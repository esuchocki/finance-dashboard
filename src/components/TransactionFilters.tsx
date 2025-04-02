
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
  
  // Display values for the amount inputs (formatted as currency)
  const [displayMinAmount, setDisplayMinAmount] = useState("");
  const [displayMaxAmount, setDisplayMaxAmount] = useState("");
  
  // Update display values when slider range changes
  useEffect(() => {
    setDisplayMinAmount(formatCurrency(sliderRange[0], "USD", 0));
    setDisplayMaxAmount(formatCurrency(sliderRange[1], "USD", 0));
  }, [sliderRange]);
  
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
  
  // Handler for the slider change - uses whole numbers
  const handleSliderChange = (values: number[]) => {
    const roundedValues: [number, number] = [
      Math.round(values[0]), 
      Math.round(values[1])
    ];
    setSliderRange(roundedValues);
    setMinAmount(roundedValues[0].toString());
    setMaxAmount(roundedValues[1].toString());
    
    // Update display values
    setDisplayMinAmount(formatCurrency(roundedValues[0], "USD", 0));
    setDisplayMaxAmount(formatCurrency(roundedValues[1], "USD", 0));
  };

  // Parse currency input to number
  const parseCurrencyInput = (value: string): number | null => {
    // Remove currency symbol, commas and any other non-numeric chars except decimal point
    const numericValue = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(numericValue);
    return isNaN(parsed) ? null : parsed;
  };

  // Format display input for min amount
  const handleMinAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayMinAmount(inputValue);
    
    // Parse numeric value from the input
    const parsedValue = parseCurrencyInput(inputValue);
    if (parsedValue !== null) {
      const roundedValue = Math.round(parsedValue);
      setMinAmount(roundedValue.toString());
      
      // Update slider
      setSliderRange([roundedValue, sliderRange[1]]);
    }
  };
  
  // Format display input for max amount
  const handleMaxAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayMaxAmount(inputValue);
    
    // Parse numeric value from the input
    const parsedValue = parseCurrencyInput(inputValue);
    if (parsedValue !== null) {
      const roundedValue = Math.round(parsedValue);
      setMaxAmount(roundedValue.toString());
      
      // Update slider
      setSliderRange([sliderRange[0], roundedValue]);
    }
  };

  // Apply all filters
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
    
    // Initialize display values
    if (minAmount) {
      setDisplayMinAmount(formatCurrency(parseInt(minAmount), "USD", 0));
    }
    if (maxAmount) {
      setDisplayMaxAmount(formatCurrency(parseInt(maxAmount), "USD", 0));
    }
  }, []); 

  // Helper to format date range for display
  const formatDateRange = (range: any) => {
    if (!range) return "All dates";
    return `${format(range.start, "MMM d, yyyy")} - ${format(range.end, "MMM d, yyyy")}`;
  };

  // Helper to format slider tick labels without decimals
  const formatSliderValue = (value: number) => {
    return formatCurrency(value, "USD", 0);
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
          
          {/* Amount range with slider - updated to format as currency */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex justify-between mb-2">
              <Label>Amount Range</Label>
              <div className="text-xs text-muted-foreground">
                {formatSliderValue(sliderRange[0])} - {formatSliderValue(sliderRange[1])}
              </div>
            </div>
            <Slider
              defaultValue={sliderRange}
              min={Math.floor(stats?.minAmount || 0)}
              max={Math.ceil(stats?.maxAmount || 1000)}
              step={1}
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
                  value={displayMinAmount}
                  onChange={handleMinAmountInputChange}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="max-amount" className="sr-only">Maximum Amount</Label>
                <Input
                  id="max-amount"
                  placeholder="Max Amount"
                  value={displayMaxAmount}
                  onChange={handleMaxAmountInputChange}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Date Picker - with manual input */}
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
                setDisplayMinAmount("");
                setDisplayMaxAmount("");
                setExcludeTransfers(false);
                if (stats) {
                  const min = Math.floor(stats.minAmount);
                  const max = Math.ceil(stats.maxAmount);
                  setSliderRange([min, max]);
                  setDisplayMinAmount(formatCurrency(min, "USD", 0));
                  setDisplayMaxAmount(formatCurrency(max, "USD", 0));
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
