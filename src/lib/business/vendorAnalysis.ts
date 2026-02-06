import {
  BusinessTransaction,
  VendorHierarchyNode,
  VendorGroup,
  VendorGranularity
} from '@/lib/types';
import {
  normalizeVendorName,
  buildTokenFrequencyMap,
  buildTokenAnalysis,
  getVendorNameByGranularity
} from './vendorNormalization';

/**
 * Build hierarchical vendor structure with base -> sub -> detailed levels
 */
export function analyzeVendorsByType(
  transactions: BusinessTransaction[],
  type: 'income' | 'expense',
  limit: number = 5
): VendorHierarchyNode[] {
  const filtered = transactions.filter(tx => tx.categoryType === type);

  if (filtered.length === 0) {
    return [];
  }

  // Build token frequency map for all vendor names
  const vendorNames = filtered.map(tx => tx.name || tx.payee || 'Unknown Vendor');
  const tokenFrequencies = buildTokenFrequencyMap(vendorNames);
  const tokenAnalysis = buildTokenAnalysis(vendorNames);

  // Normalize all transactions
  const normalized = filtered.map(tx => {
    const vendorName = tx.name || tx.payee || 'Unknown Vendor';
    return {
      transaction: tx,
      normalized: normalizeVendorName(vendorName, tokenFrequencies, tokenAnalysis)
    };
  });

  // Build hierarchy: base -> sub -> detailed
  const baseGroups = new Map<string, {
    transactions: BusinessTransaction[];
    subGroups: Map<string, {
      transactions: BusinessTransaction[];
      detailedGroups: Map<string, BusinessTransaction[]>;
    }>;
  }>();

  normalized.forEach(({ transaction, normalized: norm }) => {
    const { baseVendor, subVendor, detailedVendor } = norm;

    // Create base group if doesn't exist
    if (!baseGroups.has(baseVendor)) {
      baseGroups.set(baseVendor, {
        transactions: [],
        subGroups: new Map()
      });
    }
    const baseGroup = baseGroups.get(baseVendor)!;
    baseGroup.transactions.push(transaction);

    // Create sub group if doesn't exist
    if (!baseGroup.subGroups.has(subVendor)) {
      baseGroup.subGroups.set(subVendor, {
        transactions: [],
        detailedGroups: new Map()
      });
    }
    const subGroup = baseGroup.subGroups.get(subVendor)!;
    subGroup.transactions.push(transaction);

    // Create detailed group if doesn't exist
    if (!subGroup.detailedGroups.has(detailedVendor)) {
      subGroup.detailedGroups.set(detailedVendor, []);
    }
    subGroup.detailedGroups.get(detailedVendor)!.push(transaction);
  });

  // Calculate total for percentages
  const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0);

  // Convert to VendorHierarchyNode structure
  const hierarchyNodes: VendorHierarchyNode[] = [];

  baseGroups.forEach((baseGroup, baseName) => {
    const baseAmount = baseGroup.transactions.reduce((sum, tx) => sum + tx.amount, 0);

    const subChildren: VendorHierarchyNode[] = [];

    baseGroup.subGroups.forEach((subGroup, subName) => {
      const subAmount = subGroup.transactions.reduce((sum, tx) => sum + tx.amount, 0);

      const detailedChildren: VendorHierarchyNode[] = [];

      subGroup.detailedGroups.forEach((transactions, detailedName) => {
        const detailedAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

        detailedChildren.push({
          name: detailedName,
          level: 'detailed',
          totalAmount: detailedAmount,
          transactionCount: transactions.length,
          percentOfTotal: totalAmount > 0 ? (detailedAmount / totalAmount) * 100 : 0,
          transactions
        });
      });

      // Sort detailed children by amount
      detailedChildren.sort((a, b) => b.totalAmount - a.totalAmount);

      subChildren.push({
        name: subName,
        level: 'sub',
        totalAmount: subAmount,
        transactionCount: subGroup.transactions.length,
        percentOfTotal: totalAmount > 0 ? (subAmount / totalAmount) * 100 : 0,
        children: detailedChildren,
        transactions: subGroup.transactions
      });
    });

    // Sort sub children by amount
    subChildren.sort((a, b) => b.totalAmount - a.totalAmount);

    hierarchyNodes.push({
      name: baseName,
      level: 'base',
      totalAmount: baseAmount,
      transactionCount: baseGroup.transactions.length,
      percentOfTotal: totalAmount > 0 ? (baseAmount / totalAmount) * 100 : 0,
      children: subChildren,
      transactions: baseGroup.transactions
    });
  });

  // Sort by amount descending and take top N
  return hierarchyNodes
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

/**
 * Get top individual transactions (no grouping)
 */
export function analyzeTopTransactions(
  transactions: BusinessTransaction[],
  type: 'income' | 'expense',
  limit: number = 5
): VendorGroup[] {
  const filtered = transactions.filter(tx => tx.categoryType === type);

  const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0);

  const sorted = [...filtered]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);

  return sorted.map(tx => ({
    vendor: tx.name || tx.payee || 'Unknown',
    amount: tx.amount,
    count: 1,
    percentage: totalAmount > 0 ? (tx.amount / totalAmount) * 100 : 0,
    transactions: [tx]
  }));
}

/**
 * Flatten hierarchy to table data based on granularity level
 */
export function buildVendorTableData(
  hierarchyNodes: VendorHierarchyNode[],
  granularity: VendorGranularity
): Array<{
  vendor: string;
  amount: number;
  count: number;
  percentage: number;
  transactions: BusinessTransaction[];
}> {
  const result: Array<{
    vendor: string;
    amount: number;
    count: number;
    percentage: number;
    transactions: BusinessTransaction[];
  }> = [];

  hierarchyNodes.forEach(baseNode => {
    if (granularity === 'consolidated') {
      // Show only base level
      result.push({
        vendor: baseNode.name,
        amount: baseNode.totalAmount,
        count: baseNode.transactionCount,
        percentage: baseNode.percentOfTotal,
        transactions: baseNode.transactions
      });
    } else if (granularity === 'standard') {
      // Show sub level
      baseNode.children?.forEach(subNode => {
        result.push({
          vendor: subNode.name,
          amount: subNode.totalAmount,
          count: subNode.transactionCount,
          percentage: subNode.percentOfTotal,
          transactions: subNode.transactions
        });
      });
    } else {
      // 'detailed' - show detailed level
      baseNode.children?.forEach(subNode => {
        subNode.children?.forEach(detailedNode => {
          result.push({
            vendor: detailedNode.name,
            amount: detailedNode.totalAmount,
            count: detailedNode.transactionCount,
            percentage: detailedNode.percentOfTotal,
            transactions: detailedNode.transactions
          });
        });
      });
    }
  });

  // Sort by amount descending
  return result.sort((a, b) => b.amount - a.amount);
}

/**
 * Build chart data from hierarchy based on granularity
 */
export function buildVendorChartData(
  hierarchyNodes: VendorHierarchyNode[],
  granularity: VendorGranularity
): Array<{ vendor: string; total: number }> {
  const tableData = buildVendorTableData(hierarchyNodes, granularity);
  return tableData.map(row => ({
    vendor: row.vendor,
    total: row.amount
  }));
}
