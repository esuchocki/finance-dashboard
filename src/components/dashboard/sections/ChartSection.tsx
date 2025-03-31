
import React from "react";
import MonthlyTrendsChart from "../MonthlyTrendsChart";
import BalanceChart from "../BalanceChart";
import CategoryCharts from "../CategoryCharts";

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

      {/* Balance Over Time Chart */}
      <BalanceChart balanceData={balanceData} />
      
      {/* Category Charts */}
      <CategoryCharts 
        expenseData={categoryData} 
        incomeData={incomeData}
        transactions={transactions} 
      />
    </>
  );
};

export default ChartSection;
