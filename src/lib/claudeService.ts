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
    // Prepare transaction data for Claude
    const transactionData = transactions.map(t => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0], // Just the date portion
      amount: t.amount,
      type: t.type,
      description: t.description || '',
      memo: t.memo || '',
      name: t.name || '',
      payee: t.payee || '',
      verboseDescription: t.verboseDescription || ''
    }));

    // Create a rich prompt for Claude with detailed instructions and examples
    const prompt = `
You are an expert financial transaction categorizer. You will analyze the following financial transactions and categorize them accurately.
The transactions come from a QBO file (Quickbooks Online) or similar financial export.

Here is the list of available categories and subcategories:
${JSON.stringify(categoryHierarchy, null, 2)}

Each transaction will be enhanced with:
1. A precise category from the provided hierarchy
2. An appropriate subcategory from the same hierarchy
3. A human-readable verbose description that makes the transaction clearer
4. A confidence level (high, medium, low) for the categorization
5. A category type (income, expense, transfer, other)

Rules for categorization:
- Use only categories and subcategories listed in the hierarchy
- For ambiguous transactions, choose the most likely category based on description, amount, and type
- Assign "high" confidence only when you're very sure of the category
- Create clear, human-readable descriptions that explain what the transaction is for
- For recurring payments, try to identify the service or subscription
- For transactions with abbreviations or codes, try to expand them into readable text
- Pay attention to transaction type (DEBIT, CREDIT, etc.) to determine if it's income or expense

Here are the transactions to categorize:
${JSON.stringify(transactionData, null, 2)}

Respond with a JSON object containing an array of enhanced transactions. Each object in the array should have these properties:
- id: The original transaction ID
- category: The main category
- subCategory: The subcategory
- verboseDescription: A clear human-readable description of what this transaction is
- confidence: "high", "medium", or "low"
- categoryType: "income", "expense", "transfer", or "other"

Return ONLY the JSON object with no additional text or explanation.
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
        temperature: 0.2,
        system: "You are a financial transaction categorization expert. You respond only with valid JSON containing categorized transactions.",
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
    console.log("Claude API response:", data);

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
