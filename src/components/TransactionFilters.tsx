
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
import { format } from "date-fns";
import { Calendar as CalendarIcon, Search, X } from "lucide-react";

const TransactionFilters = () => {
  const { applyFilters, transactions } = useFinance();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState<boolean | undefined>(undefined);

  // Extract unique categories from transactions
  const uniqueCategories = Array.from(
    new Set(transactions.map((t) => t.category))
  ).sort();

  const handleApplyFilters = () => {
    const filters: TransactionFilterOptions = {
      startDate,
      endDate,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      search: searchTerm || undefined,
      isRecurring,
    };

    applyFilters(filters);
  };

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setMinAmount("");
    setMaxAmount("");
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSearchTerm("");
    setIsRecurring(undefined);
    applyFilters({});
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
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  {startDate ? (
                    format(startDate, "PPP")
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  {endDate ? (
                    format(endDate, "PPP")
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
              value={isRecurring === undefined ? "" : String(isRecurring)}
              onValueChange={(value) => {
                if (value === "") {
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
                <SelectItem value="">All Transactions</SelectItem>
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
