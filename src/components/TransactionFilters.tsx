
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TransactionFilterOptions, TransactionType } from "@/lib/types";
import { useFinance } from "@/context/FinanceContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, Search, X } from "lucide-react";

// Remove the props interface as we'll get everything from the context
const TransactionFilters = () => {
  const { applyFilters, transactions } = useFinance();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startDateInput, setStartDateInput] = useState<string>("");
  const [endDateInput, setEndDateInput] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState<boolean | undefined>(undefined);
  const [showStartCalendar, setShowStartCalendar] = useState<boolean>(false);
  const [showEndCalendar, setShowEndCalendar] = useState<boolean>(false);

  // Extract unique categories from transactions
  const uniqueCategories = Array.from(
    new Set(transactions.map((t) => t.category))
  ).sort();

  // Handle date input changes
  const handleStartDateInput = (value: string) => {
    setStartDateInput(value);
    try {
      // Try different formats: MM/DD/YYYY, YYYY-MM-DD, etc.
      const formats = ["MM/dd/yyyy", "yyyy-MM-dd", "dd/MM/yyyy", "MM-dd-yyyy"];
      let parsedDate: Date | null = null;
      
      for (const dateFormat of formats) {
        const attemptedDate = parse(value, dateFormat, new Date());
        if (isValid(attemptedDate)) {
          parsedDate = attemptedDate;
          break;
        }
      }
      
      if (parsedDate && isValid(parsedDate)) {
        setStartDate(parsedDate);
      } else if (value === "") {
        setStartDate(undefined);
      }
    } catch (error) {
      console.error("Error parsing date:", error);
    }
  };
  
  const handleEndDateInput = (value: string) => {
    setEndDateInput(value);
    try {
      // Try different formats: MM/DD/YYYY, YYYY-MM-DD, etc.
      const formats = ["MM/dd/yyyy", "yyyy-MM-dd", "dd/MM/yyyy", "MM-dd-yyyy"];
      let parsedDate: Date | null = null;
      
      for (const dateFormat of formats) {
        const attemptedDate = parse(value, dateFormat, new Date());
        if (isValid(attemptedDate)) {
          parsedDate = attemptedDate;
          break;
        }
      }
      
      if (parsedDate && isValid(parsedDate)) {
        setEndDate(parsedDate);
      } else if (value === "") {
        setEndDate(undefined);
      }
    } catch (error) {
      console.error("Error parsing date:", error);
    }
  };

  const handleCalendarStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      setStartDateInput(format(date, "MM/dd/yyyy"));
    } else {
      setStartDateInput("");
    }
    setShowStartCalendar(false);
  };

  const handleCalendarEndDateSelect = (date: Date | undefined) => {
    setEndDate(date);
    if (date) {
      setEndDateInput(format(date, "MM/dd/yyyy"));
    } else {
      setEndDateInput("");
    }
    setShowEndCalendar(false);
  };

  const handleClearStartDate = () => {
    setStartDate(undefined);
    setStartDateInput("");
  };

  const handleClearEndDate = () => {
    setEndDate(undefined);
    setEndDateInput("");
  };

  const handleApplyFilters = () => {
    const filters: TransactionFilterOptions = {
      dateRange: {
        start: startDate || null,
        end: endDate || null
      },
      amountRange: {
        min: minAmount ? parseFloat(minAmount) : null,
        max: maxAmount ? parseFloat(maxAmount) : null
      },
      types: selectedTypes,
      categories: selectedCategories,
      searchQuery: searchTerm,
      isRecurring: isRecurring === undefined ? null : isRecurring,
      // Keep backward compatibility with older filter properties
      startDate: startDate || null,
      endDate: endDate || null,
      minAmount: minAmount ? parseFloat(minAmount) : null,
      maxAmount: maxAmount ? parseFloat(maxAmount) : null,
      search: searchTerm
    };

    applyFilters(filters);
  };

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setStartDateInput("");
    setEndDateInput("");
    setMinAmount("");
    setMaxAmount("");
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSearchTerm("");
    setIsRecurring(undefined);
    
    // Create an empty filter object with all required properties
    const emptyFilters: TransactionFilterOptions = {
      dateRange: { start: null, end: null },
      amountRange: { min: null, max: null },
      types: [],
      categories: [],
      searchQuery: "",
      isRecurring: null
    };
    
    applyFilters(emptyFilters);
  };

  const handleTypeChange = (type: TransactionType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Filter Transactions</span>
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            <X className="h-4 w-4 mr-1" /> Clear All Filters
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Input
                  type="text"
                  value={startDateInput}
                  onChange={(e) => handleStartDateInput(e.target.value)}
                  placeholder="MM/DD/YYYY"
                  className="pr-8"
                />
                {startDateInput && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6"
                    onClick={handleClearStartDate}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleCalendarStartDateSelect}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Input
                  type="text"
                  value={endDateInput}
                  onChange={(e) => handleEndDateInput(e.target.value)}
                  placeholder="MM/DD/YYYY"
                  className="pr-8"
                />
                {endDateInput && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6"
                    onClick={handleClearEndDate}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleCalendarEndDateSelect}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <Label>Min Amount</Label>
            <Input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>Max Amount</Label>
            <Input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="9999.99"
              min="0"
              step="0.01"
            />
          </div>

          {/* Transaction Type */}
          <div className="space-y-2 col-span-full">
            <Label>Transaction Types</Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(TransactionType).map((type) => (
                <label
                  key={type}
                  className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => handleTypeChange(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2 col-span-full">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {uniqueCategories.map((category) => (
                <label
                  key={category}
                  className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => handleCategoryChange(category)}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Search Term */}
          <div className="space-y-2 col-span-full">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by description, memo, or payee"
                className="pl-8"
              />
            </div>
          </div>

          {/* Recurring Filter */}
          <div className="space-y-2 col-span-full">
            <Label>Recurring Transactions</Label>
            <Select
              value={isRecurring === undefined ? "undefined" : String(isRecurring)}
              onValueChange={(value) => {
                if (value === "undefined") {
                  setIsRecurring(undefined);
                } else {
                  setIsRecurring(value === "true");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="undefined">All Transactions</SelectItem>
                <SelectItem value="true">Recurring Only</SelectItem>
                <SelectItem value="false">Non-Recurring Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Apply Button */}
          <div className="col-span-full pt-2">
            <Button
              className="w-full"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionFilters;
