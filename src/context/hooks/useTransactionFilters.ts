
import { useState, useEffect } from "react";
import { Transaction, TransactionFilterOptions, TransactionType } from "@/lib/types";

export const useTransactionFilters = (transactions: Transaction[]) => {
  const [filterOptions, setFilterOptions] = useState<TransactionFilterOptions>({
    categories: [],
    types: [],
    dateRange: { start: null, end: null },
    amountRange: { min: null, max: null },
    searchQuery: "",
    isRecurring: null
  });

  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(transactions);

  // Apply filters whenever transactions or filter options change
  useEffect(() => {
    let result = [...transactions];

    // Filter by category
    if (filterOptions.categories && filterOptions.categories.length > 0) {
      result = result.filter(t => filterOptions.categories.includes(t.category || ""));
    }

    // Filter by transaction type
    if (filterOptions.types && filterOptions.types.length > 0) {
      result = result.filter(t => filterOptions.types.includes(t.type));
    }

    // Filter by date range
    if (filterOptions.dateRange && filterOptions.dateRange.start && filterOptions.dateRange.end) {
      result = result.filter(
        t => t.date >= filterOptions.dateRange.start! && t.date <= filterOptions.dateRange.end!
      );
    }

    // Filter by amount range
    if (filterOptions.amountRange) {
      if (filterOptions.amountRange.min !== null) {
        result = result.filter(t => t.amount >= filterOptions.amountRange.min!);
      }
      if (filterOptions.amountRange.max !== null) {
        result = result.filter(t => t.amount <= filterOptions.amountRange.max!);
      }
    }

    // Filter by search query
    if (filterOptions.searchQuery) {
      const query = filterOptions.searchQuery.toLowerCase();
      result = result.filter(
        t => 
          t.description.toLowerCase().includes(query) || 
          (t.category && t.category.toLowerCase().includes(query)) ||
          (t.note && t.note.toLowerCase().includes(query))
      );
    }

    // Filter by recurring status
    if (filterOptions.isRecurring !== null) {
      result = result.filter(t => t.isRecurring === filterOptions.isRecurring);
    }

    // Filter by excludeTransfers (legacy support)
    if (filterOptions.excludeTransfers) {
      result = result.filter(t => !t.isTransfer);
    }

    setFilteredTransactions(result);
  }, [transactions, filterOptions]);

  // Update filter options
  const updateFilterOptions = (updates: Partial<TransactionFilterOptions>) => {
    setFilterOptions(prev => ({ ...prev, ...updates }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterOptions({
      categories: [],
      types: [],
      dateRange: { start: null, end: null },
      amountRange: { min: null, max: null },
      searchQuery: "",
      isRecurring: null
    });
  };

  return {
    filteredTransactions,
    filterOptions,
    updateFilterOptions,
    clearFilters
  };
};
