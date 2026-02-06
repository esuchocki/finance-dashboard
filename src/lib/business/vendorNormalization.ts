import { NormalizedVendor, VendorGranularity } from '@/lib/types';

/**
 * Token types for vendor name classification
 */
type TokenType = 'vendor_name' | 'transaction_id' | 'location_code' | 'unknown';

interface Token {
  text: string;
  type: TokenType;
  confidence: number; // 0-1 score
}

interface TokenFrequencyMap {
  [token: string]: number;
}

interface TokenCooccurrence {
  token: string;
  frequency: number;
  precedingTokens: Set<string>;  // unique tokens that appear before this one
  followingTokens: Set<string>;  // unique tokens that appear after this one
  positions: number[];           // positions where this token appears (0, 1, 2...)
  firstTokenCount: number;       // how often this token appears as first token
}

export interface TokenAnalysis {
  frequencies: TokenFrequencyMap;
  cooccurrences: Map<string, TokenCooccurrence>;
}

/**
 * Build comprehensive token analysis from all vendor names in dataset
 * Includes frequency AND co-occurrence data for descriptor detection
 */
export function buildTokenFrequencyMap(vendorNames: string[]): TokenFrequencyMap {
  const analysis = buildTokenAnalysis(vendorNames);
  return analysis.frequencies;
}

/**
 * Build token analysis with co-occurrence data
 * This enables statistical identification of descriptors vs. vendor names
 */
export function buildTokenAnalysis(vendorNames: string[]): TokenAnalysis {
  const frequencies: TokenFrequencyMap = {};
  const cooccurrences = new Map<string, TokenCooccurrence>();

  vendorNames.forEach(name => {
    if (!name || !name.trim()) return;

    const tokens = tokenizeVendorName(name);

    tokens.forEach((token, position) => {
      const normalized = token.toUpperCase();

      // Update frequency
      frequencies[normalized] = (frequencies[normalized] || 0) + 1;

      // Update co-occurrence data
      if (!cooccurrences.has(normalized)) {
        cooccurrences.set(normalized, {
          token: normalized,
          frequency: 0,
          precedingTokens: new Set(),
          followingTokens: new Set(),
          positions: [],
          firstTokenCount: 0
        });
      }

      const cooccurrence = cooccurrences.get(normalized)!;
      cooccurrence.frequency++;
      cooccurrence.positions.push(position);

      if (position === 0) {
        cooccurrence.firstTokenCount++;
      }

      // Track preceding token
      if (position > 0) {
        const precedingToken = tokens[position - 1].toUpperCase();
        cooccurrence.precedingTokens.add(precedingToken);
      }

      // Track following token
      if (position < tokens.length - 1) {
        const followingToken = tokens[position + 1].toUpperCase();
        cooccurrence.followingTokens.add(followingToken);
      }
    });
  });

  return { frequencies, cooccurrences };
}

/**
 * Calculate descriptor score for a token (0-100)
 * Higher score = more likely to be a descriptor/service type/prefix
 * Lower score = more likely to be core vendor name
 *
 * Signals:
 * - Tokens with many unique preceding tokens are descriptors (e.g., "PAYMENT" appears after CANON, VERIZON, ATT)
 * - Tokens that rarely appear first are descriptors
 * - Tokens at later positions are descriptors
 * - Tokens with many unique following tokens are prefixes/connectors (e.g., "TO" in "Payment to X")
 */
function calculateDescriptorScore(
  token: string,
  cooccurrence: TokenCooccurrence | undefined
): number {
  if (!cooccurrence) {
    // No co-occurrence data = treat as low-confidence vendor name
    return 30;
  }

  let score = 0;

  // Signal 1: Number of unique preceding tokens (0-30 points)
  // Descriptors appear after many different vendors
  const uniquePrecedingCount = cooccurrence.precedingTokens.size;
  if (uniquePrecedingCount >= 10) {
    score += 30;
  } else if (uniquePrecedingCount >= 5) {
    score += 25;
  } else if (uniquePrecedingCount >= 3) {
    score += 20;
  } else if (uniquePrecedingCount >= 2) {
    score += 10;
  }

  // Signal 2: Number of unique following tokens (0-35 points)
  // Prefixes/connectors are followed by many different vendor names
  // Examples: "TO" in "Payment to X", "FROM" in "Transfer from X"
  const uniqueFollowingCount = cooccurrence.followingTokens.size;
  if (uniqueFollowingCount >= 10) {
    score += 35; // Strong signal of prefix/connector
  } else if (uniqueFollowingCount >= 7) {
    score += 30;
  } else if (uniqueFollowingCount >= 5) {
    score += 25;
  } else if (uniqueFollowingCount >= 3) {
    score += 15;
  }

  // Signal 3: How often token appears as first token (0-20 points)
  // Vendor names appear first; descriptors don't
  const firstTokenRatio = cooccurrence.firstTokenCount / cooccurrence.frequency;
  if (firstTokenRatio < 0.1) {
    score += 20; // Rarely first = likely descriptor
  } else if (firstTokenRatio < 0.3) {
    score += 15;
  } else if (firstTokenRatio < 0.5) {
    score += 10;
  }
  // If >= 0.5, add 0 points (likely vendor name)

  // Signal 4: Average position (0-15 points)
  // Descriptors appear later in vendor names
  const avgPosition = cooccurrence.positions.reduce((a, b) => a + b, 0) / cooccurrence.positions.length;
  if (avgPosition >= 2.5) {
    score += 15;
  } else if (avgPosition >= 2.0) {
    score += 12;
  } else if (avgPosition >= 1.5) {
    score += 8;
  } else if (avgPosition >= 1.0) {
    score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Tokenize vendor name into individual tokens
 */
function tokenizeVendorName(vendorName: string): string[] {
  // Split on whitespace and filter empty tokens
  return vendorName
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Classify a token based on patterns, frequency, and statistical properties
 * NO HARDCODED KEYWORD LISTS - uses data-driven approach
 */
function classifyToken(
  token: string,
  frequency: number | undefined,
  position: number,
  totalTokens: number
): Token {
  let type: TokenType = 'unknown';
  let confidence = 0.5;

  // === HIGH CONFIDENCE PATTERN MATCHING ===
  // These are unambiguous patterns that are almost certainly transaction IDs

  // Pure numbers with 6+ digits: "1601852", "0430000"
  if (/^\d{6,}$/.test(token)) {
    return { text: token, type: 'transaction_id', confidence: 0.95 };
  }

  // Hash followed by numbers: "#2851", "#1234"
  if (/^#\d+$/.test(token)) {
    return { text: token, type: 'location_code', confidence: 0.95 };
  }

  // Short letter prefix + numbers: "PD4305", "REF12345", "TXN98765"
  if (/^[A-Z]{2,4}\d{4,}$/.test(token)) {
    return { text: token, type: 'transaction_id', confidence: 0.9 };
  }

  // Very long alphanumeric codes (10+ chars, mixed): "A1B2C3D4E5F6"
  if (token.length >= 10 && /[A-Z]/.test(token) && /\d/.test(token)) {
    const alphaCount = (token.match(/[A-Z]/g) || []).length;
    const digitCount = (token.match(/\d/g) || []).length;
    const ratio = Math.min(alphaCount, digitCount) / Math.max(alphaCount, digitCount);

    // If well-mixed alpha and numeric, likely a code
    if (ratio > 0.3) {
      return { text: token, type: 'transaction_id', confidence: 0.85 };
    }
  }

  // Asterisks with numbers (masked card): "****1234"
  if (/^\*+\d{4}$/.test(token)) {
    return { text: token, type: 'transaction_id', confidence: 0.95 };
  }

  // === FREQUENCY-BASED CLASSIFICATION ===
  // Tokens that appear only once are very likely unique transaction IDs
  if (frequency !== undefined) {
    if (frequency === 1) {
      // Appears once across entire dataset = unique ID
      return { text: token, type: 'transaction_id', confidence: 0.9 };
    }

    if (frequency >= 10) {
      // Appears frequently = likely vendor name or common word
      return { text: token, type: 'vendor_name', confidence: 0.7 };
    }

    if (frequency === 2 || frequency === 3) {
      // Appears 2-3 times = possibly location code or department
      // Check if it matches location-like patterns
      if (/^\d+$/.test(token) && token.length >= 4) {
        return { text: token, type: 'location_code', confidence: 0.6 };
      }
      // Otherwise, could be vendor name (low confidence)
      return { text: token, type: 'vendor_name', confidence: 0.5 };
    }
  }

  // === STATISTICAL PROPERTIES ===

  // Token length analysis
  if (token.length === 1) {
    // Single character tokens are often codes or initials
    return { text: token, type: 'unknown', confidence: 0.3 };
  }

  // Pure numeric tokens (but shorter than 6 digits)
  if (/^\d+$/.test(token)) {
    if (token.length >= 4) {
      // 4-5 digit numbers: likely location/store codes
      return { text: token, type: 'location_code', confidence: 0.7 };
    } else {
      // 2-3 digit numbers: ambiguous
      return { text: token, type: 'unknown', confidence: 0.4 };
    }
  }

  // Position-based heuristics
  const isTrailing = position === totalTokens - 1;
  const isLeading = position === 0;

  if (isTrailing && /\d/.test(token)) {
    // Trailing tokens with numbers are more likely to be IDs
    confidence = 0.6;
    type = 'transaction_id';
  } else if (isLeading) {
    // Leading tokens are more likely to be vendor names
    confidence = 0.7;
    type = 'vendor_name';
  } else {
    // Middle tokens - likely vendor name
    confidence = 0.6;
    type = 'vendor_name';
  }

  // Token composition analysis
  const hasDigits = /\d/.test(token);
  const hasLetters = /[A-Z]/.test(token);
  const digitRatio = (token.match(/\d/g) || []).length / token.length;

  if (hasDigits && hasLetters) {
    // Mixed alphanumeric
    if (digitRatio > 0.5) {
      // More digits than letters = likely code
      type = 'transaction_id';
      confidence = 0.6;
    }
  } else if (hasLetters && !hasDigits) {
    // Pure alphabetic = likely vendor name
    type = 'vendor_name';
    confidence = 0.7;
  }

  return { text: token, type, confidence };
}

/**
 * Detect multi-word vendor names by grouping consecutive vendor_name tokens
 * Uses statistical properties to determine natural boundaries
 */
function detectVendorBoundaries(tokens: Token[]): {
  vendorTokens: Token[];
  otherTokens: Token[];
} {
  const vendorTokens: Token[] = [];
  const otherTokens: Token[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'vendor_name') {
      vendorTokens.push(token);
    } else if (token.type === 'transaction_id' || token.type === 'location_code') {
      otherTokens.push(token);
    } else {
      // 'unknown' type - use context to decide
      // If surrounded by vendor_name tokens, include it
      const prevIsVendor = i > 0 && tokens[i - 1].type === 'vendor_name';
      const nextIsVendor = i < tokens.length - 1 && tokens[i + 1].type === 'vendor_name';

      if (prevIsVendor && nextIsVendor) {
        // Sandwiched between vendor names = likely part of vendor
        vendorTokens.push(token);
      } else if (prevIsVendor && token.confidence < 0.6) {
        // Follows vendor name and low confidence = might be vendor
        vendorTokens.push(token);
      } else {
        otherTokens.push(token);
      }
    }
  }

  return { vendorTokens, otherTokens };
}

/**
 * Normalize vendor name into hierarchical levels using hybrid approach
 *
 * Algorithm:
 * 1. Tokenize vendor name
 * 2. Classify each token using frequency + patterns (NO hardcoded keywords)
 * 3. Separate vendor name tokens from transaction ID tokens
 * 4. Use co-occurrence analysis to identify core vendor name vs. descriptors
 * 5. Build three levels: detailed, standard (no IDs), consolidated (core vendor only)
 *
 * Examples:
 * - "KARME CHOLING IMPOUND PD4305" →
 *   base: "KARME CHOLING", sub: "KARME CHOLING IMPOUND", detailed: "KARME CHOLING IMPOUND PD4305"
 * - "STARBUCKS #2851" →
 *   base: "STARBUCKS", sub: "STARBUCKS", detailed: "STARBUCKS #2851"
 * - "CANON PAYMENT 1601852" →
 *   base: "CANON", sub: "CANON PAYMENT", detailed: "CANON PAYMENT 1601852"
 * - "CANON SOLUTIONS INTERNET 0430000" →
 *   base: "CANON", sub: "CANON SOLUTIONS INTERNET", detailed: "CANON SOLUTIONS INTERNET 0430000"
 */
export function normalizeVendorName(
  vendorName: string,
  tokenFrequencies?: TokenFrequencyMap,
  tokenAnalysis?: TokenAnalysis
): NormalizedVendor {
  if (!vendorName || vendorName.trim() === '') {
    return {
      baseVendor: 'Unknown Vendor',
      subVendor: 'Unknown Vendor',
      detailedVendor: 'Unknown Vendor'
    };
  }

  // Detailed level: keep as-is (after cleaning)
  const cleaned = vendorName.trim().toUpperCase();
  const detailedVendor = cleaned;

  // Tokenize
  const tokenStrings = tokenizeVendorName(vendorName);

  // Classify each token
  const tokens = tokenStrings.map((tokenStr, index) => {
    const frequency = tokenFrequencies ? tokenFrequencies[tokenStr] : undefined;
    return classifyToken(tokenStr, frequency, index, tokenStrings.length);
  });

  // Separate vendor tokens from transaction IDs
  const { vendorTokens, otherTokens } = detectVendorBoundaries(tokens);

  // Standard level: Include all tokens except high-confidence transaction IDs
  const standardTokens = tokens.filter(t => {
    return t.type !== 'transaction_id' || t.confidence < 0.8;
  });
  const subVendor = standardTokens.length > 0
    ? standardTokens.map(t => t.text).join(' ')
    : detailedVendor;

  // Consolidated level: Extract core vendor name using descriptor scores
  let baseVendor: string;

  if (tokenAnalysis && vendorTokens.length > 0) {
    // Calculate descriptor scores for all tokens first
    const tokenScores = vendorTokens.map(token => ({
      token: token.text,
      score: calculateDescriptorScore(token.text, tokenAnalysis.cooccurrences.get(token.text))
    }));

    let startIndex = 0;

    // Special case: detect prefix patterns like "Payment to", "Transfer from", "Check to"
    // Pattern 1: First token followed by high-descriptor token (score >= 50)
    // Example: "PAYMENT" (score=0) + "TO" (score=60) → skip both, start from index 2
    if (tokenScores.length >= 2 && tokenScores[1].score >= 50) {
      startIndex = 2;
    }
    // Pattern 2: First token itself is high-descriptor (score >= 50)
    // Example: "TO" at start (unusual but possible) → skip it
    else if (tokenScores.length >= 1 && tokenScores[0].score >= 50) {
      startIndex = 1;
    }

    // Build core vendor name starting from startIndex
    const coreVendorTokens: string[] = [];
    for (let i = startIndex; i < tokenScores.length; i++) {
      const { token, score } = tokenScores[i];

      // Include token if:
      // - It's the first token in our core (always include)
      // - Descriptor score is low (< 50 = likely vendor name)
      // - We haven't collected at least 2 tokens yet (for multi-word vendors like "WELLS FARGO")
      if (coreVendorTokens.length === 0 || score < 50 || (coreVendorTokens.length < 2 && i - startIndex < 3)) {
        coreVendorTokens.push(token);
      } else {
        // Hit a descriptor token, stop here
        break;
      }

      // Don't go beyond 3 tokens (safety limit)
      if (coreVendorTokens.length >= 3) {
        break;
      }
    }

    baseVendor = coreVendorTokens.length > 0
      ? coreVendorTokens.join(' ')
      : vendorTokens[0].text;
  } else {
    // Fallback: no co-occurrence data, use simple heuristic
    // Take first 1-2 vendor tokens
    if (vendorTokens.length === 0) {
      baseVendor = tokenStrings.length > 0 ? tokenStrings[0] : 'Unknown Vendor';
    } else if (vendorTokens.length === 1) {
      baseVendor = vendorTokens[0].text;
    } else {
      // Take first 2 tokens (handles "WELLS FARGO", "BANK OF AMERICA")
      baseVendor = vendorTokens.slice(0, 2).map(t => t.text).join(' ');
    }
  }

  return {
    baseVendor,
    subVendor: subVendor || detailedVendor,
    detailedVendor
  };
}

/**
 * Get vendor name based on granularity level
 */
export function getVendorNameByGranularity(
  normalized: NormalizedVendor,
  granularity: VendorGranularity
): string {
  switch (granularity) {
    case 'consolidated':
      return normalized.baseVendor;
    case 'standard':
      return normalized.subVendor;
    case 'detailed':
      return normalized.detailedVendor;
    default:
      return normalized.subVendor;
  }
}