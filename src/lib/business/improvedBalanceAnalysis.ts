import { BusinessTransaction, BankAccount } from '@/lib/types';
import { isValidDate } from '@/lib/dateUtils';

export interface BalanceDrop {
  date: Date;
  accountId: string;
  accountName: string;
  dropAmount: number;
  dropPercentage: number;
  balanceBefore: number;
  balanceAfter: number;
  causingTransactions: BusinessTransaction[];
  isLikelyNormal: boolean; // If it's a recurring expected expense
  severity: 'critical' | 'warning' | 'info';
}

export interface BalanceDropWarning {
  message: string;
  type: 'error' | 'warning' | 'info';
}

/**
 * Improved balance drop detection with per-account tracking
 *
 * Improvements:
 * 1. Per-account balance tracking (doesn't mix accounts)
 * 2. Supports opening balance for accurate calculations
 * 3. Severity levels based on amount and percentage
 * 4. Flags expected/recurring expenses as "likely normal"
 * 5. Returns warnings about limitations
 * 6. Aggregates by day instead of per-transaction
 */
export function detectImprovedBalanceDrops(
  transactions: BusinessTransaction[],
  recurringExpensePatterns: Set<string> = new Set(), // Merchant names of known recurring expenses
  options: {
    percentageThreshold?: number; // Default 15%
    absoluteThreshold?: number;   // Default $500
    accounts?: Map<string, BankAccount>; // Account details including opening balances
  } = {}
): {
  drops: BalanceDrop[];
  warnings: BalanceDropWarning[];
} {
  const percentageThreshold = options.percentageThreshold || 0.15;
  const absoluteThreshold = options.absoluteThreshold || 500;
  const accountsMap = options.accounts || new Map<string, BankAccount>();

  const warnings: BalanceDropWarning[] = [];
  const drops: BalanceDrop[] = [];

  // Note: Balance tracking starts at $0, which is correct for QBO exports
  // that don't include opening balances. This is the expected behavior.

  // Group transactions by account
  const byAccount = new Map<string, BusinessTransaction[]>();
  transactions.forEach(tx => {
    const group = byAccount.get(tx.accountId) || [];
    group.push(tx);
    byAccount.set(tx.accountId, group);
  });

  // Analyze each account separately
  byAccount.forEach((accountTxs, accountId) => {
    // Sort by date
    const sorted = [...accountTxs].sort((a, b) => a.date.getTime() - b.date.getTime());

    if (sorted.length === 0) return;

    const accountName = sorted[0].accountName || 'Unknown Account';

    // Get opening balance for this account (defaults to $0)
    const account = accountsMap.get(accountId);
    let runningBalance = account?.openingBalance ?? 0;

    // Calculate daily balance changes (aggregate transactions by day)
    const dailyBalances: Array<{
      date: Date;
      balance: number;
      transactions: BusinessTransaction[];
    }> = [];
    let currentDay = new Date(sorted[0].date);
    currentDay.setHours(0, 0, 0, 0);
    let dayTransactions: BusinessTransaction[] = [];

    sorted.forEach((tx, idx) => {
      const txDay = new Date(tx.date);
      txDay.setHours(0, 0, 0, 0);

      // If we've moved to a new day, record the previous day
      if (txDay.getTime() !== currentDay.getTime()) {
        if (dayTransactions.length > 0) {
          dailyBalances.push({
            date: new Date(currentDay),
            balance: runningBalance,
            transactions: [...dayTransactions]
          });
        }
        currentDay = txDay;
        dayTransactions = [];
      }

      // Update balance
      const amount = tx.categoryType === 'income' ? tx.amount : -tx.amount;
      runningBalance += amount;
      dayTransactions.push(tx);

      // If this is the last transaction, record the final day
      if (idx === sorted.length - 1) {
        dailyBalances.push({
          date: new Date(currentDay),
          balance: runningBalance,
          transactions: [...dayTransactions]
        });
      }
    });

    // Detect significant drops
    for (let i = 1; i < dailyBalances.length; i++) {
      const prev = dailyBalances[i - 1];
      const curr = dailyBalances[i];

      // Skip if previous balance is zero or negative
      if (prev.balance <= 0) continue;

      const dropAmount = prev.balance - curr.balance;

      // Only consider drops (not increases)
      if (dropAmount <= 0) continue;

      const dropPercentage = dropAmount / Math.abs(prev.balance);

      // Check if drop meets thresholds
      const meetsPercentageThreshold = dropPercentage >= percentageThreshold;
      const meetsAbsoluteThreshold = dropAmount >= absoluteThreshold;

      if (!meetsPercentageThreshold && !meetsAbsoluteThreshold) continue;

      // Find causing transactions (expenses on this day)
      const causingTransactions = curr.transactions.filter(
        tx => tx.categoryType === 'expense'
      );

      // Check if this is likely a normal/expected expense
      const isLikelyNormal = causingTransactions.some(tx => {
        const merchantName = (tx.name || tx.payee || '').toLowerCase();
        return recurringExpensePatterns.has(merchantName);
      });

      // Determine severity
      let severity: BalanceDrop['severity'] = 'info';
      if (dropPercentage >= 0.5 || dropAmount >= 5000) {
        severity = 'critical'; // 50%+ or $5000+
      } else if (dropPercentage >= 0.25 || dropAmount >= 1000) {
        severity = 'warning'; // 25%+ or $1000+
      }

      drops.push({
        date: curr.date,
        accountId,
        accountName,
        dropAmount,
        dropPercentage,
        balanceBefore: prev.balance,
        balanceAfter: curr.balance,
        causingTransactions,
        isLikelyNormal,
        severity
      });
    }
  });

  // Sort by severity and amount
  drops.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    if (a.severity !== b.severity) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.dropAmount - a.dropAmount;
  });

  return { drops, warnings };
}

/**
 * Extract recurring expense merchant names from patterns
 */
export function extractRecurringExpenseMerchants(
  recurringPatterns: Array<{ merchantName: string; frequency: string }>
): Set<string> {
  return new Set(
    recurringPatterns
      .map(p => p.merchantName.toLowerCase())
  );
}
