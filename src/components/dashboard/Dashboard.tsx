import React, { useState, useEffect, useMemo } from "react";
import { useFinance } from "@/context/FinanceContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, LineChart, Info, AlertCircle } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import TransactionList from "@/components/TransactionList";
import InsightsList from "@/components/InsightsList";
import UploadSummary from "@/components/UploadSummary";
import DashboardSummaryCards from "./DashboardSummaryCards";
import MonthlyTrendsChart from "./MonthlyTrendsChart";
import BalanceChart from "./BalanceChart";
import CategoryCharts from "./CategoryCharts";
import { Transaction } from "@/lib/types";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const Dashboard = () => {
  const { transactions, filteredTransactions, summary, clearData, isLoading } = useFinance();
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);

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
            console.log("Sample category data:", expenseData.slice(0, 2));
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

  // Prepare chart data with enhanced categorization
  const prepareChartData = (transactions: Transaction[]) => {
    // Group by category and sum amounts
    const categoryMap = new Map<string, { 
      amount: number, 
      subcategories: Map<string, number>,
      transactions: Transaction[]
    }>();
    
    // First, filter for expense transactions
    const expenseTransactions = transactions.filter(
      t => t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE"
    );
    
    // Count total uncategorized before processing
    const initialUncategorized = expenseTransactions.filter(
      t => !t.category || t.category === "Uncategorized"
    ).length;
    
    console.log(`Initial uncategorized expense transactions: ${initialUncategorized} of ${expenseTransactions.length}`);
    
    expenseTransactions.forEach(t => {
      // IMPORTANT: Always use Claude's assigned category if available, with fallback to original
      // If no category is available or it's "Uncategorized", try to derive one from the description
      let category = t.category;
      if (!category || category === "Uncategorized") {
        if (t.verboseDescription) {
          // Try to extract category from verbose description if available
          const words = t.verboseDescription.split(' ');
          if (words.length > 1) {
            // For transactions with verbose descriptions but no category, 
            // set them to "Other" instead of "Uncategorized" for better organization
            category = "Other";
          }
        }
      }
      
      // Still defaulting to "Other" if needed
      category = category && category !== "Uncategorized" ? category : "Other";
      const subCategory = t.subCategory || "Other";
      
      // Initialize category if it doesn't exist
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { 
          amount: 0, 
          subcategories: new Map<string, number>(),
          transactions: []
        });
      }
      
      // Update category amounts
      const categoryData = categoryMap.get(category)!;
      categoryData.amount += Math.abs(t.amount); // Use absolute value to ensure positive numbers for chart
      categoryData.transactions.push(t);
      
      // Update subcategory amounts
      const currentSubAmount = categoryData.subcategories.get(subCategory) || 0;
      categoryData.subcategories.set(subCategory, currentSubAmount + Math.abs(t.amount));
    });
    
    // Log category distribution
    console.log("Category distribution:", 
      Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        count: data.transactions.length,
        amount: data.amount
      }))
    );
    
    // Convert to chart data format, sorting from highest to lowest
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.amount,
        subcategories: Array.from(data.subcategories.entries())
          .map(([subName, amount]) => ({ name: subName, value: amount }))
          .sort((a, b) => b.value - a.value),
        transactions: data.transactions
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Prepare income chart data with enhanced categorization
  const prepareIncomeChartData = (transactions: Transaction[]) => {
    // Group by category and sum amounts
    const categoryMap = new Map<string, { 
      amount: number, 
      subcategories: Map<string, number>,
      transactions: Transaction[]
    }>();
    
    // Filter for income transactions
    const incomeTransactions = transactions.filter(
      t => t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST"
    );
    
    // Count total uncategorized before processing
    const initialUncategorized = incomeTransactions.filter(
      t => !t.category || t.category === "Uncategorized"
    ).length;
    
    console.log(`Initial uncategorized income transactions: ${initialUncategorized} of ${incomeTransactions.length}`);
    
    incomeTransactions.forEach(t => {
      // IMPORTANT: Always use Claude's assigned category if available, with fallback to original
      // For income, if the category is missing, try to use "Income" as default
      let category = t.category;
      if (!category || category === "Uncategorized") {
        category = "Income";
      }
      
      // Still defaulting if needed
      category = category && category !== "Uncategorized" ? category : "Income";
      const subCategory = t.subCategory || "Other Income";
      
      // Initialize category if it doesn't exist
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { 
          amount: 0, 
          subcategories: new Map<string, number>,
          transactions: []
        });
      }
      
      // Update category amounts
      const categoryData = categoryMap.get(category)!;
      categoryData.amount += Math.abs(t.amount); // Use absolute value for positive chart values
      categoryData.transactions.push(t);
      
      // Update subcategory amounts
      const currentSubAmount = categoryData.subcategories.get(subCategory) || 0;
      categoryData.subcategories.set(subCategory, currentSubAmount + Math.abs(t.amount));
    });
    
    // Log category distribution
    console.log("Income category distribution:", 
      Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        count: data.transactions.length,
        amount: data.amount
      }))
    );
    
    // Convert to chart data format
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.amount,
        subcategories: Array.from(data.subcategories.entries())
          .map(([subName, amount]) => ({ name: subName, value: amount }))
          .sort((a, b) => b.value - a.value),
        transactions: data.transactions
      }))
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
  
  // Pre-calculate the monthly trend and balance data using useMemo for performance
  const monthlyTrendData = useMemo(() => {
    if (!summary || !summary.monthlyBreakdown) return [];
    return prepareMonthlyTrendData();
  }, [summary]);

  const balanceData = useMemo(() => {
    if (!summary || !summary.monthlyBreakdown) return [];
    return prepareBalanceData();
  }, [summary]);

  const trends = useMemo(() => {
    return calculateCurrentTrends();
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
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button 
          variant="outline" 
          className="flex items-center gap-2 hover:bg-muted" 
          onClick={clearData}
        >
          <RefreshCw className="h-4 w-4" />
          Try Again with Another File
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {transactions.length === 0 ? (
        <div className="animate-fade-in">
          <FileUploader open={showFileUploader} onOpenChange={setShowFileUploader} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Show Upload Summary first when data is loaded */}
          <div className="animate-fade-in">
            <UploadSummary />
          </div>
          
          {/* Summary Cards */}
          <div className="flex justify-between items-center animate-fade-in">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold flex items-center">
                <LineChart className="h-6 w-6 mr-2 text-finance-primary" />
                Financial Dashboard
              </h2>
              
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">AI-Enhanced Categories</h4>
                    <p className="text-sm text-muted-foreground">
                      Your transactions have been analyzed and categorized using Claude AI to provide more accurate insights.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 hover:bg-muted" 
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
          <CategoryCharts 
            expenseData={categoryData} 
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
      
      <FileUploader
        open={showFileUploader}
        onOpenChange={setShowFileUploader}
      />
    </div>
  );
};

export default Dashboard;
