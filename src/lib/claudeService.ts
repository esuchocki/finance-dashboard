
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
    const BATCH_SIZE = 15; // Reduced batch size for more detailed processing
    let enhancedTransactions: Transaction[] = [];
    
    // Create batches of transactions
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(transactions.length / BATCH_SIZE)}`);
      
      // Prepare batch for Claude API
      const batchJSON = JSON.stringify(
        batch.map(t => ({
          id: t.id,
          date: t.date.toISOString(),
          amount: t.amount,
          type: t.type,
          name: t.name,
          description: t.description,
          memo: t.memo,
          payee: t.payee || ""
        }))
      );

      // Enhanced prompt for better categorization and more readable descriptions
      const systemPrompt = `You are a financial data analysis AI specializing in transaction categorization and description enhancement. 
      
Your task is to:
1. Categorize EVERY transaction into a main category
2. Determine a specific subcategory 
3. Provide a much more descriptive, human-readable version of the transaction name/description
4. Rate your confidence in the categorization (high, medium, low)

MOST IMPORTANT: You MUST process ALL transactions in the input. Do not skip any transactions.

Use these predefined categories as a guide: ${JSON.stringify(PREDEFINED_CATEGORIES)}

However, if a transaction clearly belongs to a different category not listed above, create a new appropriate category. Be careful not to over-create categories - try to use existing ones when possible.

Rules for categorization:
- CRITICAL: Process and categorize EVERY transaction in the input. None should be left uncategorized.
- For deposits, paychecks, etc., use "Income" as the main category
- For transactions with negative values, categorize based on the spending type
- Be specific with subcategories, but keep them general enough to be useful for grouping
- Never use "Uncategorized" unless absolutely necessary
- Analyze each transaction's name, description, memo, amount and date for context clues
- For businesses, determine what type of business it is based on name or context clues
- For recurring transactions to the same payee, maintain consistent categorization

For the verbose description (THIS IS THE MOST IMPORTANT PART):
- Create a clear, human-readable description that explains what the transaction actually is
- Use multiple strategies to deduce what the transaction is:
  1. Business name recognition (identify common merchants like "AMZN" as "Amazon")
  2. Pattern matching (recognize payment patterns like "ACH" for direct deposits)
  3. Context from transaction amount (large amounts may be rent/mortgage, small amounts may be coffee shops)
  4. Context from memo field (often contains valuable information about purpose)
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
- Remove cryptic codes, abbreviations and numbers while keeping informative details
- Make it conversational and human-readable ("Dinner at Chipotle" instead of "POS PURCHASE CHIPOTLE 092310")
- Keep it concise - ideally under 40 characters

Return a JSON array of objects with these fields:
- id: The original transaction ID
- category: The main category
- subCategory: The specific subcategory
- verboseDescription: A clearer, more human-readable version of the transaction
- confidence: Your confidence level in this categorization (high, medium, low)`;

      const userMessage = `Here are the transactions to analyze: ${batchJSON}

Please categorize each transaction, determine a subcategory, create a verbose description, and rate your confidence. Remember you MUST process EVERY transaction, even if your confidence is low.`;

      // Call Claude API with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout
      
      try {
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
          throw new Error(`Claude API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || "";
        
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
        
        const enhancedBatch = JSON.parse(jsonStr);
        
        // Map the enhanced data back to the original transactions
        const batchWithEnhancements = batch.map(t => {
          const enhancement = enhancedBatch.find((e: any) => e.id === t.id);
          
          if (enhancement) {
            return {
              ...t,
              category: enhancement.category || t.category || "Uncategorized",
              subCategory: enhancement.subCategory || t.subCategory || "",
              verboseDescription: enhancement.verboseDescription || t.description,
              confidence: enhancement.confidence || "low"
            };
          }
          
          return t;
        });
        
        enhancedTransactions = [...enhancedTransactions, ...batchWithEnhancements];
        
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
    
    console.log(`Successfully categorized ${categorizedCount} out of ${transactions.length} transactions`);
    
    return enhancedTransactions;
    
  } catch (error) {
    console.error("Error in enhanceTransactionsWithClaude:", error);
    return transactions; // Return original transactions if enhancement fails
  }
};
