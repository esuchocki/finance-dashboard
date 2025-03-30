
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
];

// Common location patterns in transaction descriptions
const locationPatterns = [
  { pattern: /\b([A-Z]{2})\b/, extract: (match: RegExpMatchArray) => match[1] }, // State codes like CA, NY
  { pattern: /#([0-9]{5})/, extract: (match: RegExpMatchArray) => match[1] },  // Zip codes
  { pattern: /([A-Za-z]+ ?[A-Za-z]*) (TX|CA|NY|FL|IL|PA|OH|GA|NC|MI|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|DC|VT|WY)/, extract: (match: RegExpMatchArray) => `${match[1]}, ${match[2]}` },  // City and state
];

export function parseQBOFile(fileContent: string): Transaction[] {
  try {
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "_",
    });
    
    const result = parser.parse(fileContent);
    
    if (!result.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN) {
      throw new Error("Invalid QBO file format");
    }
    
    const qboTransactions = Array.isArray(result.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN) 
      ? result.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN 
      : [result.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN];
      
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
          case "INT": type = TransactionType.INTEREST; break;
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
      
      // Determine if it's a recurring transaction (simplified logic)
      // A more sophisticated implementation would compare across multiple statements
      const isRecurring = false;
      
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

// Parse QBO date format (YYYYMMDD)
function parseQBODate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Handle QBO date format which could be YYYYMMDD or YYYYMMDDHHMMSS
  if (dateStr.length >= 8) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-based
    const day = parseInt(dateStr.substring(6, 8));
    
    return new Date(year, month, day);
  }
  
  return new Date();
}
