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
  InfoTooltipTrigger
} from "@/components/ui/tooltip";

interface DashboardSummaryCardsProps {
  summary: FinancialSummary | null;
  trends: {
    incomeChange: number;
    expensesChange: number;
    balanceChange: number;
  } | null;
}

// Calculate full-span trajectory indicators based on first and last month in the data
const calculateTrajectory = (type: 'income' | 'expenses' | 'balance', summaryData: FinancialSummary | null) => {
  if (!summaryData?.monthlyBreakdown || summaryData.monthlyBreakdown.length < 2) {
    return { isUpward: null, description: "Not enough data for trajectory analysis" };
  }

  const monthlyData = [...summaryData.monthlyBreakdown].sort((a, b) => 
    a.month.localeCompare(b.month)
  );
  
  // Get first and last month
  const firstMonth = monthlyData[0];
  const lastMonth = monthlyData[monthlyData.length - 1];
  
  // Extract the relevant values based on type
  let firstValue = 0;
  let lastValue = 0;
  
  if (type === 'income') {
    firstValue = firstMonth.income;
    lastValue = lastMonth.income;
  } else if (type === 'expenses') {
    firstValue = firstMonth.expenses;
    lastValue = lastMonth.expenses;
  } else {
    // balance
    firstValue = firstMonth.income - firstMonth.expenses;
    lastValue = lastMonth.income - lastMonth.expenses;
  }
  
  // Calculate percentage change
  const percentageChange = firstValue !== 0 
    ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100 
    : lastValue > 0 ? 100 : 0;
  
  const isUpward = lastValue > firstValue;
  
  // Determine if trajectory is good based on type
  const isPositive = type === 'expenses' ? !isUpward : isUpward;

  // Get month names for better description
  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  
  return {
    isUpward,
    isPositive,
    percentageChange,
    description: `${isUpward ? 'Increased' : 'Decreased'} by ${Math.abs(percentageChange).toFixed(1)}% from ${getMonthName(firstMonth.month)} to ${getMonthName(lastMonth.month)}`,
    shortDescription: `${isUpward ? 'Increasing' : 'Decreasing'} trend across all data`
  };
};
  
const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({ summary, trends }) => {
  const incomeTrajectory = calculateTrajectory('income', summary);
  const expensesTrajectory = calculateTrajectory('expenses', summary);
  const balanceTrajectory = calculateTrajectory('balance', summary);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="dashboard-card border-l-4 border-l-finance-positive animate-fade-in stagger-1 relative">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
            <TrendingUp className="text-finance-positive h-4 w-4 mr-2" />
            Total Income
          </CardTitle>
          {incomeTrajectory.isUpward !== null && (
            <TooltipProvider>
              <Tooltip>
                <InfoTooltipTrigger>
                  <div>
                    <ComparisonIndicator 
                      value={incomeTrajectory.percentageChange} 
                      suffix="%" 
                      positiveIsGood={true}
                    />
                  </div>
                </InfoTooltipTrigger>
                <TooltipContent side="top" align="end" className="max-w-xs">
                  <p className="font-medium mb-1">Full-span Income Trajectory</p>
                  <p>{incomeTrajectory.description}</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="font-medium">Overall Assessment</p>
                    <p className="text-xs mt-1">{incomeTrajectory.isPositive ? 
                      "Your income is trending positively over the full period." : 
                      "Your income is trending downward over the full period, which may need attention."}</p>
                  </div>
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
      
      <Card className="dashboard-card border-l-4 border-l-finance-negative animate-fade-in stagger-2 relative">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
            <TrendingDown className="text-finance-negative h-4 w-4 mr-2" />
            Total Expenses
          </CardTitle>
          {expensesTrajectory.isUpward !== null && (
            <TooltipProvider>
              <Tooltip>
                <InfoTooltipTrigger>
                  <div>
                    <ComparisonIndicator 
                      value={expensesTrajectory.percentageChange} 
                      suffix="%" 
                      positiveIsGood={false}
                    />
                  </div>
                </InfoTooltipTrigger>
                <TooltipContent side="top" align="end" className="max-w-xs">
                  <p className="font-medium mb-1">Full-span Expense Trajectory</p>
                  <p>{expensesTrajectory.description}</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="font-medium">Overall Assessment</p>
                    <p className="text-xs mt-1">{expensesTrajectory.isPositive ? 
                      "Your expenses are trending in a positive direction (decreasing) over the full period." : 
                      "Your expenses are trending upward over the full period, which may need attention."}</p>
                  </div>
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
      
      <Card className="dashboard-card border-l-4 border-l-finance-accent animate-fade-in stagger-3 relative">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
            <CalendarClock className="h-4 w-4 mr-2 text-accent" />
            Net Cashflow
          </CardTitle>
          {trends && trends.balanceChange !== 0 && balanceTrajectory.isUpward !== null && (
            <TooltipProvider>
              <Tooltip>
                <InfoTooltipTrigger>
                  <Badge variant={balanceTrajectory.isPositive ? "success" : "destructive"} className="ml-2 whitespace-nowrap">
                    {balanceTrajectory.isUpward ? (
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                    )}
                    {formatCurrency(Math.abs(trends.balanceChange))}
                  </Badge>
                </InfoTooltipTrigger>
                <TooltipContent side="top" align="end" className="max-w-xs">
                  <p className="font-medium mb-1">Full-span Cashflow Trajectory</p>
                  <p>{balanceTrajectory.description}</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="font-medium">Overall Assessment</p>
                    <p className="text-xs mt-1">{balanceTrajectory.isPositive ? 
                      "Your net cashflow is trending positively over the full period." : 
                      "Your net cashflow is trending downward over the full period, which may need attention."}</p>
                  </div>
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
            {/* Easter egg - Sailboat fund progress */}
            {summary && summary.netCashflow > 0 && (
              <span className="text-xs italic text-muted-foreground">
                {summary.netCashflow > 100000 ? "Yacht fund: Ready!" : `Sailboat fund: ${((summary.netCashflow / 100000) * 100).toFixed(1)}%`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSummaryCards;
