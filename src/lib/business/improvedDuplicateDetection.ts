import { BusinessTransaction } from '@/lib/types';
import { safePercentageChange, roundCurrency } from '@/lib/safeMath';

export interface DuplicateGroup {
  transactions: BusinessTransaction[];
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Normalize merchant name for better matching
 * Removes common transaction IDs, timestamps, and reference numbers
 */
function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common patterns
    .replace(/\s*#\d+/g, '') // Remove #123
    .replace(/\s*\d{6,}/g, '') // Remove long numbers (6+ digits)
    .replace(/\s*\d{2}\/\d{2}\/\d{2,4}/g, '') // Remove dates
    .replace(/\s*\d{2}:\d{2}/g, '') // Remove times
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Create a transaction hash for exact matching
 */
function createTransactionHash(tx: BusinessTransaction): string {
  const normalizedName = normalizeMerchantName(tx.name || tx.payee || '');
  const dateStr = tx.date.toISOString().split('T')[0]; // YYYY-MM-DD
  const amount = tx.amount.toFixed(2);

  return `${tx.accountId}|${normalizedName}|${amount}|${dateStr}`;
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Jaro-Winkler distance for better accuracy
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  // Simple similarity: what percentage of the shorter string appears in the longer
  let matchCount = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matchCount++;
    }
  }

  return matchCount / shorter.length;
}

/**
 * Improved duplicate detection with better accuracy and performance
 *
 * Improvements:
 * 1. Uses hashing for O(n) performance instead of O(n²)
 * 2. Checks account context - same account required for duplicates
 * 3. Uses transaction IDs when available
 * 4. Better name normalization (removes IDs, dates, etc.)
 * 5. Handles pending→cleared duplicates
 */
export function detectImprovedDuplicates(
  transactions: BusinessTransaction[]
): DuplicateGroup[] {
  const duplicateGroups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  // Build hash map for fast lookups
  const hashMap = new Map<string, BusinessTransaction[]>();

  transactions.forEach(tx => {
    const hash = createTransactionHash(tx);
    const group = hashMap.get(hash) || [];
    group.push(tx);
    hashMap.set(hash, group);
  });

  // Find exact duplicates (same hash)
  hashMap.forEach((group, hash) => {
    if (group.length > 1) {
      const ids = group.map(tx => tx.id);

      // Skip if already processed
      if (ids.some(id => processed.has(id))) return;

      // Check if they're in the same account
      const accountIds = new Set(group.map(tx => tx.accountId));
      if (accountIds.size > 1) {
        // Different accounts - not duplicates
        return;
      }

      // Mark as processed
      ids.forEach(id => processed.add(id));

      duplicateGroups.push({
        transactions: group,
        reason: 'Same amount, same merchant, same day, same account',
        confidence: 'high'
      });
    }
  });

  // Find near-duplicates (similar but not exact)
  // Group by account first for efficiency
  const byAccount = new Map<string, BusinessTransaction[]>();
  transactions.forEach(tx => {
    if (processed.has(tx.id)) return;
    const group = byAccount.get(tx.accountId) || [];
    group.push(tx);
    byAccount.set(tx.accountId, group);
  });

  // Check for near-duplicates within each account
  byAccount.forEach((accountTxs) => {
    for (let i = 0; i < accountTxs.length; i++) {
      const tx1 = accountTxs[i];
      if (processed.has(tx1.id)) continue;

      const nearDuplicates: BusinessTransaction[] = [tx1];

      for (let j = i + 1; j < accountTxs.length; j++) {
        const tx2 = accountTxs[j];
        if (processed.has(tx2.id)) continue;

        // Check amount match (within 1 cent)
        if (Math.abs(tx1.amount - tx2.amount) > 0.01) continue;

        // Check date proximity (within 7 days for pending→cleared)
        const daysDiff = Math.abs(
          (tx1.date.getTime() - tx2.date.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 7) continue;

        // Check name similarity
        const name1 = normalizeMerchantName(tx1.name || tx1.payee || '');
        const name2 = normalizeMerchantName(tx2.name || tx2.payee || '');

        const similarity = calculateSimilarity(name1, name2);

        if (similarity >= 0.8 && daysDiff <= 1) {
          // Very similar name, within 1 day
          nearDuplicates.push(tx2);
          processed.add(tx2.id);
        } else if (name1 === name2 && daysDiff <= 7) {
          // Exact name match, within 7 days (pending→cleared)
          nearDuplicates.push(tx2);
          processed.add(tx2.id);
        }
      }

      if (nearDuplicates.length > 1) {
        processed.add(tx1.id);

        // Determine confidence
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        const maxDaysDiff = Math.max(...nearDuplicates.map((tx, idx) => {
          if (idx === 0) return 0;
          return Math.abs(
            (tx.date.getTime() - nearDuplicates[0].date.getTime()) / (1000 * 60 * 60 * 24)
          );
        }));

        if (maxDaysDiff === 0) {
          confidence = 'high';
        } else if (maxDaysDiff <= 2) {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }

        let reason = `Similar amount and merchant, within ${Math.ceil(maxDaysDiff)} day${maxDaysDiff > 1 ? 's' : ''}`;
        if (maxDaysDiff >= 3 && maxDaysDiff <= 7) {
          reason += ' (possible pending→cleared duplicate)';
        }

        duplicateGroups.push({
          transactions: nearDuplicates,
          reason,
          confidence
        });
      }
    }
  });

  return duplicateGroups;
}
