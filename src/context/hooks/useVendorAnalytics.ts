import { useState, useEffect, useRef, useMemo } from 'react';
import { BusinessTransaction, VendorAnalytics } from '@/lib/types';
import { analyzeVendorsByType, analyzeTopTransactions } from '@/lib/business/vendorAnalysis';
import type { GroupingStrategy } from '@/lib/business/vendorNormalization';

interface VendorAnalyticsCache {
  strategy: GroupingStrategy;
  transactionsHash: string;
  result: VendorAnalytics;
  timestamp: number;
}

interface UseVendorAnalyticsProps {
  transactions: BusinessTransaction[];
  strategy: GroupingStrategy;
}

interface UseVendorAnalyticsResult {
  vendorAnalytics: VendorAnalytics | null;
  isCalculating: boolean;
  cacheHit: boolean;
}

/**
 * Custom hook for vendor analytics with per-strategy caching
 * Only recalculates when transactions change, NOT when strategy switches
 */
export const useVendorAnalytics = ({
  transactions,
  strategy
}: UseVendorAnalyticsProps): UseVendorAnalyticsResult => {
  // Cache map: strategy → cached result
  const cacheRef = useRef<Map<GroupingStrategy, VendorAnalyticsCache>>(new Map());

  // Loading state
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentResult, setCurrentResult] = useState<VendorAnalytics | null>(null);
  const [cacheHit, setCacheHit] = useState(false);

  // Create a stable hash of transactions to detect changes
  const transactionsHash = useMemo(() => {
    // Use length + first/last transaction IDs as a lightweight hash
    if (transactions.length === 0) return 'empty';
    const first = transactions[0]?.id || '';
    const last = transactions[transactions.length - 1]?.id || '';
    return `${transactions.length}-${first}-${last}`;
  }, [transactions]);

  // Calculate or retrieve from cache
  useEffect(() => {
    const cache = cacheRef.current.get(strategy);

    // Cache hit: same strategy, same transactions
    if (cache && cache.transactionsHash === transactionsHash) {
      console.log(`[VendorAnalytics] Cache HIT for strategy: ${strategy}`);
      setCurrentResult(cache.result);
      setCacheHit(true);
      setIsCalculating(false);
      return;
    }

    // Cache miss: need to calculate
    console.log(`[VendorAnalytics] Cache MISS for strategy: ${strategy}, calculating...`);
    setCacheHit(false);
    setIsCalculating(true);

    // Use setTimeout to yield to browser and show loading state
    const timeoutId = setTimeout(() => {
      const startTime = performance.now();

      try {
        // Separate income and expense transactions
        const expenseTransactions = transactions.filter(tx => tx.categoryType === 'expense');
        const incomeTransactions = transactions.filter(tx => tx.categoryType === 'income');

        // Calculate vendor analytics
        const result: VendorAnalytics = {
          topExpensesByVendor: analyzeVendorsByType(expenseTransactions, 'expense', strategy, 5),
          topIncomeByVendor: analyzeVendorsByType(incomeTransactions, 'income', strategy, 5),
          topExpenseTransactions: analyzeTopTransactions(expenseTransactions, 'expense', 5),
          topIncomeTransactions: analyzeTopTransactions(incomeTransactions, 'income', 5)
        };

        const endTime = performance.now();
        console.log(`[VendorAnalytics] Calculated ${strategy} in ${(endTime - startTime).toFixed(2)}ms`);

        // Store in cache
        cacheRef.current.set(strategy, {
          strategy,
          transactionsHash,
          result,
          timestamp: Date.now()
        });

        setCurrentResult(result);
        setIsCalculating(false);
      } catch (error) {
        console.error(`[VendorAnalytics] Error calculating ${strategy}:`, error);
        setIsCalculating(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [transactions, transactionsHash, strategy]);

  // Clear stale cache entries (older than 5 minutes)
  useEffect(() => {
    const clearStaleCache = () => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      for (const [key, value] of cacheRef.current.entries()) {
        if (now - value.timestamp > fiveMinutes) {
          console.log(`[VendorAnalytics] Clearing stale cache for strategy: ${key}`);
          cacheRef.current.delete(key);
        }
      }
    };

    const intervalId = setInterval(clearStaleCache, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, []);

  return {
    vendorAnalytics: currentResult,
    isCalculating,
    cacheHit
  };
};
