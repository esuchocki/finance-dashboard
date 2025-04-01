
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Transaction, TransactionFilterOptions, FinancialSummary, FinancialInsight, DateRange } from "@/lib/types";
import { useFinanceUpload } from "./hooks/useFinanceUpload";
import { applyFilters } from "./hooks/useTransactionFilters";
import { format, subMonths, startOfYear, startOfMonth, endOfMonth } from "date-fns";

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
  isUsingCache: boolean;
  isDevelopmentMode: boolean;
  toggleDevelopmentMode: () => void;
  filters: TransactionFilterOptions;
  updateFilters: (filters: TransactionFilterOptions) => void;
  resetFilters: () => void;
  applyPresetDateRange: (preset: 'lastMonth' | 'last3Months' | 'lastYear' | 'ytd') => void;
  stats: {
    minAmount: number;
    maxAmount: number;
  } | null;
}

// Default empty filter options that match the required type
const defaultFilterOptions: TransactionFilterOptions = {
  categories: [],
  types: [],
  dateRange: { start: null, end: null },
  amountRange: { min: null, max: null },
  searchQuery: "",
  isRecurring: null
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [isDevelopmentMode, setIsDevelopmentMode] = useState<boolean>(
    localStorage.getItem('financeDashboard_developmentMode') === 'true'
  );
  
  const { 
    transactions, 
    filteredTransactions, 
    setFilteredTransactions,
    isLoading, 
    error, 
    summary, 
    insights, 
    uploadQBOFile, 
    clearData,
    isUsingCache 
  } = useFinanceUpload(isDevelopmentMode);
  
  const [filterOptions, setFilterOptions] = useState<TransactionFilterOptions>(defaultFilterOptions);
  const [filters, setFilters] = useState<TransactionFilterOptions>(defaultFilterOptions);
  
  // Calculate min and max transaction amounts for the slider
  const stats = React.useMemo(() => {
    if (!transactions.length) return null;
    
    let minAmount = Number.MAX_VALUE;
    let maxAmount = 0;
    
    transactions.forEach(t => {
      const amount = Math.abs(t.amount);
      if (amount < minAmount) minAmount = amount;
      if (amount > maxAmount) maxAmount = amount;
    });
    
    return {
      minAmount: minAmount === Number.MAX_VALUE ? 0 : minAmount,
      maxAmount: maxAmount === 0 ? 1000 : maxAmount
    };
  }, [transactions]);

  const handleApplyFilters = (filters: TransactionFilterOptions) => {
    setFilterOptions(filters);
    const filtered = applyFilters(transactions, filters);
    setFilteredTransactions(filtered);
  };
  
  const updateFilters = (newFilters: TransactionFilterOptions) => {
    setFilters(newFilters);
    handleApplyFilters(newFilters);
  };
  
  const resetFilters = () => {
    setFilters(defaultFilterOptions);
    handleApplyFilters(defaultFilterOptions);
  };
  
  const applyPresetDateRange = (preset: 'lastMonth' | 'last3Months' | 'lastYear' | 'ytd') => {
    const today = new Date();
    let start: Date;
    let end: Date = today;
    
    switch (preset) {
      case 'lastMonth':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case 'last3Months':
        start = startOfMonth(subMonths(today, 3));
        break;
      case 'lastYear':
        start = subMonths(today, 12);
        break;
      case 'ytd':
        start = startOfYear(today);
        break;
      default:
        start = subMonths(today, 1);
    }
    
    const newFilters = {
      ...filters,
      dateRange: { start, end }
    };
    
    setFilters(newFilters);
    handleApplyFilters(newFilters);
  };

  const toggleDevelopmentMode = () => {
    const newMode = !isDevelopmentMode;
    setIsDevelopmentMode(newMode);
    localStorage.setItem('financeDashboard_developmentMode', newMode.toString());
  };

  const value = {
    transactions,
    filteredTransactions,
    isLoading,
    error,
    uploadQBOFile,
    applyFilters: handleApplyFilters,
    summary,
    insights,
    filterOptions,
    clearData,
    isUsingCache,
    isDevelopmentMode,
    toggleDevelopmentMode,
    filters,
    updateFilters,
    resetFilters,
    applyPresetDateRange,
    stats
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
