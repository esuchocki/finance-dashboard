import { Transaction, TransactionType } from "./types";
import { toast } from "sonner";

interface ClaudeRequestMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

// API endpoint for Claude
const CLAUDE_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-sonnet-20240229";

/**
 * Get the stored Claude API key from localStorage
 */
export const getClaudeApiKey = (): string | null => {
  return localStorage.getItem("claude_api_key");
};

/**
 * Check if a Claude API key is available
 */
export const hasClaudeApiKey = (): boolean => {
  const key = getClaudeApiKey();
  return key !== null && key.trim() !== "";
};

/**
 * Makes a request to Claude API with privacy protections
 * - Batch requests to minimize API calls
 * - Only send necessary transaction data
 * - Remove sensitive transaction details
 */
export const enhanceTransactionsWithClaude = async (
  transactions: Transaction[],
  batchSize = 10
): Promise<Transaction[]> => {
  const apiKey = getClaudeApiKey();
  
  if (!apiKey) {
    console.log("No Claude API key available, skipping enhancement");
    return transactions;
  }
  
  // Show toast to indicate categorization has started
  toast.info("Enhancing transactions with Claude AI...", {
    description: "Categorizing your transactions for better insights",
    duration: 5000
  });
  
  const results: Transaction[] = [];
  let processedCount = 0;
  const totalTransactions = transactions.length;
  
  // Get existing categories from transactions to maintain consistency
  const existingCategories = new Set<string>();
  transactions.forEach(t => {
    if (t.category && t.category !== "Uncategorized") {
      existingCategories.add(t.category);
    }
  });
  
  // Process in batches to reduce API calls
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, Math.min(i + batchSize, transactions.length));
    
    try {
      const enhancedBatch = await processBatchWithClaude(batch, apiKey, Array.from(existingCategories));
      
      // Update existing categories with any new ones from this batch
      enhancedBatch.forEach(t => {
        if (t.category && t.category !== "Uncategorized") {
          existingCategories.add(t.category);
        }
      });
      
      results.push(...enhancedBatch);
      
      // Update progress
      processedCount += batch.length;
      const progress = Math.round((processedCount / totalTransactions) * 100);
      
      if (processedCount % (batchSize * 3) === 0 || processedCount === totalTransactions) {
        toast.info(`Categorizing transactions: ${progress}% complete`, {
          description: `Processed ${processedCount} of ${totalTransactions} transactions`,
          duration: 3000
        });
      }
      
    } catch (error) {
      console.error("Error enhancing transactions with Claude:", error);
      toast.error("Error categorizing some transactions", {
        description: "Falling back to basic categorization for some items"
      });
      // Fall back to original transactions for this batch
      results.push(...batch);
    }
  }
  
  // Count how many got properly categorized
  const categorizedCount = results.filter(t => t.category && t.category !== "Uncategorized").length;
  const categorizedPercent = Math.round((categorizedCount / totalTransactions) * 100);
  
  toast.success(`Transaction categorization complete!`, {
    description: `${categorizedPercent}% of transactions categorized successfully`,
    duration: 5000
  });
  
  console.log("Enhanced transactions with Claude:", results);
  return results;
};

/**
 * Process a batch of transactions with Claude
 */
const processBatchWithClaude = async (
  batch: Transaction[],
  apiKey: string,
  existingCategories: string[] = []
): Promise<Transaction[]> => {
  // Only send minimal transaction data to Claude
  const sanitizedBatch = batch.map(transaction => ({
    description: transaction.description,
    name: transaction.name,
    memo: transaction.memo,
    amount: transaction.amount,
    type: transaction.type,
    date: transaction.date.toISOString().split('T')[0],
  }));
  
  // Build a better prompt that instructs Claude to use existing categories when possible
  // and create new ones when necessary, avoiding "Uncategorized" unless absolutely impossible
  const existingCategoriesText = existingCategories.length > 0 
    ? `Previously used categories in this dataset include: ${existingCategories.join(", ")}.
       Try to use these existing categories when appropriate to maintain consistency, but feel free to 
       create new categories when these don't fit.`
    : "";
  
  const systemPrompt = `
    You are a financial transaction categorization expert. Your job is to analyze financial transactions and provide:
    1. A detailed category hierarchy (main category, subcategory)
    2. The full merchant name when only abbreviations are provided
    3. A determination if this is likely a recurring transaction
    
    ${existingCategoriesText}
    
    Common financial categories include:
    - Housing: Mortgage, Rent, Property Tax, Home Insurance, Home Repairs, Utilities
    - Food: Groceries, Restaurants, Fast Food, Coffee Shops, Food Delivery
    - Transportation: Car Payment, Gas, Public Transit, Rideshare, Car Insurance, Car Maintenance
    - Healthcare: Insurance, Doctor, Pharmacy, Dental, Vision, Therapy
    - Entertainment: Streaming Services, Movies, Events, Hobbies, Subscriptions
    - Shopping: Clothing, Electronics, Household Items, Online Shopping, Department Stores
    - Personal: Grooming, Gym, Education, Gifts, Donations
    - Travel: Flights, Hotels, Rental Cars, Vacation
    - Finance: Credit Card Payment, Loan Payment, Bank Fees, Investments, Savings
    - Income: Salary, Bonus, Interest, Dividends, Refunds
    - Business: Office Supplies, Software, Professional Services
    
    IMPORTANT: NEVER return "Uncategorized" as a category unless it's completely impossible to determine from the transaction details. 
    Make your best informed guess based on transaction name, description and amount.
    
    For subcategories, create hierarchical relationships that make logical sense. For example, "Netflix" should be 
    categorized as "Entertainment > Streaming Services" not as separate categories.
    
    For each transaction, provide a JSON response with the following fields:
    - merchantName: The full merchant name you've identified
    - category: The main category for this transaction (NEVER use "Uncategorized" unless absolutely impossible to determine)
    - subCategory: A more specific subcategory 
    - isRecurring: Whether this appears to be a recurring transaction (true/false)
    - confidence: Your confidence level in this categorization (high, medium, low)
    
    Respond with an array of JSON objects matching the order of transactions provided.
  `;
  
  const userPrompt = `
    Please categorize these financial transactions. For each, provide the full JSON object as specified.
    
    IMPORTANT: Each transaction MUST have a specific category other than "Uncategorized" unless absolutely impossible to determine.
    If you're unsure, make your best guess based on the transaction details.
    
    Transactions:
    ${JSON.stringify(sanitizedBatch, null, 2)}
  `;
  
  try {
    const messages: ClaudeRequestMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
    
    console.log("Sending request to Claude API...");
    
    const response = await fetch(CLAUDE_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        messages,
        max_tokens: 4000,
        temperature: 0.2
      })
    });
    
    if (!response.ok) {
      console.error(`Claude API error: ${response.status}`);
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the results from Claude's response
    const claudeText = data.content[0].text;
    console.log("Claude response:", claudeText);
    
    // Parse the JSON response from Claude
    const jsonStartIndex = claudeText.indexOf('[');
    const jsonEndIndex = claudeText.lastIndexOf(']') + 1;
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      console.error("Could not parse JSON from Claude response");
      throw new Error("Could not parse JSON from Claude response");
    }
    
    const jsonStr = claudeText.substring(jsonStartIndex, jsonEndIndex);
    const claudeResults = JSON.parse(jsonStr);
    console.log("Parsed Claude results:", claudeResults);
    
    // Ensure every result has categories that aren't "Uncategorized"
    const processedResults = claudeResults.map((result: any) => {
      if (!result.category || result.category === "Uncategorized") {
        // Fallback categorization based on transaction type and name
        return {
          ...result,
          category: getFallbackCategory(batch[claudeResults.indexOf(result)])
        };
      }
      return result;
    });
    
    // Merge Claude's insights with the original transactions
    return batch.map((transaction, index) => {
      if (index < processedResults.length) {
        const enhancement = processedResults[index];
        
        return {
          ...transaction,
          payee: enhancement.merchantName || transaction.payee,
          category: enhancement.category || transaction.category || "Other",
          subCategory: enhancement.subCategory || transaction.subCategory || "",
          isRecurring: enhancement.isRecurring || transaction.isRecurring,
          confidence: enhancement.confidence || "medium"
        };
      }
      return transaction;
    });
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return batch; // Return original transactions if API call fails
  }
};

/**
 * Provide a reasonable fallback category when Claude fails to categorize
 */
const getFallbackCategory = (transaction: Transaction): string => {
  const description = (transaction.description || "").toLowerCase();
  const name = (transaction.name || "").toLowerCase();
  const memo = (transaction.memo || "").toLowerCase();
  const type = transaction.type;
  
  // Common patterns for categorization
  if (type === "CREDIT" || type === "DEPOSIT" || type === "INTEREST") {
    if (description.includes("payroll") || description.includes("direct dep") || 
        name.includes("salary") || name.includes("wage")) {
      return "Income";
    }
    return "Income";
  }
  
  // Look for common keywords in the transaction description
  if (description.includes("restaurant") || description.includes("cafe") || 
      description.includes("coffee") || name.includes("food")) {
    return "Food";
  }
  
  if (description.includes("gas") || description.includes("fuel") || 
      description.includes("transit") || description.includes("parking")) {
    return "Transportation";
  }
  
  if (description.includes("doctor") || description.includes("pharmacy") || 
      description.includes("medical") || description.includes("health")) {
    return "Healthcare";
  }
  
  if (description.includes("rent") || description.includes("mortgage") || 
      description.includes("electric") || description.includes("water") ||
      description.includes("utility")) {
    return "Housing";
  }
  
  // Default to "Other" instead of "Uncategorized"
  return "Other";
};

/**
 * Enhanced merchant resolution using Claude
 * This can be called for individual difficult transactions
 */
export const resolveMerchantWithClaude = async (
  transactionDescription: string,
  location: string
): Promise<{ merchantName: string; confidence: string } | null> => {
  const apiKey = getClaudeApiKey();
  
  if (!apiKey) {
    return null;
  }
  
  const systemPrompt = `
    You are a financial transaction merchant identification expert. Your job is to analyze a transaction description and location data to identify the most likely merchant.
    
    For the provided transaction, return a JSON response with:
    - merchantName: The full merchant name you've identified
    - confidence: Your confidence level in this identification (high, medium, low)
  `;
  
  const userPrompt = `
    Please identify the merchant from this transaction description and location.
    
    Transaction: "${transactionDescription}"
    Location: "${location}"
  `;
  
  try {
    const messages: ClaudeRequestMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
    
    const response = await fetch(CLAUDE_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        messages,
        max_tokens: 1000,
        temperature: 0.2
      })
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    const claudeText = data.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = claudeText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Claude response");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error resolving merchant with Claude:", error);
    return null;
  }
};
