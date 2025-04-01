
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Transaction, TransactionFilterOptions, FinancialSummary, FinancialInsight } from "@/lib/types";
import { useFinanceUpload } from "./hooks/useFinanceUpload";
import { applyFilters } from "./hooks/useTransactionFilters";

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
  const { 
    transactions, 
    filteredTransactions, 
    setFilteredTransactions,
    isLoading, 
    error, 
    summary, 
    insights, 
    uploadQBOFile, 
    clearData 
  } = useFinanceUpload();
  
  const [filterOptions, setFilterOptions] = useState<TransactionFilterOptions>(defaultFilterOptions);

  const handleApplyFilters = (filters: TransactionFilterOptions) => {
    setFilterOptions(filters);
    const filtered = applyFilters(transactions, filters);
    setFilteredTransactions(filtered);
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
