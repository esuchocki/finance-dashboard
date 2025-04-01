
import { categoryHierarchy } from './qbo/categoryPatterns';
import { Transaction } from './types';
import { ClaudeEnhancementResponse } from './qbo/types';
import { toast } from "sonner";

// API key storage in localStorage
const CLAUDE_API_KEY_STORAGE_KEY = 'claudeApiKey';

// Check if a Claude API key is available
export const hasClaudeApiKey = (): boolean => {
  return !!localStorage.getItem(CLAUDE_API_KEY_STORAGE_KEY);
};

// Get the stored Claude API key
export const getClaudeApiKey = (): string => {
  return localStorage.getItem(CLAUDE_API_KEY_STORAGE_KEY) || '';
};

// Save the Claude API key
export const saveClaudeApiKey = (apiKey: string): void => {
  localStorage.setItem(CLAUDE_API_KEY_STORAGE_KEY, apiKey);
};

// Clear the Claude API key
export const clearClaudeApiKey = (): void => {
  localStorage.removeItem(CLAUDE_API_KEY_STORAGE_KEY);
};

// Enhanced function to categorize transactions using Claude API
export const enhanceTransactionsWithClaude = async (transactions: Transaction[]): Promise<Transaction[]> => {
  if (!hasClaudeApiKey()) {
    console.warn("No Claude API key available. Skipping transaction enhancement.");
    return transactions;
  }

  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    throw new Error("Claude API key is required for transaction enhancement");
  }

  // Process in batches of 50 transactions to avoid overwhelming the API
  const batchSize = 50;
  const batches = [];
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    batches.push(transactions.slice(i, i + batchSize));
  }
  
  console.log(`Processing ${transactions.length} transactions in ${batches.length} batches`);
  
  let enhancedTransactions: Transaction[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      console.log(`Processing batch ${i + 1} of ${batches.length} (${batch.length} transactions)`);
      
      // Show toast for large batches
      if (batches.length > 2 && i === 0) {
        toast.info(`Enhancing transactions with Claude AI (batch ${i + 1}/${batches.length})`, {
          description: "This process may take a few moments for each batch"
        });
      }
      
      const batchResult = await enhanceTransactionBatch(batch, apiKey);
      enhancedTransactions = [...enhancedTransactions, ...batchResult];
      
      // Update toast for progress on large batches
      if (batches.length > 2 && i < batches.length - 1) {
        toast.info(`Processing transaction batch ${i + 2}/${batches.length}`, {
          description: `${Math.round(((i + 1) / batches.length) * 100)}% complete`
        });
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error processing batch ${i + 1}:`, error);
      // If a batch fails, we'll still return the transactions we've processed so far
      // plus the original transactions from the failed batch
      enhancedTransactions = [...enhancedTransactions, ...batch];
    }
  }
  
  return enhancedTransactions;
};

// Function to enhance a batch of transactions
const enhanceTransactionBatch = async (transactions: Transaction[], apiKey: string): Promise<Transaction[]> => {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  try {
    // Prepare transaction data for Claude with MORE DETAILED information
    const transactionData = transactions.map(t => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0], // Just the date portion
      amount: t.amount,
      type: t.type,
      description: t.description || '',
      memo: t.memo || '',
      name: t.name || '',
      payee: t.payee || '',
      verboseDescription: t.verboseDescription || '',
      isRecurring: t.isRecurring || false,
      // Include these to help Claude understand current categorization attempts
      currentCategory: t.category || 'Uncategorized',
      currentSubCategory: t.subCategory || '',
      // Adding more context about transaction types
      isDebit: ['DEBIT', 'CHECK', 'WITHDRAWAL', 'FEE'].includes(t.type),
      isCredit: ['CREDIT', 'DEPOSIT', 'INTEREST'].includes(t.type),
      isTransfer: t.type === 'TRANSFER'
    }));

    // Create a richer prompt for Claude with detailed instructions, examples and context
    const prompt = `
You are a FINANCIAL EXPERT CATEGORIZATION SYSTEM tasked with accurately categorizing financial transactions into precise categories and subcategories.

Your task is to analyze each transaction in detail, examining its:
- Description, memo, and name fields
- Transaction type (DEBIT, CREDIT, etc.)
- Amount
- Whether it's recurring
- Any merchant patterns, keywords, or contextual clues

## CATEGORIZATION STRUCTURE

Here is the EXACT category hierarchy you MUST use. DO NOT CREATE NEW CATEGORIES:
${JSON.stringify(categoryHierarchy, null, 2)}

## CATEGORIZATION RULES - READ THESE CAREFULLY:

1. ALWAYS assign a category from the provided hierarchy - NEVER invent new categories
2. Choose the MOST SPECIFIC subcategory possible within each main category
3. For transactions like "AMAZON" or "PAYPAL", look at the description/memo for clues about what was purchased
4. For each transaction, determine if it's:
   - INCOME: money received (deposits, credits, payments received)
   - EXPENSE: money spent (purchases, bills, fees)
   - TRANSFER: money moved between accounts (not income or expense)

5. Create a CLEAR, HELPFUL "verboseDescription" that explains what the transaction is in plain English
   - Example: "AMZN MKTP US" → "Amazon purchase: Office supplies"
   - Example: "SLING 9.99" → "Sling TV streaming subscription"
   - Example: "XXXXXX2983 PYMT" → "Credit card payment to account ending in 2983"

6. Assign a confidence level:
   - HIGH: Very clear what the transaction is
   - MEDIUM: Reasonable certainty but some ambiguity
   - LOW: Significant uncertainty about the correct category

## EXAMPLES OF IDEAL CATEGORIZATION:

Example 1:
Input: { "description": "NETFLIX.COM", "amount": 15.99, "type": "DEBIT", "isRecurring": true }
Output: { 
  "category": "Entertainment", 
  "subCategory": "Streaming Services", 
  "verboseDescription": "Netflix monthly subscription", 
  "confidence": "high", 
  "categoryType": "expense" 
}

Example 2:
Input: { "description": "WHOLEFDS LAX 10087", "amount": 82.47, "type": "DEBIT" }
Output: { 
  "category": "Food & Dining", 
  "subCategory": "Groceries", 
  "verboseDescription": "Whole Foods grocery purchase in Los Angeles", 
  "confidence": "high", 
  "categoryType": "expense" 
}

Example 3:
Input: { "description": "VENMO PAYMENT 9583", "memo": "rent", "amount": 1200, "type": "DEBIT" }
Output: { 
  "category": "Housing", 
  "subCategory": "Rent", 
  "verboseDescription": "Rent payment via Venmo", 
  "confidence": "high", 
  "categoryType": "expense" 
}

Example 4:
Input: { "description": "AMZN MKTP US", "amount": 29.99, "type": "DEBIT" }
Output: { 
  "category": "Shopping", 
  "subCategory": "Online Shopping", 
  "verboseDescription": "Amazon marketplace purchase", 
  "confidence": "medium", 
  "categoryType": "expense" 
}

Example 5:
Input: { "description": "ACH DEPOSIT PAYROLL", "amount": 2500, "type": "CREDIT" }
Output: { 
  "category": "Income", 
  "subCategory": "Salary", 
  "verboseDescription": "Payroll direct deposit", 
  "confidence": "high", 
  "categoryType": "income" 
}

Example 6:
Input: { "description": "TRANSFER TO CHECKING", "amount": 500, "type": "WITHDRAWAL" }
Output: { 
  "category": "Transfers", 
  "subCategory": "Account Transfer", 
  "verboseDescription": "Transfer to checking account", 
  "confidence": "high", 
  "categoryType": "transfer" 
}

## TRANSACTIONS TO CATEGORIZE:
${JSON.stringify(transactionData, null, 2)}

Respond with ONLY a valid JSON object containing:
1. An array of transactions with these fields for each:
   - id: The original transaction ID
   - category: The main category (MUST match one from the hierarchy)
   - subCategory: The subcategory (MUST match one from the hierarchy)
   - verboseDescription: A clear, helpful human-readable description
   - confidence: "high", "medium", or "low"
   - categoryType: "income", "expense", "transfer", or "other"

2. A summary object with:
   - categorizedCount: Total number of transactions categorized
   - totalCount: Total number of transactions processed
   - uniqueCategories: Number of unique categories used
   - confidenceDistribution: Counts of high/medium/low confidence categorizations

RETURN ONLY THE JSON OBJECT WITH NO ADDITIONAL TEXT, EXPLANATION OR MARKDOWN.
`;

    // Set up the API call to Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.1, // Lower temperature for more consistent categorization
        system: "You are a financial expert specializing in transaction categorization. Always respond with valid JSON containing categorized transactions matching the provided category hierarchy exactly.",
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log("Claude API response received");

    // Extract the content from Claude's response
    const content = data.content;
    if (!content || !content[0] || !content[0].text) {
      throw new Error("Invalid response format from Claude API");
    }

    // Parse the JSON response from Claude
    const responseText = content[0].text;
    let claudeData: ClaudeEnhancementResponse;
    
    try {
      // Extract JSON from the response (Claude might wrap it in ```json ```)
      let jsonText = responseText;
      if (responseText.includes('```json')) {
        jsonText = responseText.split('```json')[1].split('```')[0].trim();
      } else if (responseText.includes('```')) {
        jsonText = responseText.split('```')[1].split('```')[0].trim();
      }
      
      claudeData = JSON.parse(jsonText);
      
      // Validate that we have a transactions array
      if (!claudeData.transactions || !Array.isArray(claudeData.transactions)) {
        throw new Error("Missing transactions array in Claude response");
      }
      
      // Log the summary data if available
      if (claudeData.summary) {
        console.log("Claude categorization summary:", claudeData.summary);
      }
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);
      console.log("Raw response:", responseText);
      throw new Error(`Failed to parse Claude response: ${parseError.message}`);
    }

    // Analyze the quality of Claude's categorization
    const categorizedTransactions = claudeData.transactions;
    const categorizedCount = categorizedTransactions.length;
    const highConfidenceCount = categorizedTransactions.filter(t => t.confidence === "high").length;
    const mediumConfidenceCount = categorizedTransactions.filter(t => t.confidence === "medium").length;
    const lowConfidenceCount = categorizedTransactions.filter(t => t.confidence === "low").length;
    
    console.log(`Categorized ${categorizedCount} transactions:
      - High confidence: ${highConfidenceCount} (${Math.round((highConfidenceCount/categorizedCount)*100)}%)
      - Medium confidence: ${mediumConfidenceCount} (${Math.round((mediumConfidenceCount/categorizedCount)*100)}%)
      - Low confidence: ${lowConfidenceCount} (${Math.round((lowConfidenceCount/categorizedCount)*100)}%)
    `);

    // Map Claude's enhancements back to the original transactions
    const enhancedTransactions = transactions.map(transaction => {
      // Find the corresponding enhanced transaction from Claude
      const enhancedData = categorizedTransactions.find(t => t.id === transaction.id);
      
      if (enhancedData) {
        // Normalize confidence level to ensure it's one of the allowed values
        let normalizedConfidence: "high" | "medium" | "low" = "low";
        if (enhancedData.confidence === "high") {
          normalizedConfidence = "high";
        } else if (enhancedData.confidence === "medium") {
          normalizedConfidence = "medium";
        }
        
        // Normalize category type
        let normalizedCategoryType: "income" | "expense" | "transfer" = 
          enhancedData.categoryType === "income" ? "income" :
          enhancedData.categoryType === "expense" ? "expense" :
          enhancedData.categoryType === "transfer" ? "transfer" : 
          // Default based on transaction type
          (transaction.type === "CREDIT" || transaction.type === "DEPOSIT") ? "income" :
          (transaction.type === "DEBIT" || transaction.type === "WITHDRAWAL" || transaction.type === "CHECK") ? "expense" :
          transaction.type === "TRANSFER" ? "transfer" : "expense";
        
        // Update the transaction with Claude's enhanced data
        return {
          ...transaction,
          category: enhancedData.category || transaction.category,
          subCategory: enhancedData.subCategory || transaction.subCategory,
          verboseDescription: enhancedData.verboseDescription || transaction.verboseDescription || transaction.description,
          confidence: normalizedConfidence,
          categoryType: normalizedCategoryType
        };
      }
      
      // If Claude didn't return data for this transaction, return it unchanged
      return transaction;
    });

    return enhancedTransactions;
  } catch (error) {
    console.error("Error enhancing transactions with Claude:", error);
    // Instead of failing completely, we'll return the original transactions
    return transactions;
  }
};

// Simplified function for enriching a single transaction (for debugging/testing)
export const enrichSingleTransaction = async (transaction: Transaction): Promise<Transaction | null> => {
  if (!hasClaudeApiKey()) {
    console.warn("No Claude API key available. Skipping transaction enrichment.");
    return transaction;
  }

  try {
    const enriched = await enhanceTransactionsWithClaude([transaction]);
    return enriched[0] || transaction;
  } catch (error) {
    console.error("Error enriching transaction:", error);
    return transaction;
  }
};
