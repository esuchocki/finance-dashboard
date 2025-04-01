
import React from "react";
import MonthlyTrendsChart from "../MonthlyTrendsChart";
import BalanceChart from "../BalanceChart";
import MonthlyIncomeExpensesChart from "../MonthlyIncomeExpensesChart";
import ClaudeEnhancedCategories from "../ClaudeEnhancedCategories";

interface ChartSectionProps {
  monthlyTrendData: any[];
  balanceData: any[];
  categoryData: any[];
  incomeData: any[];
  transactions: any[];
}

const ChartSection = ({ 
  monthlyTrendData,
  balanceData,
  categoryData,
  incomeData,
  transactions
}: ChartSectionProps) => {
  return (
    <>
      {/* Monthly Trends Chart */}
      <MonthlyTrendsChart monthlyTrendData={monthlyTrendData} />

      {/* Monthly Income & Expenses Chart */}
      <MonthlyIncomeExpensesChart monthlyTrendData={monthlyTrendData} />
      
      {/* Balance Over Time Chart */}
      <BalanceChart balanceData={balanceData} />
      
      {/* Claude AI Enhanced Categories */}
      <ClaudeEnhancedCategories 
        transactions={transactions} 
      />
    </>
  );
};

export default ChartSection;
