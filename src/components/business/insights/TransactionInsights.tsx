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
import TrendAnalysisCharts from "./TrendAnalysisCharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Copy,
  Repeat,
  CreditCard,
  TrendingDown,
  BarChart3,
  DollarSign,
  ChevronDown,
  ChevronUp,
  TrendingUp
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TransactionInsightsProps {
  transactions: BusinessTransaction[];
}

const TransactionInsights: React.FC<TransactionInsightsProps> = ({ transactions }) => {
  const [showDuplicates, setShowDuplicates] = React.useState(false);
  const [showRecurring, setShowRecurring] = React.useState(false);
  const [showSubscriptions, setShowSubscriptions] = React.useState(true);
  const [showBalanceDrops, setShowBalanceDrops] = React.useState(true);

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
    <Tabs defaultValue="patterns" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="patterns">Patterns & Alerts</TabsTrigger>
        <TabsTrigger value="trends">
          <TrendingUp className="h-4 w-4 mr-2" />
          Trends
        </TabsTrigger>
      </TabsList>

      <TabsContent value="patterns" className="space-y-4 mt-6">
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
                      <div className="flex items-center justify-between">
                        <span>{group.transactions.length} transactions</span>
                        <Badge variant={
                          group.confidence === 'high' ? 'destructive' :
                          group.confidence === 'medium' ? 'default' : 'outline'
                        }>
                          {group.confidence} confidence
                        </Badge>
                      </div>
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
                      <Badge variant={
                        pattern.confidence === 'high' ? 'default' :
                        pattern.confidence === 'medium' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {pattern.confidence}
                      </Badge>
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
      </TabsContent>

      <TabsContent value="trends" className="space-y-6 mt-6">
        <TrendAnalysisCharts transactions={transactions} />
      </TabsContent>
    </Tabs>
  );
};

export default TransactionInsights;
