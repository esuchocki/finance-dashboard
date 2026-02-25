import React from "react";
import { BusinessTransaction } from "@/lib/types";
import {
  RecurringPattern,
  Subscription,
  BalanceDrop,
  BalanceDropWarning,
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
  ArrowRightLeft,
  TrendingUp as TrendingUpIcon,
  Minus,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import RecurringTotalsCard from "./RecurringTotalsCard";
import { getFrequencyLabel } from "@/lib/business/enhancedPatternAnalysis";
import type { DuplicateGroup } from "./PatternDuplicateDetail";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransferPair {
  debit: BusinessTransaction;
  credit: BusinessTransaction;
  daysDiff: number;
}

export interface PatternInsights {
  duplicates: DuplicateGroup[];
  recurring: RecurringPattern[];
  subscriptions: Subscription[];
  balanceDrops: BalanceDrop[];
  balanceDropWarnings: BalanceDropWarning[];
  frequency: { averagePerDay: number; peakDay: string };
  volume: { medianTransactionSize: number; totalVolume: number };
}

interface PatternAlertsSummaryProps {
  insights: PatternInsights;
  transferPairs: TransferPair[];
  onSubscriptionClick: (sub: Subscription) => void;
  onRecurringClick: (pattern: RecurringPattern) => void;
  onBalanceDropClick: (drop: BalanceDrop) => void;
  onDuplicateClick: (group: DuplicateGroup) => void;
}

// ─── TrendIndicator helper ────────────────────────────────────────────────────

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
      {isIncreasing ? <TrendingUpIcon className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
      {isIncreasing ? 'Increasing' : 'Decreasing'} ({trend.strength})
    </Badge>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const PatternAlertsSummary: React.FC<PatternAlertsSummaryProps> = ({
  insights,
  transferPairs,
  onSubscriptionClick,
  onRecurringClick,
  onBalanceDropClick,
  onDuplicateClick,
}) => {
  const [showDuplicates, setShowDuplicates] = React.useState(false);
  const [showRecurring, setShowRecurring] = React.useState(false);
  const [showSubscriptions, setShowSubscriptions] = React.useState(false);
  const [showBalanceDrops, setShowBalanceDrops] = React.useState(false);
  const [showIntercompany, setShowIntercompany] = React.useState(false);

  const activeSubs = insights.subscriptions.filter(s => s.isActive);
  const cancelledSubs = insights.subscriptions.filter(s => !s.isActive);
  const activeRecurring = insights.recurring.filter(r => r.isActive);
  const cancelledRecurring = insights.recurring.filter(r => !r.isActive);

  return (
    <div className="space-y-4">
      {/* Monthly Recurring Summary */}
      <RecurringTotalsCard
        subscriptions={insights.subscriptions}
        recurringTransactions={insights.recurring}
      />

      {/* Inter-Account Transfers */}
      {transferPairs.length > 0 && (
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

                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-3 bg-white border border-red-200 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">FROM</Badge>
                          <span className="text-xs text-muted-foreground">Withdrawal</span>
                        </div>
                        <p className="font-medium text-sm">{pair.debit.accountName}</p>
                        <p className="text-xs text-muted-foreground">{pair.debit.institutionName}</p>
                        {pair.debit.description && (
                          <p className="text-xs text-muted-foreground mt-1">{pair.debit.description}</p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                      </div>

                      <div className="flex-1 p-3 bg-white border border-green-200 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">TO</Badge>
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
                <Badge variant="secondary" className="ml-2">{activeSubs.length}</Badge>
                {cancelledSubs.length > 0 && (
                  <Badge variant="outline" className="ml-1">{cancelledSubs.length} cancelled</Badge>
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
                      onClick={() => onSubscriptionClick(sub)}
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
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                              {sub.anomalies.length} anomal{sub.anomalies.length === 1 ? 'y' : 'ies'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(sub.monthlyAmount)}/mo</p>
                        <p className="text-xs text-muted-foreground">Total: {formatCurrency(sub.totalPaid)}</p>
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
                      onClick={() => onSubscriptionClick(sub)}
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
                  <Badge variant="secondary" className="ml-2">{insights.balanceDrops.length}</Badge>
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
              {insights.balanceDropWarnings && insights.balanceDropWarnings.length > 0 && (
                <div className="mb-4 space-y-2">
                  {insights.balanceDropWarnings.map((warning, idx) => (
                    <Alert key={idx} variant={warning.type === 'error' ? 'destructive' : 'default'} className={
                      warning.type === 'warning' ? 'bg-gray-50 border-gray-200' :
                      warning.type === 'info' ? 'bg-blue-50 border-blue-200' : ''
                    }>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{warning.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {insights.balanceDrops.map((drop, idx) => {
                  const severityColors = {
                    critical: 'bg-red-50 border-red-300',
                    warning: 'bg-orange-50 border-orange-200',
                    info: 'bg-blue-50 border-blue-200',
                  };
                  const severityIconColors = {
                    critical: 'text-red-600',
                    warning: 'text-orange-600',
                    info: 'text-blue-600',
                  };

                  return (
                    <Alert
                      key={idx}
                      className={`${severityColors[drop.severity]} cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => onBalanceDropClick(drop)}
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
                            Balance dropped by {formatCurrency(drop.dropAmount)} ({(drop.dropPercentage * 100).toFixed(1)}%)
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
                  <Copy className="h-5 w-5 text-gray-600" />
                  <CardTitle>Potential Duplicates</CardTitle>
                  <Badge variant="secondary" className="ml-2">{insights.duplicates.length}</Badge>
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
                  <div
                    key={idx}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => onDuplicateClick(group)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Copy className="h-4 w-4 text-gray-600" />
                        <p className="font-medium text-sm">{group.transactions.length} transactions</p>
                        <Badge variant="outline" className="text-xs">{group.confidence} confidence</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{group.reason}</p>
                      <div className="space-y-1">
                        {group.transactions.map(tx => (
                          <div key={tx.id} className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{formatDate(tx.date)}</span>
                            <span>•</span>
                            <span className="font-medium">{tx.name || tx.payee}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">{tx.accountName}</Badge>
                            <span>•</span>
                            <span className="text-orange-600">{formatCurrency(tx.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
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
                  <Badge variant="secondary" className="ml-2">{activeRecurring.length}</Badge>
                  {cancelledRecurring.length > 0 && (
                    <Badge variant="outline" className="ml-1">{cancelledRecurring.length} cancelled</Badge>
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
                          onClick={() => onRecurringClick(pattern)}
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
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
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
                          onClick={() => onRecurringClick(pattern)}
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

export default PatternAlertsSummary;
