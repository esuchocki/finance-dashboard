
import React, { useState, useEffect } from "react";
import { useFinance } from "@/context/FinanceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { TransactionType } from "@/lib/types";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";

const TransactionFilters = () => {
  const { 
    transactions, 
    updateFilters, 
    filters,
    stats,
    resetFilters,
    applyPresetDateRange
  } = useFinance();
  
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || "");
  const [category, setCategory] = useState(filters.category || "all");
  const [transactionType, setTransactionType] = useState(filters.type || "all");
  const [dateRange, setDateRange] = useState(filters.dateRange || null);
  const [minAmount, setMinAmount] = useState(filters.minAmount?.toString() || "");
  const [maxAmount, setMaxAmount] = useState(filters.maxAmount?.toString() || "");
  const [excludeTransfers, setExcludeTransfers] = useState(filters.excludeTransfers || false);
  const [sliderRange, setSliderRange] = useState<[number, number]>([
    filters.minAmount || 0,
    filters.maxAmount || (stats?.maxAmount || 1000)
  ]);
  
  // Extract unique categories from transactions
  const categories = React.useMemo(() => {
    if (!transactions.length) return [];
    
    const categorySet = new Set<string>();
    transactions.forEach(transaction => {
      if (transaction.category) {
        categorySet.add(transaction.category);
      }
    });
    
    return Array.from(categorySet).sort();
  }, [transactions]);
  
  // Handler for the slider change - modified to use whole numbers only
  const handleSliderChange = (values: number[]) => {
    const roundedValues: [number, number] = [
      Math.round(values[0]), 
      Math.round(values[1])
    ];
    setSliderRange(roundedValues);
    setMinAmount(roundedValues[0].toString());
    setMaxAmount(roundedValues[1].toString());
  };

  // Apply all filters - fixed to match TransactionFilterOptions type
  const applyFilters = () => {
    let typeValue: TransactionType[] = [];
    
    if (transactionType !== "all") {
      typeValue = transactionType === "debit" 
        ? [TransactionType.DEBIT, TransactionType.WITHDRAWAL, TransactionType.FEE, TransactionType.CHECK] 
        : [TransactionType.CREDIT, TransactionType.DEPOSIT, TransactionType.INTEREST];
    }
    
    updateFilters({
      // Required properties from TransactionFilterOptions
      categories: category !== "all" ? [category] : [],
      types: typeValue,
      dateRange: {
        start: dateRange?.start || null,
        end: dateRange?.end || null
      },
      amountRange: {
        min: minAmount ? Math.round(parseFloat(minAmount)) : null,
        max: maxAmount ? Math.round(parseFloat(maxAmount)) : null
      },
      searchQuery: searchQuery,
      isRecurring: null,
      
      // Support for legacy properties
      category: category !== "all" ? category : undefined,
      type: transactionType,
      excludeTransfers: excludeTransfers,
      minAmount: minAmount ? Math.round(parseFloat(minAmount)) : undefined,
      maxAmount: maxAmount ? Math.round(parseFloat(maxAmount)) : undefined
    });
  };
  
  // Apply filters when component mounts
  useEffect(() => {
    applyFilters();
  }, []); // Only run once on mount

  // Helper to format date range for display
  const formatDateRange = (range: any) => {
    if (!range) return "All dates";
    return `${format(range.start, "MMM d, yyyy")} - ${format(range.end, "MMM d, yyyy")}`;
  };

  // Handle input changes for amount values - ensuring they are whole numbers
  const handleAmountInputChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    // Allow empty string for clearing
    if (value === "") {
      setter("");
      return;
    }
    
    // Ensure only whole numbers are entered
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setter(numValue.toString());
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Query */}
          <div className="col-span-1 md:col-span-2">
            <Label htmlFor="search-query" className="mb-2 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-query"
                placeholder="Search transactions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Category dropdown */}
          <div>
            <Label htmlFor="category-filter" className="mb-2 block">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Type dropdown */}
          <div>
            <Label htmlFor="type-filter" className="mb-2 block">Type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger id="type-filter">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="debit">Expenses</SelectItem>
                <SelectItem value="credit">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Amount range with slider - modified to use whole numbers */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex justify-between mb-2">
              <Label>Amount Range</Label>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(sliderRange[0])} - {formatCurrency(sliderRange[1])}
              </div>
            </div>
            <Slider
              defaultValue={sliderRange}
              min={Math.floor(stats?.minAmount || 0)}
              max={Math.ceil(stats?.maxAmount || 1000)}
              step={1} /* Changed to 1 for whole numbers */
              value={sliderRange}
              onValueChange={handleSliderChange}
              className="mb-4"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-amount" className="sr-only">Minimum Amount</Label>
                <Input
                  id="min-amount"
                  placeholder="Min Amount"
                  value={minAmount}
                  onChange={(e) => handleAmountInputChange(e.target.value, setMinAmount)}
                  type="number"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="max-amount" className="sr-only">Maximum Amount</Label>
                <Input
                  id="max-amount"
                  placeholder="Max Amount"
                  value={maxAmount}
                  onChange={(e) => handleAmountInputChange(e.target.value, setMaxAmount)}
                  type="number"
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Date Picker - now with manual input option */}
          <div className="col-span-1 md:col-span-2">
            <Label className="mb-2 block">Date Range</Label>
            <div className="flex flex-col space-y-2">
              <DatePicker
                dateRange={dateRange}
                onChange={setDateRange}
                className="w-full"
              />
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    applyPresetDateRange('lastMonth');
                    setDateRange(filters.dateRange);
                  }}
                >
                  Last Month
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    applyPresetDateRange('last3Months');
                    setDateRange(filters.dateRange);
                  }}
                >
                  Last 3 Months
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    applyPresetDateRange('lastYear');
                    setDateRange(filters.dateRange);
                  }}
                >
                  Last Year
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    applyPresetDateRange('ytd');
                    setDateRange(filters.dateRange);
                  }}
                >
                  YTD
                </Button>
              </div>
            </div>
          </div>
          
          {/* Toggle switches */}
          <div>
            <div className="flex items-center space-x-2 pt-8">
              <Switch 
                id="exclude-transfers"
                checked={excludeTransfers}
                onCheckedChange={setExcludeTransfers}
              />
              <Label htmlFor="exclude-transfers">Exclude transfers</Label>
            </div>
          </div>
          
          {/* Filter buttons */}
          <div className="flex items-end space-x-2">
            <Button 
              onClick={applyFilters} 
              className="flex items-center space-x-2"
              variant="default"
            >
              <Filter className="w-4 h-4" />
              <span>Apply Filters</span>
            </Button>
            <Button 
              onClick={() => {
                resetFilters();
                setSearchQuery("");
                setCategory("all");
                setTransactionType("all");
                setDateRange(null);
                setMinAmount("");
                setMaxAmount("");
                setExcludeTransfers(false);
                if (stats) {
                  setSliderRange([Math.floor(stats.minAmount), Math.ceil(stats.maxAmount)]);
                }
              }} 
              className="flex items-center space-x-2"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionFilters;
