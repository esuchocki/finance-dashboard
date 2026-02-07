import { BusinessTransaction } from '@/lib/types';

/**
 * Duplicate Transaction Detection
 */
import {
  detectImprovedDuplicates,
  type DuplicateGroup as ImprovedDuplicateGroup
} from './improvedDuplicateDetection';

// Re-export improved type for backward compatibility
export type DuplicateGroup = ImprovedDuplicateGroup;

/**
 * Detect duplicate transactions with improved accuracy and performance
 *
 * Improvements over old version:
 * - O(n) hash-based matching instead of O(n²) pairwise comparison
 * - Account context validation (same account required)
 * - Better name normalization (removes transaction IDs, dates, timestamps)
 * - Handles pending→cleared duplicate pattern (up to 7 days)
 */
export function detectDuplicates(transactions: BusinessTransaction[]): DuplicateGroup[] {
  return detectImprovedDuplicates(transactions);
}

/**
 * Recurring Transaction Detection
 */
import {
  detectEnhancedRecurringPatterns,
  type EnhancedRecurringPattern,
  type AmountChange,
  type TrendAnalysis,
  type Anomaly,
  type PredictiveAnalysis
} from './enhancedPatternAnalysis';

// Re-export enhanced types for backward compatibility
export type RecurringPattern = EnhancedRecurringPattern;
export type { AmountChange, TrendAnalysis, Anomaly, PredictiveAnalysis };

export function detectRecurringTransactions(
  transactions: BusinessTransaction[]
): RecurringPattern[] {
  // Use enhanced pattern detection
  return detectEnhancedRecurringPatterns(transactions);
}

/**
 * Subscription Detection
 */
export interface Subscription {
  merchantName: string;
  monthlyAmount: number;
  frequency: 'monthly' | 'annual' | 'semi-monthly' | 'bi-monthly';
  startDate: Date;
  lastChargeDate: Date;
  nextExpectedDate: Date;
  totalPaid: number;
  transactionCount: number;
  isActive: boolean;
  missedPayments: number;
  accountName?: string;
  transactions: BusinessTransaction[];

  // Enhanced features
  amountHistory: AmountChange[];
  trend: TrendAnalysis | null;
  anomalies: Anomaly[];
  prediction: PredictiveAnalysis | null;
  hasAmountChanges: boolean;
}

export function detectSubscriptions(
  transactions: BusinessTransaction[],
  currentDate: Date = new Date()
): Subscription[] {
  // Subscriptions are recurring EXPENSES (money going out)
  const expenseTransactions = transactions.filter(tx => tx.categoryType === 'expense');
  const recurringPatterns = detectRecurringTransactions(expenseTransactions);
  const subscriptions: Subscription[] = [];

  recurringPatterns.forEach(pattern => {
    // Include monthly, semi-monthly, bi-monthly, and annual patterns
    const validFrequencies = ['monthly', 'annual', 'semi-monthly', 'bi-monthly'];
    if (!validFrequencies.includes(pattern.frequency)) return;

    // Only consider if confidence is medium or high
    if (pattern.confidence === 'low') return;

    const sortedTxs = [...pattern.transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    const startDate = sortedTxs[0].date;
    const lastChargeDate = sortedTxs[sortedTxs.length - 1].date;
    const totalPaid = sortedTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // Check if subscription is still active (last charge within expected window)
    const daysSinceLastCharge = (currentDate.getTime() - lastChargeDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedDays = pattern.frequency === 'monthly' ? 30 : 365;
    const isActive = daysSinceLastCharge <= expectedDays * 1.5; // Allow 50% grace period

    // Count missed payments
    const expectedPayments = Math.floor((currentDate.getTime() - startDate.getTime()) / (expectedDays * 24 * 60 * 60 * 1000));
    const missedPayments = Math.max(0, expectedPayments - sortedTxs.length);

    // Calculate monthly equivalent
    let monthlyAmount = pattern.currentAmount;
    if (pattern.frequency === 'annual') {
      monthlyAmount = pattern.currentAmount / 12;
    } else if (pattern.frequency === 'semi-monthly') {
      monthlyAmount = pattern.currentAmount * 2;
    } else if (pattern.frequency === 'bi-monthly') {
      monthlyAmount = pattern.currentAmount * 0.5;
    }

    subscriptions.push({
      merchantName: pattern.merchantName,
      monthlyAmount,
      frequency: pattern.frequency as 'monthly' | 'annual' | 'semi-monthly' | 'bi-monthly',
      startDate,
      lastChargeDate,
      nextExpectedDate: pattern.nextExpectedDate,
      totalPaid,
      transactionCount: sortedTxs.length,
      isActive,
      missedPayments,
      accountName: sortedTxs[0].accountName,
      transactions: sortedTxs,
      amountHistory: pattern.amountHistory,
      trend: pattern.trend,
      anomalies: pattern.anomalies,
      prediction: pattern.prediction,
      hasAmountChanges: pattern.hasAmountChanges
    });
  });

  return subscriptions;
}

/**
 * Balance Drop Detection
 */
import {
  detectImprovedBalanceDrops,
  extractRecurringExpenseMerchants,
  type BalanceDrop as ImprovedBalanceDrop,
  type BalanceDropWarning
} from './improvedBalanceAnalysis';

// Re-export improved type for backward compatibility
export type BalanceDrop = ImprovedBalanceDrop;
export type { BalanceDropWarning };

/**
 * Detect significant balance drops with improved accuracy
 *
 * Improvements over old version:
 * - Per-account balance tracking (doesn't mix accounts)
 * - Severity levels (critical/warning/info)
 * - Flags expected/recurring expenses as "likely normal"
 * - Returns warnings about limitations (e.g., assumes $0 opening balance)
 * - Aggregates by day instead of per-transaction
 *
 * @param transactions - All transactions to analyze
 * @param threshold - Percentage threshold (default 15%)
 * @param subscriptions - Optional list of known recurring expenses to flag as normal
 */
export function detectBalanceDrops(
  transactions: BusinessTransaction[],
  threshold: number = 0.15, // 15% drop
  subscriptions?: Subscription[]
): { drops: BalanceDrop[]; warnings: BalanceDropWarning[] } {
  // Extract recurring expense patterns from subscriptions
  const recurringPatterns = subscriptions
    ? extractRecurringExpenseMerchants(
        subscriptions.map(s => ({
          merchantName: s.merchantName,
          frequency: s.frequency
        }))
      )
    : new Set<string>();

  return detectImprovedBalanceDrops(transactions, recurringPatterns, {
    percentageThreshold: threshold,
    absoluteThreshold: 500 // $500 minimum
  });
}

/**
 * Transaction Frequency Analysis
 */
export interface FrequencyAnalysis {
  daily: number;
  weekly: number;
  monthly: number;
  byDayOfWeek: Record<string, number>;
  byHourOfDay: Record<number, number>;
  averagePerDay: number;
  peakDay: string;
  peakHour: number;
}

export function analyzeTransactionFrequency(
  transactions: BusinessTransaction[]
): FrequencyAnalysis {
  if (transactions.length === 0) {
    return {
      daily: 0,
      weekly: 0,
      monthly: 0,
      byDayOfWeek: {},
      byHourOfDay: {},
      averagePerDay: 0,
      peakDay: 'Monday',
      peakHour: 12
    };
  }

  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const startDate = sorted[0].date;
  const endDate = sorted[sorted.length - 1].date;

  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
  const averagePerDay = transactions.length / totalDays;

  // By day of week
  const byDayOfWeek: Record<string, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  transactions.forEach(tx => {
    const dayName = dayNames[tx.date.getDay()];
    byDayOfWeek[dayName]++;
  });

  // By hour of day (if time information available)
  const byHourOfDay: Record<number, number> = {};
  for (let i = 0; i < 24; i++) {
    byHourOfDay[i] = 0;
  }

  transactions.forEach(tx => {
    const hour = tx.date.getHours();
    byHourOfDay[hour]++;
  });

  // Find peaks
  const peakDay = Object.entries(byDayOfWeek).sort((a, b) => b[1] - a[1])[0][0];
  const peakHour = parseInt(Object.entries(byHourOfDay).sort((a, b) => b[1] - a[1])[0][0]);

  return {
    daily: averagePerDay,
    weekly: averagePerDay * 7,
    monthly: averagePerDay * 30,
    byDayOfWeek,
    byHourOfDay,
    averagePerDay,
    peakDay,
    peakHour
  };
}

/**
 * Transaction Volume Analysis
 */
export interface VolumeAnalysis {
  totalVolume: number;
  averageTransactionSize: number;
  medianTransactionSize: number;
  largestTransaction: BusinessTransaction | null;
  smallestTransaction: BusinessTransaction | null;
  volumeByCategory: Record<string, number>;
  volumeByAccount: Record<string, number>;
}

export function analyzeTransactionVolume(
  transactions: BusinessTransaction[]
): VolumeAnalysis {
  if (transactions.length === 0) {
    return {
      totalVolume: 0,
      averageTransactionSize: 0,
      medianTransactionSize: 0,
      largestTransaction: null,
      smallestTransaction: null,
      volumeByCategory: {},
      volumeByAccount: {}
    };
  }

  const totalVolume = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const averageTransactionSize = totalVolume / transactions.length;

  // Calculate median
  const amounts = transactions.map(tx => Math.abs(tx.amount)).sort((a, b) => a - b);
  const mid = Math.floor(amounts.length / 2);
  const medianTransactionSize = amounts.length % 2 === 0
    ? (amounts[mid - 1] + amounts[mid]) / 2
    : amounts[mid];

  // Find extremes
  const sorted = [...transactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const largestTransaction = sorted[0];
  const smallestTransaction = sorted[sorted.length - 1];

  // Volume by category
  const volumeByCategory: Record<string, number> = {};
  transactions.forEach(tx => {
    volumeByCategory[tx.category] = (volumeByCategory[tx.category] || 0) + Math.abs(tx.amount);
  });

  // Volume by account
  const volumeByAccount: Record<string, number> = {};
  transactions.forEach(tx => {
    volumeByAccount[tx.accountName] = (volumeByAccount[tx.accountName] || 0) + Math.abs(tx.amount);
  });

  return {
    totalVolume,
    averageTransactionSize,
    medianTransactionSize,
    largestTransaction,
    smallestTransaction,
    volumeByCategory,
    volumeByAccount
  };
}
