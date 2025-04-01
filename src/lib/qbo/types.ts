
import { Transaction } from '../types';

// Define patterns for category matching
export interface CategoryPattern {
  pattern: RegExp;
  category: string;
  subcategory: string;
}

// Pattern for extracting location information
export interface LocationPattern {
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => string;
}

// Define category hierarchy for enrichment
export interface CategoryHierarchy {
  name: string;
  subcategories: string[];
  examples: string[];
  isIncome?: boolean;
  isExpense?: boolean;
  isTransfer?: boolean;
}

// Enhanced transaction with detailed information
export interface EnhancedTransaction extends Transaction {
  // Additional properties that Claude might add
  confidence: "high" | "medium" | "low";
  verboseDescription: string;
  categoryType: "income" | "expense" | "transfer" | "other";
}

// Structured format for Claude's response
export interface ClaudeEnhancementResponse {
  transactions: Array<{
    id: string;
    category: string;
    subCategory: string;
    verboseDescription: string;
    confidence: "high" | "medium" | "low";
    categoryType: "income" | "expense" | "transfer" | "other";
  }>;
  summary?: {
    categorizedCount: number;
    totalCount: number;
    uniqueCategories: number;
    confidenceDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  };
}
