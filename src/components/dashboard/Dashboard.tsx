
import React, { useState, useEffect, useMemo } from "react";
import { useFinance } from "@/context/FinanceContext";
import FileUploader from "@/components/FileUploader";
import TransactionList from "@/components/TransactionList";
import InsightsList from "@/components/InsightsList";
import UploadSummary from "@/components/UploadSummary";
import DashboardSummaryCards from "./DashboardSummaryCards";
import DashboardError from "./sections/DashboardError";
import DashboardHeader from "./sections/DashboardHeader";
import ChartSection from "./sections/ChartSection";
import {
  prepareChartData,
  prepareIncomeChartData,
  prepareMonthlyTrendData,
  prepareBalanceData,
  calculateCurrentTrends
} from "./utils/chartDataUtils";

const Dashboard = () => {
  const { transactions, filteredTransactions, summary, clearData, isLoading } = useFinance();
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Process transaction data when filteredTransactions change
  useEffect(() => {
    if (filteredTransactions.length > 0) {
      setIsProcessing(true);
      setError(null);
      
      try {
        console.log("Starting to prepare chart data");
        // Use a small timeout to allow the UI to update before heavy processing
        setTimeout(() => {
          try {
            const expenseData = prepareChartData(filteredTransactions);
            const incomeChartData = prepareIncomeChartData(filteredTransactions);
            
            setCategoryData(expenseData);
            setIncomeData(incomeChartData);

            console.log("Chart data prepared successfully");
          } catch (err) {
            console.error("Error preparing chart data:", err);
            setError("Failed to process transaction data for visualization");
          } finally {
            setIsProcessing(false);
          }
        }, 100);
      } catch (err) {
        console.error("Error in chart data preparation:", err);
        setError("Failed to process transaction data");
        setIsProcessing(false);
      }
    } else {
      setCategoryData([]);
      setIncomeData([]);
      setIsProcessing(false);
    }
  }, [filteredTransactions]);
  
  // Pre-calculate the monthly trend and balance data using useMemo for performance
  const monthlyTrendData = useMemo(() => {
    if (!summary || !summary.monthlyBreakdown) return [];
    return prepareMonthlyTrendData(summary.monthlyBreakdown);
  }, [summary]);

  const balanceData = useMemo(() => {
    if (!summary || !summary.monthlyBreakdown) return [];
    return prepareBalanceData(summary.monthlyBreakdown);
  }, [summary]);

  const trends = useMemo(() => {
    return calculateCurrentTrends(monthlyTrendData);
  }, [monthlyTrendData]);

  // If we're still loading from the FinanceContext, return loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  // If we're processing locally in the Dashboard component
  if (isProcessing) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Processing transaction data...</p>
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  // If we have an error in the Dashboard component
  if (error) {
    return <DashboardError error={error} onClearData={clearData} />;
  }

  return (
    <div className="space-y-6">
      {transactions.length === 0 ? (
        <div className="animate-fade-in">
          <FileUploader />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Show Upload Summary first when data is loaded */}
          <div className="animate-fade-in">
            <UploadSummary />
          </div>
          
          {/* Dashboard Header */}
          <DashboardHeader onClearData={clearData} />
          
          {/* Summary Cards */}
          <DashboardSummaryCards summary={summary} trends={trends} />
          
          {/* Charts Section */}
          <ChartSection 
            monthlyTrendData={monthlyTrendData}
            balanceData={balanceData}
            categoryData={categoryData}
            incomeData={incomeData}
            transactions={filteredTransactions}
          />
          
          {/* Insights */}
          <div className="animate-fade-in stagger-1">
            <InsightsList />
          </div>
          
          {/* Transactions List */}
          <div className="animate-fade-in stagger-2">
            <TransactionList 
              transactions={filteredTransactions.slice(0, 10)} 
              title="Recent Transactions"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
