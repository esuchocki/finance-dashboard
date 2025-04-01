
import React from "react";
import MonthlyTrendsChart from "../MonthlyTrendsChart";
import BalanceChart from "../BalanceChart";
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
      {/* Monthly Trends Chart - Now includes combined percentage changes */}
      <MonthlyTrendsChart monthlyTrendData={monthlyTrendData} />
      
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
