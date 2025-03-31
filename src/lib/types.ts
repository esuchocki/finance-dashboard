
export enum TransactionType {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
  CHECK = "CHECK",
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  FEE = "FEE",
  INTEREST = "INTEREST",
  TRANSFER = "TRANSFER",
  OTHER = "OTHER",
}

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
  tags: string[];
  // New fields for enhanced categorization
  subSubCategory?: string;
  confidence?: string; // high, medium, low
  verboseDescription?: string; // Enhanced readable description
}

export interface TransactionFilterOptions {
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  types?: TransactionType[];
  categories?: string[];
  search?: string;
  isRecurring?: boolean;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  topExpenseCategories: { category: string; amount: number }[];
  recurringExpensesTotal: number;
  largestTransaction: Transaction;
  monthlyBreakdown: { month: string; income: number; expenses: number }[];
  transactionCount: number;
  dateRange: { start: Date; end: Date };
}

export interface FinancialInsight {
  id: string;
  title: string;
  description: string;
  type: "info" | "warning" | "error";
  relatedTransactions?: string[];
}
