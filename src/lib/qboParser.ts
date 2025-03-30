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

// Direct approach to extract transactions from OFX response
export function parseQBOFile(fileContent: string): Transaction[] {
  try {
    // Basic validation check
    if (!fileContent || fileContent.length < 100) {
      throw new Error("Invalid QBO file: File content too short");
    }
    
    // Check if the file is QBO format with headers
    const isQBO = fileContent.includes("OFXHEADER:") || fileContent.includes("<OFX>");
    
    if (!isQBO) {
      throw new Error("Invalid file format: Not a QBO file");
    }
    
    // Extract XML content from QBO file
    const ofxStartIndex = fileContent.indexOf("<OFX>");
    if (ofxStartIndex === -1) {
      throw new Error("Invalid QBO file: Missing <OFX> tag");
    }
    
    // Extract just the XML part
    const xmlContent = fileContent.substring(ofxStartIndex);
    
    console.log("Processing QBO file...");
    
    // Simplified direct extraction approach 
    // Instead of using complex XML parsing, directly extract transactions using string manipulation
    // This is much faster than deep XML parsing for large files
    const transactions = extractTransactionsDirectly(xmlContent);
    
    if (!transactions || transactions.length === 0) {
      console.log("No transactions found using direct extraction, trying XML parser as fallback");
      
      // Fallback to XML parser with minimal options
      try {
        const parser = new XMLParser({
          ignoreAttributes: true,
          isArray: (name) => name === "STMTTRN",
          parseTagValue: false,
          trimValues: true
        });
        
        const result = parser.parse(xmlContent);
        const xmlTransactions = findSTMTTRNArrayInParsedXML(result);
        
        if (xmlTransactions && xmlTransactions.length > 0) {
          console.log(`Found ${xmlTransactions.length} transactions using XML parser`);
          return processTransactionsInBatches(xmlTransactions, 50);
        } else {
          console.error("No transactions found in QBO file");
          return [];
        }
      } catch (parseError) {
        console.error("XML parsing error:", parseError);
        throw new Error(`Failed to parse QBO XML content: ${(parseError as Error).message}`);
      }
    }
    
    console.log(`Found ${transactions.length} transactions in QBO file using direct extraction`);
    return transactions;
    
  } catch (error) {
    console.error("Error parsing QBO file:", error);
    throw new Error(`Failed to parse QBO file: ${(error as Error).message}`);
  }
}

// Extract transactions directly from the XML string for better performance
function extractTransactionsDirectly(xmlContent: string): Transaction[] {
  const transactions: Transaction[] = [];
  const stmtTrnPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  const fieldPattern = /<(\w+)>([\s\S]*?)(?=<\/\1>|<\w+>)/g;
  
  let match;
  while ((match = stmtTrnPattern.exec(xmlContent)) !== null) {
    const trnContent = match[1];
    const trnData: Record<string, string> = {};
    
    let fieldMatch;
    while ((fieldMatch = fieldPattern.exec(trnContent)) !== null) {
      const [, fieldName, fieldValue] = fieldMatch;
      trnData[fieldName] = fieldValue.trim();
    }
    
    const transaction = createTransactionFromData(trnData);
    if (transaction) {
      transactions.push(transaction);
    }
  }
  
  return transactions;
}

// Create transaction from extracted data
function createTransactionFromData(data: Record<string, string>): Transaction | null {
  try {
    // Basic validation
    if (!data.TRNAMT || !data.DTPOSTED) {
      return null;
    }
    
    const amount = parseFloat(data.TRNAMT);
    if (isNaN(amount)) return null;
    
    const name = data.NAME || "";
    const memo = data.MEMO || "";
    const description = `${name} ${memo}`.trim();
    
    // Determine transaction type
    let type = TransactionType.OTHER;
    if (data.TRNTYPE) {
      switch (data.TRNTYPE.toUpperCase()) {
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
    
    // Determine category and other metadata
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
    
    // Check for recurring transactions
    const isRecurring = /monthly|recurring|subscription|netflix|spotify|hulu|disney\+|hbo|\bprime\b|anthropic|patreon/i.test(description);
    
    const date = parseQBODate(data.DTPOSTED);
    
    return {
      id: data.FITID || `${date.getTime()}-${amount}-${Math.random().toString(36).substring(2, 9)}`,
      date,
      amount: Math.abs(amount),
      type,
      name,
      description,
      memo: data.MEMO || "",
      category,
      subCategory,
      location,
      isRecurring,
      payee: name,
      tags: []
    };
  } catch (err) {
    console.error("Error processing transaction data:", err);
    return null;
  }
}

// Fallback XML parsing approach
function findSTMTTRNArrayInParsedXML(obj: any): any[] {
  if (!obj) return [];
  
  // Common paths to look for transaction arrays
  const paths = [
    ['OFX', 'BANKMSGSRSV1', 'STMTTRNRS', 'STMTRS', 'BANKTRANLIST', 'STMTTRN'],
    ['OFX', 'CREDITCARDMSGSRSV1', 'CCSTMTTRNRS', 'CCSTMTRS', 'BANKTRANLIST', 'STMTTRN'],
    ['OFX', 'BANKMSGSRSV1', 'STMTRS', 'BANKTRANLIST', 'STMTTRN']
  ];
  
  // Try each path
  for (const path of paths) {
    let current = obj;
    let valid = true;
    
    for (let i = 0; i < path.length; i++) {
      if (!current || !current[path[i]]) {
        valid = false;
        break;
      }
      current = current[path[i]];
    }
    
    if (valid && Array.isArray(current)) {
      return current;
    }
  }
  
  // Last resort: search for STMTTRN array anywhere in the object
  if (obj.OFX) {
    const result = searchForSTMTTRNArray(obj.OFX);
    if (result.length > 0) return result;
  }
  
  return [];
}

// Non-recursive search for STMTTRN arrays
function searchForSTMTTRNArray(obj: any): any[] {
  if (!obj || typeof obj !== 'object') return [];
  
  // Check direct properties
  if (obj.STMTTRN && Array.isArray(obj.STMTTRN)) {
    return obj.STMTTRN;
  }
  
  // Check BANKTRANLIST property
  if (obj.BANKTRANLIST && obj.BANKTRANLIST.STMTTRN && Array.isArray(obj.BANKTRANLIST.STMTTRN)) {
    return obj.BANKTRANLIST.STMTTRN;
  }
  
  // Check first-level properties
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === 'object') {
      if (obj[key].STMTTRN && Array.isArray(obj[key].STMTTRN)) {
        return obj[key].STMTTRN;
      }
      if (obj[key].BANKTRANLIST && 
          obj[key].BANKTRANLIST.STMTTRN && 
          Array.isArray(obj[key].BANKTRANLIST.STMTTRN)) {
        return obj[key].BANKTRANLIST.STMTTRN;
      }
    }
  }
  
  return [];
}

// Process transactions in batches for better performance
function processTransactionsInBatches(transactions: any[], batchSize: number = 50): Transaction[] {
  const result: Transaction[] = [];
  const totalTransactions = transactions.length;
  
  for (let i = 0; i < totalTransactions; i += batchSize) {
    const endIndex = Math.min(i + batchSize, totalTransactions);
    const batch = transactions.slice(i, endIndex);
    const processedBatch = batch.map(processTransaction).filter(Boolean) as Transaction[];
    result.push(...processedBatch);
  }
  
  return result;
}

// Process a single transaction
function processTransaction(trn: any): Transaction | null {
  if (!trn) return null;
  
  try {
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
  } catch (err) {
    console.error("Error processing transaction:", err);
    return null;
  }
}

// Parse QBO date format
function parseQBODate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  try {
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
    return new Date();
  } catch (error) {
    console.error(`Error parsing date ${dateStr}:`, error);
    return new Date();
  }
}
