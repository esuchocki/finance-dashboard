
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/context/FinanceContext";
import { formatCurrency } from "@/lib/formatters";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { Transaction } from "@/lib/types";
import FileUploader from "./FileUploader";
import TransactionList from "./TransactionList";
import InsightsList from "./InsightsList";

const Dashboard = () => {
  const { transactions, filteredTransactions, summary } = useFinance();

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

  const chartData = prepareChartData(filteredTransactions);
  
  // Define chart colors
  const CHART_COLORS = [
    "#0EA5E9", "#06B6D4", "#14B8A6", "#10B981", "#34D399", 
    "#8B5CF6", "#A855F7", "#EC4899", "#F472B6", "#FB7185"
  ];

  return (
    <div className="space-y-6">
      {transactions.length === 0 ? (
        <FileUploader />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-finance-positive">
                  {summary ? formatCurrency(summary.totalIncome) : "$0.00"}
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
              </CardContent>
            </Card>
          </div>
          
          {/* Category Chart and Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            
            <InsightsList />
          </div>
          
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
