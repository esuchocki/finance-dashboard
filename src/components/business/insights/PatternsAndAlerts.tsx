import React, { useMemo } from "react";
import { BusinessTransaction } from "@/lib/types";
import {
  detectDuplicates,
  detectRecurringTransactions,
  detectSubscriptions,
  detectBalanceDrops,
  analyzeTransactionFrequency,
  analyzeTransactionVolume,
  RecurringPattern,
  Subscription,
  BalanceDrop,
} from "@/lib/business/transactionAnalysis";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart3 } from "lucide-react";
import PatternSubscriptionDetail from "./PatternSubscriptionDetail";
import PatternRecurringDetail from "./PatternRecurringDetail";
import PatternBalanceDropDetail from "./PatternBalanceDropDetail";
import PatternDuplicateDetail from "./PatternDuplicateDetail";
import type { DuplicateGroup } from "./PatternDuplicateDetail";
import PatternAlertsSummary from "./PatternAlertsSummary";
import type { TransferPair } from "./PatternAlertsSummary";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatternsAndAlertsProps {
  transactions: BusinessTransaction[];
  intercompanyTransactions?: BusinessTransaction[];
}

type ViewMode = 'list' | 'subscription-detail' | 'recurring-detail' | 'balance-drop-detail' | 'duplicate-detail';

// ─── Component ────────────────────────────────────────────────────────────────

const PatternsAndAlerts: React.FC<PatternsAndAlertsProps> = ({ transactions, intercompanyTransactions = [] }) => {
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [selectedSubscription, setSelectedSubscription] = React.useState<Subscription | null>(null);
  const [selectedRecurring, setSelectedRecurring] = React.useState<RecurringPattern | null>(null);
  const [selectedBalanceDrop, setSelectedBalanceDrop] = React.useState<BalanceDrop | null>(null);
  const [selectedDuplicate, setSelectedDuplicate] = React.useState<DuplicateGroup | null>(null);

  const transferPairs = useMemo((): TransferPair[] => {
    const pairs: TransferPair[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < intercompanyTransactions.length; i++) {
      const tx1 = intercompanyTransactions[i];
      if (processed.has(tx1.id)) continue;

      for (let j = i + 1; j < intercompanyTransactions.length; j++) {
        const tx2 = intercompanyTransactions[j];
        if (processed.has(tx2.id)) continue;

        const sameAmount = Math.abs(tx1.amount - tx2.amount) <= 0.01;
        const daysDiff = Math.abs((tx1.date.getTime() - tx2.date.getTime()) / (1000 * 60 * 60 * 24));
        const withinTimeWindow = daysDiff <= 5;
        const differentAccounts = tx1.accountId !== tx2.accountId;
        const oppositeTypes =
          (tx1.categoryType === 'expense' && tx2.categoryType === 'income') ||
          (tx1.categoryType === 'income' && tx2.categoryType === 'expense');

        if (sameAmount && withinTimeWindow && differentAccounts && oppositeTypes) {
          const debit = tx1.categoryType === 'expense' ? tx1 : tx2;
          const credit = tx1.categoryType === 'income' ? tx1 : tx2;
          pairs.push({ debit, credit, daysDiff });
          processed.add(tx1.id);
          processed.add(tx2.id);
          break;
        }
      }
    }

    return pairs;
  }, [intercompanyTransactions]);

  const insights = useMemo(() => {
    if (transactions.length === 0) return null;

    const incomeTransactions = transactions.filter(tx => tx.categoryType === 'income');
    const recurringIncome = detectRecurringTransactions(incomeTransactions);
    const subscriptions = detectSubscriptions(transactions);
    const balanceDropResult = detectBalanceDrops(transactions, 0.15, subscriptions);

    return {
      duplicates: detectDuplicates(transactions),
      recurring: recurringIncome,
      subscriptions,
      balanceDrops: balanceDropResult.drops,
      balanceDropWarnings: balanceDropResult.warnings,
      frequency: analyzeTransactionFrequency(transactions),
      volume: analyzeTransactionVolume(transactions),
    };
  }, [transactions]);

  if (!insights || transactions.length === 0) {
    return (
      <Alert>
        <BarChart3 className="h-5 w-5" />
        <AlertTitle>No Insights Available</AlertTitle>
        <AlertDescription>
          Upload transactions to see patterns, duplicates, and other insights.
        </AlertDescription>
      </Alert>
    );
  }

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedSubscription(null);
    setSelectedRecurring(null);
    setSelectedBalanceDrop(null);
    setSelectedDuplicate(null);
  };

  if (viewMode === 'subscription-detail' && selectedSubscription) {
    return <PatternSubscriptionDetail subscription={selectedSubscription} onBack={handleBackToList} />;
  }
  if (viewMode === 'recurring-detail' && selectedRecurring) {
    return <PatternRecurringDetail pattern={selectedRecurring} onBack={handleBackToList} />;
  }
  if (viewMode === 'balance-drop-detail' && selectedBalanceDrop) {
    return <PatternBalanceDropDetail drop={selectedBalanceDrop} onBack={handleBackToList} />;
  }
  if (viewMode === 'duplicate-detail' && selectedDuplicate) {
    return <PatternDuplicateDetail group={selectedDuplicate} onBack={handleBackToList} />;
  }

  return (
    <PatternAlertsSummary
      insights={insights}
      transferPairs={transferPairs}
      onSubscriptionClick={sub => { setSelectedSubscription(sub); setViewMode('subscription-detail'); }}
      onRecurringClick={pattern => { setSelectedRecurring(pattern); setViewMode('recurring-detail'); }}
      onBalanceDropClick={drop => { setSelectedBalanceDrop(drop); setViewMode('balance-drop-detail'); }}
      onDuplicateClick={group => { setSelectedDuplicate(group); setViewMode('duplicate-detail'); }}
    />
  );
};

export default PatternsAndAlerts;
