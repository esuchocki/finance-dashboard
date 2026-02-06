import { useState, useEffect, useMemo } from 'react';
import {
  BankAccount,
  BusinessTransaction,
  BusinessFinancialSummary,
  ConsolidatedFinancialData
} from '@/lib/types';
import {
  consolidateTransactions,
  detectIntercompanyTransfers,
  calculateBusinessSummary
} from '@/lib/business/consolidation';

interface UseConsolidationProps {
  accounts: BankAccount[];
  selectedAccountIds: string[];
  getAccountTransactions: (accountId: string) => BusinessTransaction[];
}

interface UseConsolidationResult {
  consolidatedData: ConsolidatedFinancialData | null;
  consolidatedTransactions: BusinessTransaction[];
  consolidatedSummary: BusinessFinancialSummary | null;
  intercompanyTransactions: BusinessTransaction[];
  isConsolidating: boolean;
}

export const useConsolidation = ({
  accounts,
  selectedAccountIds,
  getAccountTransactions
}: UseConsolidationProps): UseConsolidationResult => {
  const [isConsolidating, setIsConsolidating] = useState(false);

  // Log when selectedAccountIds changes
  useEffect(() => {
    console.log('useConsolidation: selectedAccountIds changed', selectedAccountIds);
  }, [selectedAccountIds]);

  // Gather all transactions from selected accounts
  const allTransactions = useMemo(() => {
    if (selectedAccountIds.length === 0) return [];

    const txs: BusinessTransaction[] = [];

    selectedAccountIds.forEach(accountId => {
      const accountTxs = getAccountTransactions(accountId);
      if (accountTxs && accountTxs.length > 0) {
        txs.push(...accountTxs);
      }
    });

    console.log('useConsolidation: Gathered transactions', {
      selectedAccountIds,
      totalTransactions: txs.length
    });

    return txs;
  }, [selectedAccountIds, getAccountTransactions]);

  // Consolidate transactions and mark inter-account transfers
  const consolidatedTransactions = useMemo(() => {
    if (selectedAccountIds.length === 0 || allTransactions.length === 0) {
      console.log('useConsolidation: No transactions to consolidate');
      return [];
    }

    console.log('useConsolidation: Consolidating transactions', {
      allTransactionsCount: allTransactions.length,
      selectedAccountIds
    });

    setIsConsolidating(true);
    const result = consolidateTransactions(allTransactions, selectedAccountIds);

    // Detect transfers and mark them
    const intercompany = detectIntercompanyTransfers(result);
    const intercompanyIds = new Set(intercompany.map(tx => tx.id));

    // Mark transactions that are inter-account transfers
    const markedResult = result.map(tx => ({
      ...tx,
      isIntercompany: intercompanyIds.has(tx.id)
    }));

    console.log('useConsolidation: Consolidation complete', {
      consolidatedCount: markedResult.length,
      intercompanyCount: intercompany.length
    });

    setIsConsolidating(false);
    return markedResult;
  }, [allTransactions, selectedAccountIds]);

  // Get list of inter-account transfers
  const intercompanyTransactions = useMemo(() => {
    return consolidatedTransactions.filter(tx => tx.isIntercompany);
  }, [consolidatedTransactions]);

  // Calculate consolidated summary (fast - no vendor analytics)
  const consolidatedSummary = useMemo(() => {
    if (consolidatedTransactions.length === 0) return null;

    console.log('useConsolidation: Calculating summary (no vendor analytics)');
    return calculateBusinessSummary(
      consolidatedTransactions,
      accounts,
      selectedAccountIds,
      true // Eliminate transfers between accounts
    );
  }, [consolidatedTransactions, accounts, selectedAccountIds]);

  // Create consolidated data object
  const consolidatedData = useMemo<ConsolidatedFinancialData | null>(() => {
    if (!consolidatedSummary) return null;

    return {
      accounts: accounts.filter(a => selectedAccountIds.includes(a.id)),
      selectedAccountIds,
      consolidatedTransactions,
      consolidatedSummary,
      intercompanyTransactions,
      lastConsolidated: new Date()
    };
  }, [
    accounts,
    selectedAccountIds,
    consolidatedTransactions,
    consolidatedSummary,
    intercompanyTransactions
  ]);

  return {
    consolidatedData,
    consolidatedTransactions,
    consolidatedSummary,
    intercompanyTransactions,
    isConsolidating
  };
};
