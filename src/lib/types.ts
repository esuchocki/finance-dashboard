
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

// Simple date range type
export interface DateRange {
  start: Date;
  end: Date;
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
  // Required base filter properties
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
  
  // Legacy/alternative properties (keeping for backward compatibility)
  startDate?: Date | null;
  endDate?: Date | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  search?: string;
  category?: string;
  type?: string;
  excludeTransfers?: boolean;
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
  netCashflow: number;
  transactionCount: number;
  recurringExpensesTotal: number;
  largestExpense: Transaction | null;
  largestIncome: Transaction | null;
  recurringExpenses: Transaction[];
  largestTransaction?: Transaction;
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
  monthlyBreakdown: {
    month: string; // Format: "YYYY-MM"
    income: number;
    expenses: number;
  }[];
  // Add the topInsights property that is referenced in InsightsList.tsx
  topInsights?: FinancialInsight[];
}

// Structure for financial insights
export interface FinancialInsight {
  id: string;
  title: string;
  description: string;
  type: "info" | "warning" | "success" | "danger" | "tip"; // Added "tip" to match usage in InsightsList.tsx
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

// ======== NEW FINANCIAL PERSONA STRUCTURES ========

// Personal background information collected from the user
export interface PersonalBackground {
  name: string;
  birthDate: Date;
  education: {
    level: string;
    school: string;
    major: string;
  };
  locations: LocationHistory[];
}

// Location history with time period
export interface LocationHistory {
  id: string;
  location: string;
  startDate: Date;
  endDate: Date | null; // null means "current"
}

// Factoid about the user derived from transaction analysis
export interface Factoid {
  id: string;
  date: Date; // When this factoid was discovered/created
  content: string; // The factoid text
  confidence: "high" | "medium" | "low";
  source: "transaction" | "pattern" | "explicit"; // Where this factoid came from
  relatedTransactionIds?: string[]; // IDs of transactions that led to this factoid
  category?: string; // Category of factoid (e.g., "spending-habit", "life-event", etc.)
  tags: string[];
}

// Narrative transaction - enhanced transaction with narrative context
export interface NarrativeTransaction extends Transaction {
  narrative: string; // Subject-Verb-Object sentence describing the transaction
  userAge: number; // Age of the user at the time of transaction
  userLocation: string; // Where the user was living at the time
  transactionTags: string[]; // Tags like 'necessity', 'luxury', etc.
  lifeContext?: string; // Additional context about user's life at this time
  isNotable: boolean; // Whether this transaction is particularly significant
  relatedFactoids: string[]; // IDs of factoids derived from this transaction
}

// Life chapter - a period in the user's financial life with distinct patterns
export interface LifeChapter {
  id: string;
  title: string; // E.g., "College Years", "First Job", "New Parent"
  startDate: Date;
  endDate: Date | null; // null means "current"
  summary: string; // Brief description of this life chapter
  keyFactoids: string[]; // IDs of factoids that define this chapter
  financialMetrics: {
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
    topExpenseCategories: { category: string; percentage: number }[];
    savingsRate: number;
  };
  transactionPatterns: {
    description: string;
    frequency: "daily" | "weekly" | "monthly" | "occasional";
    significance: number; // 0-1 scale of how defining this pattern is
  }[];
  majorLifeEvents: {
    date: Date;
    description: string;
    financialImpact: "positive" | "negative" | "neutral";
  }[];
}

// Complete financial persona - the full user profile with all levels of abstraction
export interface FinancialPersona {
  personalBackground: PersonalBackground;
  rawTransactions: Transaction[]; // Original transactions
  narrativeTransactions: NarrativeTransaction[]; // Level 1: Detailed narrative
  lifeChapters: LifeChapter[]; // Level 2: Life chapters and transitions
  currentLifeChapter: string; // ID of the most recent life chapter
  factoids: Factoid[]; // All factoids about the user
  lastUpdated: Date;
}
