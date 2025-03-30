
export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  type: TransactionType;
  name: string;
  description: string;
  memo: string;
  category: string;
  subCategory?: string;
  payee?: string;
  location?: string;
  isRecurring?: boolean;
  tags?: string[];
}

export enum TransactionType {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
  TRANSFER = "TRANSFER",
  CHECK = "CHECK",
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  FEE = "FEE",
  INTEREST = "INTEREST",
  OTHER = "OTHER"
}

export interface Category {
  id: string;
  name: string;
  color: string;
  subcategories?: Category[];
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

export interface AnalysisSection {
  title: string;
  content: string;
}

export interface FinancialInsight {
  id: string;
  title: string;
  description: string;
  type: "warning" | "info" | "tip";
  relatedTransactions?: string[];
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  topExpenseCategories: { category: string; amount: number }[];
  recurringExpensesTotal: number;
  largestTransaction: Transaction;
}
