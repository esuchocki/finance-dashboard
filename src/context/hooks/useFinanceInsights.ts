
import { useState, useEffect } from "react";
import { Transaction, FinancialSummary, FinancialInsight } from "@/lib/types";

// Generate financial insights based on transaction data and summary
export const generateInsights = (txns: Transaction[], summary: FinancialSummary): FinancialInsight[] => {
  console.log("Generating insights from", txns.length, "transactions");
  const insights: FinancialInsight[] = [];
  
  // Basic cash flow insights
  if (summary.netCashflow < 0) {
    insights.push({
      id: "negative-cashflow",
      title: "Negative Cash Flow",
      description: "Your expenses exceed your income for this period.",
      type: "warning",
      category: "cashflow"
    });
  } else {
    const savingsRate = (summary.netCashflow / summary.totalIncome) * 100;
    if (savingsRate > 20) {
      insights.push({
        id: "high-savings",
        title: "Great Savings Rate",
        description: `You're saving ${savingsRate.toFixed(1)}% of your income, which is excellent!`,
        type: "info",
        category: "savings"
      });
    }
  }
  
  // Look for potential duplicate transactions
  const potentialDuplicateIds = findPotentialDuplicates(txns);
  if (potentialDuplicateIds.length > 0) {
    const duplicateTransactions = txns.filter(t => potentialDuplicateIds.includes(t.id));
    insights.push({
      id: "potential-duplicates",
      title: "Potential Duplicate Transactions",
      description: `Found ${potentialDuplicateIds.length} potential duplicate transactions that may need review.`,
      type: "warning",
      category: "data-quality",
      relatedTransactions: duplicateTransactions
    });
  }
  
  // Look for significant category spending
  const topCategory = summary.topExpenseCategories[0];
  if (topCategory && (topCategory.amount / summary.totalExpenses > 0.4)) {
    insights.push({
      id: "high-category-spending",
      title: "High Category Spending",
      description: `${topCategory.category} represents over 40% of your total expenses.`,
      type: "info",
      category: "spending"
    });
  }
  
  // Add subscription insight if relevant
  if (summary.recurringExpensesTotal > 0) {
    const recurringPercentage = (summary.recurringExpensesTotal / summary.totalExpenses) * 100;
    insights.push({
      id: "subscription-spending",
      title: "Subscription Spending",
      description: `You're spending approximately $${summary.recurringExpensesTotal.toFixed(2)} (${recurringPercentage.toFixed(1)}% of expenses) on recurring items.`,
      type: "info",
      category: "subscriptions"
    });
  }
  
  // Analyze spending trends
  const trendInsight = analyzeMonthlyTrends(summary.monthlyBreakdown);
  if (trendInsight) insights.push(trendInsight);
  
  // Large transactions insight
  const largeTransactionIds = findLargeTransactions(txns, summary.totalExpenses);
  if (largeTransactionIds.length > 0) {
    const largeTransactions = txns.filter(t => largeTransactionIds.includes(t.id));
    insights.push({
      id: "large-transactions",
      title: "Large Transactions Detected",
      description: `Found ${largeTransactionIds.length} unusually large transactions that represent significant portions of your spending.`,
      type: "warning",
      category: "spending",
      relatedTransactions: largeTransactions
    });
  }
  
  console.log("Generated", insights.length, "insights:", insights);
  return insights;
};

// Helper functions for insights generation
export const analyzeMonthlyTrends = (monthlyData: { month: string; income: number; expenses: number }[]) => {
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
      type: "warning" as const,
      category: "trends"
    };
  }
  
  return null;
};

export const findLargeTransactions = (txns: Transaction[], totalExpenses: number): string[] => {
  // Consider a transaction "large" if it's more than 10% of total expenses
  const threshold = totalExpenses * 0.1;
  return txns
    .filter(t => (t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE") && 
               t.amount > threshold)
    .map(t => t.id);
};

// Simple duplicate detection
export const findPotentialDuplicates = (txns: Transaction[]): string[] => {
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

// This is the hook that will be used by components
export const useFinanceInsights = (financialSummary: FinancialSummary | null) => {
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [hasGeneratedInsights, setHasGeneratedInsights] = useState(false);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);

  // Check if we should automatically generate insights when summary changes
  useEffect(() => {
    if (financialSummary && !hasGeneratedInsights && !isGeneratingInsights && insights.length === 0) {
      console.log("Financial summary available but no insights - triggering automatic generation");
      generateFinanceInsights();
    }
  }, [financialSummary, hasGeneratedInsights, isGeneratingInsights, insights]);

  const generateFinanceInsights = async () => {
    if (!financialSummary) {
      console.log("Cannot generate insights: no financial summary available");
      return;
    }

    console.log("Starting insight generation process");
    setIsGeneratingInsights(true);
    
    try {
      // Get transactions from the financial summary or use an empty array
      const txns = (financialSummary as any).transactions || [];
      console.log(`Generating insights from ${txns.length} transactions`);
      
      // Generate basic insights based on transaction data
      const basicInsights = generateInsights(
        txns,
        financialSummary
      );
      
      // Set the insights
      setInsights(basicInsights);
      setHasGeneratedInsights(true);
      console.log(`Generated ${basicInsights.length} insights successfully`);
    } catch (error) {
      console.error("Error generating insights:", error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return {
    generateInsights: generateFinanceInsights,
    isGeneratingInsights,
    hasGeneratedInsights,
    insights
  };
};
