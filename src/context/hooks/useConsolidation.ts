import { useState, useEffect, useMemo } from 'react';
import {
  BusinessEntity,
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
  entities: BusinessEntity[];
  selectedEntityIds: string[];
  getEntityTransactions: (entityId: string) => BusinessTransaction[];
}

interface UseConsolidationResult {
  consolidatedData: ConsolidatedFinancialData | null;
  consolidatedTransactions: BusinessTransaction[];
  consolidatedSummary: BusinessFinancialSummary | null;
  intercompanyTransactions: BusinessTransaction[];
  isConsolidating: boolean;
}

export const useConsolidation = ({
  entities,
  selectedEntityIds,
  getEntityTransactions
}: UseConsolidationProps): UseConsolidationResult => {
  const [isConsolidating, setIsConsolidating] = useState(false);

  // Gather all transactions from selected entities
  const allTransactions = useMemo(() => {
    const txs: BusinessTransaction[] = [];

    selectedEntityIds.forEach(entityId => {
      const entityTxs = getEntityTransactions(entityId);
      txs.push(...entityTxs);
    });

    return txs;
  }, [selectedEntityIds, getEntityTransactions]);

  // Consolidate transactions
  const consolidatedTransactions = useMemo(() => {
    if (selectedEntityIds.length === 0) return [];

    setIsConsolidating(true);
    const result = consolidateTransactions(allTransactions, selectedEntityIds);
    setIsConsolidating(false);

    return result;
  }, [allTransactions, selectedEntityIds]);

  // Detect intercompany transfers
  const intercompanyTransactions = useMemo(() => {
    if (consolidatedTransactions.length === 0) return [];
    return detectIntercompanyTransfers(consolidatedTransactions);
  }, [consolidatedTransactions]);

  // Calculate consolidated summary
  const consolidatedSummary = useMemo(() => {
    if (consolidatedTransactions.length === 0) return null;

    return calculateBusinessSummary(
      consolidatedTransactions,
      entities,
      selectedEntityIds,
      true // Eliminate intercompany transactions
    );
  }, [consolidatedTransactions, entities, selectedEntityIds]);

  // Create consolidated data object
  const consolidatedData = useMemo<ConsolidatedFinancialData | null>(() => {
    if (!consolidatedSummary) return null;

    return {
      entities: entities.filter(e => selectedEntityIds.includes(e.id)),
      selectedEntityIds,
      consolidatedTransactions,
      consolidatedSummary,
      intercompanyTransactions,
      lastConsolidated: new Date()
    };
  }, [
    entities,
    selectedEntityIds,
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
