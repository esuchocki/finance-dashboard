
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/context/FinanceContext";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line } from "recharts";
import { Transaction } from "@/lib/types";
import FileUploader from "./FileUploader";
import TransactionList from "./TransactionList";
import InsightsList from "./InsightsList";
import UploadSummary from "./UploadSummary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, CalendarClock, ArrowUp, ArrowDown, ArrowRight, ChartBar, ChartLine } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import ComparisonIndicator from "./ComparisonIndicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    
    return summary.monthlyBreakdown.map((item, index, array) => {
      // Format the month for display (e.g., "2023-01" to "Jan 2023")
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const formattedMonth = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Calculate month-over-month change percentages
      let incomeChange = 0;
      let expensesChange = 0;
      
      if (index > 0) {
        const prevMonth = array[index - 1];
        incomeChange = prevMonth.income > 0 
          ? ((item.income - prevMonth.income) / prevMonth.income) * 100 
          : 0;
        expensesChange = prevMonth.expenses > 0 
          ? ((item.expenses - prevMonth.expenses) / prevMonth.expenses) * 100 
          : 0;
      }
      
      return {
        name: formattedMonth,
        income: item.income,
        expenses: item.expenses,
        balance: item.income - item.expenses,
        incomeChange,
        expensesChange
      };
    });
  };

  // Prepare running balance data
  const prepareBalanceData = () => {
    if (!summary || !summary.monthlyBreakdown) return [];
    
    let runningBalance = 0;
    return summary.monthlyBreakdown.map((item, index) => {
      // Format the month for display
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const formattedMonth = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Calculate monthly balance and add to running total
      const monthlyBalance = item.income - item.expenses;
      runningBalance += monthlyBalance;
      
      return {
        name: formattedMonth,
        balance: runningBalance,
        monthlyChange: monthlyBalance
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
  
  // Configuration for charts - properly typed to fix the errors
  const chartConfig = {
    expense: { 
      theme: { light: "#F97316", dark: "#F97316" } 
    },
    income: { 
      theme: { light: "#10B981", dark: "#10B981" } 
    },
    balance: { 
      theme: { light: "#8B5CF6", dark: "#8B5CF6" } 
    },
  };

  // Calculate basic stats for the current period
  const calculateCurrentTrends = () => {
    if (!monthlyTrendData || monthlyTrendData.length < 2) return null;
    
    const currentMonth = monthlyTrendData[monthlyTrendData.length - 1];
    const previousMonth = monthlyTrendData[monthlyTrendData.length - 2];
    
    return {
      incomeChange: ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100,
      expensesChange: ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100,
      balanceChange: currentMonth.balance - previousMonth.balance
    };
  };
  
  const trends = calculateCurrentTrends();

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
                      {chartData.length || 0} categories
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
          
          {/* Monthly Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Financial Trends</CardTitle>
              <CardDescription>Income and expense patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="combined">
                <TabsList className="mb-4">
                  <TabsTrigger value="combined" className="flex items-center gap-1">
                    <ChartBarIcon className="h-4 w-4" />
                    <span>Combined</span>
                  </TabsTrigger>
                  <TabsTrigger value="income" className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Income</span>
                  </TabsTrigger>
                  <TabsTrigger value="expenses" className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    <span>Expenses</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="combined" className="mt-0">
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
                          <ChartTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <ChartTooltipContent
                                    active={active}
                                    payload={payload}
                                    formatter={(value) => formatCurrency(value as number)}
                                  />
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="income" 
                            name="income" 
                          />
                          <Bar 
                            dataKey="expenses" 
                            name="expense" 
                          />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No monthly data available
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="income" className="mt-0">
                  <div className="h-[300px]">
                    {monthlyTrendData.length > 0 ? (
                      <ChartContainer
                        config={chartConfig}
                        className="h-[300px]"
                      >
                        <LineChart
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
                          <ChartTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <ChartTooltipContent
                                    active={active}
                                    payload={payload}
                                    formatter={(value) => formatCurrency(value as number)}
                                  />
                                );
                              }
                              return null;
                            }}
                          />
                          <defs>
                            <linearGradient id="incomeColorGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="income" 
                            name="income"
                            stroke="#10B981" 
                            fillOpacity={1} 
                            fill="url(#incomeColorGradient)" 
                          />
                          {monthlyTrendData.length > 1 && (
                            <Line 
                              type="monotone" 
                              dataKey="incomeChange" 
                              name="% Change" 
                              yAxisId="right"
                              stroke="#8B5CF6" 
                              dot={true}
                              strokeDasharray="5 5"
                            />
                          )}
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No income data available
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="expenses" className="mt-0">
                  <div className="h-[300px]">
                    {monthlyTrendData.length > 0 ? (
                      <ChartContainer
                        config={chartConfig}
                        className="h-[300px]"
                      >
                        <LineChart
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
                          <ChartTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <ChartTooltipContent
                                    active={active}
                                    payload={payload}
                                    formatter={(value) => formatCurrency(value as number)}
                                  />
                                );
                              }
                              return null;
                            }}
                          />
                          <defs>
                            <linearGradient id="expenseColorGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="expenses" 
                            name="expense"
                            stroke="#F97316" 
                            fillOpacity={1} 
                            fill="url(#expenseColorGradient)" 
                          />
                          {monthlyTrendData.length > 1 && (
                            <Line 
                              type="monotone" 
                              dataKey="expensesChange" 
                              name="% Change" 
                              yAxisId="right"
                              stroke="#8B5CF6" 
                              dot={true}
                              strokeDasharray="5 5"
                            />
                          )}
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No expense data available
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
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
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <ChartTooltipContent
                                active={active}
                                payload={payload}
                                formatter={(value) => formatCurrency(value as number)}
                              />
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        name="balance" 
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
