
// Base Transaction type
export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  type: TransactionType;
  name?: string;
  description?: string;
  memo?: string;
  category?: string;
  subCategory?: string;
  location?: string;
  payee?: string;
  isRecurring?: boolean;
  tags?: string[];
  verboseDescription?: string;
  confidence?: "high" | "medium" | "low";
  categoryType?: "income" | "expense" | "transfer";
}

// Transaction types
export enum TransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
  CHECK = "CHECK",
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  FEE = "FEE",
  INTEREST = "INTEREST",
  TRANSFER = "TRANSFER",
  OTHER = "OTHER"
}

// Filter options for transactions
export interface TransactionFilterOptions {
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  types?: TransactionType[];
  categories?: string[];
  amountRange?: {
    min?: number;
    max?: number;
  };
  searchTerm?: string;
}

// Financial summary
export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  topExpenseCategories: { category: string; amount: number }[];
  recurringExpensesTotal: number;
  largestTransaction: Transaction;
  monthlyBreakdown: { month: string; income: number; expenses: number }[];
  transactionCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

// Financial insights
export interface FinancialInsight {
  id: string;
  type: "info" | "warning" | "tip";
  title: string;
  description: string;
  category?: string;
  relatedTransactions?: Transaction[];
  priority?: number;
}
