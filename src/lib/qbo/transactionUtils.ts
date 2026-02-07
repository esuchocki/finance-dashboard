
import { Transaction, TransactionType, TimeOfDay, NarrativeTransaction, PersonalBackground } from '../types';
import { categoryPatterns, locationPatterns, categoryHierarchy } from './categoryPatterns';
import { isValidDate } from '@/lib/dateUtils';

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

// Determine time of day based on transaction timestamp if available
export function determineTimeOfDay(dateStr: string): TimeOfDay {
  try {
    // Default to MORNING if no time information is available
    if (!dateStr || dateStr.length < 10) return TimeOfDay.MORNING;
    
    // Try to extract time information if available (format could be like "20230415120000")
    let hour = 12; // Default to noon
    
    // If the date string has time portion (greater than 8 chars for YYYYMMDD)
    if (dateStr.length > 8) {
      // Try to extract hour from position 8-10 (assuming YYYYMMDDHH format)
      const hourStr = dateStr.substring(8, 10);
      const parsedHour = parseInt(hourStr);
      if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour < 24) {
        hour = parsedHour;
      }
    }
    
    // Categorize based on hour
    if (hour >= 5 && hour < 12) return TimeOfDay.MORNING;
    if (hour >= 12 && hour < 17) return TimeOfDay.AFTERNOON;
    if (hour >= 17 && hour < 21) return TimeOfDay.EVENING;
    if (hour >= 21 || hour < 1) return TimeOfDay.NIGHT;
    return TimeOfDay.LATE_NIGHT; // 1am - 5am
  } catch (error) {
    console.error("Error determining time of day:", error);
    return TimeOfDay.MORNING; // Default
  }
}

// Process a single transaction with improved categorization
export function processTransaction(trn: any): Transaction | null {
  if (!trn) return null;
  
  try {
    // Safely extract values with fallbacks
    const trnType = String(trn.TRNTYPE || "");
    const amountStr = String(trn.TRNAMT || "0");
    const name = String(trn.NAME || "");
    const memo = String(trn.MEMO || "");
    const checkNum = trn.CHECKNUM ? `Check #${trn.CHECKNUM}` : "";
    const datePosted = String(trn.DTPOSTED || "");
    
    // Create a richer description by combining available fields
    const baseDescription = `${name} ${memo} ${checkNum}`.trim();
    
    // Create a more verbose initial description for user readability
    // Prioritize giving meaningful information
    let verboseDescription = "";
    if (name && memo) {
      // If we have both name and memo, combine them
      verboseDescription = `${name}: ${memo}`;
    } else if (memo) {
      // Just memo
      verboseDescription = memo;
    } else if (name) {
      // Just name
      verboseDescription = name;
    } else if (checkNum) {
      // Just check number
      verboseDescription = checkNum;
    }
    
    // Add check number to verbose description if not already included
    if (checkNum && !verboseDescription.includes(checkNum)) {
      verboseDescription = verboseDescription ? `${verboseDescription} (${checkNum})` : checkNum;
    }
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return null;
    
    // Determine transaction type more accurately
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
    
    // Determine initial category and other metadata
    let category = "Uncategorized";
    let subCategory = "";
    let categoryType: "income" | "expense" | "transfer" = "expense";
    
    // Set initial category type based on transaction type
    if (type === TransactionType.CREDIT || type === TransactionType.DEPOSIT || type === TransactionType.INTEREST) {
      categoryType = "income";
    } else if (type === TransactionType.DEBIT || type === TransactionType.CHECK || 
               type === TransactionType.WITHDRAWAL || type === TransactionType.FEE) {
      categoryType = "expense";
    } else if (type === TransactionType.TRANSFER) {
      categoryType = "transfer";
    }
    
    // Apply category pattern matching for initial categorization with more contextual info
    for (const { pattern, category: cat, subcategory: subcat } of categoryPatterns) {
      // Check against both the base description and verbose description for better matching
      if (pattern.test(baseDescription) || pattern.test(verboseDescription)) {
        category = cat;
        subCategory = subcat;
        
        // Refine category type based on matched category
        const matchedCategoryHierarchy = categoryHierarchy.find(c => c.name === cat);
        if (matchedCategoryHierarchy) {
          if (matchedCategoryHierarchy.isIncome) categoryType = "income";
          else if (matchedCategoryHierarchy.isExpense) categoryType = "expense";
          else if (matchedCategoryHierarchy.isTransfer) categoryType = "transfer";
        }
        
        break;
      }
    }
    
    // Extract location if available in the description
    let location = "";
    for (const { pattern, extract } of locationPatterns) {
      // Try to match location in both base description and verbose description
      const baseMatch = baseDescription.match(pattern);
      const verboseMatch = verboseDescription.match(pattern);
      const match = baseMatch || verboseMatch;
      
      if (match) {
        location = extract(match);
        break;
      }
    }
    
    // Enhanced check for recurring transactions with expanded pattern matching
    const isRecurring = /monthly|recurring|subscription|bill payment|netflix|spotify|hulu|disney\+|hbo|\bprime\b|anthropic|patreon|gym|fitness|insurance|mortgage|rent|loan payment|utility|phone|internet|cable|service fee/i.test(baseDescription + " " + verboseDescription);
    
    // Parse the date
    const date = parseQBODate(datePosted);

    // Generate a unique transaction ID
    // Ensure we use a valid timestamp for the ID
    const timestamp = date && !isNaN(date.getTime()) ? date.getTime() : Date.now();
    const id = trn.FITID || `${timestamp}-${amount}-${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      id,
      date,
      amount: Math.abs(amount),
      type,
      name,
      description: baseDescription,
      memo: trn.MEMO || "",
      category,
      subCategory,
      location,
      isRecurring,
      payee: name,
      verboseDescription,
      confidence: "low", // Initial confidence is low, Claude will improve this
      categoryType,
      tags: []
    };
  } catch (err) {
    console.error("Error processing transaction:", err);
    return null;
  }
}

// Create transaction from extracted data with improved categorization
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
    const checkNum = data.CHECKNUM ? `Check #${data.CHECKNUM}` : "";
    
    // Create a richer description
    const baseDescription = `${name} ${memo} ${checkNum}`.trim();
    
    // Create a more verbose initial description for user readability with better formatting
    let verboseDescription = "";
    if (name && memo) {
      // If we have both name and memo, combine them
      verboseDescription = `${name}: ${memo}`;
    } else if (memo) {
      // Just memo
      verboseDescription = memo;
    } else if (name) {
      // Just name
      verboseDescription = name;
    } else if (checkNum) {
      // Just check number
      verboseDescription = checkNum;
    }
    
    // Add check number to verbose description if not already included
    if (checkNum && !verboseDescription.includes(checkNum)) {
      verboseDescription = verboseDescription ? `${verboseDescription} (${checkNum})` : checkNum;
    }
    
    // Determine transaction type more precisely
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
    
    // Determine initial category and other metadata
    let category = "Uncategorized";
    let subCategory = "";
    let categoryType: "income" | "expense" | "transfer" = "expense";
    
    // Set initial category type based on transaction type
    if (type === TransactionType.CREDIT || type === TransactionType.DEPOSIT || type === TransactionType.INTEREST) {
      categoryType = "income";
    } else if (type === TransactionType.DEBIT || type === TransactionType.CHECK || 
               type === TransactionType.WITHDRAWAL || type === TransactionType.FEE) {
      categoryType = "expense";
    } else if (type === TransactionType.TRANSFER) {
      categoryType = "transfer";
    }
    
    // Apply category pattern matching for initial categorization
    for (const { pattern, category: cat, subcategory: subcat } of categoryPatterns) {
      // Check against both the base description and verbose description for better matching
      if (pattern.test(baseDescription) || pattern.test(verboseDescription)) {
        category = cat;
        subCategory = subcat;
        
        // Refine category type based on matched category
        const matchedCategoryHierarchy = categoryHierarchy.find(c => c.name === cat);
        if (matchedCategoryHierarchy) {
          if (matchedCategoryHierarchy.isIncome) categoryType = "income";
          else if (matchedCategoryHierarchy.isExpense) categoryType = "expense";
          else if (matchedCategoryHierarchy.isTransfer) categoryType = "transfer";
        }
        
        break;
      }
    }
    
    // Extract location if available in the description
    let location = "";
    for (const { pattern, extract } of locationPatterns) {
      // Try to match location in both descriptions for better results
      const baseMatch = baseDescription.match(pattern);
      const verboseMatch = verboseDescription.match(pattern);
      const match = baseMatch || verboseMatch;
      
      if (match) {
        location = extract(match);
        break;
      }
    }
    
    // Enhanced check for recurring transactions with expanded pattern matching
    const isRecurring = /monthly|recurring|subscription|bill payment|netflix|spotify|hulu|disney\+|hbo|\bprime\b|anthropic|patreon|gym|fitness|insurance|mortgage|rent|loan payment|utility|phone|internet|cable|service fee/i.test(baseDescription + " " + verboseDescription);
    
    // Parse the date
    const date = parseQBODate(data.DTPOSTED);

    // Generate a unique transaction ID
    // Ensure we use a valid timestamp for the ID
    const timestamp = date && !isNaN(date.getTime()) ? date.getTime() : Date.now();
    const id = data.FITID || `${timestamp}-${amount}-${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      id,
      date,
      amount: Math.abs(amount),
      type,
      name,
      description: baseDescription,
      memo: data.MEMO || "",
      category,
      subCategory,
      location,
      isRecurring,
      payee: name,
      verboseDescription,
      confidence: "low", // Initial confidence is low, Claude will improve this
      categoryType,
      tags: []
    };
  } catch (err) {
    console.error("Error processing transaction data:", err);
    return null;
  }
}

// Create a narrative transaction from a regular transaction with personal context
export function createNarrativeTransaction(
  transaction: Transaction, 
  personalBackground: PersonalBackground | null
): NarrativeTransaction {
  // Default values if no personal background is available
  let userAge = 0;
  let userLocation = "Unknown";

  // Calculate user age and determine location at time of transaction if personal data exists
  if (personalBackground) {
    // Calculate age
    const birthDate = new Date(personalBackground.birthDate);
    const transactionDate = new Date(transaction.date);

    // Validate dates before calculating age
    if (isValidDate(birthDate) && isValidDate(transactionDate)) {
      userAge = transactionDate.getFullYear() - birthDate.getFullYear();

      // Adjust age if birthday hasn't occurred yet in the transaction year
      const hasBirthdayOccurred =
        transactionDate.getMonth() > birthDate.getMonth() ||
        (transactionDate.getMonth() === birthDate.getMonth() &&
         transactionDate.getDate() >= birthDate.getDate());

      if (!hasBirthdayOccurred) {
        userAge--;
      }
    }
    
    // Find location at time of transaction
    const sortedLocations = [...personalBackground.locations].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    
    for (const loc of sortedLocations) {
      const locationStart = new Date(loc.startDate);
      const locationEnd = loc.endDate ? new Date(loc.endDate) : null;
      
      if (locationStart <= transactionDate && 
          (!locationEnd || locationEnd >= transactionDate)) {
        userLocation = loc.location;
        break;
      }
    }
  }
  
  // Determine time of day from transaction date
  const timeOfDay = determineTimeOfDay(transaction.date.toString());
  
  // Generate initial narrative sentence based on transaction type and other details
  let narrative = "";
  const userName = personalBackground?.name || "User";
  
  if (transaction.categoryType === "income") {
    narrative = `${userName} received ${transaction.amount.toFixed(2)} from ${transaction.name || "an unknown source"}`;
  } else if (transaction.categoryType === "expense") {
    narrative = `${userName} spent ${transaction.amount.toFixed(2)} at ${transaction.name || "an unknown vendor"}`;
  } else {
    narrative = `${userName} transferred ${transaction.amount.toFixed(2)} involving ${transaction.name || "an account"}`;
  }
  
  // Initial determination of whether this transaction is notable (to be enhanced by Claude)
  const isNotable = transaction.amount > 1000 || transaction.isRecurring;
  
  return {
    ...transaction,
    narrative,
    timeOfDay,
    userAge,
    userLocation,
    lifestyleTags: [], // To be filled by Claude
    transactionTags: transaction.tags || [],
    lifeContext: "", // To be filled by Claude
    isNotable,
    relatedFactoids: [],
    majorCategory: transaction.category || "Uncategorized",
    minorCategory: transaction.subCategory || "",
    vendor: transaction.name || transaction.payee || ""
  };
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
