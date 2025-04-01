
// Enum for transaction types
export enum TransactionType {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
  CHECK = "CHECK",
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  FEE = "FEE",
  INTEREST = "INTEREST",
  TRANSFER = "TRANSFER",
  OTHER = "OTHER"
}

// Structure for a transaction
export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  type: TransactionType;
  name: string;
  description: string;
  memo: string;
  category: string;
  subCategory: string;
  location: string;
  isRecurring: boolean;
  payee: string;
  verboseDescription: string;
  confidence: "high" | "medium" | "low";
  categoryType: "income" | "expense" | "transfer";
  tags: string[];
}

// Options for filtering transactions
export interface TransactionFilterOptions {
  categories: string[];
  types: TransactionType[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  amountRange: {
    min: number | null;
    max: number | null;
  };
  searchQuery: string;
  isRecurring: boolean | null;
  startDate?: Date | null;
  endDate?: Date | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  search?: string;
}

// Structure for financial summary data
export interface FinancialSummary {
  dateRange: {
    start: Date;
    end: Date;
  };
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  largestExpense: Transaction | null;
  largestIncome: Transaction | null;
  recurringExpenses: Transaction[];
  monthlyBreakdown: {
    month: string; // Format: "YYYY-MM"
    income: number;
    expenses: number;
  }[];
  topExpenseCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  topIncomeCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

// Structure for financial insights
export interface FinancialInsight {
  id: string;
  title: string;
  description: string;
  type: "info" | "warning" | "success" | "danger";
  category?: string;
  relatedTransactions?: Transaction[];
  amount?: number;
  change?: number;
  trendDirection?: "up" | "down" | "stable";
}

// Define category hierarchy
export interface CategoryHierarchy {
  name: string;
  subcategories: string[];
  examples: string[];
  isIncome?: boolean;
  isExpense?: boolean;
  isTransfer?: boolean;
}
