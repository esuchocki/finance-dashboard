
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import ComparisonIndicator from "@/components/ComparisonIndicator";
import { FinanceSummary } from "@/lib/types";

interface DashboardSummaryCardsProps {
  summary: FinanceSummary | null;
  trends: {
    incomeChange: number;
    expensesChange: number;
    balanceChange: number;
  } | null;
}

const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({ summary, trends }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-finance-positive">
            {summary ? formatCurrency(summary.totalIncome) : "$0.00"}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center">
              <TrendingUp className="text-finance-positive h-4 w-4 mr-1" />
              <span className="text-xs text-muted-foreground">
                {summary?.transactionCount || 0} transactions
              </span>
            </div>
            {trends && (
              <ComparisonIndicator 
                value={trends.incomeChange} 
                suffix="%" 
                positiveIsGood={true}
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-finance-negative">
            {summary ? formatCurrency(summary.totalExpenses) : "$0.00"}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center">
              <TrendingDown className="text-finance-negative h-4 w-4 mr-1" />
              <span className="text-xs text-muted-foreground">
                {summary ? summary.categories?.length || 0 : 0} categories
              </span>
            </div>
            {trends && (
              <ComparisonIndicator 
                value={trends.expensesChange} 
                suffix="%" 
                positiveIsGood={false}
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net Cashflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary && summary.netCashflow >= 0 ? "text-finance-positive" : "text-finance-negative"}`}>
            {summary ? formatCurrency(summary.netCashflow) : "$0.00"}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center">
              <CalendarClock className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {summary && summary.dateRange ? 
                  `${summary.dateRange.start.toLocaleDateString()} - ${summary.dateRange.end.toLocaleDateString()}` : 
                  "No date range"
                }
              </span>
            </div>
            {trends && trends.balanceChange !== 0 && (
              <Badge variant={trends.balanceChange > 0 ? "success" : "destructive"} className="ml-2">
                {trends.balanceChange > 0 ? "+" : ""}{formatCurrency(trends.balanceChange)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSummaryCards;
