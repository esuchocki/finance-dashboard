import React, { useState, useMemo, useCallback } from "react";
import { BusinessTransaction } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Download,
  ArrowUpDown
} from "lucide-react";

export interface SearchFilters {
  searchText: string;
  minAmount: string;
  maxAmount: string;
  startDate: string;
  endDate: string;
  categoryType: "all" | "income" | "expense" | "transfer";
  category: string;
  accountId: string;
  sortBy: "date" | "amount" | "vendor";
  sortOrder: "asc" | "desc";
}

interface TransactionSearchProps {
  transactions: BusinessTransaction[];
  accounts: Array<{ id: string; name: string }>;
  onFilteredTransactionsChange: (transactions: BusinessTransaction[]) => void;
}

const TransactionSearch: React.FC<TransactionSearchProps> = ({
  transactions,
  accounts,
  onFilteredTransactionsChange
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    searchText: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
    categoryType: "all",
    category: "all",
    accountId: "all",
    sortBy: "date",
    sortOrder: "desc"
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  // Debounce search text
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(filters.searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.searchText]);

  // Get unique categories from transactions
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    transactions.forEach(tx => {
      if (tx.category && tx.category !== "Uncategorized") {
        categorySet.add(tx.category);
      }
    });
    return Array.from(categorySet).sort();
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Text search (vendor, description, memo, category)
    if (debouncedSearchText) {
      const searchLower = debouncedSearchText.toLowerCase();
      result = result.filter(tx =>
        tx.name?.toLowerCase().includes(searchLower) ||
        tx.payee?.toLowerCase().includes(searchLower) ||
        tx.description?.toLowerCase().includes(searchLower) ||
        tx.memo?.toLowerCase().includes(searchLower) ||
        tx.verboseDescription?.toLowerCase().includes(searchLower) ||
        tx.category?.toLowerCase().includes(searchLower)
      );
    }

    // Amount range
    if (filters.minAmount) {
      const min = parseFloat(filters.minAmount);
      if (!isNaN(min)) {
        result = result.filter(tx => tx.amount >= min);
      }
    }
    if (filters.maxAmount) {
      const max = parseFloat(filters.maxAmount);
      if (!isNaN(max)) {
        result = result.filter(tx => tx.amount <= max);
      }
    }

    // Date range
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      result = result.filter(tx => new Date(tx.date) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      result = result.filter(tx => new Date(tx.date) <= end);
    }

    // Category type
    if (filters.categoryType !== "all") {
      result = result.filter(tx => tx.categoryType === filters.categoryType);
    }

    // Specific category
    if (filters.category && filters.category !== "all") {
      result = result.filter(tx => tx.category === filters.category);
    }

    // Account filter
    if (filters.accountId && filters.accountId !== "all") {
      result = result.filter(tx => tx.accountId === filters.accountId);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "vendor":
          const nameA = (a.name || a.payee || "").toLowerCase();
          const nameB = (b.name || b.payee || "").toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
      }

      return filters.sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [transactions, debouncedSearchText, filters]);

  // Update parent component when filtered transactions change
  React.useEffect(() => {
    onFilteredTransactionsChange(filteredTransactions);
  }, [filteredTransactions, onFilteredTransactionsChange]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchText !== "" ||
      filters.minAmount !== "" ||
      filters.maxAmount !== "" ||
      filters.startDate !== "" ||
      filters.endDate !== "" ||
      filters.categoryType !== "all" ||
      (filters.category !== "" && filters.category !== "all") ||
      (filters.accountId !== "" && filters.accountId !== "all")
    );
  }, [filters]);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchText: "",
      minAmount: "",
      maxAmount: "",
      startDate: "",
      endDate: "",
      categoryType: "all",
      category: "all",
      accountId: "all",
      sortBy: "date",
      sortOrder: "desc"
    });
  }, []);

  const handleExport = useCallback(() => {
    // Create CSV content
    const headers = ["Date", "Vendor", "Description", "Category", "Type", "Account", "Amount"];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString(),
      tx.name || tx.payee || "",
      tx.verboseDescription || tx.description || "",
      tx.category || "",
      tx.categoryType || "",
      tx.accountName || "",
      tx.amount.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [filteredTransactions]);

  const toggleSortOrder = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === "asc" ? "desc" : "asc"
    }));
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Transaction Search
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredTransactions.length === 0}
              title="Export to CSV"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by vendor, description, category, or memo..."
            value={filters.searchText}
            onChange={(e) => handleFilterChange("searchText", e.target.value)}
            className="pl-10 pr-4"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Type:</Label>
            <Select
              value={filters.categoryType}
              onValueChange={(value) => handleFilterChange("categoryType", value)}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="transfer">Transfers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Sort:</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => handleFilterChange("sortBy", value as "date" | "amount" | "vendor")}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortOrder}
            className="h-9"
            title={filters.sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            {filters.sortOrder === "asc" ? "A-Z" : "Z-A"}
          </Button>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 ml-auto">
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Advanced Filters
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleContent className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Amount Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Amount Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    className="h-9"
                  />
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => handleFilterChange("category", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Filter */}
              {accounts.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Account</Label>
                  <Select
                    value={filters.accountId}
                    onValueChange={(value) => handleFilterChange("accountId", value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

      </CardContent>
    </Card>
  );
};

export default TransactionSearch;
