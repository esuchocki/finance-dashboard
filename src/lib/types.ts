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
  note?: string;
  isTransfer?: boolean;
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

// Enhanced transaction types for time of day and additional context
export enum TimeOfDay {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  EVENING = "evening",
  NIGHT = "night",
  LATE_NIGHT = "late_night"
}

// Transaction lifestyle impact tags
export enum LifestyleTag {
  NECESSITY = "necessity",
  LIFESTYLE_IMPROVEMENT = "lifestyle_improvement",
  LUXURY = "luxury",
  SUBSCRIPTION = "subscription",
  INVESTMENT = "investment",
  EMERGENCY = "emergency",
  ENTERTAINMENT = "entertainment",
  HEALTH = "health",
  EDUCATION = "education"
}

// Narrative transaction - enhanced transaction with narrative context
export interface NarrativeTransaction extends Transaction {
  narrative: string; // Subject-Verb-Object sentence describing the transaction
  timeOfDay: TimeOfDay; // Time of day categorization
  userAge: number; // Age of the user at the time of transaction
  userLocation: string; // Where the user was living at the time
  lifestyleTags: LifestyleTag[]; // Tags like 'necessity', 'luxury', etc.
  transactionTags: string[]; // Custom tags specific to this transaction
  lifeContext?: string; // Additional context about user's life at this time
  isNotable: boolean; // Whether this transaction is particularly significant
  relatedFactoids: string[]; // IDs of factoids derived from this transaction
  majorCategory: string; // Main category (e.g., "Food & Dining")
  minorCategory: string; // Subcategory (e.g., "Coffee Shop")
  vendor: string; // The merchant or vendor name
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

// ======== BUSINESS MODE TYPES ========

// Application mode - Personal or Business
export type AppMode = 'personal' | 'business';

// Account type classification (matching QBO standards)
export type AccountType = 'checking' | 'savings' | 'mma' | 'credit' | 'paypal' | 'other';

// Fund type for nonprofit accounting (FASB ASC 958)
export type FundType = 'unrestricted' | 'temporarily_restricted' | 'permanently_restricted';

// FASB functional expense categories
export type FunctionalExpenseCategory = 'program' | 'management' | 'fundraising';

// Bank account representing a QBO file/financial account
export interface BankAccount {
  id: string;
  name: string; // User-defined nickname (e.g., "NP Stmt MMA", "Non-Profit Plus")
  institutionName: string; // Bank name (e.g., "Passumpsic Bank", "First National Bank of Omaha")
  institutionId?: string; // Routing number or FID from QBO
  accountNumber?: string; // Last 4 digits only for display
  accountType: AccountType; // checking, savings, mma, credit, paypal, other
  fileSource: string; // Original filename (e.g., "NP Stmt MMA.qbo")
  dateUploaded: Date;
  transactionCount: number;
  dateRange: DateRange;
  currency?: string; // ISO 4217, default 'USD'
  description?: string; // Optional user description
}

// Extended transaction with account context
export interface BusinessTransaction extends Transaction {
  accountId: string;
  accountName: string;
  institutionName: string;
  fundType: FundType;
  programAllocation?: string; // For FASB functional expense reporting
  functionalCategory?: FunctionalExpenseCategory; // Program/Admin/Fundraising
  isIntercompany?: boolean; // For elimination in consolidation (transfers between accounts)
  vendorId?: string; // For vendor analysis
  grantId?: string; // For grant tracking
}

// Per-account summary for consolidated view
export interface AccountSummary {
  accountId: string;
  accountName: string;
  institutionName: string;
  accountType: AccountType;
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  balance: number;
  transactionCount: number;
  dateRange: DateRange;
}

// Functional expenses breakdown (FASB requirement)
export interface FunctionalExpenses {
  programServices: number;
  managementGeneral: number;
  fundraising: number;
  total: number;
}

// Vendor spending analysis
export interface VendorSpending {
  vendor: string;
  vendorId?: string;
  totalSpent: number;
  transactionCount: number;
  percentOfTotal: number;
  firstTransaction: Date;
  lastTransaction: Date;
  averageTransaction: number;
  categories: string[]; // Categories this vendor appears in
}

// Donor metrics for fundraising analysis
export interface DonorMetrics {
  totalDonors: number;
  newDonors: number;
  repeatDonors: number;
  retentionRate: number; // Percentage of donors who gave again
  averageGift: number;
  totalGifts: number;
  largestGift: number;
  medianGift: number;
}

// Revenue source breakdown
export interface RevenueBySource {
  programFees: number;
  donations: number;
  grants: number;
  investment: number;
  other: number;
}

// Budget variance for a category
export interface BudgetVariance {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
  isFavorable: boolean; // For expenses: under budget is favorable
}

// Nonprofit-specific financial summary
export interface BusinessFinancialSummary extends FinancialSummary {
  // FASB functional expense breakdown
  functionalExpenses: FunctionalExpenses;

  // Nonprofit key metrics
  programExpenseRatio: number; // Program / Total Expenses (target: 70%+)
  operatingReserveMonths: number; // Cash reserves / (Monthly expenses)

  // Revenue composition
  revenueBySource: RevenueBySource;

  // Multi-account tracking
  accountsSummary: AccountSummary[];
  consolidationAdjustments: number; // Intercompany eliminations (transfers between accounts)

  // Budget comparison (optional - requires budget data)
  budgetVariance?: {
    totalRevenueVariance: number;
    totalExpenseVariance: number;
    byCategory: BudgetVariance[];
  };

  // Vendor analysis
  topVendors: VendorSpending[];
  vendorConcentration: number; // Percentage of spend with top 5 vendors

  // Donor metrics (optional - requires donation tracking)
  donorMetrics?: DonorMetrics;

  // Cash flow metrics
  burnRate?: number; // Average monthly cash outflow
  monthsOfRunway?: number; // Current cash / burn rate
}

// Consolidated financial data across multiple bank accounts
export interface ConsolidatedFinancialData {
  accounts: BankAccount[];
  selectedAccountIds: string[];
  consolidatedTransactions: BusinessTransaction[];
  consolidatedSummary: BusinessFinancialSummary;
  intercompanyTransactions: BusinessTransaction[]; // Detected transfers between accounts
  periodComparison?: PeriodComparison;
  lastConsolidated: Date;
}

// Multi-year/period comparison metrics
export interface PeriodComparison {
  currentPeriod: DateRange;
  comparisonPeriod: DateRange;
  metrics: {
    revenue: {
      current: number;
      comparison: number;
      change: number;
      changePercent: number;
    };
    expenses: {
      current: number;
      comparison: number;
      change: number;
      changePercent: number;
    };
    netCashflow: {
      current: number;
      comparison: number;
      change: number;
      changePercent: number;
    };
    programRatio: {
      current: number;
      comparison: number;
      change: number;
    };
    transactionCount: {
      current: number;
      comparison: number;
      change: number;
      changePercent: number;
    };
  };
}
