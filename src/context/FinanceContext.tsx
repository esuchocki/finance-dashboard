import React, { createContext, useContext, useState, ReactNode } from "react";
import { Transaction, TransactionFilterOptions, FinancialSummary, FinancialInsight } from "@/lib/types";
import { parseQBOFile } from "@/lib/qboParser";
import { toast } from "sonner";

interface FinanceContextType {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  isLoading: boolean;
  uploadQBOFile: (file: File) => Promise<void>;
  applyFilters: (filters: TransactionFilterOptions) => void;
  summary: FinancialSummary | null;
  insights: FinancialInsight[];
  filterOptions: TransactionFilterOptions;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState<TransactionFilterOptions>({});
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);

  const calculateSummary = (txns: Transaction[]): FinancialSummary => {
    const incomeTransactions = txns.filter(t => 
      t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST"
    );
    
    const expenseTransactions = txns.filter(t => 
      t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE"
    );
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate top expense categories
    const categoryMap = new Map<string, number>();
    for (const t of expenseTransactions) {
      const currentAmount = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, currentAmount + t.amount);
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
    
    return {
      totalIncome,
      totalExpenses,
      netCashflow: totalIncome - totalExpenses,
      topExpenseCategories,
      recurringExpensesTotal,
      largestTransaction
    };
  };

  const generateInsights = (txns: Transaction[], summary: FinancialSummary): FinancialInsight[] => {
    const insights: FinancialInsight[] = [];
    
    // Add basic insights
    if (summary.netCashflow < 0) {
      insights.push({
        id: "negative-cashflow",
        title: "Negative Cash Flow",
        description: "Your expenses exceed your income for this period.",
        type: "warning"
      });
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
      insights.push({
        id: "subscription-spending",
        title: "Subscription Spending",
        description: `You're spending approximately $${summary.recurringExpensesTotal.toFixed(2)} on recurring items.`,
        type: "info"
      });
    }
    
    return insights;
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

  const uploadQBOFile = async (file: File) => {
    try {
      setIsLoading(true);
      
      const content = await file.text();
      const parsedTransactions = parseQBOFile(content);
      
      // Sort by date descending
      parsedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTransactions(parsedTransactions);
      setFilteredTransactions(parsedTransactions);
      
      // Calculate summary
      const newSummary = calculateSummary(parsedTransactions);
      setSummary(newSummary);
      
      // Generate insights
      const newInsights = generateInsights(parsedTransactions, newSummary);
      setInsights(newInsights);
      
      toast.success(`Imported ${parsedTransactions.length} transactions successfully.`);
    } catch (error) {
      console.error("Error uploading QBO file:", error);
      toast.error(`Error uploading file: ${(error as Error).message}`);
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

  const value = {
    transactions,
    filteredTransactions,
    isLoading,
    uploadQBOFile,
    applyFilters,
    summary,
    insights,
    filterOptions
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
