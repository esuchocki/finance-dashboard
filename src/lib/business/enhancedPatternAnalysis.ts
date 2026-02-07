import { BusinessTransaction } from '@/lib/types';

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

  // Enhanced features
  amountHistory: AmountChange[];
  trend: TrendAnalysis | null;
  anomalies: Anomaly[];
  prediction: PredictiveAnalysis | null;
  hasAmountChanges: boolean;
}

/**
 * Calculate linear regression for trend analysis
 */
function calculateLinearRegression(xValues: number[], yValues: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = xValues.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

  return { slope, intercept, rSquared };
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
  const totalChange = lastAmount - firstAmount;
  const changePercentage = (totalChange / firstAmount) * 100;

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

    const changePct = Math.abs((curr.amount - prev.amount) / prev.amount);

    // Detect if amount changed significantly
    if (changePct > tolerance) {
      changes.push({
        date: curr.date,
        previousAmount: prev.amount,
        newAmount: curr.amount,
        changeAmount: curr.amount - prev.amount,
        changePercentage: ((curr.amount - prev.amount) / prev.amount) * 100,
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
  return transactions
    .filter(tx => {
      const deviation = Math.abs((tx.amount - expectedAmount) / expectedAmount);
      return deviation > tolerance;
    })
    .map(tx => ({
      transaction: tx,
      expectedAmount,
      actualAmount: tx.amount,
      deviationPercentage: ((tx.amount - expectedAmount) / expectedAmount) * 100,
      reason: tx.amount > expectedAmount
        ? `Amount ${Math.abs(((tx.amount - expectedAmount) / expectedAmount) * 100).toFixed(1)}% higher than expected`
        : `Amount ${Math.abs(((tx.amount - expectedAmount) / expectedAmount) * 100).toFixed(1)}% lower than expected`
    }));
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
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

  // Calculate standard deviation
  const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

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
  const coefficientOfVariation = (stdDev / avgAmount);
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
    confidenceScore = Math.min(1, confidenceScore + 0.1);
  }

  return {
    nextExpectedAmount,
    confidence,
    confidenceScore,
    predictionRange: {
      min: nextExpectedAmount - stdDev * 1.5,
      max: nextExpectedAmount + stdDev * 1.5
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
    const avgDays = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;
    const variance = daysBetween.reduce((sum, d) => sum + Math.pow(d - avgDays, 2), 0) / daysBetween.length;
    const stdDev = Math.sqrt(variance);

    // Determine confidence based on consistency
    let confidence: 'high' | 'medium' | 'low';
    const coefficientOfVariation = stdDev / avgDays;

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

    // Calculate current amount (most recent)
    const currentAmount = sorted[sorted.length - 1].amount;
    const lastDate = sorted[sorted.length - 1].date;

    // Check if active
    const currentDate = new Date();
    const daysSinceLastTransaction = (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    const isActive = daysSinceLastTransaction <= avgDays * 1.5;

    // Next expected date
    const nextExpectedDate = new Date(lastDate.getTime() + avgDays * 24 * 60 * 60 * 1000);

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
