
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
  // Calculate trajectory indicators based on monthly breakdowns
  const calculateTrajectory = (type: 'income' | 'expenses' | 'balance') => {
    if (!summary?.monthlyBreakdown || summary.monthlyBreakdown.length < 3) {
      return { isUpward: null, description: "Not enough data for trajectory analysis" };
    }

    const monthlyData = [...summary.monthlyBreakdown].sort((a, b) => 
      a.month.localeCompare(b.month)
    );
    
    // Need at least 3 months for meaningful trajectory
    const recentMonths = monthlyData.slice(-3);
    
    // Extract the relevant values based on type
    const values = recentMonths.map(month => {
      if (type === 'income') return month.income;
      if (type === 'expenses') return month.expenses;
      return month.income - month.expenses; // balance
    });
    
    // Check if trajectory is mostly upward (2+ increases)
    let increases = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i-1]) increases++;
    }
    
    const isUpward = increases >= (values.length - 1) / 2;
    
    // Determine if trajectory is good based on type
    const isPositive = type === 'expenses' ? !isUpward : isUpward;
    
    return {
      isUpward,
      isPositive,
      description: `${isUpward ? 'Increasing' : 'Decreasing'} trend over the last ${recentMonths.length} months`
    };
  };
  
  const incomeTrajectory = calculateTrajectory('income');
  const expensesTrajectory = calculateTrajectory('expenses');
  const balanceTrajectory = calculateTrajectory('balance');
  
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
                  <p className="font-medium mb-1">Month-over-month change</p>
                  <p>This compares the most recent month's income with the previous month in your data.</p>
                  {incomeTrajectory.isUpward !== null && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="font-medium">Overall Trajectory: {incomeTrajectory.description}</p>
                    </div>
                  )}
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
                  <p className="font-medium mb-1">Month-over-month change</p>
                  <p>This compares the most recent month's expenses with the previous month in your data. Lower expenses are generally better.</p>
                  {expensesTrajectory.isUpward !== null && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="font-medium">Overall Trajectory: {expensesTrajectory.description}</p>
                      <p className="text-xs mt-1">{expensesTrajectory.isPositive ? 
                        "Your expenses are trending in a positive direction." : 
                        "Your expenses are trending upward, which may need attention."}</p>
                    </div>
                  )}
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
                  <p className="font-medium mb-1">Month-over-month change</p>
                  <p>This shows the absolute change in net cashflow (income minus expenses) from the previous month to the most recent month in your data.</p>
                  {balanceTrajectory.isUpward !== null && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="font-medium">Overall Trajectory: {balanceTrajectory.description}</p>
                      <p className="text-xs mt-1">{balanceTrajectory.isPositive ? 
                        "Your net cashflow is trending in a positive direction." : 
                        "Your net cashflow is trending downward, which may need attention."}</p>
                    </div>
                  )}
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
