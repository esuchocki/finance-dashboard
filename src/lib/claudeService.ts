
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
    
    // Process in smaller batches to get more detailed results
    const BATCH_SIZE = 20; // Increased from 10 to 20 for better throughput
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
          location: t.location || "",
          category: t.category || ""  // Include existing category as context
        }))
      );

      // Enhanced prompt for better categorization and more readable descriptions
      const systemPrompt = `You are a financial data analysis AI specializing in transaction categorization and description enhancement. 
      
YOUR MOST CRITICAL TASK is to process EVERY transaction in the input. Each transaction MUST receive:
1. A main category
2. A specific subcategory 
3. A much more descriptive, human-readable version of the transaction name/description
4. A confidence rating (high, medium, low)

PROCESS 100% OF TRANSACTIONS, even if your confidence is low. It's better to make an educated guess than to skip categorization.

Use these predefined categories as a guide: ${JSON.stringify(PREDEFINED_CATEGORIES)}

However, if a transaction clearly belongs to a different category not listed above, create a new appropriate category. Be careful not to over-create categories - try to use existing ones when possible.

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
- Create a clear, human-readable description that explains what the transaction actually is
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
- NEVER return the exact same string as the original description - always make it more readable

Return a JSON array of objects with these fields:
- id: The original transaction ID
- category: The main category
- subCategory: The specific subcategory
- verboseDescription: A clearer, more human-readable version of the transaction
- confidence: Your confidence level in this categorization (high, medium, low)`;

      const userMessage = `Here are the transactions to analyze: ${batchJSON}

Please categorize each transaction, determine a subcategory, create a verbose description, and rate your confidence. Remember you MUST process EVERY transaction, even if your confidence is low. The verboseDescription should be significantly different from the original - make it truly human-readable.`;

      // Call Claude API with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout
      
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
          throw new Error("Invalid response format from Claude API");
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
              if (verboseDescription === t.description || verboseDescription === t.name) {
                // If Claude returned the same string, try to make it more readable
                if (t.description.toUpperCase() === t.description) {
                  // If all caps, convert to Title Case
                  verboseDescription = t.description.toLowerCase().split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                } else {
                  // Add some context based on transaction type
                  const prefix = t.type === "DEBIT" ? "Payment to " : 
                               t.type === "CREDIT" ? "Deposit from " :
                               t.type === "CHECK" ? "Check payment " : "";
                  verboseDescription = prefix + verboseDescription;
                }
              }
              
              return {
                ...t,
                category: enhancement.category || t.category || "Uncategorized",
                subCategory: enhancement.subCategory || t.subCategory || "",
                verboseDescription: verboseDescription,
                confidence: enhancement.confidence || "low"
              };
            }
            
            return t;
          });
          
          enhancedTransactions = [...enhancedTransactions, ...batchWithEnhancements];
          
          // Log information about categorization progress
          const categorizedCount = batchWithEnhancements.filter(t => t.category && t.category !== "Uncategorized").length;
          console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: Categorized ${categorizedCount} of ${batch.length} transactions (${Math.round((categorizedCount/batch.length) * 100)}%)`);
          
        } catch (jsonError) {
          console.error("Error parsing JSON from Claude response:", jsonError);
          console.error("Raw content:", content);
          // Add the unenhanced batch to the result to avoid data loss
          enhancedTransactions = [...enhancedTransactions, ...batch];
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Error processing batch starting at index ${i}:`, error);
        // Add the unenhanced batch to the result to avoid data loss
        enhancedTransactions = [...enhancedTransactions, ...batch];
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
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
