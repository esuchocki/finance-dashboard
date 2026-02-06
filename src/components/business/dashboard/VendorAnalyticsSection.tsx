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
                <CardTitle>Vendor Grouping Detail Level</CardTitle>
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
                {vendorGranularity === 'detailed' && 'Full detail - Shows original transaction names with all IDs and codes (e.g., "KARME CHOLING IMPOUND PD4305")'}
                {vendorGranularity === 'standard' && 'Medium detail - Transaction IDs removed, vendor subdivisions kept (e.g., "KARME CHOLING IMPOUND")'}
                {vendorGranularity === 'consolidated' && 'Core only - Shows root vendor name only (e.g., "KARME CHOLING")'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 min-w-[200px]">
              <Select value={vendorGranularity} onValueChange={setVendorGranularity}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consolidated">Consolidated (Root)</SelectItem>
                  <SelectItem value="standard">Standard (Medium)</SelectItem>
                  <SelectItem value="detailed">Detailed (Full)</SelectItem>
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
            title="Top 5 Income by Vendor"
            hierarchyNodes={topIncomeByVendor}
            granularity={vendorGranularity}
            type="income"
          />
          <VendorTable
            title="Top 5 Expenses by Vendor"
            hierarchyNodes={topExpensesByVendor}
            granularity={vendorGranularity}
            type="expense"
          />
        </div>

        {/* Vendor Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorHierarchyChart
            title="Income Vendor Breakdown"
            hierarchyNodes={topIncomeByVendor}
            granularity={vendorGranularity}
            type="income"
          />
          <VendorHierarchyChart
            title="Expense Vendor Breakdown"
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
            title="Top 5 Income Transactions"
            topTransactions={topIncomeTransactions}
            type="income"
          />
          <TopTransactionsTable
            title="Top 5 Expense Transactions"
            topTransactions={topExpenseTransactions}
            type="expense"
          />
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsSection;
