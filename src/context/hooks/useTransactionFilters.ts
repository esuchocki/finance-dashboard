
import { Transaction, TransactionFilterOptions } from "@/lib/types";

// Apply filters to transactions
export const applyFilters = (transactions: Transaction[], filters: TransactionFilterOptions): Transaction[] => {
  let filtered = [...transactions];
  
  // Apply date filters - support both new dateRange and older startDate/endDate properties
  if (filters.dateRange?.start || filters.startDate) {
    const startDate = filters.dateRange?.start || filters.startDate;
    filtered = filtered.filter(t => startDate && t.date >= startDate);
  }
  
  if (filters.dateRange?.end || filters.endDate) {
    const endDate = filters.dateRange?.end || filters.endDate;
    filtered = filtered.filter(t => endDate && t.date <= endDate);
  }
  
  // Apply amount filters - support both new amountRange and older min/maxAmount properties
  if (filters.amountRange?.min !== null || filters.minAmount !== null) {
    const minAmount = filters.amountRange?.min !== null ? filters.amountRange.min : filters.minAmount;
    filtered = filtered.filter(t => minAmount !== null && t.amount >= minAmount);
  }
  
  if (filters.amountRange?.max !== null || filters.maxAmount !== null) {
    const maxAmount = filters.amountRange?.max !== null ? filters.amountRange.max : filters.maxAmount;
    filtered = filtered.filter(t => maxAmount !== null && t.amount <= maxAmount);
  }
  
  // Apply type filters
  if (filters.types && filters.types.length > 0) {
    filtered = filtered.filter(t => filters.types.includes(t.type));
  }
  
  // Apply category filters
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(t => filters.categories.includes(t.category));
  }
  
  // Apply search filter - support both searchQuery and older search property
  const searchTerm = filters.searchQuery || filters.search;
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(t => 
      (t.description?.toLowerCase().includes(searchLower) || false) || 
      (t.memo?.toLowerCase().includes(searchLower) || false) ||
      (t.name?.toLowerCase().includes(searchLower) || false) ||
      (t.verboseDescription?.toLowerCase().includes(searchLower) || false) ||
      (t.category?.toLowerCase().includes(searchLower) || false) ||
      (t.subCategory?.toLowerCase().includes(searchLower) || false)
    );
  }
  
  // Apply recurring filter
  if (filters.isRecurring !== null && filters.isRecurring !== undefined) {
    filtered = filtered.filter(t => t.isRecurring === filters.isRecurring);
  }
  
  return filtered;
};
