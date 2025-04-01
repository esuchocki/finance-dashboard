
import { Transaction, TransactionFilterOptions } from "@/lib/types";

// Apply filters to transactions
export const applyFilters = (transactions: Transaction[], filters: TransactionFilterOptions): Transaction[] => {
  console.log("Applying filters:", filters);
  console.log("Initial transaction count:", transactions.length);
  
  let filtered = [...transactions];
  
  // Apply date filters - support both new dateRange and older startDate/endDate properties
  if (filters.dateRange?.start || filters.startDate) {
    const startDate = filters.dateRange?.start || filters.startDate;
    filtered = filtered.filter(t => startDate && t.date >= startDate);
    console.log("After start date filter:", filtered.length);
  }
  
  if (filters.dateRange?.end || filters.endDate) {
    const endDate = filters.dateRange?.end || filters.endDate;
    filtered = filtered.filter(t => endDate && t.date <= endDate);
    console.log("After end date filter:", filtered.length);
  }
  
  // Apply amount filters - support both new amountRange and older min/maxAmount properties
  if ((filters.amountRange?.min !== null && filters.amountRange?.min !== undefined) || 
      (filters.minAmount !== null && filters.minAmount !== undefined)) {
    const minAmount = filters.amountRange?.min !== null && filters.amountRange?.min !== undefined 
      ? filters.amountRange.min 
      : filters.minAmount;
    if (minAmount !== null && minAmount !== undefined) {
      filtered = filtered.filter(t => Math.abs(t.amount) >= minAmount);
      console.log("After min amount filter:", filtered.length);
    }
  }
  
  if ((filters.amountRange?.max !== null && filters.amountRange?.max !== undefined) || 
      (filters.maxAmount !== null && filters.maxAmount !== undefined)) {
    const maxAmount = filters.amountRange?.max !== null && filters.amountRange?.max !== undefined 
      ? filters.amountRange.max 
      : filters.maxAmount;
    if (maxAmount !== null && maxAmount !== undefined) {
      filtered = filtered.filter(t => Math.abs(t.amount) <= maxAmount);
      console.log("After max amount filter:", filtered.length);
    }
  }
  
  // Apply type filters
  if (filters.types && filters.types.length > 0) {
    filtered = filtered.filter(t => filters.types.includes(t.type));
    console.log("After type filter:", filtered.length);
  } else if (filters.type && filters.type !== "all") {
    // Support legacy type filter
    const types = filters.type === "debit" 
      ? ["DEBIT", "WITHDRAWAL", "FEE", "CHECK"] 
      : ["CREDIT", "DEPOSIT", "INTEREST"];
    filtered = filtered.filter(t => types.includes(t.type));
    console.log("After legacy type filter:", filtered.length);
  }
  
  // Apply category filters
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(t => filters.categories.includes(t.category));
    console.log("After category filter:", filtered.length);
  } else if (filters.category && filters.category !== "all") {
    // Support legacy category filter
    filtered = filtered.filter(t => t.category === filters.category);
    console.log("After legacy category filter:", filtered.length);
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
    console.log("After search filter:", filtered.length);
  }
  
  // Apply recurring filter
  if (filters.isRecurring !== null && filters.isRecurring !== undefined) {
    filtered = filtered.filter(t => t.isRecurring === filters.isRecurring);
    console.log("After recurring filter:", filtered.length);
  }
  
  // Apply exclude transfers filter
  if (filters.excludeTransfers) {
    filtered = filtered.filter(t => t.type !== "TRANSFER" && !t.description?.toLowerCase().includes("transfer"));
    console.log("After exclude transfers filter:", filtered.length);
  }
  
  console.log("Final filtered transaction count:", filtered.length);
  return filtered;
};
