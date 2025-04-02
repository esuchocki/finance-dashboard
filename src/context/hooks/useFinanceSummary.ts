import { useState, useEffect } from "react";
import { Transaction, FinancialSummary } from "@/lib/types";

// Calculate financial summary from transactions
export const calculateSummary = (txns: Transaction[]): FinancialSummary => {
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
    .map(([category, amount]) => {
      // Calculate the percentage of total expenses
      const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
      return { category, amount, percentage };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  // Find recurring expenses (simplified)
  const recurringExpenses = expenseTransactions.filter(t => t.isRecurring);
  const recurringExpensesTotal = recurringExpenses.reduce((sum, t) => sum + t.amount, 0);
  
  // Find largest transaction
  const largestTransaction = [...txns].sort((a, b) => b.amount - a.amount)[0];
  
  // Calculate monthly breakdown (for trends)
  const monthlyBreakdown = calculateMonthlyBreakdown(txns);
  
  // Calculate net cashflow
  const netCashflow = totalIncome - totalExpenses;
  
  return {
    totalIncome,
    totalExpenses,
    netCashflow,
    balance: netCashflow, // Use netCashflow as balance for now
    topExpenseCategories,
    topIncomeCategories: [], // Empty array for now
    recurringExpensesTotal,
    recurringExpenses,
    largestTransaction,
    largestExpense: null, // Set to null for now
    largestIncome: null, // Set to null for now
    monthlyBreakdown,
    transactionCount: txns.length,
    dateRange: calculateDateRange(txns)
  };
};

// Helper functions for enhanced insights
export const calculateMonthlyBreakdown = (txns: Transaction[]) => {
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

export const calculateDateRange = (txns: Transaction[]) => {
  if (txns.length === 0) return { start: new Date(), end: new Date() };
  
  // Clone the array to avoid mutating the original
  const sortedByDate = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());
  return {
    start: sortedByDate[0].date,
    end: sortedByDate[sortedByDate.length - 1].date
  };
};

// Add the missing hook
export const useFinanceSummary = (transactions: Transaction[]) => {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // Calculate summary when transactions or date range changes
  useEffect(() => {
    if (transactions.length === 0) {
      setFinancialSummary(null);
      return;
    }

    // Filter transactions by date range if present
    let filteredTxns = transactions;
    if (dateRange && dateRange.start && dateRange.end) {
      filteredTxns = transactions.filter(txn => {
        const txnDate = txn.date;
        return txnDate >= dateRange.start && txnDate <= dateRange.end;
      });
    }

    // Calculate the summary
    const summary = calculateSummary(filteredTxns);
    
    // Add the transactions to the summary for reference
    const enhancedSummary = {
      ...summary,
      transactions: filteredTxns
    };
    
    setFinancialSummary(enhancedSummary);
  }, [transactions, dateRange]);

  // Update date range function
  const updateDateRange = (start: Date, end: Date) => {
    setDateRange({ start, end });
  };

  return { 
    financialSummary, 
    updateDateRange 
  };
};
