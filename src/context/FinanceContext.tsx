
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Transaction, TransactionFilterOptions, FinancialSummary, FinancialInsight } from "@/lib/types";
import { parseQBOFile } from "@/lib/qboParser";
import { toast } from "sonner";
import { enhanceTransactionsWithClaude, hasClaudeApiKey } from "@/lib/claudeService";

interface FinanceContextType {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  uploadQBOFile: (file: File) => Promise<number>;
  applyFilters: (filters: TransactionFilterOptions) => void;
  summary: FinancialSummary | null;
  insights: FinancialInsight[];
  filterOptions: TransactionFilterOptions;
  clearData: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<TransactionFilterOptions>({});
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);

  const calculateSummary = (txns: Transaction[]): FinancialSummary => {
    // Determine income and expense transactions, using categoryType if available
    const incomeTransactions = txns.filter(t => 
      t.categoryType === "income" || 
      (!t.categoryType && (t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST"))
    );
    
    const expenseTransactions = txns.filter(t => 
      t.categoryType === "expense" || 
      (!t.categoryType && (t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE"))
    );
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate top expense categories using Claude's enhanced categorization
    const categoryMap = new Map<string, number>();
    for (const t of expenseTransactions) {
      // Use Claude's categorization, which should now be more specific than just "Expenses"
      const category = t.category || "Uncategorized";
      const currentAmount = categoryMap.get(category) || 0;
      categoryMap.set(category, currentAmount + t.amount);
    }
    
    const topExpenseCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    // Find recurring expenses (simplified)
    const recurringExpensesTotal = expenseTransactions
      .filter(t => t.isRecurring)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Find largest transaction
    const largestTransaction = [...txns].sort((a, b) => b.amount - a.amount)[0];
    
    // Calculate monthly breakdown (for trends)
    const monthlyBreakdown = calculateMonthlyBreakdown(txns);
    
    return {
      totalIncome,
      totalExpenses,
      netCashflow: totalIncome - totalExpenses,
      topExpenseCategories,
      recurringExpensesTotal,
      largestTransaction,
      monthlyBreakdown,
      transactionCount: txns.length,
      dateRange: calculateDateRange(txns)
    };
  };

  // New helper functions for enhanced insights
  const calculateMonthlyBreakdown = (txns: Transaction[]) => {
    const breakdown: Record<string, { income: number; expenses: number }> = {};
    
    txns.forEach(t => {
      const monthYear = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!breakdown[monthYear]) {
        breakdown[monthYear] = { income: 0, expenses: 0 };
      }
      
      if (t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST") {
        breakdown[monthYear].income += t.amount;
      } else if (t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE") {
        breakdown[monthYear].expenses += t.amount;
      }
    });
    
    return Object.entries(breakdown)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };
  
  const calculateDateRange = (txns: Transaction[]) => {
    if (txns.length === 0) return { start: new Date(), end: new Date() };
    
    // Clone the array to avoid mutating the original
    const sortedByDate = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());
    return {
      start: sortedByDate[0].date,
      end: sortedByDate[sortedByDate.length - 1].date
    };
  };

  const generateInsights = (txns: Transaction[], summary: FinancialSummary): FinancialInsight[] => {
    const insights: FinancialInsight[] = [];
    
    // Basic cash flow insights
    if (summary.netCashflow < 0) {
      insights.push({
        id: "negative-cashflow",
        title: "Negative Cash Flow",
        description: "Your expenses exceed your income for this period.",
        type: "warning"
      });
    } else {
      const savingsRate = (summary.netCashflow / summary.totalIncome) * 100;
      if (savingsRate > 20) {
        insights.push({
          id: "high-savings",
          title: "Great Savings Rate",
          description: `You're saving ${savingsRate.toFixed(1)}% of your income, which is excellent!`,
          type: "info"
        });
      }
    }
    
    // Look for potential duplicate transactions
    const potentialDuplicates = findPotentialDuplicates(txns);
    if (potentialDuplicates.length > 0) {
      insights.push({
        id: "potential-duplicates",
        title: "Potential Duplicate Transactions",
        description: `Found ${potentialDuplicates.length} potential duplicate transactions that may need review.`,
        type: "warning",
        relatedTransactions: potentialDuplicates
      });
    }
    
    // Look for significant category spending
    const topCategory = summary.topExpenseCategories[0];
    if (topCategory && (topCategory.amount / summary.totalExpenses > 0.4)) {
      insights.push({
        id: "high-category-spending",
        title: "High Category Spending",
        description: `${topCategory.category} represents over 40% of your total expenses.`,
        type: "info"
      });
    }
    
    // Add subscription insight if relevant
    if (summary.recurringExpensesTotal > 0) {
      const recurringPercentage = (summary.recurringExpensesTotal / summary.totalExpenses) * 100;
      insights.push({
        id: "subscription-spending",
        title: "Subscription Spending",
        description: `You're spending approximately $${summary.recurringExpensesTotal.toFixed(2)} (${recurringPercentage.toFixed(1)}% of expenses) on recurring items.`,
        type: "info"
      });
    }
    
    // Analyze spending trends
    const trendInsight = analyzeMonthlyTrends(summary.monthlyBreakdown);
    if (trendInsight) insights.push(trendInsight);
    
    // Large transactions insight
    const largeTransactions = findLargeTransactions(txns, summary.totalExpenses);
    if (largeTransactions.length > 0) {
      insights.push({
        id: "large-transactions",
        title: "Large Transactions Detected",
        description: `Found ${largeTransactions.length} unusually large transactions that represent significant portions of your spending.`,
        type: "warning",
        relatedTransactions: largeTransactions
      });
    }
    
    return insights;
  };

  // New helper functions for enhanced insights
  const analyzeMonthlyTrends = (monthlyData: { month: string; income: number; expenses: number }[]) => {
    if (monthlyData.length < 2) return null;
    
    // Look at the most recent 3 months (or fewer if not available)
    const recentMonths = monthlyData.slice(-Math.min(3, monthlyData.length));
    
    // Check if expenses are consistently increasing
    let isIncreasing = true;
    for (let i = 1; i < recentMonths.length; i++) {
      if (recentMonths[i].expenses <= recentMonths[i-1].expenses) {
        isIncreasing = false;
        break;
      }
    }
    
    if (isIncreasing && recentMonths.length > 1) {
      const oldestMonth = recentMonths[0];
      const newestMonth = recentMonths[recentMonths.length - 1];
      const percentIncrease = ((newestMonth.expenses - oldestMonth.expenses) / oldestMonth.expenses) * 100;
      
      return {
        id: "increasing-expenses",
        title: "Increasing Expenses Trend",
        description: `Your monthly expenses have increased by ${percentIncrease.toFixed(1)}% over the last ${recentMonths.length} months.`,
        type: "warning" as const // Fix: explicitly type as literal "warning"
      };
    }
    
    return null;
  };
  
  const findLargeTransactions = (txns: Transaction[], totalExpenses: number): string[] => {
    // Consider a transaction "large" if it's more than 10% of total expenses
    const threshold = totalExpenses * 0.1;
    return txns
      .filter(t => (t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE") && 
                   t.amount > threshold)
      .map(t => t.id);
  };

  // Simple duplicate detection
  const findPotentialDuplicates = (txns: Transaction[]): string[] => {
    const duplicateIds: string[] = [];
    
    for (let i = 0; i < txns.length; i++) {
      for (let j = i + 1; j < txns.length; j++) {
        const t1 = txns[i];
        const t2 = txns[j];
        
        // Check for same amount, same description, and close dates (within 48 hours)
        if (
          t1.amount === t2.amount && 
          t1.description === t2.description &&
          Math.abs(t1.date.getTime() - t2.date.getTime()) < 48 * 60 * 60 * 1000
        ) {
          duplicateIds.push(t1.id, t2.id);
        }
      }
    }
    
    return [...new Set(duplicateIds)];
  };

  const uploadQBOFile = async (file: File): Promise<number> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Starting QBO file upload and parsing");
      const content = await file.text();
      let parsedTransactions = parseQBOFile(content);
      
      // Enhanced categorization with Claude if API key is available
      if (hasClaudeApiKey()) {
        try {
          toast.info("Starting transaction categorization with Claude AI", {
            description: "This may take a moment for larger datasets",
            duration: 5000
          });
          
          // Wait for Claude AI to enhance the transactions
          parsedTransactions = await enhanceTransactionsWithClaude(parsedTransactions);
          console.log(`Transactions enhanced: ${parsedTransactions.length}`);
          
          // Check if categorization was successful
          const categorizedCount = parsedTransactions.filter(t => 
            t.category && t.category !== "Uncategorized"
          ).length;
          
          const categorizedPercent = Math.round((categorizedCount / parsedTransactions.length) * 100);
          
          // Count unique categories for better feedback
          const uniqueCategories = new Set(parsedTransactions.map(t => t.category)).size;
          
          if (categorizedPercent < 50) {
            toast.warning("Limited categorization success", {
              description: `Only ${categorizedPercent}% of transactions were successfully categorized`,
              duration: 5000
            });
          } else {
            toast.success("Transactions categorized successfully", {
              description: `${categorizedPercent}% of transactions were categorized into ${uniqueCategories} categories`,
              duration: 5000
            });
          }
        } catch (error) {
          console.error("Error enhancing transactions with Claude:", error);
          toast.error("Could not enhance all transactions with Claude AI", {
            description: "Using basic categorization instead for some transactions"
          });
          // We continue with partial results rather than failing completely
        }
      } else {
        toast.info("Add a Claude API key to enhance transaction categorization", {
          description: "Click the 'Add Claude API' button in the navbar"
        });
      }
      
      // Sort by date descending
      parsedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      // Safety check to ensure we have valid transactions
      if (!Array.isArray(parsedTransactions) || parsedTransactions.length === 0) {
        throw new Error("No valid transactions found in the file");
      }
      
      // Log a sample transaction to debug categorization issues
      if (parsedTransactions.length > 0) {
        console.log("Sample transaction:", JSON.stringify(parsedTransactions[0], null, 2));
      }
      
      console.log(`Setting ${parsedTransactions.length} transactions`);
      setTransactions(parsedTransactions);
      setFilteredTransactions(parsedTransactions);
      
      const transactionCount = parsedTransactions.length;
      
      // Only calculate summary and generate insights if we have transactions
      if (transactionCount > 0) {
        try {
          // Calculate summary
          console.log("Calculating financial summary");
          const newSummary = calculateSummary(parsedTransactions);
          setSummary(newSummary);
          
          // Generate insights
          console.log("Generating financial insights");
          const newInsights = generateInsights(parsedTransactions, newSummary);
          setInsights(newInsights);
          
          const dateRange = newSummary.dateRange;
          const formattedStartDate = dateRange.start.toLocaleDateString();
          const formattedEndDate = dateRange.end.toLocaleDateString();
          
          toast.success(
            `Imported ${transactionCount} transactions from ${formattedStartDate} to ${formattedEndDate}.`
          );
          
          // Show key insights as toasts for immediate feedback
          if (newInsights.length > 0) {
            setTimeout(() => {
              // Only show one key insight for now to avoid overwhelming the user
              const keyInsight = newInsights.find(i => i.type === "warning") || newInsights[0];
              if (keyInsight) {
                toast.info(`${keyInsight.title}: ${keyInsight.description}`);
              }
            }, 1000);
          }
        } catch (error) {
          console.error("Error processing transaction data:", error);
          toast.error("Error processing transaction data", {
            description: "The data was imported but could not be fully analyzed"
          });
          // We continue with the transactions, even if summary/insights failed
        }
      } else {
        setSummary(null);
        setInsights([]);
        throw new Error("No transactions found in the file. Please check the file format.");
      }
      
      return transactionCount;
    } catch (error) {
      console.error("Error uploading QBO file:", error);
      setError((error as Error).message);
      toast.error(`Error uploading file: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (filters: TransactionFilterOptions) => {
    setFilterOptions(filters);
    
    let filtered = [...transactions];
    
    // Apply date filters
    if (filters.startDate) {
      filtered = filtered.filter(t => t.date >= filters.startDate!);
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(t => t.date <= filters.endDate!);
    }
    
    // Apply amount filters
    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(t => t.amount >= filters.minAmount!);
    }
    
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(t => t.amount <= filters.maxAmount!);
    }
    
    // Apply type filters
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(t => filters.types!.includes(t.type));
    }
    
    // Apply category filters
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(t => filters.categories!.includes(t.category));
    }
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower) || 
        t.memo.toLowerCase().includes(searchLower) ||
        t.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply recurring filter
    if (filters.isRecurring !== undefined) {
      filtered = filtered.filter(t => t.isRecurring === filters.isRecurring);
    }
    
    setFilteredTransactions(filtered);
  };

  const clearData = () => {
    setTransactions([]);
    setFilteredTransactions([]);
    setSummary(null);
    setInsights([]);
    setFilterOptions({});
    toast.success("Data cleared. You can now upload a new file.");
  };

  const value = {
    transactions,
    filteredTransactions,
    isLoading,
    error,
    uploadQBOFile,
    applyFilters,
    summary,
    insights,
    filterOptions,
    clearData
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}
