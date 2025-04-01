
import React from "react";
import MonthlyTrendsChart from "../MonthlyTrendsChart";
import BalanceChart from "../BalanceChart";
import ClaudeEnhancedCategories from "../ClaudeEnhancedCategories";
import { useFinance } from "@/context/FinanceContext";
import { Badge } from "@/components/ui/badge";
import ClaudeRawCategoryDebugger from "../ClaudeRawCategoryDebugger";

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
      {/* Monthly Trends Chart - Now includes the Trends tab */}
      <MonthlyTrendsChart monthlyTrendData={monthlyTrendData} />
      
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
      
      {/* Claude Raw Category Debugger - Only visible in development mode */}
      {isDevelopmentMode && (
        <ClaudeRawCategoryDebugger 
          transactions={transactions} 
        />
      )}
    </>
  );
};

export default ChartSection;
