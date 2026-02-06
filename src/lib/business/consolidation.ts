import {
  BusinessTransaction,
  BankAccount,
  BusinessFinancialSummary,
  AccountSummary,
  DateRange,
  FunctionalExpenses,
  RevenueBySource,
  VendorSpending
} from '@/lib/types';
import { analyzeVendorsByType, analyzeTopTransactions } from './vendorAnalysis';
import type { GroupingStrategy } from './vendorNormalization';

/**
 * Consolidate transactions from multiple accounts
 */
export function consolidateTransactions(
  allTransactions: BusinessTransaction[],
  selectedAccountIds: string[]
): BusinessTransaction[] {
  // Filter transactions to only include selected accounts
  const consolidated = allTransactions.filter(tx =>
    selectedAccountIds.includes(tx.accountId)
  );

  // Sort by date (newest first)
  return consolidated.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Detect potential transfers between accounts
 * Looks for matching amounts on the same date with opposite signs
 */
export function detectIntercompanyTransfers(
  transactions: BusinessTransaction[]
): BusinessTransaction[] {
  const potentialTransfers: BusinessTransaction[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    const tx1 = transactions[i];
    if (processed.has(tx1.id)) continue;

    for (let j = i + 1; j < transactions.length; j++) {
      const tx2 = transactions[j];
      if (processed.has(tx2.id)) continue;

      // Check if transactions are from different accounts (by both ID and name)
      if (tx1.accountId === tx2.accountId) continue;
      if (tx1.accountName === tx2.accountName) continue; // Additional check by account name

      // Check if amounts match (within $0.01 tolerance)
      if (Math.abs(tx1.amount - tx2.amount) > 0.01) continue;

      // Check if dates match (same day)
      const sameDay =
        tx1.date.getFullYear() === tx2.date.getFullYear() &&
        tx1.date.getMonth() === tx2.date.getMonth() &&
        tx1.date.getDate() === tx2.date.getDate();

      if (!sameDay) continue;

      // Check if one is income and one is expense (opposite directions)
      const oppositeTypes =
        (tx1.categoryType === 'income' && tx2.categoryType === 'expense') ||
        (tx1.categoryType === 'expense' && tx2.categoryType === 'income');

      if (!oppositeTypes) continue;

      // Exclude transactions that look like fees or internal account transactions
      // (e.g., PayPal fees, refunds, chargebacks within the same account)
      const isFeeRelated =
        tx1.description?.toLowerCase().includes('fee') ||
        tx2.description?.toLowerCase().includes('fee') ||
        tx1.category?.toLowerCase().includes('fee') ||
        tx2.category?.toLowerCase().includes('fee') ||
        tx1.name?.toLowerCase().includes('fee') ||
        tx2.name?.toLowerCase().includes('fee');

      const isRefundRelated =
        tx1.description?.toLowerCase().includes('refund') ||
        tx2.description?.toLowerCase().includes('refund') ||
        tx1.name?.toLowerCase().includes('refund') ||
        tx2.name?.toLowerCase().includes('refund');

      // Skip if likely a fee or refund within the same account
      if (isFeeRelated || isRefundRelated) continue;

      // Mark both as potential transfers between accounts
      console.log('Inter-account transfer detected:', {
        date: tx1.date.toLocaleDateString(),
        amount: tx1.amount,
        from: `${tx1.accountName} (${tx1.accountId})`,
        to: `${tx2.accountName} (${tx2.accountId})`,
        tx1Type: tx1.categoryType,
        tx2Type: tx2.categoryType,
        tx1Desc: tx1.description,
        tx2Desc: tx2.description
      });
      potentialTransfers.push({ ...tx1, isIntercompany: true });
      potentialTransfers.push({ ...tx2, isIntercompany: true });
      processed.add(tx1.id);
      processed.add(tx2.id);
      break;
    }
  }

  return potentialTransfers;
}

/**
 * Calculate consolidated financial summary across accounts
 */
export function calculateBusinessSummary(
  transactions: BusinessTransaction[],
  accounts: BankAccount[],
  selectedAccountIds: string[],
  eliminateIntercompany: boolean = true
): BusinessFinancialSummary {
  let workingTransactions = [...transactions];

  // Detect and optionally eliminate intercompany transactions
  let intercompanyAdjustment = 0;
  if (eliminateIntercompany) {
    const intercompany = detectIntercompanyTransfers(workingTransactions);
    const intercompanyIds = new Set(intercompany.map(tx => tx.id));
    intercompanyAdjustment = intercompany.reduce((sum, tx) => sum + tx.amount, 0);

    // Remove intercompany transactions from calculations
    workingTransactions = workingTransactions.filter(tx => !intercompanyIds.has(tx.id));
  }

  // Calculate date range
  const dates = workingTransactions.map(tx => tx.date.getTime());
  const dateRange: DateRange = {
    start: dates.length > 0 ? new Date(Math.min(...dates)) : new Date(),
    end: dates.length > 0 ? new Date(Math.max(...dates)) : new Date()
  };

  // Separate income and expenses
  const incomeTransactions = workingTransactions.filter(tx => tx.categoryType === 'income');
  const expenseTransactions = workingTransactions.filter(tx => tx.categoryType === 'expense');

  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate functional expenses (FASB requirement)
  const functionalExpenses = calculateFunctionalExpenses(expenseTransactions);
  const programExpenseRatio = functionalExpenses.total > 0
    ? functionalExpenses.programServices / functionalExpenses.total
    : 0;

  // Calculate operating reserves
  const monthlyExpenses = totalExpenses / (getMonthsDifference(dateRange.start, dateRange.end) || 1);
  const currentCash = totalIncome - totalExpenses; // Simplified - ideally would track actual cash balance
  const operatingReserveMonths = monthlyExpenses > 0 ? currentCash / monthlyExpenses : 0;

  // Revenue composition
  const revenueBySource = categorizeRevenue(incomeTransactions);

  // Top categories
  const topExpenseCategories = calculateTopCategories(expenseTransactions, totalExpenses);
  const topIncomeCategories = calculateTopCategories(incomeTransactions, totalIncome);

  // Monthly breakdown
  const monthlyBreakdown = calculateMonthlyBreakdown(workingTransactions);

  // Per-account summary
  const accountsSummary = calculateAccountSummaries(workingTransactions, accounts, selectedAccountIds);

  // Vendor analysis (simple, for backward compatibility)
  const topVendors = analyzeVendors(expenseTransactions);
  const vendorConcentration = calculateVendorConcentration(topVendors);

  // NOTE: Enhanced vendor analytics with hierarchy is now calculated separately
  // using useVendorAnalytics hook for better performance and caching

  // Recurring expenses
  const recurringExpenses = expenseTransactions.filter(tx => tx.isRecurring);
  const recurringExpensesTotal = recurringExpenses.reduce((sum, tx) => sum + tx.amount, 0);

  // Largest transactions
  const sortedExpenses = [...expenseTransactions].sort((a, b) => b.amount - a.amount);
  const sortedIncome = [...incomeTransactions].sort((a, b) => b.amount - a.amount);

  return {
    // Base summary fields
    dateRange,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    netCashflow: totalIncome - totalExpenses,
    transactionCount: workingTransactions.length,
    recurringExpensesTotal,
    largestExpense: sortedExpenses[0] || null,
    largestIncome: sortedIncome[0] || null,
    recurringExpenses,
    topExpenseCategories,
    topIncomeCategories,
    monthlyBreakdown,

    // Business-specific fields
    functionalExpenses,
    programExpenseRatio,
    operatingReserveMonths,
    revenueBySource,
    accountsSummary,
    consolidationAdjustments: intercompanyAdjustment,
    topVendors,
    vendorConcentration,
    vendorAnalytics: undefined // Calculated separately via useVendorAnalytics hook
  };
}

/**
 * Calculate functional expenses (Program/Management/Fundraising)
 */
function calculateFunctionalExpenses(expenseTransactions: BusinessTransaction[]): FunctionalExpenses {
  let programServices = 0;
  let managementGeneral = 0;
  let fundraising = 0;

  expenseTransactions.forEach(tx => {
    if (tx.functionalCategory === 'program') {
      programServices += tx.amount;
    } else if (tx.functionalCategory === 'management') {
      managementGeneral += tx.amount;
    } else if (tx.functionalCategory === 'fundraising') {
      fundraising += tx.amount;
    } else {
      // Default categorization based on category names if not explicitly set
      if (isFundraisingCategory(tx.category)) {
        fundraising += tx.amount;
      } else if (isManagementCategory(tx.category)) {
        managementGeneral += tx.amount;
      } else {
        // Default to program services
        programServices += tx.amount;
      }
    }
  });

  return {
    programServices,
    managementGeneral,
    fundraising,
    total: programServices + managementGeneral + fundraising
  };
}

/**
 * Categorize revenue by source
 */
function categorizeRevenue(incomeTransactions: BusinessTransaction[]): RevenueBySource {
  let programFees = 0;
  let donations = 0;
  let grants = 0;
  let investment = 0;
  let other = 0;

  incomeTransactions.forEach(tx => {
    const category = tx.category.toLowerCase();
    const description = tx.description.toLowerCase();

    if (category.includes('program') || category.includes('retreat') || category.includes('tuition')) {
      programFees += tx.amount;
    } else if (category.includes('donation') || category.includes('contribution') || description.includes('donor')) {
      donations += tx.amount;
    } else if (category.includes('grant') || description.includes('grant')) {
      grants += tx.amount;
    } else if (category.includes('investment') || category.includes('interest') || category.includes('dividend')) {
      investment += tx.amount;
    } else {
      other += tx.amount;
    }
  });

  return {
    programFees,
    donations,
    grants,
    investment,
    other
  };
}

/**
 * Calculate top spending categories
 */
function calculateTopCategories(
  transactions: BusinessTransaction[],
  total: number
): Array<{ category: string; amount: number; percentage: number }> {
  const categoryTotals = new Map<string, number>();

  transactions.forEach(tx => {
    const current = categoryTotals.get(tx.category) || 0;
    categoryTotals.set(tx.category, current + tx.amount);
  });

  return Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

/**
 * Calculate monthly breakdown
 */
function calculateMonthlyBreakdown(
  transactions: BusinessTransaction[]
): Array<{ month: string; income: number; expenses: number }> {
  const monthlyData = new Map<string, { income: number; expenses: number }>();

  transactions.forEach(tx => {
    const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
    const current = monthlyData.get(monthKey) || { income: 0, expenses: 0 };

    if (tx.categoryType === 'income') {
      current.income += tx.amount;
    } else if (tx.categoryType === 'expense') {
      current.expenses += tx.amount;
    }

    monthlyData.set(monthKey, current);
  });

  return Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate per-account summaries
 */
function calculateAccountSummaries(
  transactions: BusinessTransaction[],
  accounts: BankAccount[],
  selectedAccountIds: string[]
): AccountSummary[] {
  return selectedAccountIds.map(accountId => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) {
      return {
        accountId,
        accountName: 'Unknown',
        institutionName: 'Unknown',
        accountType: 'other',
        totalIncome: 0,
        totalExpenses: 0,
        netCashflow: 0,
        balance: 0,
        transactionCount: 0,
        dateRange: { start: new Date(), end: new Date() }
      };
    }

    const accountTransactions = transactions.filter(tx => tx.accountId === accountId);
    const income = accountTransactions
      .filter(tx => tx.categoryType === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = accountTransactions
      .filter(tx => tx.categoryType === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      accountId: account.id,
      accountName: account.name,
      institutionName: account.institutionName,
      accountType: account.accountType,
      totalIncome: income,
      totalExpenses: expenses,
      netCashflow: income - expenses,
      balance: income - expenses,
      transactionCount: accountTransactions.length,
      dateRange: account.dateRange
    };
  });
}

/**
 * Analyze vendor spending patterns
 */
function analyzeVendors(expenseTransactions: BusinessTransaction[]): VendorSpending[] {
  const vendorMap = new Map<string, VendorSpending>();
  const total = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  expenseTransactions.forEach(tx => {
    const vendorName = tx.name || tx.payee || 'Unknown Vendor';
    const existing = vendorMap.get(vendorName);

    if (existing) {
      existing.totalSpent += tx.amount;
      existing.transactionCount += 1;
      existing.lastTransaction = tx.date > existing.lastTransaction ? tx.date : existing.lastTransaction;
      if (!existing.categories.includes(tx.category)) {
        existing.categories.push(tx.category);
      }
    } else {
      vendorMap.set(vendorName, {
        vendor: vendorName,
        totalSpent: tx.amount,
        transactionCount: 1,
        percentOfTotal: 0, // Will calculate after
        firstTransaction: tx.date,
        lastTransaction: tx.date,
        averageTransaction: 0, // Will calculate after
        categories: [tx.category]
      });
    }
  });

  // Calculate percentages and averages
  const vendors = Array.from(vendorMap.values()).map(v => ({
    ...v,
    percentOfTotal: total > 0 ? (v.totalSpent / total) * 100 : 0,
    averageTransaction: v.totalSpent / v.transactionCount
  }));

  // Sort by total spent and return top 20
  return vendors.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 20);
}

/**
 * Calculate vendor concentration (top 5 vendors as % of total)
 */
function calculateVendorConcentration(topVendors: VendorSpending[]): number {
  return topVendors.slice(0, 5).reduce((sum, v) => sum + v.percentOfTotal, 0);
}

/**
 * Helper: Check if category is fundraising
 */
function isFundraisingCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return lower.includes('fundraising') ||
         lower.includes('development') ||
         lower.includes('donor') ||
         lower.includes('campaign');
}

/**
 * Helper: Check if category is management/admin
 */
function isManagementCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return lower.includes('admin') ||
         lower.includes('management') ||
         lower.includes('office') ||
         lower.includes('overhead') ||
         lower.includes('insurance') ||
         lower.includes('legal') ||
         lower.includes('accounting');
}

/**
 * Helper: Calculate months difference between dates
 */
function getMonthsDifference(start: Date, end: Date): number {
  const months = (end.getFullYear() - start.getFullYear()) * 12 +
                 (end.getMonth() - start.getMonth()) + 1;
  return months > 0 ? months : 1;
}
