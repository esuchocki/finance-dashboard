
import React from "react";
import MonthlyTrendsChart from "../MonthlyTrendsChart";
import BalanceChart from "../BalanceChart";

interface ChartSectionProps {
  monthlyTrendData: any[];
  balanceData: any[];
  categoryData: any[];
  incomeData: any[];
}

const ChartSection = ({
  monthlyTrendData,
  balanceData,
  categoryData,
  incomeData,
}: ChartSectionProps) => {
  return (
    <>
      <MonthlyTrendsChart monthlyTrendData={monthlyTrendData} />
      <BalanceChart balanceData={balanceData} />
    </>
  );
};

export default ChartSection;
