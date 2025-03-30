
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

export function parseQBOFile(fileContent: string): Transaction[] {
  try {
    // Check if content has OFX headers (which are not XML)
    const hasHeaders = fileContent.includes("OFXHEADER:");
    
    // If headers exist, strip them to get to the XML part
    let xmlContent = fileContent;
    if (hasHeaders) {
      const xmlStartIndex = fileContent.indexOf("<OFX>");
      if (xmlStartIndex !== -1) {
        xmlContent = fileContent.substring(xmlStartIndex);
      } else {
        throw new Error("Invalid QBO file: Missing <OFX> tag");
      }
    }
    
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "_",
      ignoreDeclaration: true,
      parseTagValue: false,
      trimValues: true,
    });
    
    const result = parser.parse(xmlContent);
    
    console.log("Parsed QBO data structure:", JSON.stringify(result, null, 2));
    
    // Validate structure and get transactions
    if (!result.OFX || 
        !result.OFX.BANKMSGSRSV1 || 
        !result.OFX.BANKMSGSRSV1.STMTTRNRS || 
        !result.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS || 
        !result.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST) {
      console.error("Invalid QBO structure:", result);
      throw new Error("Invalid QBO file format: Missing required structure");
    }
    
    const bankTranList = result.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST;
    
    if (!bankTranList.STMTTRN) {
      console.error("No transactions found in QBO file");
      return [];
    }
    
    const qboTransactions = Array.isArray(bankTranList.STMTTRN) 
      ? bankTranList.STMTTRN 
      : [bankTranList.STMTTRN];
    
    console.log(`Found ${qboTransactions.length} transactions in QBO file`);
    
    return qboTransactions.map((trn: QBOTransaction["STMTTRN"]) => {
      if (!trn) return null;
      
      const amount = parseFloat(trn.TRNAMT || "0");
      const name = trn.NAME || "";
      const memo = trn.MEMO || "";
      const description = `${name} ${memo}`.trim();
      
      // Determine transaction type
      let type = TransactionType.OTHER;
      if (trn.TRNTYPE) {
        switch (trn.TRNTYPE.toUpperCase()) {
          case "DEBIT": type = TransactionType.DEBIT; break;
          case "CREDIT": type = TransactionType.CREDIT; break;
          case "CHECK": type = TransactionType.CHECK; break;
          case "DEP": case "DEPOSIT": type = TransactionType.DEPOSIT; break;
          case "WITHDRAWAL": type = TransactionType.WITHDRAWAL; break;
          case "FEE": type = TransactionType.FEE; break;
          case "INT": case "INTEREST": type = TransactionType.INTEREST; break;
          case "XFER": case "TRANSFER": type = TransactionType.TRANSFER; break;
          default: type = TransactionType.OTHER;
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
    }).filter(Boolean) as Transaction[];
  } catch (error) {
    console.error("Error parsing QBO file:", error);
    throw new Error("Failed to parse QBO file: " + (error as Error).message);
  }
}

// Parse QBO date format (YYYYMMDDHHMMSS.000[-TZ:TZ_NAME])
function parseQBODate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Standard QBO date format can be:
  // 1. YYYYMMDDHHMMSS.000[-TZ:TZ_NAME]
  // 2. YYYYMMDD
  
  try {
    // Extract just the date portion for simplicity
    const datePart = dateStr.substring(0, 8); // Get first 8 chars (YYYYMMDD)
    
    if (datePart.length === 8) {
      const year = parseInt(datePart.substring(0, 4));
      const month = parseInt(datePart.substring(4, 6)) - 1; // JS months are 0-based
      const day = parseInt(datePart.substring(6, 8));
      
      return new Date(year, month, day);
    }
    
    // Fallback to current date if we can't parse
    console.warn(`Could not parse date: ${dateStr}, using current date instead`);
    return new Date();
  } catch (error) {
    console.error(`Error parsing date ${dateStr}:`, error);
    return new Date();
  }
}
