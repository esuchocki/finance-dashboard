import React, { useEffect, useRef } from "react";
import { useFinance } from "@/context/FinanceContext";
import { useConsolidation } from "@/context/hooks/useConsolidation";
import AccountSelector from "@/components/business/accounts/AccountSelector";
import AccountBreakdownTable from "./AccountBreakdownTable";
import PatternsAndAlerts from "@/components/business/insights/PatternsAndAlerts";
import TrendAnalysisCharts from "@/components/business/insights/TrendAnalysisCharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Building2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const BusinessDashboard: React.FC = () => {
  const {
    businessAccounts,
    selectedAccountIds,
    setSelectedAccountIds,
    getAccountTransactions
  } = useFinance();

  // Track if we've done initial auto-select to prevent re-selecting after "None" is clicked
  const hasAutoSelected = useRef(false);

  // Auto-select all accounts only on first load
  useEffect(() => {
    if (businessAccounts.length > 0 && selectedAccountIds.length === 0 && !hasAutoSelected.current) {
      setSelectedAccountIds(businessAccounts.map(a => a.id));
      hasAutoSelected.current = true;
    }
  }, [businessAccounts, selectedAccountIds, setSelectedAccountIds]);

  // Use consolidation hook
  const {
    consolidatedSummary,
    consolidatedTransactions,
    intercompanyTransactions,
    isConsolidating
  } = useConsolidation({
    accounts: businessAccounts,
    selectedAccountIds,
    getAccountTransactions
  });

  if (businessAccounts.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <Building2 className="h-5 w-5" />
          <AlertDescription>
            <span className="font-medium">No accounts loaded.</span>
            {' '}Visit the Account Management page to upload QBO files and get started.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (selectedAccountIds.length === 0) {
    return (
      <div className="space-y-4">
        <AccountSelector />
        <Alert>
          <Info className="h-5 w-5" />
          <AlertDescription>
            Select one or more accounts above to view consolidated financial data.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Selector */}
      <AccountSelector />

      {/* Inter-Account Transfer Alert */}
      {intercompanyTransactions.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <span className="font-medium">
              {intercompanyTransactions.length} potential inter-account {intercompanyTransactions.length === 1 ? 'transfer' : 'transfers'} detected
            </span>
            {' '}and automatically eliminated from consolidated totals.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabbed Dashboard */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns & Alerts</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Cards */}
          {consolidatedSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Income</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {formatCurrency(consolidatedSummary.totalIncome)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Across {selectedAccountIds.length} {selectedAccountIds.length === 1 ? 'account' : 'accounts'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Expenses</CardDescription>
              <CardTitle className="text-2xl text-orange-600">
                {formatCurrency(consolidatedSummary.totalExpenses)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {consolidatedSummary.transactionCount.toLocaleString()} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Net Cashflow</CardDescription>
              <CardTitle className={`text-2xl ${consolidatedSummary.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(consolidatedSummary.netCashflow)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Income - Expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Program Expense Ratio</CardDescription>
              <CardTitle className="text-2xl">
                {(consolidatedSummary.programExpenseRatio * 100).toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                (Program Services Expenses ÷ Total Expenses) × 100%.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Account Breakdown */}
      {consolidatedSummary && (
        <AccountBreakdownTable accountsSummary={consolidatedSummary.accountsSummary} />
      )}

          {isConsolidating && (
            <Alert>
              <Info className="h-5 w-5" />
              <AlertDescription>
                Consolidating accounts...
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6 mt-6">
          <PatternsAndAlerts
            transactions={consolidatedTransactions}
            intercompanyTransactions={intercompanyTransactions}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          <TrendAnalysisCharts transactions={consolidatedTransactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessDashboard;
