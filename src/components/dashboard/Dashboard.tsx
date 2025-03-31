
import React, { useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import TransactionList from "@/components/TransactionList";
import InsightsList from "@/components/InsightsList";
import UploadSummary from "@/components/UploadSummary";
import DashboardSummaryCards from "./DashboardSummaryCards";
import MonthlyTrendsChart from "./MonthlyTrendsChart";
import BalanceChart from "./BalanceChart";
import CategoryCharts from "./CategoryCharts";
import { Transaction } from "@/lib/types";

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
          
          {/* Summary Cards */}
          <DashboardSummaryCards summary={summary} trends={trends} />
          
          {/* Monthly Trends Chart */}
          <MonthlyTrendsChart monthlyTrendData={monthlyTrendData} />

          {/* Balance Over Time Chart */}
          <BalanceChart balanceData={balanceData} />
          
          {/* Category Charts */}
          <CategoryCharts expenseData={chartData} incomeData={incomeChartData} />
          
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
