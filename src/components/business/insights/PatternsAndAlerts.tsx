import React, { useMemo } from "react";
import { BusinessTransaction } from "@/lib/types";
import {
  detectDuplicates,
  detectRecurringTransactions,
  detectSubscriptions,
  detectBalanceDrops,
  analyzeTransactionFrequency,
  analyzeTransactionVolume
} from "@/lib/business/transactionAnalysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Copy,
  Repeat,
  CreditCard,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface PatternsAndAlertsProps {
  transactions: BusinessTransaction[];
  intercompanyTransactions?: BusinessTransaction[];
}

const PatternsAndAlerts: React.FC<PatternsAndAlertsProps> = ({ transactions, intercompanyTransactions = [] }) => {
  const [showDuplicates, setShowDuplicates] = React.useState(false);
  const [showRecurring, setShowRecurring] = React.useState(false);
  const [showSubscriptions, setShowSubscriptions] = React.useState(true);
  const [showBalanceDrops, setShowBalanceDrops] = React.useState(true);
  const [showIntercompany, setShowIntercompany] = React.useState(true);

  // Group inter-account transfers into pairs
  const transferPairs = React.useMemo(() => {
    const pairs: Array<{ debit: BusinessTransaction; credit: BusinessTransaction }> = [];
    const processed = new Set<string>();

    for (let i = 0; i < intercompanyTransactions.length; i++) {
      const tx1 = intercompanyTransactions[i];
      if (processed.has(tx1.id)) continue;

      for (let j = i + 1; j < intercompanyTransactions.length; j++) {
        const tx2 = intercompanyTransactions[j];
        if (processed.has(tx2.id)) continue;

        // Check if they're a matching pair (same amount, same date, different accounts)
        const sameAmount = Math.abs(tx1.amount - tx2.amount) <= 0.01;
        const sameDay =
          tx1.date.getFullYear() === tx2.date.getFullYear() &&
          tx1.date.getMonth() === tx2.date.getMonth() &&
          tx1.date.getDate() === tx2.date.getDate();
        const differentAccounts = tx1.accountId !== tx2.accountId;

        if (sameAmount && sameDay && differentAccounts) {
          // Determine which is debit and which is credit
          const debit = tx1.type === 'DEBIT' ? tx1 : tx2;
          const credit = tx1.type === 'CREDIT' ? tx1 : tx2;
          pairs.push({ debit, credit });
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

    return {
      duplicates: detectDuplicates(transactions),
      recurring: detectRecurringTransactions(transactions),
      subscriptions: detectSubscriptions(transactions),
      balanceDrops: detectBalanceDrops(transactions, 0.15),
      frequency: analyzeTransactionFrequency(transactions),
      volume: analyzeTransactionVolume(transactions)
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

  const activeSubs = insights.subscriptions.filter(s => s.isActive);
  const cancelledSubs = insights.subscriptions.filter(s => !s.isActive);

  return (
    <div className="space-y-4">
      {/* Inter-Account Transfers */}
      {intercompanyTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                <CardTitle>Inter-Account Transfers</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIntercompany(!showIntercompany)}
              >
                {showIntercompany ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              {transferPairs.length} transfer{transferPairs.length === 1 ? '' : 's'} between your accounts detected and eliminated from consolidated totals to avoid double-counting
            </CardDescription>
          </CardHeader>
          {showIntercompany && (
            <CardContent>
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <span className="font-medium">What are inter-account transfers?</span>
                  <br />
                  When you move money between your own accounts (e.g., from checking to savings), it appears as both
                  an expense in one account and income in another. These transactions are automatically eliminated from
                  your consolidated totals to prevent inflating both income and expenses.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {transferPairs.map((pair, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                          {pair.debit.date.toLocaleDateString()}
                        </Badge>
                        <span className="text-sm font-semibold">{formatCurrency(pair.debit.amount)}</span>
                      </div>
                    </div>

                    {/* Transfer visualization */}
                    <div className="flex items-center gap-3">
                      {/* From account (debit/withdrawal) */}
                      <div className="flex-1 p-3 bg-white border border-red-200 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            FROM
                          </Badge>
                          <span className="text-xs text-muted-foreground">Withdrawal</span>
                        </div>
                        <p className="font-medium text-sm">{pair.debit.accountName}</p>
                        <p className="text-xs text-muted-foreground">{pair.debit.institutionName}</p>
                        {pair.debit.description && (
                          <p className="text-xs text-muted-foreground mt-1">{pair.debit.description}</p>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0">
                        <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                      </div>

                      {/* To account (credit/deposit) */}
                      <div className="flex-1 p-3 bg-white border border-green-200 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            TO
                          </Badge>
                          <span className="text-xs text-muted-foreground">Deposit</span>
                        </div>
                        <p className="font-medium text-sm">{pair.credit.accountName}</p>
                        <p className="text-xs text-muted-foreground">{pair.credit.institutionName}</p>
                        {pair.credit.description && (
                          <p className="text-xs text-muted-foreground mt-1">{pair.credit.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Subscriptions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Subscriptions</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSubscriptions(!showSubscriptions)}
            >
              {showSubscriptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          <CardDescription>
            {activeSubs.length} active, {cancelledSubs.length} cancelled
          </CardDescription>
        </CardHeader>
        {showSubscriptions && (
          <CardContent>
            <div className="space-y-3">
              {activeSubs.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold">Active Subscriptions</h4>
                  {activeSubs.map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{sub.merchantName}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.frequency === 'monthly' ? 'Monthly' : 'Annual'} •{' '}
                          Since {sub.startDate.toLocaleDateString()} •{' '}
                          {sub.transactionCount} payments
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(sub.monthlyAmount)}/mo</p>
                        <p className="text-xs text-muted-foreground">
                          Total: {formatCurrency(sub.totalPaid)}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {cancelledSubs.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold mt-4">Cancelled Subscriptions</h4>
                  {cancelledSubs.map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg opacity-60">
                      <div>
                        <p className="font-medium capitalize">{sub.merchantName}</p>
                        <p className="text-xs text-muted-foreground">
                          Last payment: {sub.lastChargeDate.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">Cancelled</Badge>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Balance Drops */}
      {insights.balanceDrops.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <CardTitle>Balance Drops</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalanceDrops(!showBalanceDrops)}
              >
                {showBalanceDrops ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              {insights.balanceDrops.length} significant drops detected (15%+)
            </CardDescription>
          </CardHeader>
          {showBalanceDrops && (
            <CardContent>
              <div className="space-y-3">
                {insights.balanceDrops.slice(0, 5).map((drop, idx) => (
                  <Alert key={idx} className="bg-orange-50 border-orange-200">
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                    <AlertTitle>{drop.date.toLocaleDateString()}</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>
                          Balance dropped by {formatCurrency(drop.dropAmount)} (
                          {(drop.dropPercentage * 100).toFixed(1)}%)
                        </p>
                        <p className="text-xs">
                          {formatCurrency(drop.balanceBefore)} → {formatCurrency(drop.balanceAfter)}
                        </p>
                        {drop.causingTransactions.length > 0 && (
                          <p className="text-xs mt-2">
                            Caused by {drop.causingTransactions.length} transaction(s)
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Duplicates */}
      {insights.duplicates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-yellow-600" />
                <CardTitle>Potential Duplicates</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDuplicates(!showDuplicates)}
              >
                {showDuplicates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              {insights.duplicates.length} groups of potential duplicate transactions
            </CardDescription>
          </CardHeader>
          {showDuplicates && (
            <CardContent>
              <div className="space-y-3">
                {insights.duplicates.slice(0, 5).map((group, idx) => (
                  <Alert key={idx} className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle>
                      {group.transactions.length} transactions
                    </AlertTitle>
                    <AlertDescription>
                      <div className="space-y-1 mt-2">
                        <p className="text-sm">{group.reason}</p>
                        {group.transactions.map(tx => (
                          <div key={tx.id} className="text-xs">
                            {tx.date.toLocaleDateString()} • {tx.name || tx.payee} • {formatCurrency(tx.amount)}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Recurring Transactions */}
      {insights.recurring.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                <CardTitle>Recurring Transactions</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecurring(!showRecurring)}
              >
                {showRecurring ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              {insights.recurring.length} recurring patterns detected
            </CardDescription>
          </CardHeader>
          {showRecurring && (
            <CardContent>
              <div className="space-y-2">
                {insights.recurring.slice(0, 10).map((pattern, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium capitalize text-sm">{pattern.merchantName}</p>
                      <p className="text-xs text-muted-foreground">
                        {pattern.frequency} • {pattern.transactions.length} occurrences
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(pattern.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Transaction Patterns */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle>Transaction Patterns</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Average per day</p>
              <p className="text-2xl font-semibold">{insights.frequency.averagePerDay.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Peak day</p>
              <p className="text-2xl font-semibold">{insights.frequency.peakDay}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Median transaction</p>
              <p className="text-2xl font-semibold">{formatCurrency(insights.volume.medianTransactionSize)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total volume</p>
              <p className="text-2xl font-semibold">{formatCurrency(insights.volume.totalVolume)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatternsAndAlerts;
