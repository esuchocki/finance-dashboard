
import React from "react";
import MonthlyTrendsChart from "../MonthlyTrendsChart";
import BalanceChart from "../BalanceChart";
import MonthlyIncomeExpensesChart from "../MonthlyIncomeExpensesChart";
import ClaudeEnhancedCategories from "../ClaudeEnhancedCategories";
import { useFinance } from "@/context/FinanceContext";
import { Badge } from "@/components/ui/badge";

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
  const { isDevelopmentMode } = useFinance();
  
  return (
    <>
      {/* Monthly Trends Chart */}
      <MonthlyTrendsChart monthlyTrendData={monthlyTrendData} />

      {/* Monthly Income & Expenses Chart */}
      <MonthlyIncomeExpensesChart monthlyTrendData={monthlyTrendData} />
      
      {/* Balance Over Time Chart */}
      <BalanceChart balanceData={balanceData} />
      
      {/* Claude AI Enhanced Categories */}
      <div className="relative">
        {isDevelopmentMode && (
          <Badge 
            variant="outline" 
            className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 z-10"
          >
            Development Mode
          </Badge>
        )}
        <ClaudeEnhancedCategories 
          transactions={transactions} 
        />
      </div>
    </>
  );
};

export default ChartSection;
