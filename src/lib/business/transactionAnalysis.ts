import { BusinessTransaction } from '@/lib/types';

/**
 * Duplicate Transaction Detection
 */
export interface DuplicateGroup {
  transactions: BusinessTransaction[];
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export function detectDuplicates(transactions: BusinessTransaction[]): DuplicateGroup[] {
  const duplicateGroups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    const tx1 = transactions[i];
    if (processed.has(tx1.id)) continue;

    const duplicates: BusinessTransaction[] = [tx1];
    let reason = '';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    for (let j = i + 1; j < transactions.length; j++) {
      const tx2 = transactions[j];
      if (processed.has(tx2.id)) continue;

      // Check if amounts match exactly
      if (Math.abs(tx1.amount - tx2.amount) > 0.01) continue;

      // Check if dates are close (within 3 days)
      const daysDiff = Math.abs(tx1.date.getTime() - tx2.date.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 3) continue;

      // Check if descriptions/names are similar
      const name1 = (tx1.name || tx1.payee || '').toLowerCase();
      const name2 = (tx2.name || tx2.payee || '').toLowerCase();
      const namesSimilar = name1 === name2 ||
                          name1.includes(name2) ||
                          name2.includes(name1);

      if (namesSimilar && daysDiff === 0) {
        // Same day, same amount, same merchant - very likely duplicate
        duplicates.push(tx2);
        processed.add(tx2.id);
        reason = 'Same day, same amount, same merchant';
        confidence = 'high';
      } else if (namesSimilar && daysDiff <= 1) {
        // Within 1 day, same amount, same merchant - likely duplicate
        duplicates.push(tx2);
        processed.add(tx2.id);
        reason = 'Within 1 day, same amount, same merchant';
        confidence = 'medium';
      } else if (daysDiff <= 3) {
        // Within 3 days, same amount - possible duplicate
        duplicates.push(tx2);
        processed.add(tx2.id);
        reason = 'Within 3 days, same amount';
        confidence = 'low';
      }
    }

    if (duplicates.length > 1) {
      duplicateGroups.push({
        transactions: duplicates,
        reason,
        confidence
      });
      processed.add(tx1.id);
    }
  }

  return duplicateGroups;
}

/**
 * Recurring Transaction Detection
 */
export interface RecurringPattern {
  merchantName: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  transactions: BusinessTransaction[];
  averageDaysBetween: number;
  confidence: 'high' | 'medium' | 'low';
  nextExpectedDate?: Date;
}

export function detectRecurringTransactions(
  transactions: BusinessTransaction[]
): RecurringPattern[] {
  // Group transactions by merchant name and similar amounts
  const merchantGroups = new Map<string, BusinessTransaction[]>();

  transactions.forEach(tx => {
    const key = (tx.name || tx.payee || 'Unknown').toLowerCase();
    const group = merchantGroups.get(key) || [];
    group.push(tx);
    merchantGroups.set(key, group);
  });

  const recurringPatterns: RecurringPattern[] = [];

  merchantGroups.forEach((txs, merchantName) => {
    // Need at least 3 transactions to detect pattern
    if (txs.length < 3) return;

    // Sort by date
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by similar amounts (within 5% tolerance)
    const amountGroups = new Map<number, BusinessTransaction[]>();
    sorted.forEach(tx => {
      let foundGroup = false;
      for (const [amount, group] of amountGroups.entries()) {
        if (Math.abs(tx.amount - amount) / amount < 0.05) {
          group.push(tx);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        amountGroups.set(tx.amount, [tx]);
      }
    });

    // Analyze each amount group for recurring patterns
    amountGroups.forEach((group, amount) => {
      if (group.length < 3) return;

      // Calculate days between consecutive transactions
      const daysBetween: number[] = [];
      for (let i = 1; i < group.length; i++) {
        const days = (group[i].date.getTime() - group[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
        daysBetween.push(days);
      }

      // Calculate average and standard deviation
      const avg = daysBetween.reduce((sum, d) => sum + d, 0) / daysBetween.length;
      const variance = daysBetween.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / daysBetween.length;
      const stdDev = Math.sqrt(variance);

      // Determine frequency and confidence
      let frequency: RecurringPattern['frequency'];
      let confidence: 'high' | 'medium' | 'low';

      // Low standard deviation means consistent pattern
      if (stdDev / avg < 0.2) {
        confidence = 'high';
      } else if (stdDev / avg < 0.4) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }

      // Classify frequency
      if (avg >= 6 && avg <= 8) {
        frequency = 'weekly';
      } else if (avg >= 13 && avg <= 15) {
        frequency = 'biweekly';
      } else if (avg >= 28 && avg <= 32) {
        frequency = 'monthly';
      } else if (avg >= 88 && avg <= 95) {
        frequency = 'quarterly';
      } else if (avg >= 360 && avg <= 370) {
        frequency = 'annual';
      } else {
        // Non-standard frequency
        return;
      }

      // Calculate next expected date
      const lastDate = group[group.length - 1].date;
      const nextExpectedDate = new Date(lastDate.getTime() + avg * 24 * 60 * 60 * 1000);

      recurringPatterns.push({
        merchantName,
        amount,
        frequency,
        transactions: group,
        averageDaysBetween: avg,
        confidence,
        nextExpectedDate
      });
    });
  });

  return recurringPatterns.sort((a, b) => b.amount - a.amount);
}

/**
 * Subscription Detection
 */
export interface Subscription {
  merchantName: string;
  monthlyAmount: number;
  frequency: 'monthly' | 'annual';
  startDate: Date;
  lastChargeDate: Date;
  nextExpectedDate: Date;
  totalPaid: number;
  transactionCount: number;
  isActive: boolean;
  missedPayments: number;
  accountName?: string;
}

export function detectSubscriptions(
  transactions: BusinessTransaction[],
  currentDate: Date = new Date()
): Subscription[] {
  const recurringPatterns = detectRecurringTransactions(transactions);
  const subscriptions: Subscription[] = [];

  recurringPatterns.forEach(pattern => {
    // Only consider monthly or annual patterns as subscriptions
    if (pattern.frequency !== 'monthly' && pattern.frequency !== 'annual') return;

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
    const monthlyAmount = pattern.frequency === 'annual' ? pattern.amount / 12 : pattern.amount;

    subscriptions.push({
      merchantName: pattern.merchantName,
      monthlyAmount,
      frequency: pattern.frequency,
      startDate,
      lastChargeDate,
      nextExpectedDate: pattern.nextExpectedDate!,
      totalPaid,
      transactionCount: sortedTxs.length,
      isActive,
      missedPayments,
      accountName: sortedTxs[0].accountName
    });
  });

  return subscriptions;
}

/**
 * Balance Drop Detection
 */
export interface BalanceDrop {
  date: Date;
  dropAmount: number;
  dropPercentage: number;
  balanceBefore: number;
  balanceAfter: number;
  causingTransactions: BusinessTransaction[];
}

export function detectBalanceDrops(
  transactions: BusinessTransaction[],
  threshold: number = 0.15 // 15% drop
): BalanceDrop[] {
  // Sort by date
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate running balance
  let runningBalance = 0;
  const balanceHistory: Array<{ date: Date; balance: number; tx: BusinessTransaction }> = [];

  sorted.forEach(tx => {
    const amount = tx.categoryType === 'income' ? tx.amount : -tx.amount;
    runningBalance += amount;
    balanceHistory.push({ date: tx.date, balance: runningBalance, tx });
  });

  // Detect significant drops
  const drops: BalanceDrop[] = [];

  for (let i = 1; i < balanceHistory.length; i++) {
    const prev = balanceHistory[i - 1];
    const curr = balanceHistory[i];

    if (prev.balance === 0) continue;

    const dropAmount = prev.balance - curr.balance;
    const dropPercentage = dropAmount / Math.abs(prev.balance);

    if (dropPercentage >= threshold) {
      // Find all transactions on this day that contributed to the drop
      const dayStart = new Date(curr.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(curr.date);
      dayEnd.setHours(23, 59, 59, 999);

      const causingTransactions = sorted.filter(tx =>
        tx.date >= dayStart &&
        tx.date <= dayEnd &&
        tx.categoryType === 'expense'
      );

      drops.push({
        date: curr.date,
        dropAmount,
        dropPercentage,
        balanceBefore: prev.balance,
        balanceAfter: curr.balance,
        causingTransactions
      });
    }
  }

  return drops;
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
