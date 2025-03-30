
import { Transaction, TransactionType } from "./types";
import { XMLParser } from "fast-xml-parser";

interface QBOTransaction {
  STMTTRN?: {
    TRNTYPE?: string;
    DTPOSTED?: string;
    TRNAMT?: string;
    FITID?: string;
    NAME?: string;
    MEMO?: string;
    CHECKNUM?: string;
  };
}

// Define common merchant patterns for better categorization
const categoryPatterns = [
  { pattern: /(netflix|hulu|disney\+|hbo|spotify|apple music|youtube|prime)/i, category: "Entertainment", subcategory: "Streaming" },
  { pattern: /(uber|lyft|taxi|cab|train|subway|metro|transit|airline|flight)/i, category: "Transportation", subcategory: "Travel" },
  { pattern: /(restaurant|café|cafe|coffee|starbucks|mcdonald|burger|pizza|taco|dining)/i, category: "Food", subcategory: "Dining Out" },
  { pattern: /(grocery|market|food|supermarket|walmart|target|costco|trader|wholefood)/i, category: "Food", subcategory: "Groceries" },
  { pattern: /(amazon|ebay|etsy|wayfair|bestbuy|aliexpress|walmart)/i, category: "Shopping", subcategory: "Online" },
  { pattern: /(gym|fitness|peloton|nike|adidas|workout|sport)/i, category: "Health", subcategory: "Fitness" },
  { pattern: /(doctor|pharmacy|clinic|hospital|medical|dental|healthcare)/i, category: "Health", subcategory: "Medical" },
  { pattern: /(rent|mortgage|loan|apartment|condo|house payment)/i, category: "Housing", subcategory: "Rent/Mortgage" },
  { pattern: /(electric|gas|water|sewer|utility|internet|cable|phone|cell|mobile)/i, category: "Housing", subcategory: "Utilities" },
  { pattern: /(insurance|geico|allstate|statefarm|progressive|liberty)/i, category: "Insurance", subcategory: "General" },
  { pattern: /(salary|payroll|direct deposit|deposit)/i, category: "Income", subcategory: "Salary" },
  { pattern: /(anthropic|claude\.ai)/i, category: "Software", subcategory: "AI Tools" },
  { pattern: /(patreon|facebook|meta)/i, category: "Entertainment", subcategory: "Social Media" },
  { pattern: /(home depot|lowes|ikea|wayfair|overstock|furniture)/i, category: "Housing", subcategory: "Home Improvement" },
];

// Common location patterns in transaction descriptions
const locationPatterns = [
  { pattern: /\b([A-Z]{2})\b/, extract: (match: RegExpMatchArray) => match[1] }, // State codes like CA, NY
  { pattern: /#([0-9]{5})/, extract: (match: RegExpMatchArray) => match[1] },  // Zip codes
  { pattern: /([A-Za-z]+ ?[A-Za-z]*) (TX|CA|NY|FL|IL|PA|OH|GA|NC|MI|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|DC|VT|WY)/, extract: (match: RegExpMatchArray) => `${match[1]}, ${match[2]}` },  // City and state
];

// Common QBO transaction paths to try
const TRANSACTION_PATHS = [
  ["OFX", "BANKMSGSRSV1", "STMTTRNRS", "STMTRS", "BANKTRANLIST", "STMTTRN"],
  ["OFX", "CREDITCARDMSGSRSV1", "CCSTMTTRNRS", "CCSTMTRS", "BANKTRANLIST", "STMTTRN"],
  ["OFX", "BANKMSGSRSV1", "STMTRS", "BANKTRANLIST", "STMTTRN"],
  ["OFX", "BANKMSGSRSV1", "STMTTRNRS", "BANKTRANLIST", "STMTTRN"],
  ["OFX", "BANKMSGSRSV1", "STMTTRNRS", "STMTRS", "BANKTRANLIST", "STMTTRN"],
];

export function parseQBOFile(fileContent: string): Transaction[] {
  try {
    // Check if the file is QBO format with headers
    const isQBO = fileContent.includes("OFXHEADER:") || fileContent.includes("<OFX>");
    
    if (!isQBO) {
      throw new Error("Invalid file format: Not a QBO file");
    }
    
    // Extract XML content from QBO file (handle both with and without headers)
    let xmlContent = fileContent;
    
    // Find the OFX start tag (handle both header and non-header formats)
    const ofxStartIndex = fileContent.indexOf("<OFX>");
    if (ofxStartIndex === -1) {
      console.error("Missing <OFX> tag in QBO file");
      throw new Error("Invalid QBO file: Missing <OFX> tag");
    }
    
    // Extract just the XML part
    xmlContent = fileContent.substring(ofxStartIndex);
    
    // Clean up any potential issues in the XML
    // QBO files sometimes have unclosed or improperly formatted tags
    xmlContent = cleanupQBOXml(xmlContent);
    
    console.log("Processing QBO content...");
    
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "_",
      parseTagValue: true,
      trimValues: true,
      isArray: (name) => {
        return name === "STMTTRN"; // Always treat STMTTRN as array
      }
    });
    
    try {
      const result = parser.parse(xmlContent);
      console.log("QBO structure:", JSON.stringify(result, null, 2).substring(0, 200) + "...");
      
      // Attempt to find transactions using predefined paths instead of recursive search
      let transactions = findTransactionsInStructureIterative(result);
      
      if (!transactions || transactions.length === 0) {
        console.error("No transactions found in QBO file");
        return [];
      }
      
      console.log(`Found ${transactions.length} transactions in QBO file`);
      
      // Process transactions in batches to avoid call stack issues
      return processTransactionsInBatches(transactions);
      
    } catch (parseError) {
      console.error("XML parsing error:", parseError);
      throw new Error(`Failed to parse QBO XML content: ${(parseError as Error).message}`);
    }
  } catch (error) {
    console.error("Error parsing QBO file:", error);
    throw new Error("Failed to parse QBO file: " + (error as Error).message);
  }
}

// Clean up QBO XML to make it more parser-friendly
function cleanupQBOXml(xml: string): string {
  // Handle self-closing tags that aren't properly formed
  let cleaned = xml.replace(/<([^>]+)>(?!\s*<\/)/g, (match, tag) => {
    if (tag.endsWith('/')) return match; // Already a proper self-closing tag
    if (/\s+\/>$/.test(tag)) return match; // Already a proper self-closing tag
    return `<${tag}>`; // Convert to normal tag
  });
  
  // Ensure OFX is properly closed
  if (!cleaned.includes("</OFX>")) {
    cleaned += "\n</OFX>";
  }
  
  return cleaned;
}

// Non-recursive function to find transactions using predefined paths
function findTransactionsInStructureIterative(obj: any): any[] {
  if (!obj) return [];
  
  // Try each predefined path
  for (const path of TRANSACTION_PATHS) {
    let current = obj;
    let valid = true;
    
    // Navigate through the path
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (!current || !current[key]) {
        valid = false;
        break;
      }
      current = current[key];
    }
    
    if (valid && Array.isArray(current)) {
      return current;
    }
  }
  
  // If no transactions found using predefined paths, try a more general approach
  if (obj.OFX) {
    // Search for STMTTRN in direct children of OFX
    for (const key in obj.OFX) {
      if (key === "STMTTRN" && Array.isArray(obj.OFX[key])) {
        return obj.OFX[key];
      }
      
      // Look one level deeper
      if (typeof obj.OFX[key] === "object" && obj.OFX[key] !== null) {
        for (const nestedKey in obj.OFX[key]) {
          if (nestedKey === "STMTTRN" && Array.isArray(obj.OFX[key][nestedKey])) {
            return obj.OFX[key][nestedKey];
          }
          
          // Look one more level deeper
          if (typeof obj.OFX[key][nestedKey] === "object" && obj.OFX[key][nestedKey] !== null) {
            for (const deepKey in obj.OFX[key][nestedKey]) {
              if (deepKey === "STMTTRN" && Array.isArray(obj.OFX[key][nestedKey][deepKey])) {
                return obj.OFX[key][nestedKey][deepKey];
              }
            }
          }
        }
      }
    }
  }
  
  return [];
}

// Process transactions in smaller batches to avoid stack overflow
function processTransactionsInBatches(transactions: any[]): Transaction[] {
  const BATCH_SIZE = 100; // Adjust based on performance testing
  const result: Transaction[] = [];
  
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    const processedBatch = batch.map((trn) => processTransaction(trn)).filter(Boolean) as Transaction[];
    result.push(...processedBatch);
  }
  
  return result;
}

// Process a single transaction
function processTransaction(trn: any): Transaction | null {
  if (!trn) return null;
  
  // Safely extract values with fallbacks
  const trnType = String(trn.TRNTYPE || "");
  const amountStr = String(trn.TRNAMT || "0");
  const name = String(trn.NAME || "");
  const memo = String(trn.MEMO || "");
  const description = `${name} ${memo}`.trim();
  
  const amount = parseFloat(amountStr);
  if (isNaN(amount)) return null;
  
  // Determine transaction type
  let type = TransactionType.OTHER;
  if (trnType) {
    switch (trnType.toUpperCase()) {
      case "DEBIT": type = TransactionType.DEBIT; break;
      case "CREDIT": type = TransactionType.CREDIT; break;
      case "CHECK": type = TransactionType.CHECK; break;
      case "DEP": case "DEPOSIT": type = TransactionType.DEPOSIT; break;
      case "WITHDRAWAL": type = TransactionType.WITHDRAWAL; break;
      case "FEE": type = TransactionType.FEE; break;
      case "INT": case "INTEREST": type = TransactionType.INTEREST; break;
      case "XFER": case "TRANSFER": type = TransactionType.TRANSFER; break;
      default: 
        // If type is unknown, determine by amount
        type = amount < 0 ? TransactionType.DEBIT : TransactionType.CREDIT;
    }
  } else {
    // Determine type based on amount if not specified
    type = amount < 0 ? TransactionType.DEBIT : TransactionType.CREDIT;
  }
  
  // Determine category based on description patterns
  let category = "Uncategorized";
  let subCategory = "";
  
  for (const { pattern, category: cat, subcategory: subcat } of categoryPatterns) {
    if (pattern.test(description)) {
      category = cat;
      subCategory = subcat;
      break;
    }
  }
  
  // Extract location if available in the description
  let location = "";
  for (const { pattern, extract } of locationPatterns) {
    const match = description.match(pattern);
    if (match) {
      location = extract(match);
      break;
    }
  }
  
  // Look for recurring transactions (checking for repeated patterns)
  const isRecurring = /monthly|recurring|subscription|netflix|spotify|hulu|disney\+|hbo|\bprime\b|anthropic|patreon/i.test(description);
  
  const date = parseQBODate(trn.DTPOSTED || "");
  
  return {
    id: trn.FITID || `${date.getTime()}-${amount}-${Math.random().toString(36).substring(2, 9)}`,
    date,
    amount: Math.abs(amount),
    type,
    name,
    description,
    memo: trn.MEMO || "",
    category,
    subCategory,
    location,
    isRecurring,
    payee: name,
    tags: []
  };
}

// Parse QBO date format (YYYYMMDDHHMMSS.000[-TZ:TZ_NAME])
function parseQBODate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  try {
    // Handle different QBO date formats
    
    // Format 1: YYYYMMDDHHMMSS.000[-TZ:TZ_NAME]
    // Format 2: YYYYMMDD
    
    // Extract just the date portion for simplicity
    let datePart = dateStr;
    
    // If it has timezone or milliseconds, extract just the date part
    if (dateStr.includes("[") || dateStr.includes(".")) {
      datePart = dateStr.substring(0, 8); // Get first 8 chars (YYYYMMDD)
    }
    
    // Ensure we have at least 8 characters for YYYYMMDD
    if (datePart.length >= 8) {
      const year = parseInt(datePart.substring(0, 4));
      const month = parseInt(datePart.substring(4, 6)) - 1; // JS months are 0-based
      const day = parseInt(datePart.substring(6, 8));
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    
    // Fallback to current date if we can't parse
    console.warn(`Could not parse date: ${dateStr}, using current date instead`);
    return new Date();
  } catch (error) {
    console.error(`Error parsing date ${dateStr}:`, error);
    return new Date();
  }
}
