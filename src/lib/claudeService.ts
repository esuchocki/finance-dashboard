
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

// Define predefined categories to guide Claude
const PREDEFINED_CATEGORIES = {
  Income: [
    "Salary", "Freelance", "Investments", "Dividends", "Rental", "Business", "Gifts", "Tax Refund", "Other Income"
  ],
  Expenses: [
    "Food", "Groceries", "Dining", "Housing", "Rent", "Mortgage", "Utilities", "Transportation", 
    "Car", "Public Transit", "Entertainment", "Shopping", "Healthcare", "Insurance", "Personal", 
    "Education", "Travel", "Finance", "Debt", "Savings", "Business", "Donations", "Childcare"
  ]
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
    const BATCH_SIZE = 50; // Using a large batch size for better throughput
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

      // Enhanced prompt focusing on dynamic categorization and distinct descriptions
      const systemPrompt = `You are a financial data analysis AI specializing in transaction categorization and description enhancement.
      
YOUR MOST CRITICAL TASK is to process EVERY transaction in the input. Each transaction MUST receive:
1. A main category
2. A specific subcategory 
3. A much more descriptive, human-readable version of the transaction name/description that is COMPLETELY DIFFERENT from the original
4. A confidence rating (high, medium, low)

PROCESS 100% OF TRANSACTIONS, even if your confidence is low. It's better to make an educated guess than to skip categorization.

Use these predefined categories as a guide: ${JSON.stringify(PREDEFINED_CATEGORIES)}

IMPORTANTLY: If a transaction clearly doesn't fit the predefined categories, CREATE A NEW APPROPRIATE CATEGORY. Take a dynamic approach where you can iteratively create new categories as needed.

Consider when categories should be hierarchical (using main category + subcategory) versus creating entirely new categories. For example:
- If you see "Amazon" transactions, use "Shopping" as main category and "Online Shopping" as subcategory
- If you see "Uber" or "Lyft", use "Transportation" as main category and "Rideshare" as subcategory
- But if you see many pet-related expenses, create a new main category "Pets" with appropriate subcategories

Rules for categorization:
- CRITICAL: Process and categorize EVERY transaction in the input. None should be left uncategorized.
- For deposits, paychecks, etc., use "Income" as the main category and appropriate subcategories
- For transactions with negative values, categorize based on the spending type
- Be specific with subcategories, but keep them general enough to be useful for grouping
- Never use "Uncategorized" unless absolutely necessary
- Use clues from all available fields: name, description, memo, amount, date, etc.
- For businesses, determine what type of business it likely is, even with minimal data
- For recurring transactions to the same payee, maintain consistent categorization

For the verbose description (THIS IS THE MOST IMPORTANT PART):
- NEVER return the original description unchanged - always create a completely new human-readable version
- Create a clear, human-readable description that explains what the transaction actually is
- The verbose description MUST be noticeably different from the original description
- Use multiple strategies to deduce what the transaction is:
  1. Business name recognition (identify common merchants, "AMZN" → "Amazon")
  2. Pattern matching (recognize payment patterns like "ACH" for direct deposits)
  3. Context from transaction amount (large amounts may be rent/mortgage, small amounts may be coffee shops)
  4. Context from memo field (contains valuable information about purpose)
  5. Location data if available (city/state can help identify local businesses)
  6. Industry knowledge about common transaction format patterns
  7. Seasonality and timing (holiday-related purchases in December, etc.)
- Examples of good verbose descriptions:
  - "CHECK #123" → "Check Payment #123"
  - "AMZN MKTP US*1234" → "Amazon Marketplace Purchase"
  - "STARBUCKS STORE #1234" → "Starbucks Coffee"
  - "ACH DEPOSIT PAYROLL 123456" → "Salary Deposit from Employer"
  - "POS PURCHASE KROGER #1234" → "Groceries at Kroger"
  - "POS DEBIT SPOTIFY USA" → "Spotify Monthly Subscription"
  - "VENMO PAYMENT 1234567890" → "Venmo Payment"
  - "DEBIT PURCHASE VISA ONLINE PMT" → "Credit Card Payment"
  - "POS PURCHASE TARGET 12345" → "Target Shopping"
  - "ACH DEBIT INSURANCE PREMIUM" → "Insurance Premium Payment"
- Remove cryptic codes, abbreviations and numbers while keeping informative details
- Make it conversational and human-readable ("Dinner at Chipotle" instead of "POS PURCHASE CHIPOTLE 092310")
- Keep it concise - ideally under 40 characters
- NEVER return the exact same string as the original description or name - always make it more readable

Return a JSON array of objects with these fields:
- id: The original transaction ID
- category: The main category (use your judgment to create new ones if needed)
- subCategory: The specific subcategory
- verboseDescription: A clearer, more human-readable version of the transaction that is DIFFERENT from the original
- confidence: Your confidence level in this categorization (high, medium, low)`;

      const userMessage = `Here are the transactions to analyze: ${batchJSON}

Please categorize each transaction, determine a subcategory, create a verbose description, and rate your confidence. 
You MUST process EVERY transaction, even if your confidence is low.
The verboseDescription MUST be significantly different from the original - make it truly human-readable.
CRITICAL: Do not return the same description as the original. If you don't know what a transaction is, make your best guess.
If a transaction doesn't fit the predefined categories, feel free to create a NEW appropriate category.`;

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
              
              // Ensure we have a valid category (never use "Uncategorized")
              let category = enhancement.category;
              if (!category || category === "Uncategorized") {
                // Assign a category based on transaction type rather than leaving uncategorized
                if (t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE") {
                  category = "Expenses";
                } else if (t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST") {
                  category = "Income";
                } else {
                  category = "Other";
                }
              }
              
              return {
                ...t,
                category: category,
                subCategory: enhancement.subCategory || "",
                verboseDescription: verboseDescription,
                confidence: enhancement.confidence || "low"
              };
            }
            
            // If no enhancement found, create a basic categorization
            return {
              ...t,
              category: t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE" ? "Expenses" : "Income",
              subCategory: t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE" ? "Other Expenses" : "Other Income",
              verboseDescription: t.description ? 
                `${t.type === "DEBIT" ? "Payment: " : "Deposit: "}${t.description}` : 
                `${t.type === "DEBIT" ? "Payment" : "Deposit"} - ${t.name || "Unknown"}`,
              confidence: "low"
            };
          });
          
          enhancedTransactions = [...enhancedTransactions, ...batchWithEnhancements];
          
          // Log information about categorization progress
          const categorizedCount = batchWithEnhancements.filter(t => t.category && t.category !== "Uncategorized").length;
          console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: Categorized ${categorizedCount} of ${batch.length} transactions (${Math.round((categorizedCount/batch.length) * 100)}%)`);
          
        } catch (jsonError) {
          console.error("Error parsing JSON from Claude response:", jsonError);
          console.error("Raw content:", content);
          
          // Add fallback enhancements to the batch to avoid data loss
          const batchWithFallbackEnhancements = batch.map(t => {
            // Create basic fallback enhancements
            return {
              ...t,
              category: t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE" ? "Expenses" : "Income",
              subCategory: t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE" ? "Other Expenses" : "Other Income",
              verboseDescription: t.description ? 
                `${t.type === "DEBIT" ? "Payment: " : "Deposit: "}${t.description}` : 
                `${t.type === "DEBIT" ? "Payment" : "Deposit"} - ${t.name || "Unknown"}`,
              confidence: "low"
            };
          });
          
          enhancedTransactions = [...enhancedTransactions, ...batchWithFallbackEnhancements];
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Error processing batch starting at index ${i}:`, error);
        
        // Add fallback enhancements to the batch to avoid data loss
        const batchWithFallbackEnhancements = batch.map(t => {
          // Create basic fallback enhancements
          return {
            ...t,
            category: t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE" ? "Expenses" : "Income",
            subCategory: t.type === "DEBIT" || t.type === "WITHDRAWAL" || t.type === "CHECK" || t.type === "FEE" ? "Other Expenses" : "Other Income",
            verboseDescription: t.description ? 
              `${t.type === "DEBIT" ? "Payment: " : "Deposit: "}${t.description}` : 
              `${t.type === "DEBIT" ? "Payment" : "Deposit"} - ${t.name || "Unknown"}`,
            confidence: "low"
          };
        });
        
        enhancedTransactions = [...enhancedTransactions, ...batchWithFallbackEnhancements];
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Count how many transactions were successfully categorized
    const categorizedCount = enhancedTransactions.filter(
      t => t.category && t.category !== "Uncategorized"
    ).length;
    
    const categorizedPercent = Math.round((categorizedCount / transactions.length) * 100);
    console.log(`Successfully categorized ${categorizedCount} out of ${transactions.length} transactions (${categorizedPercent}%)`);
    
    // Check for transactions that weren't properly enhanced
    const unenhancedCount = enhancedTransactions.filter(t => !t.verboseDescription).length;
    if (unenhancedCount > 0) {
      console.warn(`Warning: ${unenhancedCount} transactions did not receive verbose descriptions`);
    }
    
    return enhancedTransactions;
    
  } catch (error) {
    console.error("Error in enhanceTransactionsWithClaude:", error);
    return transactions; // Return original transactions if enhancement fails
  }
};
