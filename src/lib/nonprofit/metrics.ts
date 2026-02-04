import { BusinessTransaction, FunctionalExpenses, VendorSpending } from '@/lib/types';

/**
 * Classify transactions into FASB functional expense categories
 */
export function classifyFunctionalExpenses(
  transactions: BusinessTransaction[]
): FunctionalExpenses {
  let programServices = 0;
  let managementGeneral = 0;
  let fundraising = 0;

  transactions.forEach(tx => {
    if (tx.functionalCategory === 'program') {
      programServices += tx.amount;
    } else if (tx.functionalCategory === 'management') {
      managementGeneral += tx.amount;
    } else if (tx.functionalCategory === 'fundraising') {
      fundraising += tx.amount;
    } else {
      // Auto-classify based on category name
      const category = tx.category.toLowerCase();
      if (category.includes('fundraising') || category.includes('development') || category.includes('donor')) {
        fundraising += tx.amount;
      } else if (category.includes('admin') || category.includes('management') || category.includes('overhead')) {
        managementGeneral += tx.amount;
      } else {
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
 * Calculate program expense ratio (nonprofit key metric)
 */
export function calculateProgramExpenseRatio(
  functionalExpenses: FunctionalExpenses
): number {
  if (functionalExpenses.total === 0) return 0;
  return functionalExpenses.programServices / functionalExpenses.total;
}

/**
 * Calculate operating reserve in months
 */
export function calculateOperatingReserveMonths(
  currentCash: number,
  monthlyExpenses: number
): number {
  if (monthlyExpenses === 0) return 0;
  return currentCash / monthlyExpenses;
}

/**
 * Analyze vendor spending patterns
 */
export function analyzeVendorSpending(
  transactions: BusinessTransaction[]
): VendorSpending[] {
  const vendorMap = new Map<string, VendorSpending>();
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  transactions.forEach(tx => {
    const vendorName = tx.name || tx.payee || 'Unknown';
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
        percentOfTotal: 0,
        firstTransaction: tx.date,
        lastTransaction: tx.date,
        averageTransaction: 0,
        categories: [tx.category]
      });
    }
  });

  const vendors = Array.from(vendorMap.values()).map(v => ({
    ...v,
    percentOfTotal: total > 0 ? (v.totalSpent / total) * 100 : 0,
    averageTransaction: v.totalSpent / v.transactionCount
  }));

  return vendors.sort((a, b) => b.totalSpent - a.totalSpent);
}
