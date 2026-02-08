import React, { useMemo, useState } from "react";
import { Subscription, RecurringPattern } from "@/lib/business/transactionAnalysis";
import { toMonthlyAmount } from "@/lib/business/enhancedPatternAnalysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import { TrendingDown, TrendingUp, Wallet, ChevronDown, ChevronUp } from "lucide-react";

interface RecurringTotalsCardProps {
  subscriptions: Subscription[];
  recurringTransactions: RecurringPattern[];
}

interface UpcomingTransaction {
  name: string;
  amount: number;
  date: Date;
}

interface AccountTotal {
  accountName: string;
  subscriptionTotal: number;
  subscriptionCount: number;
  recurringTotal: number;
  recurringCount: number;
  netMonthly: number;
  upcomingSubscriptions: UpcomingTransaction[];
  upcomingRecurring: UpcomingTransaction[];
}

const RecurringTotalsCard: React.FC<RecurringTotalsCardProps> = ({
  subscriptions,
  recurringTransactions
}) => {
  const [showSummary, setShowSummary] = useState(false);

  const accountTotals = useMemo(() => {
    const totalsMap = new Map<string, AccountTotal>();

    // Process subscriptions (expenses - money OUT)
    subscriptions.forEach(sub => {
      if (!sub.isActive) return; // Only count active subscriptions

      const accountName = sub.accountName || 'Unknown Account';
      const existing = totalsMap.get(accountName) || {
        accountName,
        subscriptionTotal: 0,
        subscriptionCount: 0,
        recurringTotal: 0,
        recurringCount: 0,
        netMonthly: 0,
        upcomingSubscriptions: [],
        upcomingRecurring: []
      };

      existing.subscriptionTotal += sub.monthlyAmount;
      existing.subscriptionCount += 1;

      // Add upcoming subscription charge
      existing.upcomingSubscriptions.push({
        name: sub.merchantName,
        amount: sub.monthlyAmount,
        date: sub.nextExpectedDate
      });

      totalsMap.set(accountName, existing);
    });

    // Process recurring transactions (income - money IN)
    recurringTransactions.forEach(pattern => {
      if (!pattern.isActive) return; // Only count active patterns

      const accountName = pattern.transactions[0].accountName || 'Unknown Account';
      const existing = totalsMap.get(accountName) || {
        accountName,
        subscriptionTotal: 0,
        subscriptionCount: 0,
        recurringTotal: 0,
        recurringCount: 0,
        netMonthly: 0,
        upcomingSubscriptions: [],
        upcomingRecurring: []
      };

      // Convert to monthly equivalent using enhanced system
      const monthlyAmount = toMonthlyAmount(pattern);

      existing.recurringTotal += monthlyAmount;
      existing.recurringCount += 1;

      // Add upcoming recurring income
      existing.upcomingRecurring.push({
        name: pattern.merchantName,
        amount: pattern.currentAmount,
        date: pattern.nextExpectedDate
      });

      totalsMap.set(accountName, existing);
    });

    // Calculate net monthly for each account and sort upcoming transactions by date
    totalsMap.forEach(total => {
      total.netMonthly = total.recurringTotal - total.subscriptionTotal;

      // Sort upcoming transactions by date (earliest first)
      total.upcomingSubscriptions.sort((a, b) => a.date.getTime() - b.date.getTime());
      total.upcomingRecurring.sort((a, b) => a.date.getTime() - b.date.getTime());
    });

    // Convert to array and sort by account name
    return Array.from(totalsMap.values()).sort((a, b) =>
      a.accountName.localeCompare(b.accountName)
    );
  }, [subscriptions, recurringTransactions]);

  const grandTotals = useMemo(() => {
    return accountTotals.reduce(
      (acc, account) => ({
        subscriptionTotal: acc.subscriptionTotal + account.subscriptionTotal,
        subscriptionCount: acc.subscriptionCount + account.subscriptionCount,
        recurringTotal: acc.recurringTotal + account.recurringTotal,
        recurringCount: acc.recurringCount + account.recurringCount,
        netMonthly: acc.netMonthly + account.netMonthly
      }),
      {
        subscriptionTotal: 0,
        subscriptionCount: 0,
        recurringTotal: 0,
        recurringCount: 0,
        netMonthly: 0
      }
    );
  }, [accountTotals]);

  if (accountTotals.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <CardTitle>Monthly Recurring Summary</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {grandTotals.subscriptionCount + grandTotals.recurringCount} items
              </Badge>
            </div>
            <CardDescription className="mt-2">
              Net monthly impact: <span className={`font-semibold ${grandTotals.netMonthly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(grandTotals.netMonthly)}
              </span> ({grandTotals.subscriptionCount} subscriptions, {grandTotals.recurringCount} recurring income)
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
            aria-label={showSummary ? "Collapse monthly recurring summary" : "Expand monthly recurring summary"}
            aria-expanded={showSummary}
            title={showSummary ? "Collapse section" : "Expand section"}
          >
            {showSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {showSummary && (
        <CardContent>
        <div className="space-y-6">
          {/* Grand Totals Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Subscriptions</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(grandTotals.subscriptionTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {grandTotals.subscriptionCount} active
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-orange-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Recurring Income</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(grandTotals.recurringTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {grandTotals.recurringCount} active
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className={grandTotals.netMonthly >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Monthly Impact</p>
                    <p className={`text-2xl font-bold ${grandTotals.netMonthly >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(grandTotals.netMonthly)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Income - Expenses
                    </p>
                  </div>
                  <Wallet className={`h-8 w-8 ${grandTotals.netMonthly >= 0 ? 'text-blue-600' : 'text-red-600'} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Breakdown Table */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Breakdown by Account</h4>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Subscriptions</TableHead>
                    <TableHead className="text-right">Recurring Income</TableHead>
                    <TableHead className="text-right">Net Monthly</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountTotals.map((account, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {account.accountName}
                        <div className="flex gap-2 mt-1">
                          {account.subscriptionCount > 0 && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              {account.subscriptionCount} subs
                            </Badge>
                          )}
                          {account.recurringCount > 0 && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              {account.recurringCount} recurring
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {account.subscriptionTotal > 0 ? formatCurrency(account.subscriptionTotal) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {account.recurringTotal > 0 ? formatCurrency(account.recurringTotal) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${account.netMonthly >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(account.netMonthly)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(grandTotals.subscriptionTotal)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(grandTotals.recurringTotal)}
                    </TableCell>
                    <TableCell className={`text-right ${grandTotals.netMonthly >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(grandTotals.netMonthly)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Upcoming Transactions Timeline */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-3">Upcoming Transactions (Next 30 Days)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upcoming Subscriptions */}
              <div className="border rounded-md p-4 bg-orange-50/30">
                <h5 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Next Subscription Charges
                </h5>
                <div className="space-y-2">
                  {(() => {
                    // Collect all upcoming subscriptions from all accounts
                    const allUpcoming = accountTotals.flatMap(account =>
                      account.upcomingSubscriptions.map(sub => ({
                        ...sub,
                        accountName: account.accountName
                      }))
                    );

                    // Filter to next 30 days and sort by date
                    const thirtyDaysFromNow = new Date();
                    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

                    const upcoming = allUpcoming
                      .filter(sub => new Date(sub.date) <= thirtyDaysFromNow)
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 8); // Show max 8

                    if (upcoming.length === 0) {
                      return (
                        <div className="text-sm text-muted-foreground italic">
                          No subscriptions due in the next 30 days
                        </div>
                      );
                    }

                    return upcoming.map((sub, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-orange-100">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate" title={sub.name}>
                            {sub.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sub.accountName}
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="font-semibold text-orange-600">
                            {formatCurrency(sub.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(sub.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Upcoming Recurring Income */}
              <div className="border rounded-md p-4 bg-green-50/30">
                <h5 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Next Recurring Income
                </h5>
                <div className="space-y-2">
                  {(() => {
                    // Collect all upcoming recurring income from all accounts
                    const allUpcoming = accountTotals.flatMap(account =>
                      account.upcomingRecurring.map(rec => ({
                        ...rec,
                        accountName: account.accountName
                      }))
                    );

                    // Filter to next 30 days and sort by date
                    const thirtyDaysFromNow = new Date();
                    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

                    const upcoming = allUpcoming
                      .filter(rec => new Date(rec.date) <= thirtyDaysFromNow)
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 8); // Show max 8

                    if (upcoming.length === 0) {
                      return (
                        <div className="text-sm text-muted-foreground italic">
                          No recurring income expected in the next 30 days
                        </div>
                      );
                    }

                    return upcoming.map((rec, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-green-100">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate" title={rec.name}>
                            {rec.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {rec.accountName}
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="font-semibold text-green-600">
                            {formatCurrency(rec.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(rec.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
        </CardContent>
      )}
    </Card>
  );
};

export default RecurringTotalsCard;
