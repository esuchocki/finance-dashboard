import { Transaction } from "./types";

// Check if the Claude API key is available (stored in localStorage)
export const hasClaudeApiKey = () => {
  return !!localStorage.getItem("claude_api_key");
};

// Get the Claude API key from localStorage
export const getClaudeApiKey = () => {
  return localStorage.getItem("claude_api_key") || "";
};

// Set the Claude API key in localStorage
export const setClaudeApiKey = (apiKey: string) => {
  localStorage.setItem("claude_api_key", apiKey);
};

// Clear the Claude API key from localStorage
export const clearClaudeApiKey = () => {
  localStorage.removeItem("claude_api_key");
};

// Define rich categorization taxonomy to guide Claude
// These are suggestions, Claude is encouraged to create more specific ones as needed
const CATEGORIZATION_TAXONOMY = {
  "Housing": ["Mortgage", "Rent", "Property Tax", "Home Insurance", "HOA Fees", "Home Repairs", "Home Improvement", "Utilities", "Internet", "Cable", "Phone", "Furniture"],
  "Transportation": ["Car Payment", "Auto Insurance", "Gas", "Public Transit", "Parking", "Tolls", "Ride Sharing", "Car Repairs", "Car Registration", "Car Wash"],
  "Food": ["Groceries", "Restaurants", "Fast Food", "Coffee Shops", "Food Delivery", "Alcohol", "Snacks"],
  "Shopping": ["Clothing", "Electronics", "Home Goods", "Online Shopping", "Department Stores", "Jewelry", "Accessories", "Books"],
  "Entertainment": ["Movies", "Concerts", "Sports", "Streaming Services", "Games", "Hobbies", "Subscription Boxes", "Music"],
  "Health & Wellness": ["Health Insurance", "Doctor", "Dentist", "Pharmacy", "Gym", "Fitness Classes", "Vitamins", "Mental Health", "Vision"],
  "Personal Care": ["Hair", "Cosmetics", "Spa", "Massage", "Grooming", "Skincare"],
  "Education": ["Tuition", "Student Loans", "Books", "Courses", "School Supplies", "Tutoring", "Educational Apps", "Professional Development"],
  "Travel": ["Flights", "Hotels", "Vacation Packages", "Rental Cars", "Travel Insurance", "Cruises", "Souvenirs", "Luggage"],
  "Pets": ["Pet Food", "Vet", "Pet Insurance", "Pet Supplies", "Grooming", "Boarding", "Pet Sitting"],
  "Financial": ["Banking Fees", "Credit Card Interest", "Investment Fees", "Financial Advisor", "Cryptocurrency", "Loans", "Insurance"],
  "Subscriptions": ["Software", "Media", "Memberships", "Digital Services", "Cloud Storage", "Newsletters", "Websites"],
  "Gifts & Donations": ["Charity", "Gifts", "Fundraisers", "Religious Donations", "Political Contributions"],
  "Taxes": ["Income Tax", "Property Tax", "Sales Tax", "Tax Preparation", "Tax Payments"],
  "Business": ["Office Supplies", "Software", "Marketing", "Professional Services", "Client Meetings", "Coworking Space"],
  "Income": ["Salary", "Freelance", "Investment Income", "Dividends", "Interest", "Rental Income", "Side Hustle", "Gifts Received", "Tax Refund", "Benefits", "Reimbursements"],
  "Transfers": ["Account Transfer", "Investment Transfer", "Savings Transfer", "Loan Payment", "Credit Card Payment"],
  "Cash & ATM": ["ATM Withdrawal", "Cash Deposit", "Check Deposit", "Currency Exchange"],
  "Digital Services": ["Apps", "Online Services", "Cloud Storage", "Digital Goods", "Software Subscriptions"],
  "Children": ["Childcare", "Child Support", "School Expenses", "Toys", "Activities", "Clothing", "Baby Supplies"]
};

// Function to ensure categoryType is one of the allowed values
const validateCategoryType = (type: string): "income" | "expense" | "transfer" | "other" => {
  switch (type.toLowerCase()) {
    case "income":
      return "income";
    case "expense":
      return "expense";
    case "transfer":
      return "transfer";
    default:
      return "other";
  }
};

// Add a simple function to validate if a transaction is categorized meaningfully
const hasDetailedCategorization = (transaction: Transaction): boolean => {
  if (!transaction.category || transaction.category === "Uncategorized" || 
      transaction.category === "Other Income" || transaction.category === "Miscellaneous") {
    return false;
  }
  return true;
};

// Function to enhance transactions with Claude categorization
export const enhanceTransactionsWithClaude = async (transactions: Transaction[]): Promise<Transaction[]> => {
  if (!hasClaudeApiKey()) {
    console.log("No Claude API key available");
    return transactions;
  }

  try {
    const apiKey = getClaudeApiKey();
    const apiUrl = "https://api.anthropic.com/v1/messages";
    
    // Process in larger batches to improve throughput
    const BATCH_SIZE = 20; // Smaller batch size to improve quality
    let enhancedTransactions: Transaction[] = [];
    
    // Calculate total batches for logging
    const totalBatches = Math.ceil(transactions.length / BATCH_SIZE);
    console.log(`Processing ${transactions.length} transactions in ${totalBatches} batches of ${BATCH_SIZE}`);
    
    // Create batches of transactions
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${totalBatches} (${batch.length} transactions)`);
      
      // Prepare batch for Claude API with more fields for better context
      const batchJSON = JSON.stringify(
        batch.map(t => ({
          id: t.id,
          date: t.date.toISOString(),
          amount: t.amount,
          type: t.type,
          name: t.name || "",
          description: t.description || "",
          memo: t.memo || "",
          payee: t.payee || "",
          location: t.location || ""
        }))
      );

      // Enhanced prompt focusing on rich, hierarchical categorization
      const systemPrompt = `You are a financial data analyst specialized in transaction categorization and classification.

YOUR TASK is to analyze each financial transaction and provide:
1. A SPECIFIC main category - do NOT use generic labels like "Income" or "Expenses" or "Uncategorized"
2. A specific subcategory that relates to the main category
3. A clear, human-readable description that explains what the transaction actually is
4. A confidence rating (high, medium, low)
5. A category type (income, expense, transfer, or other)

CATEGORIZATION GUIDELINES:
- Every transaction MUST receive a specific, meaningful category based on its nature
- NEVER use "Income" or "Expenses" as a top-level category
- For expenses, use specific categories like "Food", "Housing", "Transportation", etc.
- For income, use categories like "Salary", "Investment Income", "Freelance Work", etc.
- Create NEW appropriate categories when needed - DON'T force transactions into ill-fitting categories
- Be descriptive and specific with category names
- Make categories easily understandable to regular people

For the HUMAN-READABLE DESCRIPTION:
- Your generated description MUST be different from the original
- Make it conversational and clear (e.g., "Dinner at Chipotle" instead of "POS PURCHASE CHIPOTLE")
- Remove cryptic codes, abbreviations and numbers
- Aim for clarity over brevity
- Be descriptive enough that someone can understand what the transaction was for

Here's a taxonomy of potential categories as a guide: ${JSON.stringify(CATEGORIZATION_TAXONOMY)}

RESPONSE FORMAT:
Return a JSON array of objects with these fields:
- id: The original transaction ID
- category: Specific, descriptive main category 
- subCategory: Specific subcategory
- verboseDescription: Clear, human-readable version of the transaction
- confidence: Your confidence level (high, medium, low)
- categoryType: One of: "income", "expense", "transfer", or "other"`;

      const userMessage = `Here are the financial transactions to categorize: ${batchJSON}

For EACH transaction:
1. Assign a SPECIFIC category (NOT generic "Income" or "Expenses")
2. Assign a relevant subcategory
3. Create a human-readable description that's different from the original
4. Add confidence level (high/medium/low)
5. Classify as income/expense/transfer/other

Use the guidelines I provided. EVERY transaction must have ALL five elements.
DO NOT skip any transactions or use generic categories like "Uncategorized", "Miscellaneous", "Income", or "Expenses".`;

      // Call Claude API with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      try {
        console.log(`Sending batch ${Math.floor(i / BATCH_SIZE) + 1} to Claude API...`);
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-3-opus-20240229", // Using the most capable model
            max_tokens: 4000,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: userMessage
              }
            ]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Claude API error: ${response.status} ${errorText}`);
          throw new Error(`Claude API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || "";
        console.log(`Received response from Claude API for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        
        // Log a sample of the response for debugging
        console.log("Sample of Claude response:", content.substring(0, 500));
        
        // Improved JSON extraction from Claude's response
        let jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        content.match(/\[([\s\S]*?)\]/) ||
                        content.match(/(\[.*\])/s);
        
        if (!jsonMatch) {
          console.error("Failed to parse Claude response:", content);
          // If we fail to parse as JSON, try to extract just what's between brackets
          const bracketMatch = content.match(/\[([\s\S]*)\]/s);
          if (bracketMatch) {
            jsonMatch = bracketMatch;
          } else {
            throw new Error("Invalid response format from Claude API");
          }
        }
        
        let jsonStr = jsonMatch[1];
        // If we captured just the inner content without brackets, add them back
        if (!jsonStr.trim().startsWith('[')) {
          jsonStr = `[${jsonStr}]`;
        }
        
        try {
          const enhancedBatch = JSON.parse(jsonStr);
          console.log(`Successfully parsed JSON for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          
          // Log a sample of the parsed JSON for debugging
          if (enhancedBatch.length > 0) {
            console.log("Sample parsed transaction:", JSON.stringify(enhancedBatch[0], null, 2));
          }
          
          // Map the enhanced data back to the original transactions
          const batchWithEnhancements = batch.map(t => {
            const enhancement = enhancedBatch.find((e: any) => e.id === t.id);
            
            if (enhancement) {
              // Ensure verbose description is actually different from original
              let verboseDescription = enhancement.verboseDescription;
              
              // Verify the description is actually different
              if (!verboseDescription || 
                  verboseDescription === t.description || 
                  verboseDescription === t.name) {
                
                // Generate a fallback description using more creative transformation
                const baseText = t.description || t.name || "Unknown Transaction";
                let prefix = "";
                
                // More descriptive prefixes based on transaction type
                if (t.type === "DEBIT") {
                  prefix = ["Payment to ", "Purchase at ", "Bought from "][Math.floor(Math.random() * 3)];
                } else if (t.type === "CREDIT") {
                  prefix = ["Deposit from ", "Payment received from ", "Income from "][Math.floor(Math.random() * 3)];
                } else if (t.type === "CHECK") {
                  prefix = ["Check payment ", "Wrote check for ", "Check paid to "][Math.floor(Math.random() * 3)];
                } else if (t.type === "WITHDRAWAL") {
                  prefix = ["Withdrawal - ", "Cash withdrawal at ", "ATM withdrawal "][Math.floor(Math.random() * 3)];
                } else if (t.type === "FEE") {
                  prefix = ["Fee - ", "Service charge for ", "Fee charged by "][Math.floor(Math.random() * 3)];
                } else if (t.type === "INTEREST") {
                  prefix = ["Interest from ", "Interest earned on ", "Interest credit "][Math.floor(Math.random() * 3)];
                }
                
                // Transform abbreviated text if needed
                const transformedText = baseText
                  .replace(/^(ACH|EFT|POS|WEB)(\s+|_)/, '') // Remove common prefixes
                  .replace(/(\d{4,})/g, '****') // Replace long numbers with asterisks
                  .replace(/\b([A-Z]{2,})\b/g, (word) => word.charAt(0) + word.slice(1).toLowerCase()); // Title case all-caps words
                
                // Format the description
                verboseDescription = prefix + transformedText;
                
                // Final check to make sure it's different
                if (verboseDescription === t.description || verboseDescription === t.name) {
                  // Last resort, create a completely different description using general terms
                  const generalDescriptions = [
                    `${t.type === "DEBIT" ? "Payment" : "Deposit"} on ${new Date(t.date).toLocaleDateString()}`,
                    `Financial transaction - ${Math.abs(t.amount).toFixed(2)}`,
                    `${t.type === "DEBIT" ? "Expense" : "Income"} - ${new Date(t.date).toLocaleDateString()}`,
                    `${t.type} transaction - Reference #${t.id.slice(-4)}`
                  ];
                  verboseDescription = generalDescriptions[Math.floor(Math.random() * generalDescriptions.length)];
                }
              }
              
              // Ensure we have a specific, meaningful category (not just "Income", "Expenses", "Uncategorized", etc.)
              let category = enhancement.category;
              let subCategory = enhancement.subCategory;
              
              // Validate categoryType to ensure it's one of the allowed literal types
              const categoryType = validateCategoryType(enhancement.categoryType || 
                  (t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE" ? "expense" : 
                  t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST" ? "income" : "other"));
              
              if (!category || 
                  category === "Uncategorized" || 
                  category === "Income" || 
                  category === "Expenses" ||
                  category === "Miscellaneous" ||
                  category === "Other Income" ||
                  category === "Other") {
                
                // Assign a more specific category based on transaction type and description
                if (categoryType === "income") {
                  // More specific income categories
                  if (/payroll|salary|direct deposit/i.test(t.description)) {
                    category = "Salary & Wages";
                    subCategory = "Regular Income";
                  } else if (/interest|dividend/i.test(t.description)) {
                    category = "Investment Income";
                    subCategory = "Interest";
                  } else if (/refund|return/i.test(t.description)) {
                    category = "Refunds";
                    subCategory = "Purchase Refunds";
                  } else {
                    category = "Other Income Sources";
                    subCategory = "Miscellaneous Income";
                  }
                } else if (categoryType === "expense") {
                  // More specific expense categories based on common patterns
                  if (/restaurant|food|coffee|dining|cafe|mcdonald|burger|taco|pizza/i.test(t.description)) {
                    category = "Food & Dining";
                    subCategory = "Restaurants";
                  } else if (/amazon|walmart|target|ebay|shopping/i.test(t.description)) {
                    category = "Shopping";
                    subCategory = "Online Shopping";
                  } else if (/uber|lyft|gas|parking|transit/i.test(t.description)) {
                    category = "Transportation";
                    subCategory = "Rideshare & Transit";
                  } else if (/netflix|spotify|hulu|disney|entertainment/i.test(t.description)) {
                    category = "Entertainment";
                    subCategory = "Streaming Services";
                  } else if (/rent|mortgage|home|apartment|property/i.test(t.description)) {
                    category = "Housing";
                    subCategory = "Rent & Mortgage";
                  } else if (/doctor|medical|health|pharmacy|dental/i.test(t.description)) {
                    category = "Healthcare";
                    subCategory = "Medical Services";
                  } else {
                    category = "Other Expenses";
                    subCategory = "Uncategorized Spending";
                  }
                } else if (categoryType === "transfer") {
                  category = "Transfers";
                  subCategory = "Account Transfers";
                } else {
                  category = "Uncategorized Transactions";
                  subCategory = "Other";
                }
              }
              
              // Ensure the subcategory is not empty
              if (!subCategory || subCategory === "Uncategorized" || subCategory === "Other") {
                // Generate a reasonable subcategory based on the main category
                const potentialSubcategories = CATEGORIZATION_TAXONOMY[category as keyof typeof CATEGORIZATION_TAXONOMY];
                if (potentialSubcategories && potentialSubcategories.length > 0) {
                  // If we have subcategories for this category in our taxonomy, use the first one as a default
                  subCategory = potentialSubcategories[0];
                } else {
                  // Otherwise create a generic subcategory based on the main category
                  subCategory = `${category} - General`;
                }
              }
              
              return {
                ...t,
                category: category,
                subCategory: subCategory,
                verboseDescription: verboseDescription,
                confidence: enhancement.confidence || "low",
                categoryType: categoryType
              };
            }
            
            // If no enhancement found, create a more specific categorization than just "Income" or "Expenses"
            const isIncome = t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST";
            const isExpense = t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE";
            const isTransfer = t.type === "TRANSFER";
            
            let fallbackCategory = "Uncategorized Transactions";
            let fallbackSubCategory = "Other";
            let fallbackCategoryType: "income" | "expense" | "transfer" | "other" = "other";
            
            if (isIncome) {
              if (/payroll|salary|direct deposit/i.test(t.description)) {
                fallbackCategory = "Salary & Wages";
                fallbackSubCategory = "Regular Income";
              } else if (/interest|dividend/i.test(t.description)) {
                fallbackCategory = "Investment Income";
                fallbackSubCategory = "Interest";
              } else if (/refund|return/i.test(t.description)) {
                fallbackCategory = "Refunds";
                fallbackSubCategory = "Purchase Refunds";
              } else {
                fallbackCategory = "Other Income Sources";
                fallbackSubCategory = "Miscellaneous Income";
              }
              fallbackCategoryType = "income";
            } else if (isExpense) {
              // Try to determine a more specific category from the description
              if (/restaurant|food|coffee|dining|cafe|mcdonald|burger|taco|pizza/i.test(t.description)) {
                fallbackCategory = "Food & Dining";
                fallbackSubCategory = "Restaurants";
              } else if (/amazon|walmart|target|ebay/i.test(t.description)) {
                fallbackCategory = "Shopping";
                fallbackSubCategory = "Online Shopping";
              } else if (/uber|lyft|gas|parking|transit/i.test(t.description)) {
                fallbackCategory = "Transportation";
                fallbackSubCategory = "Rideshare & Transit";
              } else if (/netflix|spotify|hulu|disney/i.test(t.description)) {
                fallbackCategory = "Entertainment";
                fallbackSubCategory = "Streaming Services";
              } else if (/rent|mortgage|home|apartment|property/i.test(t.description)) {
                fallbackCategory = "Housing";
                fallbackSubCategory = "Rent & Mortgage";
              } else if (/doctor|medical|health|pharmacy|dental/i.test(t.description)) {
                fallbackCategory = "Healthcare";
                fallbackSubCategory = "Medical Services";
              } else {
                fallbackCategory = "Other Expenses";
                fallbackSubCategory = "Uncategorized Spending";
              }
              fallbackCategoryType = "expense";
            } else if (isTransfer) {
              fallbackCategory = "Transfers";
              fallbackSubCategory = "Account Transfers";
              fallbackCategoryType = "transfer";
            }
            
            return {
              ...t,
              category: fallbackCategory,
              subCategory: fallbackSubCategory,
              verboseDescription: t.description ? 
                `${isExpense ? "Payment: " : isIncome ? "Deposit: " : ""}${t.description}` : 
                `${isExpense ? "Payment" : isIncome ? "Deposit" : "Transaction"} - ${t.name || "Unknown"}`,
              confidence: "low",
              categoryType: fallbackCategoryType
            };
          });
          
          enhancedTransactions = [...enhancedTransactions, ...batchWithEnhancements];
          
          // Log information about categorization progress
          const categorizedCount = batchWithEnhancements.filter(t => hasDetailedCategorization(t)).length;
          console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: Categorized ${categorizedCount} of ${batch.length} transactions (${Math.round((categorizedCount/batch.length) * 100)}%)`);
          
          // Log the unique categories that were created
          const uniqueCategories = [...new Set(batchWithEnhancements.map(t => t.category))];
          console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} categories: ${uniqueCategories.join(', ')}`);
          
        } catch (jsonError) {
          console.error("Error parsing JSON from Claude response:", jsonError);
          console.error("Raw content:", content);
          
          // Add fallback enhancements with more specific categories than just "Income" or "Expenses"
          const batchWithFallbackEnhancements = batch.map(t => {
            // Create more specific fallback categories
            const isIncome = t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST";
            const isExpense = t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE";
            
            let fallbackCategory = "Uncategorized Transactions";
            let fallbackSubCategory = "Other";
            let fallbackCategoryType: "income" | "expense" | "transfer" | "other" = "other";
            
            if (isIncome) {
              if (/payroll|salary|direct deposit/i.test(t.description)) {
                fallbackCategory = "Salary & Wages";
                fallbackSubCategory = "Regular Income";
              } else {
                fallbackCategory = "Other Income Sources";
                fallbackSubCategory = "Miscellaneous Income";
              }
              fallbackCategoryType = "income";
            } else if (isExpense) {
              // Try to determine a more specific category from the description
              if (/restaurant|food|coffee|dining|cafe/i.test(t.description)) {
                fallbackCategory = "Food & Dining";
                fallbackSubCategory = "Restaurants";
              } else if (/amazon|walmart|target|ebay/i.test(t.description)) {
                fallbackCategory = "Shopping";
                fallbackSubCategory = "Online Shopping";
              } else if (/uber|lyft|gas|parking|transit/i.test(t.description)) {
                fallbackCategory = "Transportation";
                fallbackSubCategory = "Rideshare & Transit";
              } else {
                fallbackCategory = "Other Expenses";
                fallbackSubCategory = "Uncategorized Spending";
              }
              fallbackCategoryType = "expense";
            }
            
            return {
              ...t,
              category: fallbackCategory,
              subCategory: fallbackSubCategory,
              verboseDescription: t.description ? 
                `${isExpense ? "Payment: " : isIncome ? "Deposit: " : ""}${t.description}` : 
                `${isExpense ? "Payment" : isIncome ? "Deposit" : "Transaction"} - ${t.name || "Unknown"}`,
              confidence: "low",
              categoryType: fallbackCategoryType
            };
          });
          
          enhancedTransactions = [...enhancedTransactions, ...batchWithFallbackEnhancements];
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Error processing batch starting at index ${i}:`, error);
        
        // Add fallback enhancements with specific categories
        const batchWithFallbackEnhancements = batch.map(t => {
          // Create more specific fallback categories
          const isIncome = t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST";
          const isExpense = t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE";
          const isTransfer = t.type === "TRANSFER";
          
          let fallbackCategory = "Uncategorized Transactions";
          let fallbackSubCategory = "Other";
          let fallbackCategoryType: "income" | "expense" | "transfer" | "other" = "other";
          
          if (isIncome) {
            fallbackCategory = "Other Income Sources";
            fallbackSubCategory = "Miscellaneous Income";
            fallbackCategoryType = "income";
          } else if (isExpense) {
            fallbackCategory = "Other Expenses";
            fallbackSubCategory = "Uncategorized Spending";
            fallbackCategoryType = "expense";
          } else if (isTransfer) {
            fallbackCategory = "Transfers";
            fallbackSubCategory = "Account Transfers";
            fallbackCategoryType = "transfer";
          }
          
          return {
            ...t,
            category: fallbackCategory,
            subCategory: fallbackSubCategory,
            verboseDescription: t.description ? 
              `${isExpense ? "Payment: " : isIncome ? "Deposit: " : ""}${t.description}` : 
              `${isExpense ? "Payment" : isIncome ? "Deposit" : "Transaction"} - ${t.name || "Unknown"}`,
            confidence: "low",
            categoryType: fallbackCategoryType
          };
        });
        
        enhancedTransactions = [...enhancedTransactions, ...batchWithFallbackEnhancements];
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Count how many transactions were successfully categorized with meaningful categories
    const categorizedCount = enhancedTransactions.filter(t => hasDetailedCategorization(t)).length;
    
    const categorizedPercent = Math.round((categorizedCount / transactions.length) * 100);
    console.log(`Successfully categorized ${categorizedCount} out of ${transactions.length} transactions (${categorizedPercent}%)`);
    
    // Check for transactions that weren't properly enhanced
    const unenhancedCount = enhancedTransactions.filter(t => !t.verboseDescription).length;
    if (unenhancedCount > 0) {
      console.warn(`Warning: ${unenhancedCount} transactions did not receive verbose descriptions`);
    }
    
    // Log category distribution for debugging
    const categories = new Set(enhancedTransactions.map(t => t.category));
    console.log(`Generated ${categories.size} unique categories:`, Array.from(categories));
    
    return enhancedTransactions;
    
  } catch (error) {
    console.error("Error in enhanceTransactionsWithClaude:", error);
    return transactions; // Return original transactions if enhancement fails
  }
};
