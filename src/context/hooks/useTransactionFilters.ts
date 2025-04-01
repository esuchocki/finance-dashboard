
import { Transaction, TransactionFilterOptions } from "@/lib/types";

// Apply filters to transactions
export const applyFilters = (transactions: Transaction[], filters: TransactionFilterOptions): Transaction[] => {
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
      (t.description?.toLowerCase().includes(searchLower) || false) || 
      (t.memo?.toLowerCase().includes(searchLower) || false) ||
      (t.name?.toLowerCase().includes(searchLower) || false) ||
      (t.verboseDescription?.toLowerCase().includes(searchLower) || false) ||
      (t.category?.toLowerCase().includes(searchLower) || false) ||
      (t.subCategory?.toLowerCase().includes(searchLower) || false)
    );
  }
  
  // Apply recurring filter
  if (filters.isRecurring !== undefined) {
    filtered = filtered.filter(t => t.isRecurring === filters.isRecurring);
  }
  
  return filtered;
};
