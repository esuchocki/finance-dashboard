import { BusinessTransaction } from '@/lib/types';
import {
  safeDivide,
  safePercentageChange,
  safeCoefficientOfVariation,
  safeStandardDeviation,
  safeAverage,
  roundCurrency,
  clamp,
  safeLinearRegression
} from '@/lib/safeMath';

/**
 * Enhanced Pattern Recognition System
 *
 * Improvements over basic system:
 * 1. Tracks amount changes over time (price increases/decreases)
 * 2. Detects trends (gradual increases/decreases)
 * 3. Flexible frequency detection (handles more patterns)
 * 4. Anomaly detection (flags unusual transactions)
 * 5. Predictive analysis (forecasts next amount)
 */

export interface AmountChange {
  date: Date;
  previousAmount: number;
  newAmount: number;
  changeAmount: number;
  changePercentage: number;
  transactionId: string;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: 'strong' | 'moderate' | 'weak'; // Based on R-squared
  averageChange: number; // Per occurrence
  totalChange: number; // First to last
  changePercentage: number; // Total percentage change
  rSquared: number; // Goodness of fit (0-1)
}

export interface Anomaly {
  transaction: BusinessTransaction;
  expectedAmount: number;
  actualAmount: number;
  deviationPercentage: number;
  reason: string;
}

export interface PredictiveAnalysis {
  nextExpectedAmount: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-1
  predictionRange: {
    min: number;
    max: number;
  };
}

export type PatternType = 'regular' | 'sporadic';

export interface EnhancedRecurringPattern {
  merchantName: string;
  currentAmount: number;
  frequency: 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly' | 'bi-monthly' | 'quarterly' | 'annual' | 'custom';
  customFrequencyDays?: number; // For custom frequency
  transactions: BusinessTransaction[];
  averageDaysBetween: number;
  confidence: 'high' | 'medium' | 'low';
  nextExpectedDate: Date;
  isActive: boolean;
  lastTransactionDate: Date;

  // Pattern classification
  patternType: PatternType; // 'regular' = predictable for forecasting, 'sporadic' = valuable for outreach

  // Enhanced features
  amountHistory: AmountChange[];
  trend: TrendAnalysis | null;
  anomalies: Anomaly[];
  prediction: PredictiveAnalysis | null;
  hasAmountChanges: boolean;
}

/**
 * Calculate linear regression for trend analysis
 * Now uses safe implementation from safeMath.ts
 */
function calculateLinearRegression(xValues: number[], yValues: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const result = safeLinearRegression(xValues, yValues);
  if (result === null) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }
  return result;
}

/**
 * Analyze trend in amounts over time
 */
function analyzeTrend(transactions: BusinessTransaction[]): TrendAnalysis | null {
  if (transactions.length < 3) return null;

  // Sort by date
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Use transaction index as x-axis (time progression)
  const xValues = sorted.map((_, i) => i);
  const yValues = sorted.map(tx => tx.amount);

  const regression = calculateLinearRegression(xValues, yValues);

  // Determine direction and strength
  const firstAmount = sorted[0].amount;
  const lastAmount = sorted[sorted.length - 1].amount;
  const totalChange = roundCurrency(lastAmount - firstAmount);
  const changePercentage = safePercentageChange(lastAmount, firstAmount, 0);

  let direction: TrendAnalysis['direction'];
  if (Math.abs(changePercentage) < 3) {
    direction = 'stable';
  } else if (regression.slope > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }

  let strength: TrendAnalysis['strength'];
  if (regression.rSquared > 0.7) {
    strength = 'strong';
  } else if (regression.rSquared > 0.4) {
    strength = 'moderate';
  } else {
    strength = 'weak';
  }

  return {
    direction,
    strength,
    averageChange: regression.slope,
    totalChange,
    changePercentage,
    rSquared: regression.rSquared
  };
}

/**
 * Detect amount changes by comparing consecutive transactions
 */
function detectAmountChanges(
  transactions: BusinessTransaction[],
  tolerance: number = 0.03 // 3% tolerance
): AmountChange[] {
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const changes: AmountChange[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // Skip if previous amount is zero (can't calculate percentage change)
    if (prev.amount === 0) continue;

    const changePercentage = safePercentageChange(curr.amount, prev.amount, 0);
    const changePct = Math.abs(changePercentage) / 100;

    // Detect if amount changed significantly
    if (changePct > tolerance) {
      changes.push({
        date: curr.date,
        previousAmount: roundCurrency(prev.amount),
        newAmount: roundCurrency(curr.amount),
        changeAmount: roundCurrency(curr.amount - prev.amount),
        changePercentage,
        transactionId: curr.id
      });
    }
  }

  return changes;
}

/**
 * Detect anomalies (outliers) in transaction amounts
 */
function detectAnomalies(
  transactions: BusinessTransaction[],
  expectedAmount: number,
  tolerance: number = 0.15 // 15% deviation threshold
): Anomaly[] {
  // Skip if expected amount is zero (can't calculate deviation)
  if (expectedAmount === 0) {
    return [];
  }

  return transactions
    .filter(tx => {
      const deviationPct = safePercentageChange(tx.amount, expectedAmount, 0);
      const deviation = Math.abs(deviationPct) / 100;
      return deviation > tolerance;
    })
    .map(tx => {
      const deviationPercentage = safePercentageChange(tx.amount, expectedAmount, 0);
      const absDeviation = Math.abs(deviationPercentage);
      return {
        transaction: tx,
        expectedAmount: roundCurrency(expectedAmount),
        actualAmount: roundCurrency(tx.amount),
        deviationPercentage,
        reason: tx.amount > expectedAmount
          ? `Amount ${absDeviation.toFixed(1)}% higher than expected`
          : `Amount ${absDeviation.toFixed(1)}% lower than expected`
      };
    });
}

/**
 * Predict next transaction amount based on trend
 */
function predictNextAmount(
  transactions: BusinessTransaction[],
  trend: TrendAnalysis | null
): PredictiveAnalysis | null {
  if (transactions.length < 3) return null;

  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const recentTransactions = sorted.slice(-5); // Use last 5 for prediction
  const amounts = recentTransactions.map(tx => tx.amount);
  const avgAmount = safeAverage(amounts, 0);

  // Calculate standard deviation
  const stdDev = safeStandardDeviation(amounts, 0);

  let nextExpectedAmount = avgAmount;

  // Adjust based on trend
  if (trend && trend.direction !== 'stable') {
    // Use trend slope to predict next value
    const xValues = recentTransactions.map((_, i) => i);
    const yValues = amounts;
    const regression = calculateLinearRegression(xValues, yValues);
    nextExpectedAmount = regression.slope * recentTransactions.length + regression.intercept;
  }

  // Determine confidence based on variability
  const coefficientOfVariation = safeCoefficientOfVariation(amounts, 1);
  let confidence: 'high' | 'medium' | 'low';
  let confidenceScore: number;

  if (coefficientOfVariation < 0.05) {
    confidence = 'high';
    confidenceScore = 0.9;
  } else if (coefficientOfVariation < 0.15) {
    confidence = 'medium';
    confidenceScore = 0.7;
  } else {
    confidence = 'low';
    confidenceScore = 0.4;
  }

  // If trend is strong, increase confidence
  if (trend && trend.strength === 'strong') {
    confidenceScore = clamp(confidenceScore + 0.1, 0, 0.99);
  }

  return {
    nextExpectedAmount: roundCurrency(nextExpectedAmount),
    confidence,
    confidenceScore,
    predictionRange: {
      min: Math.max(0, roundCurrency(nextExpectedAmount - stdDev * 1.5)), // Clamp to 0 for monetary amounts
      max: roundCurrency(nextExpectedAmount + stdDev * 1.5)
    }
  };
}

/**
 * Classify frequency with flexible ranges
 */
function classifyFrequency(avgDays: number): {
  frequency: EnhancedRecurringPattern['frequency'];
  customDays?: number;
} {
  if (avgDays >= 5 && avgDays <= 9) {
    return { frequency: 'weekly' };
  } else if (avgDays >= 13 && avgDays <= 16) {
    return { frequency: 'biweekly' };
  } else if (avgDays >= 14 && avgDays <= 17) {
    return { frequency: 'semi-monthly' }; // Twice a month
  } else if (avgDays >= 28 && avgDays <= 33) {
    return { frequency: 'monthly' };
  } else if (avgDays >= 58 && avgDays <= 65) {
    return { frequency: 'bi-monthly' }; // Every 2 months
  } else if (avgDays >= 88 && avgDays <= 98) {
    return { frequency: 'quarterly' };
  } else if (avgDays >= 350 && avgDays <= 380) {
    return { frequency: 'annual' };
  } else {
    return { frequency: 'custom', customDays: Math.round(avgDays) };
  }
}

/**
 * Enhanced recurring pattern detection
 */
export function detectEnhancedRecurringPatterns(
  transactions: BusinessTransaction[]
): EnhancedRecurringPattern[] {
  // Build a map of account names to their last transaction date
  // Each account may have a different date range
  const accountLastDates = new Map<string, Date>();
  transactions.forEach(tx => {
    const accountName = tx.accountName || 'Unknown Account';
    const existing = accountLastDates.get(accountName);
    if (!existing || tx.date > existing) {
      accountLastDates.set(accountName, tx.date);
    }
  });

  // Group by merchant
  const merchantGroups = new Map<string, BusinessTransaction[]>();

  transactions.forEach(tx => {
    const key = (tx.name || tx.payee || 'Unknown').toLowerCase().trim();
    const group = merchantGroups.get(key) || [];
    group.push(tx);
    merchantGroups.set(key, group);
  });

  const patterns: EnhancedRecurringPattern[] = [];

  merchantGroups.forEach((txs, merchantName) => {
    // Need at least 3 transactions
    if (txs.length < 3) return;

    // Sort by date
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate days between transactions
    const daysBetween: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const days = (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
      daysBetween.push(days);
    }

    // Calculate statistics
    const avgDays = safeAverage(daysBetween, 30);
    const stdDev = safeStandardDeviation(daysBetween, 0);

    // Determine confidence based on consistency
    let confidence: 'high' | 'medium' | 'low';
    const coefficientOfVariation = safeCoefficientOfVariation(daysBetween, 1);

    if (coefficientOfVariation < 0.2) {
      confidence = 'high';
    } else if (coefficientOfVariation < 0.4) {
      confidence = 'medium';
    } else if (coefficientOfVariation < 0.6) {
      confidence = 'low';
    } else {
      // Too inconsistent to be a pattern
      return;
    }

    // Classify frequency
    const { frequency, customDays } = classifyFrequency(avgDays);

    // Classify pattern type (regular vs sporadic)
    // Regular: High confidence + standard frequency (predictable for forecasting)
    // Sporadic: Lower confidence or custom frequency (valuable for donor outreach)
    const isStandardFrequency = ['weekly', 'biweekly', 'semi-monthly', 'monthly', 'bi-monthly', 'quarterly', 'annual'].includes(frequency);
    const patternType: PatternType = (confidence === 'high' && isStandardFrequency) ? 'regular' : 'sporadic';

    // Calculate current amount (most recent)
    const currentAmount = sorted[sorted.length - 1].amount;
    const lastDate = sorted[sorted.length - 1].date;

    // Get the reference date for THIS specific account
    const accountName = sorted[0].accountName || 'Unknown Account';
    const accountReferenceDate = accountLastDates.get(accountName) || new Date();

    // Next expected date (based on last transaction + average interval)
    const nextExpectedDate = new Date(lastDate.getTime() + avgDays * 24 * 60 * 60 * 1000);

    // Check if active (using THIS account's last transaction date, not a global date)
    const daysSinceLastTransaction = (accountReferenceDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    // Check if the expected next payment date has already passed (is before account end date)
    // and if enough time has passed that we should have seen the payment
    const nextExpectedHasPassed = nextExpectedDate < accountReferenceDate;
    const daysSinceExpected = (accountReferenceDate.getTime() - nextExpectedDate.getTime()) / (1000 * 60 * 60 * 24);

    // Use a reasonable grace period: 30% of cycle OR 30 days, whichever is SMALLER
    // This prevents absurdly long grace periods for irregular patterns
    const gracePeriodDays = Math.min(avgDays * 0.3, 30);
    const isPaymentMissing = nextExpectedHasPassed && daysSinceExpected > gracePeriodDays;

    // Mark as inactive if:
    // 1. Too much time has passed since last transaction (1.5x the cycle), OR
    // 2. Expected payment date is IN THE PAST (within account data range) and payment is missing
    const isActive = (daysSinceLastTransaction <= avgDays * 1.5) && !isPaymentMissing;

    // Enhanced analysis
    const amountHistory = detectAmountChanges(sorted);
    const trend = analyzeTrend(sorted);
    const avgAmount = sorted.reduce((sum, tx) => sum + tx.amount, 0) / sorted.length;
    const anomalies = detectAnomalies(sorted, avgAmount);
    const prediction = predictNextAmount(sorted, trend);

    patterns.push({
      merchantName,
      currentAmount,
      frequency,
      customFrequencyDays: customDays,
      transactions: sorted,
      averageDaysBetween: avgDays,
      confidence,
      patternType,
      nextExpectedDate,
      isActive,
      lastTransactionDate: lastDate,
      amountHistory,
      trend,
      anomalies,
      prediction,
      hasAmountChanges: amountHistory.length > 0
    });
  });

  // Sort by current amount (descending)
  return patterns.sort((a, b) => b.currentAmount - a.currentAmount);
}

/**
 * Convert enhanced pattern to monthly equivalent amount
 */
export function toMonthlyAmount(pattern: EnhancedRecurringPattern): number {
  let amount = pattern.currentAmount;

  switch (pattern.frequency) {
    case 'weekly':
      return amount * 4.33;
    case 'biweekly':
      return amount * 2.17;
    case 'semi-monthly':
      return amount * 2;
    case 'monthly':
      return amount;
    case 'bi-monthly':
      return amount * 0.5;
    case 'quarterly':
      return amount / 3;
    case 'annual':
      return amount / 12;
    case 'custom':
      if (pattern.customFrequencyDays) {
        return amount * (30.44 / pattern.customFrequencyDays);
      }
      return amount;
    default:
      return amount;
  }
}

/**
 * Get frequency display label
 */
export function getFrequencyLabel(pattern: EnhancedRecurringPattern): string {
  if (pattern.frequency === 'custom' && pattern.customFrequencyDays) {
    return `Every ${pattern.customFrequencyDays} days`;
  }

  const labels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    'semi-monthly': 'Semi-monthly',
    monthly: 'Monthly',
    'bi-monthly': 'Bi-monthly',
    quarterly: 'Quarterly',
    annual: 'Annual'
  };

  return labels[pattern.frequency] || pattern.frequency;
}
