
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/context/FinanceContext";
import { formatCurrency } from "@/lib/formatters";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line } from "recharts";
import { Transaction } from "@/lib/types";
import FileUploader from "./FileUploader";
import TransactionList from "./TransactionList";
import InsightsList from "./InsightsList";
import UploadSummary from "./UploadSummary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, CalendarClock } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const Dashboard = () => {
  const { transactions, filteredTransactions, summary, clearData } = useFinance();

  // Prepare chart data
  const prepareChartData = (transactions: Transaction[]) => {
    // Group by category and sum amounts
    const categoryMap = new Map<string, number>();
    
    transactions.filter(t => t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE")
      .forEach(t => {
        const currentAmount = categoryMap.get(t.category) || 0;
        categoryMap.set(t.category, currentAmount + t.amount);
      });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Prepare income chart data
  const prepareIncomeChartData = (transactions: Transaction[]) => {
    // Group by category and sum amounts
    const categoryMap = new Map<string, number>();
    
    transactions.filter(t => t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST")
      .forEach(t => {
        const currentAmount = categoryMap.get(t.category) || 0;
        categoryMap.set(t.category, currentAmount + t.amount);
      });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Prepare monthly trend data
  const prepareMonthlyTrendData = () => {
    if (!summary || !summary.monthlyBreakdown) return [];
    
    return summary.monthlyBreakdown.map(item => {
      // Format the month for display (e.g., "2023-01" to "Jan 2023")
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const formattedMonth = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      return {
        name: formattedMonth,
        income: item.income,
        expenses: item.expenses,
        balance: item.income - item.expenses
      };
    });
  };

  // Prepare running balance data
  const prepareBalanceData = () => {
    if (!summary || !summary.monthlyBreakdown) return [];
    
    let runningBalance = 0;
    return summary.monthlyBreakdown.map(item => {
      // Format the month for display
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const formattedMonth = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Calculate monthly balance and add to running total
      const monthlyBalance = item.income - item.expenses;
      runningBalance += monthlyBalance;
      
      return {
        name: formattedMonth,
        balance: runningBalance
      };
    });
  };

  const chartData = prepareChartData(filteredTransactions);
  const incomeChartData = prepareIncomeChartData(filteredTransactions);
  const monthlyTrendData = prepareMonthlyTrendData();
  const balanceData = prepareBalanceData();
  
  // Define chart colors
  const CHART_COLORS = [
    "#0EA5E9", "#06B6D4", "#14B8A6", "#10B981", "#34D399", 
    "#8B5CF6", "#A855F7", "#EC4899", "#F472B6", "#FB7185"
  ];
  
  // Configuration for charts
  const chartConfig = {
    expense: { color: "#F97316", theme: { light: "#F97316", dark: "#F97316" } },
    income: { color: "#10B981", theme: { light: "#10B981", dark: "#10B981" } },
    balance: { color: "#8B5CF6", theme: { light: "#8B5CF6", dark: "#8B5CF6" } },
  };

  return (
    <div className="space-y-6">
      {transactions.length === 0 ? (
        <FileUploader />
      ) : (
        <>
          {/* Show Upload Summary first when data is loaded */}
          <UploadSummary />
          
          {/* Summary Cards */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Financial Dashboard</h2>
            <Button 
              variant="outline" 
              className="flex items-center gap-2" 
              onClick={clearData}
            >
              <RefreshCw className="h-4 w-4" />
              Change QBO File
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-finance-positive">
                  {summary ? formatCurrency(summary.totalIncome) : "$0.00"}
                </div>
                <div className="flex items-center mt-1">
                  <TrendingUp className="text-finance-positive h-4 w-4 mr-1" />
                  <span className="text-xs text-muted-foreground">
                    {summary?.transactionCount || 0} transactions
                  </span>
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
                <div className="flex items-center mt-1">
                  <TrendingDown className="text-finance-negative h-4 w-4 mr-1" />
                  <span className="text-xs text-muted-foreground">
                    {chartData.length || 0} categories
                  </span>
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
                <div className="flex items-center mt-1">
                  <CalendarClock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {summary && summary.dateRange ? 
                      `${summary.dateRange.start.toLocaleDateString()} - ${summary.dateRange.end.toLocaleDateString()}` : 
                      "No date range"
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Monthly Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Income & Expenses</CardTitle>
              <CardDescription>Trend over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {monthlyTrendData.length > 0 ? (
                  <ChartContainer
                    config={chartConfig}
                    className="h-[300px]"
                  >
                    <BarChart
                      data={monthlyTrendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickMargin={20}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${Math.abs(value) >= 1000 
                          ? `${(value / 1000).toFixed(1)}k` 
                          : value}`}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Income
                                    </span>
                                    <span className="font-bold text-finance-positive">
                                      {formatCurrency(payload[0].value as number)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Expenses
                                    </span>
                                    <span className="font-bold text-finance-negative">
                                      {formatCurrency(payload[1].value as number)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="income" 
                        fill="var(--color-income)" 
                        name="Income" 
                      />
                      <Bar 
                        dataKey="expenses" 
                        fill="var(--color-expense)" 
                        name="Expenses" 
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No monthly data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Balance Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Balance Over Time</CardTitle>
              <CardDescription>Running balance by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {balanceData.length > 0 ? (
                  <ChartContainer
                    config={chartConfig}
                    className="h-[300px]"
                  >
                    <AreaChart
                      data={balanceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickMargin={20}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${Math.abs(value) >= 1000 
                          ? `${(value / 1000).toFixed(1)}k` 
                          : value}`}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value as number)}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#8B5CF6" 
                        fillOpacity={1} 
                        fill="url(#balanceGradient)" 
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No balance data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Category Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense Categories Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>
                  {chartData.length} categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CHART_COLORS[index % CHART_COLORS.length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No expense data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Income Categories Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Income Sources</CardTitle>
                <CardDescription>
                  {incomeChartData.length} categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {incomeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomeChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#10B981"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {incomeChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CHART_COLORS[index % CHART_COLORS.length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No income data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Insights */}
          <InsightsList />
          
          {/* Transactions List */}
          <TransactionList 
            transactions={filteredTransactions.slice(0, 10)} 
            title="Recent Transactions"
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
