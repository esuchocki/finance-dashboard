
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, Legend } from "recharts";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Info, LineChart, BadgeCheck, Loader2, Filter, Search } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SelectSeparator } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

// Custom colors for the chart - using a different palette from main charts
const COLORS = [
  "#8B5CF6", "#D946EF", "#F97316", "#0EA5E9", "#10B981", 
  "#F59E0B", "#EC4899", "#6366F1", "#84CC16", "#14B8A6",
  "#EF4444", "#64748B", "#9333EA", "#0369A1", "#15803D",
  "#6D28D9", "#DB2777", "#059669", "#D97706", "#7C3AED",
  "#0284C7", "#0F766E", "#4338CA", "#A21CAF", "#0F172A"
];

// Map categories to specific colors for consistency
const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#00C49F",
  "Housing": "#0088FE",
  "Transportation": "#FFBB28",
  "Entertainment": "#FF8042",
  "Shopping": "#A4DE6C",
  "Health & Fitness": "#8884D8",
  "Insurance": "#673AB7",
  "Personal Care": "#FF6B6B",
  "Education": "#E91E63",
  "Travel": "#6A6AFF",
  "Financial": "#FFDDA1",
  "Income": "#7FB069",
  "Business": "#D1495B",
  "Charity & Gifts": "#9E9E9E",
  "Children": "#FF5722",
  "Pets": "#607D8B",
  "Technology": "#3F51B5",
  "Taxes": "#795548",
  "Other": "#9C6644",
  "Transfers": "#4CAF50",
  "Uncategorized": "#AAAAAA" // Gray for uncategorized (should be minimal)
};

interface ClaudeEnhancedCategoriesProps {
  transactions: Transaction[];
}

const ClaudeEnhancedCategories: React.FC<ClaudeEnhancedCategoriesProps> = ({ transactions }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[] | null>(null);
  const [view, setView] = useState<"pie" | "list">("pie");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Custom tooltip for the PieChart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / data.totalValue) * 100).toFixed(1);
      
      return (
        <div className="bg-background border rounded p-3 shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
          <p className="text-xs text-muted-foreground">{percentage}% of total</p>
          {data.count > 0 && (
            <p className="text-xs text-muted-foreground">{data.count} transactions</p>
          )}
          <p className="text-xs text-finance-primary mt-1">Click to view transactions</p>
        </div>
      );
    }
    return null;
  };

  // Active shape for the PieChart (when a slice is selected)
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  // Filter transactions based on active tab
  const filteredTransactionsByType = useMemo(() => {
    if (activeTab === "all") return transactions;
    
    return transactions.filter(transaction => {
      if (activeTab === "expenses") return transaction.categoryType === "expense";
      if (activeTab === "income") return transaction.categoryType === "income";
      if (activeTab === "transfers") return transaction.categoryType === "transfer";
      return true;
    });
  }, [transactions, activeTab]);

  // Further filter by search if applicable
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return filteredTransactionsByType;
    
    const query = searchQuery.toLowerCase();
    return filteredTransactionsByType.filter(t => 
      (t.verboseDescription || "").toLowerCase().includes(query) ||
      (t.description || "").toLowerCase().includes(query) ||
      (t.name || "").toLowerCase().includes(query) ||
      (t.category || "").toLowerCase().includes(query) ||
      (t.subCategory || "").toLowerCase().includes(query)
    );
  }, [filteredTransactionsByType, searchQuery]);

  // Prepare data for visualization based on Claude-enhanced categories
  const prepareClaudeData = () => {
    // Filter to include all transactions with Claude-generated data
    const enhancedTransactions = filteredTransactions.filter(t => t.category);
    
    const totalTransactions = transactions.length;
    const enhancedCount = enhancedTransactions.length;
    const percentCategorized = Math.round((enhancedCount / totalTransactions) * 100);
    
    // Group transactions by category
    const categoryMap = new Map<string, { 
      amount: number,
      count: number,
      transactions: Transaction[],
      subcategories: Map<string, {
        amount: number,
        count: number,
        transactions: Transaction[]
      }>
    }>();
    
    enhancedTransactions.forEach(t => {
      // Use Claude's assigned category, defaulting to "Other" for any uncategorized
      const category = t.category && t.category !== "Uncategorized" ? t.category : "Other";
      const subCategory = t.subCategory || "Other";
      
      // Initialize category if it doesn't exist
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { 
          amount: 0, 
          count: 0,
          transactions: [],
          subcategories: new Map()
        });
      }
      
      // Update category data
      const categoryData = categoryMap.get(category)!;
      categoryData.amount += Math.abs(t.amount);
      categoryData.count += 1;
      categoryData.transactions.push(t);
      
      // Initialize subcategory if it doesn't exist
      if (!categoryData.subcategories.has(subCategory)) {
        categoryData.subcategories.set(subCategory, {
          amount: 0,
          count: 0,
          transactions: []
        });
      }
      
      // Update subcategory data
      const subCategoryData = categoryData.subcategories.get(subCategory)!;
      subCategoryData.amount += Math.abs(t.amount);
      subCategoryData.count += 1;
      subCategoryData.transactions.push(t);
    });
    
    // Convert to chart data format
    const chartData = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.amount,
        count: data.count,
        subcategories: Array.from(data.subcategories.entries())
          .map(([subName, subData]) => ({ 
            name: subName, 
            value: subData.amount,
            count: subData.count,
            transactions: subData.transactions
          }))
          .sort((a, b) => b.value - a.value),
        transactions: data.transactions,
        totalValue: enhancedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      }))
      .sort((a, b) => b.value - a.value);
    
    return {
      chartData,
      totalTransactions,
      enhancedCount,
      percentCategorized,
      filteredCount: enhancedTransactions.length,
      categoriesCount: categoryMap.size
    };
  };

  const { chartData, totalTransactions, enhancedCount, percentCategorized, filteredCount, categoriesCount } = prepareClaudeData();

  // Handle pie slice click to show transactions
  const handlePieClick = (data: any) => {
    setSelectedCategory(data.name);
    setSelectedTransactions(data.transactions);
    setView("list");
  };

  // Go back from transaction list to pie chart
  const handleBackClick = () => {
    setSelectedCategory(null);
    setSelectedTransactions(null);
    setView("pie");
  };

  // Handle mouse hover on pie slices
  const onPieEnter = (_, index: number) => {
    setActiveIndex(index);
  };
  
  // Handle mouse leave on pie slices
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Toggle between pie chart and list view
  const toggleView = () => {
    setView(view === "pie" ? "list" : "pie");
    if (view === "list") {
      setSelectedCategory(null);
      setSelectedTransactions(null);
    } else {
      setSelectedTransactions(filteredTransactions);
    }
  };

  // Function to get color for a category, with fallback
  const getCategoryColor = (category: string, index: number) => {
    if (!category) return COLORS[index % COLORS.length];
    return CATEGORY_COLORS[category] || COLORS[index % COLORS.length];
  };

  // Get display name for transaction - UPDATED to prioritize verbose description
  const getTransactionDisplayName = (transaction: Transaction) => {
    if (transaction.verboseDescription && 
        transaction.verboseDescription !== transaction.description &&
        transaction.verboseDescription !== transaction.name) {
      return transaction.verboseDescription;
    }
    if (transaction.payee) {
      return transaction.payee;
    }
    return transaction.description || transaction.name;
  };

  // Get more readable format for category type
  const getCategoryTypeLabel = (type: string) => {
    switch (type) {
      case "income": return "Income";
      case "expense": return "Expense";
      case "transfer": return "Transfer";
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-finance-primary" />
              Categories & Spending
            </CardTitle>
            <CardDescription>
              AI-powered categorization across {enhancedCount} transactions
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {view === "list" && selectedTransactions && (
              <div className="relative mr-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8 h-9 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleView}
              className="flex items-center gap-1"
            >
              {view === "pie" 
                ? <><LineChart className="h-4 w-4" /> View List</>
                : <><LineChart className="h-4 w-4" /> View Chart</>
              }
            </Button>
            
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">AI-Enhanced Categories</h4>
                  <p className="text-sm text-muted-foreground">
                    Claude AI has analyzed your transactions and created {categoriesCount} specific 
                    categories for better financial insights. Switch between tabs to view different 
                    transaction types.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Transactions with higher confidence ratings have been better categorized. 
                    Click on a category to see the transactions within it.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All Categories</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
          </TabsList>
        </Tabs>

        {enhancedCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <Alert>
              <AlertTitle>No enhanced data available yet</AlertTitle>
              <AlertDescription>
                Claude AI hasn't categorized any transactions yet. This may be because the enhancement 
                process is still running or there was an issue with the Claude API connection.
              </AlertDescription>
            </Alert>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-4">
            <Alert>
              <AlertTitle>No data for selected filter</AlertTitle>
              <AlertDescription>
                There are no transactions in the currently selected category type.
                Try selecting a different tab to view other transaction categories.
              </AlertDescription>
            </Alert>
          </div>
        ) : view === "pie" ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={1}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={handlePieClick}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getCategoryColor(entry.name, index)}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  formatter={(value, entry, index) => (
                    <span className="text-xs">
                      {value} ({chartData[index].count} items)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="animate-in fade-in-50 duration-300">
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-0 h-8 mr-2" 
                onClick={handleBackClick}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              
              {selectedCategory && (
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <span>{selectedCategory}</span>
                  <Badge variant="outline" className="ml-2">
                    {selectedTransactions?.length || 0} transactions
                  </Badge>
                  <Badge variant="secondary">
                    {formatCurrency(selectedTransactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0)}
                  </Badge>
                </h3>
              )}
            </div>
            
            <div className="overflow-y-auto max-h-[300px] space-y-2">
              {(selectedTransactions?.filter(t => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                  (t.verboseDescription || "").toLowerCase().includes(query) ||
                  (t.description || "").toLowerCase().includes(query) ||
                  (t.name || "").toLowerCase().includes(query) ||
                  (t.category || "").toLowerCase().includes(query) ||
                  (t.subCategory || "").toLowerCase().includes(query)
                );
              }) || []).map((t) => (
                <div key={t.id} className="text-sm p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="max-w-[70%]">
                      {/* Prioritize displaying the verbose description */}
                      <p className="font-medium">
                        {getTransactionDisplayName(t)}
                      </p>
                      {/* Only show original description if different from verbose */}
                      {t.description && t.description !== getTransactionDisplayName(t) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Original: {t.description || t.name}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {t.category}
                        </Badge>
                        {t.subCategory && (
                          <Badge variant="outline" className="text-xs bg-muted/50">
                            {t.subCategory}
                          </Badge>
                        )}
                        {t.confidence && (
                          <Badge variant={
                            t.confidence === "high" ? "default" : 
                            t.confidence === "medium" ? "secondary" : "outline"
                          } className="text-xs">
                            {t.confidence} confidence
                          </Badge>
                        )}
                        {t.categoryType && (
                          <Badge variant={
                            t.categoryType === "income" ? "default" : 
                            t.categoryType === "expense" ? "destructive" : 
                            t.categoryType === "transfer" ? "secondary" : "outline"
                          } className="text-xs">
                            {getCategoryTypeLabel(t.categoryType)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${t.categoryType === "income" ? "text-green-600" : t.categoryType === "expense" ? "text-red-600" : ""}`}>
                        {formatCurrency(t.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {selectedTransactions && selectedTransactions.length === 0 && (
                <div className="text-center p-4 text-muted-foreground">
                  No transactions in this category
                </div>
              )}
            </div>
          </div>
        )}
        
        {enhancedCount > 0 && (
          <div className="mt-4 text-xs text-muted-foreground text-center">
            {activeTab === "all" ? (
              <p>Showing {filteredCount} of {totalTransactions} total transactions ({percentCategorized}% categorized)</p>
            ) : (
              <p>Filtered to {filteredCount} {activeTab} transactions across {categoriesCount} categories</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaudeEnhancedCategories;
