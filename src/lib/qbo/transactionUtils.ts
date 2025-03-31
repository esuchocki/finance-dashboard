
import { Transaction, TransactionType } from '../types';
import { categoryPatterns, locationPatterns } from './categoryPatterns';

// Process transactions in batches for better performance
export function processTransactionsInBatches(transactions: any[], batchSize: number = 50): Transaction[] {
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
export function processTransaction(trn: any): Transaction | null {
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

// Create transaction from extracted data
export function createTransactionFromData(data: Record<string, string>): Transaction | null {
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

// Parse QBO date format
export function parseQBODate(dateStr: string): Date {
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
