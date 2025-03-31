
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
    
    // Batch processing to avoid overwhelming the API
    const BATCH_SIZE = 50;
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

      // Create the prompt to analyze the batch
      const systemPrompt = `You are a financial data analysis AI specializing in transaction categorization and description enhancement. 
      
Your task is to:
1. Categorize each transaction into a main category
2. Determine a specific subcategory 
3. Provide a more descriptive/verbose version of the transaction name/description
4. Rate your confidence in the categorization (high, medium, low)

Use these predefined categories as a guide: ${JSON.stringify(PREDEFINED_CATEGORIES)}

However, if a transaction clearly belongs to a different category not listed above, create a new appropriate category. Be careful not to over-create categories - try to use existing ones when possible.

Rules for categorization:
- For deposits, paychecks, etc., use "Income" as the main category
- For transactions with negative values, categorize based on the spending type
- Be specific with subcategories, but keep them general enough to be useful for grouping
- Never use "Uncategorized" unless absolutely necessary
- Analyze each transaction's name, description, memo, and amount for context clues
- For businesses, try to determine what type of business it is based on name, location, or other context
- For recurring transactions to the same payee, maintain consistent categorization

For the verbose description:
- Create a clearer, more informative description that expands the often cryptic transaction names
- Include the business name and what was likely purchased if possible
- For online purchases or subscriptions, identify the service (like "Netflix Subscription" instead of "NETFLIX.COM")
- For transfers or financial transactions, identify the type clearly (like "ATM Withdrawal" or "Credit Card Payment")
- For retail purchases, include the store name and general type (like "Target - Household Items")
- Remove unnecessary codes, abbreviations, or numbers while keeping informative details
- Make it conversational and human-readable (like "Dinner at Chipotle" instead of "POS PURCHASE CHIPOTLE 092310")
- Keep it concise - ideally under 50 characters

Return a JSON array of objects with these fields:
- id: The original transaction ID
- category: The main category
- subCategory: The specific subcategory
- verboseDescription: A clearer, more descriptive version of the transaction
- confidence: Your confidence level in this categorization (high, medium, low)`;

      const userMessage = `Here are the transactions to analyze: ${batchJSON}

Please categorize each transaction, determine a subcategory, create a verbose description, and rate your confidence.`;

      // Call Claude API with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-3-opus-20240229",
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
        
        // Extract JSON from Claude's response
        let jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       content.match(/\[([\s\S]*?)\]/);
        
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
      await new Promise(resolve => setTimeout(resolve, 1000));
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
