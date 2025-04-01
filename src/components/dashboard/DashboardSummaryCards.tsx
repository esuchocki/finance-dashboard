
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CalendarClock, ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import ComparisonIndicator from "@/components/ComparisonIndicator";
import { FinancialSummary } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardSummaryCardsProps {
  summary: FinancialSummary | null;
  trends: {
    incomeChange: number;
    expensesChange: number;
    balanceChange: number;
  } | null;
}

const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({ summary, trends }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="dashboard-card border-l-4 border-l-finance-positive animate-fade-in stagger-1">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
            <TrendingUp className="text-finance-positive h-4 w-4 mr-2" />
            Total Income
          </CardTitle>
          {trends && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ComparisonIndicator 
                      value={trends.incomeChange} 
                      suffix="%" 
                      positiveIsGood={true}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Month-over-month change in income compared to previous month. This compares the current month's income with the previous month's income.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-finance-positive tracking-tight">
            {summary ? formatCurrency(summary.totalIncome) : "$0.00"}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <span className="text-xs text-muted-foreground">
                {summary?.transactionCount || 0} transactions
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="dashboard-card border-l-4 border-l-finance-negative animate-fade-in stagger-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
            <TrendingDown className="text-finance-negative h-4 w-4 mr-2" />
            Total Expenses
          </CardTitle>
          {trends && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ComparisonIndicator 
                      value={trends.expensesChange} 
                      suffix="%" 
                      positiveIsGood={false}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Month-over-month change in expenses compared to previous month. This compares the current month's expenses with the previous month's expenses. Lower expenses are better.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-finance-negative tracking-tight">
            {summary ? formatCurrency(summary.totalExpenses) : "$0.00"}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <span className="text-xs text-muted-foreground">
                {summary ? summary.topExpenseCategories?.length || 0 : 0} categories
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="dashboard-card border-l-4 border-l-finance-accent animate-fade-in stagger-3">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
            <CalendarClock className="h-4 w-4 mr-2 text-accent" />
            Net Cashflow
          </CardTitle>
          {trends && trends.balanceChange !== 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Badge variant={trends.balanceChange > 0 ? "success" : "destructive"} className="ml-2 whitespace-nowrap">
                      {trends.balanceChange > 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {formatCurrency(Math.abs(trends.balanceChange))}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Absolute change in net cashflow (income minus expenses) compared to previous month. This shows how much your monthly cash flow has changed from last month to this month.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold tracking-tight ${summary && summary.netCashflow >= 0 ? "text-finance-positive" : "text-finance-negative"}`}>
            {summary ? formatCurrency(summary.netCashflow) : "$0.00"}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <span className="text-xs text-muted-foreground">
                {summary && summary.dateRange ? 
                  `${summary.dateRange.start.toLocaleDateString()} - ${summary.dateRange.end.toLocaleDateString()}` : 
                  "No date range"
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSummaryCards;
