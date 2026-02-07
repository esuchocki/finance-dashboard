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
  BalanceDropWarning,
  BalanceDrop
} from "@/lib/business/transactionAnalysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  Copy,
  Repeat,
  CreditCard,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  ArrowLeft,
  TrendingUp as TrendingUpIcon,
  Minus,
  AlertCircle
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import RecurringTotalsCard from "./RecurringTotalsCard";
import { getFrequencyLabel } from "@/lib/business/enhancedPatternAnalysis";

interface PatternsAndAlertsProps {
  transactions: BusinessTransaction[];
  intercompanyTransactions?: BusinessTransaction[];
}

type ViewMode = 'list' | 'subscription-detail' | 'recurring-detail' | 'balance-drop-detail';

// Helper component for trend indicator
const TrendIndicator: React.FC<{ trend: any }> = ({ trend }) => {
  if (!trend || trend.direction === 'stable') {
    return (
      <Badge variant="outline" className="text-xs bg-gray-50">
        <Minus className="h-3 w-3 mr-1" />
        Stable
      </Badge>
    );
  }

  const isIncreasing = trend.direction === 'increasing';
  const color = isIncreasing ? 'red' : 'green';

  return (
    <Badge variant="outline" className={`text-xs bg-${color}-50 text-${color}-700 border-${color}-200`}>
      {isIncreasing ? (
        <TrendingUpIcon className="h-3 w-3 mr-1" />
      ) : (
        <TrendingDown className="h-3 w-3 mr-1" />
      )}
      {isIncreasing ? 'Increasing' : 'Decreasing'} ({trend.strength})
    </Badge>
  );
};

const PatternsAndAlerts: React.FC<PatternsAndAlertsProps> = ({ transactions, intercompanyTransactions = [] }) => {
  const [showDuplicates, setShowDuplicates] = React.useState(false);
  const [showRecurring, setShowRecurring] = React.useState(false);
  const [showSubscriptions, setShowSubscriptions] = React.useState(false);
  const [showBalanceDrops, setShowBalanceDrops] = React.useState(false);
  const [showIntercompany, setShowIntercompany] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [selectedSubscription, setSelectedSubscription] = React.useState<Subscription | null>(null);
  const [selectedRecurring, setSelectedRecurring] = React.useState<RecurringPattern | null>(null);
  const [selectedBalanceDrop, setSelectedBalanceDrop] = React.useState<BalanceDrop | null>(null);

  // Group inter-account transfers into pairs
  // Updated to handle multi-day transfers (up to 5 days apart)
  const transferPairs = React.useMemo(() => {
    const pairs: Array<{
      debit: BusinessTransaction;
      credit: BusinessTransaction;
      daysDiff: number;
    }> = [];
    const processed = new Set<string>();

    for (let i = 0; i < intercompanyTransactions.length; i++) {
      const tx1 = intercompanyTransactions[i];
      if (processed.has(tx1.id)) continue;

      for (let j = i + 1; j < intercompanyTransactions.length; j++) {
        const tx2 = intercompanyTransactions[j];
        if (processed.has(tx2.id)) continue;

        // Check if they're a matching pair (same amount, within 5 days, different accounts)
        const sameAmount = Math.abs(tx1.amount - tx2.amount) <= 0.01;

        // Calculate days difference (expanded from same-day to 5-day window)
        const daysDiff = Math.abs(
          (tx1.date.getTime() - tx2.date.getTime()) / (1000 * 60 * 60 * 24)
        );
        const withinTimeWindow = daysDiff <= 5;

        const differentAccounts = tx1.accountId !== tx2.accountId;

        // Check opposite transaction types
        const oppositeTypes =
          (tx1.categoryType === 'expense' && tx2.categoryType === 'income') ||
          (tx1.categoryType === 'income' && tx2.categoryType === 'expense');

        if (sameAmount && withinTimeWindow && differentAccounts && oppositeTypes) {
          // Determine which is debit (expense/withdrawal) and which is credit (income/deposit)
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

    // Recurring transactions = recurring INCOME (money coming in)
    const incomeTransactions = transactions.filter(tx => tx.categoryType === 'income');
    const recurringIncome = detectRecurringTransactions(incomeTransactions);

    // Detect subscriptions first so we can use them for balance drop analysis
    const subscriptions = detectSubscriptions(transactions);

    // Detect balance drops with improved analysis (returns { drops, warnings })
    const balanceDropResult = detectBalanceDrops(transactions, 0.15, subscriptions);

    return {
      duplicates: detectDuplicates(transactions),
      recurring: recurringIncome,
      subscriptions,
      balanceDrops: balanceDropResult.drops,
      balanceDropWarnings: balanceDropResult.warnings,
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

  const activeRecurring = insights.recurring.filter(r => r.isActive);
  const cancelledRecurring = insights.recurring.filter(r => !r.isActive);

  const handleSubscriptionClick = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setViewMode('subscription-detail');
  };

  const handleRecurringClick = (pattern: RecurringPattern) => {
    setSelectedRecurring(pattern);
    setViewMode('recurring-detail');
  };

  const handleBalanceDropClick = (drop: BalanceDrop) => {
    setSelectedBalanceDrop(drop);
    setViewMode('balance-drop-detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedSubscription(null);
    setSelectedRecurring(null);
    setSelectedBalanceDrop(null);
  };

  // Prepare timeline data for subscription or recurring transaction
  const timelineData = useMemo(() => {
    const txs = viewMode === 'subscription-detail'
      ? selectedSubscription?.transactions
      : selectedRecurring?.transactions;

    if (!txs || txs.length === 0) return [];

    return txs.map(tx => ({
      date: new Date(tx.date).getTime(),
      amount: tx.amount,
      dateLabel: formatDate(tx.date),
      name: tx.name || tx.payee || 'Unknown',
      accountName: tx.accountName,
      institutionName: tx.institutionName
    }));
  }, [viewMode, selectedSubscription, selectedRecurring]);

  // Show detail view if in detail mode
  if (viewMode === 'subscription-detail' && selectedSubscription) {
    const txs = selectedSubscription.transactions;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Subscription: {selectedSubscription.merchantName}</CardTitle>
          </div>
          <CardDescription>
            {selectedSubscription.frequency === 'monthly' ? 'Monthly' : 'Annual'} subscription •{' '}
            {selectedSubscription.isActive ? 'Active' : 'Cancelled'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToList}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patterns
          </Button>

          <div className="max-h-[700px] overflow-y-auto space-y-6 pr-2">
            {/* Timeline Chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Payment Timeline</h4>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="amount"
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                              <div className="font-medium">{data.name}</div>
                              <div className="text-xs text-muted-foreground">{data.accountName}</div>
                              <div className="text-muted-foreground mt-1">{data.dateLabel}</div>
                              <div className="font-bold text-orange-600 mt-1">
                                {formatCurrency(data.amount)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter data={timelineData} fill="#F59E0B" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 p-4 rounded-lg grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Account</p>
                <p className="font-medium">{selectedSubscription.accountName || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Cost</p>
                <p className="font-medium">{formatCurrency(selectedSubscription.monthlyAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="font-medium">{formatCurrency(selectedSubscription.totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Count</p>
                <p className="font-medium">{selectedSubscription.transactionCount} payments</p>
              </div>
            </div>

            {/* Trend Analysis */}
            {selectedSubscription.trend && selectedSubscription.trend.direction !== 'stable' && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900">Trend Detected</AlertTitle>
                <AlertDescription className="text-blue-800">
                  This subscription shows a <strong>{selectedSubscription.trend.strength}</strong> {selectedSubscription.trend.direction} trend.
                  Amount has changed by <strong>{formatCurrency(Math.abs(selectedSubscription.trend.totalChange))}</strong> ({selectedSubscription.trend.changePercentage > 0 ? '+' : ''}{selectedSubscription.trend.changePercentage.toFixed(1)}%) over time.
                </AlertDescription>
              </Alert>
            )}

            {/* Amount Change History */}
            {selectedSubscription.amountHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Amount Change History</h4>
                <div className="border rounded-md p-3 space-y-2">
                  {selectedSubscription.amountHistory.map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">{formatDate(change.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{formatCurrency(change.previousAmount)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{formatCurrency(change.newAmount)}</span>
                        <Badge variant={change.changePercentage > 0 ? "destructive" : "default"} className="text-xs">
                          {change.changePercentage > 0 ? '+' : ''}{change.changePercentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prediction */}
            {selectedSubscription.prediction && selectedSubscription.prediction.confidence !== 'low' && (
              <Alert className="bg-purple-50 border-purple-200">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                <AlertTitle className="text-purple-900">Next Payment Prediction</AlertTitle>
                <AlertDescription className="text-purple-800">
                  Expected amount: <strong>{formatCurrency(selectedSubscription.prediction.nextExpectedAmount)}</strong>
                  <br />
                  Range: {formatCurrency(selectedSubscription.prediction.predictionRange.min)} - {formatCurrency(selectedSubscription.prediction.predictionRange.max)}
                  <br />
                  Confidence: <strong>{selectedSubscription.prediction.confidence}</strong> ({(selectedSubscription.prediction.confidenceScore * 100).toFixed(0)}%)
                </AlertDescription>
              </Alert>
            )}

            {/* Anomalies */}
            {selectedSubscription.anomalies.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Anomalies Detected</h4>
                <div className="space-y-2">
                  {selectedSubscription.anomalies.map((anomaly, idx) => (
                    <Alert key={idx} className="bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-900 text-sm">
                        <strong>{formatDate(anomaly.transaction.date)}</strong>: {anomaly.reason}
                        <br />
                        Expected: {formatCurrency(anomaly.expectedAmount)}, Actual: {formatCurrency(anomaly.actualAmount)}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction Table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.map((tx, index) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm tabular-nums">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {tx.name || tx.payee || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.accountName}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-orange-600">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'recurring-detail' && selectedRecurring) {
    const txs = selectedRecurring.transactions;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            <CardTitle>Recurring: {selectedRecurring.merchantName}</CardTitle>
          </div>
          <CardDescription>
            {selectedRecurring.frequency} pattern • {selectedRecurring.confidence} confidence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToList}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patterns
          </Button>

          <div className="max-h-[700px] overflow-y-auto space-y-6 pr-2">
            {/* Timeline Chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Transaction Timeline</h4>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="amount"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                              <div className="font-medium">{data.name}</div>
                              <div className="text-xs text-muted-foreground">{data.accountName}</div>
                              <div className="text-muted-foreground mt-1">{data.dateLabel}</div>
                              <div className="font-bold text-green-600 mt-1">
                                {formatCurrency(data.amount)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter data={timelineData} fill="#10B981" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 p-4 rounded-lg grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Frequency</p>
                <p className="font-medium">{getFrequencyLabel(selectedRecurring)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Amount</p>
                <p className="font-medium">{formatCurrency(selectedRecurring.currentAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Occurrences</p>
                <p className="font-medium">{selectedRecurring.transactions.length} times</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Days Between</p>
                <p className="font-medium">{selectedRecurring.averageDaysBetween.toFixed(0)} days</p>
              </div>
            </div>

            {/* Trend Analysis */}
            {selectedRecurring.trend && selectedRecurring.trend.direction !== 'stable' && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900">Trend Detected</AlertTitle>
                <AlertDescription className="text-blue-800">
                  This recurring income shows a <strong>{selectedRecurring.trend.strength}</strong> {selectedRecurring.trend.direction} trend.
                  Amount has changed by <strong>{formatCurrency(Math.abs(selectedRecurring.trend.totalChange))}</strong> ({selectedRecurring.trend.changePercentage > 0 ? '+' : ''}{selectedRecurring.trend.changePercentage.toFixed(1)}%) over time.
                </AlertDescription>
              </Alert>
            )}

            {/* Amount Change History */}
            {selectedRecurring.amountHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Amount Change History</h4>
                <div className="border rounded-md p-3 space-y-2">
                  {selectedRecurring.amountHistory.map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">{formatDate(change.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{formatCurrency(change.previousAmount)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{formatCurrency(change.newAmount)}</span>
                        <Badge variant={change.changePercentage > 0 ? "default" : "destructive"} className="text-xs">
                          {change.changePercentage > 0 ? '+' : ''}{change.changePercentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prediction */}
            {selectedRecurring.prediction && selectedRecurring.prediction.confidence !== 'low' && (
              <Alert className="bg-purple-50 border-purple-200">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                <AlertTitle className="text-purple-900">Next Transaction Prediction</AlertTitle>
                <AlertDescription className="text-purple-800">
                  Expected amount: <strong>{formatCurrency(selectedRecurring.prediction.nextExpectedAmount)}</strong>
                  <br />
                  Range: {formatCurrency(selectedRecurring.prediction.predictionRange.min)} - {formatCurrency(selectedRecurring.prediction.predictionRange.max)}
                  <br />
                  Confidence: <strong>{selectedRecurring.prediction.confidence}</strong> ({(selectedRecurring.prediction.confidenceScore * 100).toFixed(0)}%)
                </AlertDescription>
              </Alert>
            )}

            {/* Anomalies */}
            {selectedRecurring.anomalies.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Anomalies Detected</h4>
                <div className="space-y-2">
                  {selectedRecurring.anomalies.map((anomaly, idx) => (
                    <Alert key={idx} className="bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-900 text-sm">
                        <strong>{formatDate(anomaly.transaction.date)}</strong>: {anomaly.reason}
                        <br />
                        Expected: {formatCurrency(anomaly.expectedAmount)}, Actual: {formatCurrency(anomaly.actualAmount)}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction Table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.map((tx, index) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm tabular-nums">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {tx.name || tx.payee || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.accountName}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-green-600">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'balance-drop-detail' && selectedBalanceDrop) {
    const drop = selectedBalanceDrop;
    const severityColors = {
      critical: 'bg-red-50 border-red-300',
      warning: 'bg-orange-50 border-orange-200',
      info: 'bg-blue-50 border-blue-200'
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            <CardTitle>Balance Drop: {drop.date.toLocaleDateString()}</CardTitle>
          </div>
          <CardDescription>
            {drop.accountName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToList}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patterns
          </Button>

          <div className="max-h-[700px] overflow-y-auto space-y-6 pr-2">
            {/* Drop Summary */}
            <Alert className={severityColors[drop.severity]}>
              <TrendingDown className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                <span>Balance Drop Details</span>
                <Badge variant={drop.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                  {drop.severity}
                </Badge>
                {drop.isLikelyNormal && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Likely Normal
                  </Badge>
                )}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Balance Before:</span>
                      <span className="ml-2 font-medium">{formatCurrency(drop.balanceBefore)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Balance After:</span>
                      <span className="ml-2 font-medium">{formatCurrency(drop.balanceAfter)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Drop Amount:</span>
                      <span className="ml-2 font-medium text-orange-600">{formatCurrency(drop.dropAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Drop Percentage:</span>
                      <span className="ml-2 font-medium text-orange-600">{(drop.dropPercentage * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Causing Transactions Table */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                Transactions on {drop.date.toLocaleDateString()} ({drop.causingTransactions.length} total)
              </h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drop.causingTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm tabular-nums">
                          {formatDate(tx.date)}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {tx.name || tx.payee || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.category}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-orange-600">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Monthly Recurring Summary */}
      <RecurringTotalsCard
        subscriptions={insights.subscriptions}
        recurringTransactions={insights.recurring}
      />

      {/* Inter-Account Transfers */}
      {intercompanyTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  <CardTitle>Inter-Account Transfers</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {transferPairs.length}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {transferPairs.length} transfer{transferPairs.length === 1 ? '' : 's'} between your accounts detected and eliminated from consolidated totals to avoid double-counting
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIntercompany(!showIntercompany)}
                aria-label={showIntercompany ? "Collapse inter-account transfers" : "Expand inter-account transfers"}
                aria-expanded={showIntercompany}
                title={showIntercompany ? "Collapse section" : "Expand section"}
              >
                {showIntercompany ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
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

              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {transferPairs.map((pair, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                          {pair.debit.date.toLocaleDateString()}
                          {pair.daysDiff > 0 && (
                            <span className="ml-1 text-xs">
                              → {pair.credit.date.toLocaleDateString()} ({Math.round(pair.daysDiff)}d)
                            </span>
                          )}
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Subscriptions</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {activeSubs.length}
                </Badge>
                {cancelledSubs.length > 0 && (
                  <Badge variant="outline" className="ml-1">
                    {cancelledSubs.length} cancelled
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-2">
                {activeSubs.length} active subscription{activeSubs.length === 1 ? '' : 's'} • Total: {formatCurrency(activeSubs.reduce((sum, s) => sum + s.monthlyAmount, 0))}/month
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSubscriptions(!showSubscriptions)}
              aria-label={showSubscriptions ? "Collapse subscriptions" : "Expand subscriptions"}
              aria-expanded={showSubscriptions}
              title={showSubscriptions ? "Collapse section" : "Expand section"}
            >
              {showSubscriptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {showSubscriptions && (
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
              {activeSubs.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold">Active Subscriptions</h4>
                  {activeSubs.map((sub, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleSubscriptionClick(sub)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium capitalize">{sub.merchantName}</p>
                          {sub.hasAmountChanges && (
                            <AlertCircle className="h-4 w-4 text-amber-500" title="Amount changed" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sub.frequency === 'monthly' ? 'Monthly' : sub.frequency === 'annual' ? 'Annual' : sub.frequency === 'semi-monthly' ? 'Semi-monthly' : 'Bi-monthly'} •{' '}
                          Since {sub.startDate.toLocaleDateString()} •{' '}
                          {sub.transactionCount} payments
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{sub.accountName || 'Unknown Account'}</Badge>
                          {sub.trend && <TrendIndicator trend={sub.trend} />}
                          {sub.anomalies.length > 0 && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                              {sub.anomalies.length} anomal{sub.anomalies.length === 1 ? 'y' : 'ies'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(sub.monthlyAmount)}/mo</p>
                        <p className="text-xs text-muted-foreground">
                          Total: {formatCurrency(sub.totalPaid)}
                        </p>
                        {sub.prediction && sub.prediction.confidence !== 'low' && (
                          <p className="text-xs text-blue-600 mt-1">
                            Next: ~{formatCurrency(sub.prediction.nextExpectedAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {cancelledSubs.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold mt-4">Cancelled Subscriptions</h4>
                  {cancelledSubs.map((sub, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg opacity-60 hover:opacity-100 hover:bg-accent cursor-pointer transition-all"
                      onClick={() => handleSubscriptionClick(sub)}
                    >
                      <div className="flex-1">
                        <p className="font-medium capitalize">{sub.merchantName}</p>
                        <p className="text-xs text-muted-foreground">
                          Last payment: {sub.lastChargeDate.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">{sub.accountName || 'Unknown Account'}</Badge>
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  <CardTitle>Balance Drops</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {insights.balanceDrops.length}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {insights.balanceDrops.length} significant drop{insights.balanceDrops.length === 1 ? '' : 's'} detected (15%+ threshold)
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalanceDrops(!showBalanceDrops)}
                aria-label={showBalanceDrops ? "Collapse balance drops" : "Expand balance drops"}
                aria-expanded={showBalanceDrops}
                title={showBalanceDrops ? "Collapse section" : "Expand section"}
              >
                {showBalanceDrops ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showBalanceDrops && (
            <CardContent>
              {/* Display warnings from improved analysis */}
              {insights.balanceDropWarnings && insights.balanceDropWarnings.length > 0 && (
                <div className="mb-4 space-y-2">
                  {insights.balanceDropWarnings.map((warning, idx) => (
                    <Alert key={idx} variant={warning.type === 'error' ? 'destructive' : 'default'} className={
                      warning.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      warning.type === 'info' ? 'bg-blue-50 border-blue-200' : ''
                    }>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {warning.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {insights.balanceDrops.map((drop, idx) => {
                  // Determine alert styling based on severity
                  const severityColors = {
                    critical: 'bg-red-50 border-red-300',
                    warning: 'bg-orange-50 border-orange-200',
                    info: 'bg-blue-50 border-blue-200'
                  };

                  const severityIconColors = {
                    critical: 'text-red-600',
                    warning: 'text-orange-600',
                    info: 'text-blue-600'
                  };

                  return (
                    <Alert
                      key={idx}
                      className={`${severityColors[drop.severity]} cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => handleBalanceDropClick(drop)}
                    >
                      <TrendingDown className={`h-4 w-4 ${severityIconColors[drop.severity]}`} />
                      <AlertTitle className="flex items-center gap-2">
                        <span>{drop.date.toLocaleDateString()}</span>
                        <Badge variant={drop.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                          {drop.severity}
                        </Badge>
                        {drop.isLikelyNormal && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Likely Normal
                          </Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium">{drop.accountName}</p>
                          <p>
                            Balance dropped by {formatCurrency(drop.dropAmount)} (
                            {(drop.dropPercentage * 100).toFixed(1)}%)
                          </p>
                          <p className="text-xs">
                            {formatCurrency(drop.balanceBefore)} → {formatCurrency(drop.balanceAfter)}
                          </p>
                          {drop.causingTransactions.length > 0 && (
                            <p className="text-xs mt-2">
                              Caused by {drop.causingTransactions.length} transaction(s). Click to view details.
                            </p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  );
                })}
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Copy className="h-5 w-5 text-yellow-600" />
                  <CardTitle>Potential Duplicates</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {insights.duplicates.length}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {insights.duplicates.length} group{insights.duplicates.length === 1 ? '' : 's'} of potential duplicate transactions found
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDuplicates(!showDuplicates)}
                aria-label={showDuplicates ? "Collapse potential duplicates" : "Expand potential duplicates"}
                aria-expanded={showDuplicates}
                title={showDuplicates ? "Collapse section" : "Expand section"}
              >
                {showDuplicates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showDuplicates && (
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {insights.duplicates.map((group, idx) => (
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  <CardTitle>Recurring Transactions</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {activeRecurring.length}
                  </Badge>
                  {cancelledRecurring.length > 0 && (
                    <Badge variant="outline" className="ml-1">
                      {cancelledRecurring.length} cancelled
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-2">
                  {activeRecurring.length} active recurring income pattern{activeRecurring.length === 1 ? '' : 's'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecurring(!showRecurring)}
                aria-label={showRecurring ? "Collapse recurring transactions" : "Expand recurring transactions"}
                aria-expanded={showRecurring}
                title={showRecurring ? "Collapse section" : "Expand section"}
              >
                {showRecurring ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showRecurring && (
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {activeRecurring.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold">Active Recurring Transactions</h4>
                    {activeRecurring.map((pattern, idx) => {
                      const firstTx = pattern.transactions[0];
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => handleRecurringClick(pattern)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium capitalize text-sm">{pattern.merchantName}</p>
                              {pattern.hasAmountChanges && (
                                <AlertCircle className="h-4 w-4 text-amber-500" title="Amount changed" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getFrequencyLabel(pattern)} • {pattern.transactions.length} occurrences • {pattern.confidence} confidence
                            </p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{firstTx.accountName}</Badge>
                              {pattern.trend && <TrendIndicator trend={pattern.trend} />}
                              {pattern.anomalies.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                                  {pattern.anomalies.length} anomal{pattern.anomalies.length === 1 ? 'y' : 'ies'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(pattern.currentAmount)}</p>
                            {pattern.prediction && pattern.prediction.confidence !== 'low' && (
                              <p className="text-xs text-blue-600 mt-1">
                                Next: ~{formatCurrency(pattern.prediction.nextExpectedAmount)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                {cancelledRecurring.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold mt-4">Cancelled Recurring Transactions</h4>
                    {cancelledRecurring.map((pattern, idx) => {
                      const firstTx = pattern.transactions[0];
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg opacity-60 hover:opacity-100 hover:bg-accent cursor-pointer transition-all"
                          onClick={() => handleRecurringClick(pattern)}
                        >
                          <div className="flex-1">
                            <p className="font-medium capitalize text-sm">{pattern.merchantName}</p>
                            <p className="text-xs text-muted-foreground">
                              Last transaction: {pattern.lastTransactionDate.toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <Badge variant="outline" className="text-xs">{firstTx.accountName}</Badge>
                            </p>
                          </div>
                          <Badge variant="outline">Cancelled</Badge>
                        </div>
                      );
                    })}
                  </>
                )}
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
