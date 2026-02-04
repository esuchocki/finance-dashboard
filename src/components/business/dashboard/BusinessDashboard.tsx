import React, { useEffect } from "react";
import { useFinance } from "@/context/FinanceContext";
import { useConsolidation } from "@/context/hooks/useConsolidation";
import EntitySelector from "@/components/business/entities/EntitySelector";
import EntityBreakdownTable from "./EntityBreakdownTable";
import FunctionalExpenseChart from "./FunctionalExpenseChart";
import VendorParetoChart from "./VendorParetoChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Building2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const BusinessDashboard: React.FC = () => {
  const {
    businessEntities,
    selectedEntityIds,
    setSelectedEntityIds,
    getEntityTransactions
  } = useFinance();

  // Auto-select all entities when first loaded
  useEffect(() => {
    if (businessEntities.length > 0 && selectedEntityIds.length === 0) {
      setSelectedEntityIds(businessEntities.map(e => e.id));
    }
  }, [businessEntities, selectedEntityIds, setSelectedEntityIds]);

  // Use consolidation hook
  const {
    consolidatedSummary,
    intercompanyTransactions,
    isConsolidating
  } = useConsolidation({
    entities: businessEntities,
    selectedEntityIds,
    getEntityTransactions
  });

  if (businessEntities.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <Building2 className="h-5 w-5" />
          <AlertDescription>
            <span className="font-medium">No entities loaded.</span>
            {' '}Visit the Entity Management page to upload QBO files and get started.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (selectedEntityIds.length === 0) {
    return (
      <div className="space-y-4">
        <EntitySelector />
        <Alert>
          <Info className="h-5 w-5" />
          <AlertDescription>
            Select one or more entities above to view consolidated financial data.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entity Selector */}
      <EntitySelector />

      {/* Intercompany Alert */}
      {intercompanyTransactions.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <span className="font-medium">
              {intercompanyTransactions.length} potential intercompany {intercompanyTransactions.length === 1 ? 'transfer' : 'transfers'} detected
            </span>
            {' '}and automatically eliminated from consolidated totals.
          </AlertDescription>
        </Alert>
      )}

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
                Across {selectedEntityIds.length} {selectedEntityIds.length === 1 ? 'entity' : 'entities'}
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
              <p className="text-xs text-muted-foreground">
                Target: 70%+ (Nonprofit standard)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Entity Breakdown */}
      {consolidatedSummary && (
        <EntityBreakdownTable entitiesSummary={consolidatedSummary.entitiesSummary} />
      )}

      {/* Nonprofit Metrics Charts */}
      {consolidatedSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FunctionalExpenseChart functionalExpenses={consolidatedSummary.functionalExpenses} />
          <VendorParetoChart vendors={consolidatedSummary.topVendors} />
        </div>
      )}

      {isConsolidating && (
        <Alert>
          <Info className="h-5 w-5" />
          <AlertDescription>
            Consolidating entities...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default BusinessDashboard;
