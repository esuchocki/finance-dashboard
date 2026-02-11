
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
export interface EnhancedTransaction extends Omit<Transaction, 'categoryType'> {
  categoryType: "income" | "expense" | "transfer";
  confidence: "high" | "medium" | "low";
  verboseDescription: string;
  merchantType?: string;
  merchantCategory?: string;
  isRecurring: boolean;
}
