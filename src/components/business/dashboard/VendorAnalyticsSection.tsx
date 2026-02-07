import React from "react";
import { useFinance } from "@/context/FinanceContext";
import { VendorAnalytics } from "@/lib/types";
import VendorTable from "./VendorTable";
import TopTransactionsTable from "./TopTransactionsTable";
import VendorHierarchyChart from "./VendorHierarchyChart";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Loader2 } from "lucide-react";

interface VendorAnalyticsSectionProps {
  vendorAnalytics: VendorAnalytics | null;
  isCalculating: boolean;
  cacheHit: boolean;
}

const VendorAnalyticsSection: React.FC<VendorAnalyticsSectionProps> = ({
  vendorAnalytics,
  isCalculating,
  cacheHit
}) => {
  const { vendorGranularity, setVendorGranularity } = useFinance();

  // Show placeholder while calculating for the first time
  if (!vendorAnalytics && isCalculating) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <CardTitle>Calculating Vendor Analytics...</CardTitle>
            </div>
            <CardDescription>
              This may take a few moments for large datasets
            </CardDescription>
          </CardHeader>
        </Card>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!vendorAnalytics) {
    return null;
  }

  const {
    topExpensesByVendor,
    topIncomeByVendor,
    topExpenseTransactions,
    topIncomeTransactions
  } = vendorAnalytics;

  return (
    <div className={`space-y-6 transition-opacity ${isCalculating && !cacheHit ? 'opacity-60' : 'opacity-100'}`}>
      {/* Header with Granularity Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle>Transaction Grouping</CardTitle>
                {isCalculating && !cacheHit && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calculating...</span>
                  </div>
                )}
                {cacheHit && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <span className="text-xs">Cached</span>
                  </div>
                )}
              </div>
              <CardDescription className="text-sm">
                {vendorGranularity === 'detailed' && 'Transaction Level - Each unique transaction description appears as a separate row. Shows all codes, IDs, and variations.'}
                {vendorGranularity === 'standard' && 'Subdivision Level - Groups transactions by location or department. Removes transaction codes but keeps organizational subdivisions.'}
                {vendorGranularity === 'consolidated' && 'Organization Level - Groups all transactions by main vendor or organization name. Combines all locations and subdivisions.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 min-w-[220px]">
              <Select value={vendorGranularity} onValueChange={setVendorGranularity}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consolidated">Organization Level</SelectItem>
                  <SelectItem value="standard">Subdivision Level</SelectItem>
                  <SelectItem value="detailed">Transaction Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* BY VENDOR SECTION */}
      <div className="space-y-4">

        {/* Vendor Tables: Income and Expenses side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorTable
            title="Income by Group"
            hierarchyNodes={topIncomeByVendor}
            granularity={vendorGranularity}
            type="income"
          />
          <VendorTable
            title="Expenses by Group"
            hierarchyNodes={topExpensesByVendor}
            granularity={vendorGranularity}
            type="expense"
          />
        </div>

        {/* Vendor Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorHierarchyChart
            title="Income Group Breakdown"
            hierarchyNodes={topIncomeByVendor}
            granularity={vendorGranularity}
            type="income"
          />
          <VendorHierarchyChart
            title="Expense Group Breakdown"
            hierarchyNodes={topExpensesByVendor}
            granularity={vendorGranularity}
            type="expense"
          />
        </div>
      </div>

      {/* BY TRANSACTION SECTION */}
      <div className="space-y-4">

        {/* Transaction Tables: Income and Expenses side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopTransactionsTable
            title="Large Income Transactions"
            topTransactions={topIncomeTransactions}
            type="income"
          />
          <TopTransactionsTable
            title="Large Expense Transactions"
            topTransactions={topExpenseTransactions}
            type="expense"
          />
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsSection;
