
import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, Legend } from "recharts";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Filter, Search, PieChart as PieChartIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Consistent, visually distinct colors for the chart
const COLORS = [
  "#8B5CF6", "#D946EF", "#F97316", "#0EA5E9", "#10B981", 
  "#F59E0B", "#EC4899", "#6366F1", "#84CC16", "#14B8A6",
  "#EF4444", "#64748B", "#9333EA", "#0369A1", "#15803D",
  "#6D28D9", "#DB2777", "#059669", "#D97706", "#7C3AED"
];

interface CategoryBreakdownProps {
  transactions: Transaction[];
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ transactions }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[] | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"expenses" | "income">("expenses");

  // Process the transactions data to extract category information
  const { 
    categoryData, 
    subcategoryData, 
    totalExpenses, 
    totalIncome,
    expenseCategoriesCount,
    incomeCategoriesCount
  } = useMemo(() => {
    // Filter based on the active tab
    const relevantTransactions = transactions.filter(t => {
      if (activeTab === "expenses") {
        return t.amount < 0 || (t.categoryType === "expense");
      } else {
        return t.amount > 0 || (t.categoryType === "income");
      }
    });

    // Apply search filter if present
    const filteredTransactions = searchTerm 
      ? relevantTransactions.filter(t => 
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.subCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.verboseDescription?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : relevantTransactions;

    // Group by category
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
    
    let totalValue = 0;
    
    filteredTransactions.forEach(t => {
      const amount = Math.abs(t.amount);
      totalValue += amount;
      
      // Use Claude's categorization if available, or derive from transaction data
      const category = t.category && t.category !== "Uncategorized" 
        ? t.category 
        : activeTab === "expenses" ? "Other Expenses" : "Other Income";
      
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
      
      // Get category data
      const categoryData = categoryMap.get(category)!;
      
      // Update category data
      categoryData.amount += amount;
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
      subCategoryData.amount += amount;
      subCategoryData.count += 1;
      subCategoryData.transactions.push(t);
    });
    
    // Convert to chart data format
    const chartData = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.amount,
        count: data.count,
        transactions: data.transactions,
        subcategories: Array.from(data.subcategories.entries())
          .map(([subName, subData]) => ({ 
            name: subName, 
            value: subData.amount,
            count: subData.count,
            transactions: subData.transactions,
            parentCategory: name
          }))
          .sort((a, b) => b.value - a.value),
        totalValue
      }))
      .sort((a, b) => b.value - a.value);
    
    // Extract subcategory data if a category is selected
    const subcategoryChartData = selectedCategory 
      ? chartData.find(cat => cat.name === selectedCategory)?.subcategories || []
      : [];
    
    // Calculate totals
    const totalExpenses = activeTab === "expenses" ? totalValue : 0;
    const totalIncome = activeTab === "income" ? totalValue : 0;
    
    return { 
      categoryData: chartData, 
      subcategoryData: subcategoryChartData,
      totalExpenses,
      totalIncome,
      expenseCategoriesCount: activeTab === "expenses" ? chartData.length : 0,
      incomeCategoriesCount: activeTab === "income" ? chartData.length : 0
    };
  }, [transactions, selectedCategory, activeTab, searchTerm]);

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
          <p className="text-xs text-muted-foreground">{data.count} transactions</p>
          <p className="text-xs text-primary mt-1">Click to view details</p>
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

  // Handle category selection
  const handleCategoryClick = (data: any) => {
    setSelectedCategory(data.name);
    setSelectedSubcategory(null);
    setSelectedTransactions(null);
  };

  // Handle subcategory selection
  const handleSubcategoryClick = (data: any) => {
    setSelectedSubcategory(data.name);
    setSelectedTransactions(data.transactions);
  };

  // Handle navigation back (from subcategories to categories)
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedTransactions(null);
  };

  // Handle navigation back (from transactions to subcategories)
  const handleBackToSubcategories = () => {
    setSelectedSubcategory(null);
    setSelectedTransactions(null);
  };

  // Handle mouse hover on pie slices
  const onPieEnter = (_, index: number) => {
    setActiveIndex(index);
  };
  
  // Handle mouse leave on pie slices
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Get display name for transaction - prioritize verbose description
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              {activeTab === "expenses" ? "Expense Categories" : "Income Sources"}
            </CardTitle>
            <CardDescription>
              {activeTab === "expenses" 
                ? `${expenseCategoriesCount} expense categories with ${formatCurrency(totalExpenses)} total`
                : `${incomeCategoriesCount} income categories with ${formatCurrency(totalIncome)} total`
              }
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={(value: any) => {
              setActiveTab(value);
              setSelectedCategory(null);
              setSelectedSubcategory(null);
              setSelectedTransactions(null);
            }}>
              <TabsList>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Search Input */}
        <div className="mb-4 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Navigation breadcrumbs */}
        {(selectedCategory || selectedSubcategory) && (
          <div className="flex items-center mb-4 space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-0 h-8" 
              onClick={
                selectedTransactions 
                  ? handleBackToSubcategories 
                  : handleBackToCategories
              }
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            {selectedCategory && (
              <div className="flex items-center">
                <span className="text-sm font-medium mx-1">
                  {selectedCategory}
                </span>
                {selectedSubcategory && (
                  <>
                    <span className="mx-1 text-muted-foreground">/</span>
                    <span className="text-sm font-medium">
                      {selectedSubcategory}
                    </span>
                  </>
                )}
              </div>
            )}
            
            {selectedTransactions && (
              <Badge variant="outline" className="ml-2">
                {selectedTransactions.length} transactions
              </Badge>
            )}
          </div>
        )}
        
        {/* Charts and Transaction List */}
        <div className="mt-2">
          {/* Category Pie Chart */}
          {!selectedCategory && !selectedTransactions && (
            <div className="h-[350px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={1}
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                      onMouseLeave={onPieLeave}
                      onClick={handleCategoryClick}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
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
                          {value} ({categoryData[index].count})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No {activeTab} categories available
                </div>
              )}
            </div>
          )}
          
          {/* Subcategory Pie Chart */}
          {selectedCategory && !selectedTransactions && (
            <div className="h-[350px]">
              {subcategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={subcategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={1}
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                      onMouseLeave={onPieLeave}
                      onClick={handleSubcategoryClick}
                    >
                      {subcategoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
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
                          {value} ({subcategoryData[index].count})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No subcategories for {selectedCategory}
                </div>
              )}
            </div>
          )}
          
          {/* Transaction List */}
          {selectedTransactions && (
            <div className="overflow-y-auto max-h-[350px] space-y-2">
              {selectedTransactions.map((t) => (
                <div key={t.id} className="text-sm p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="max-w-[70%]">
                      <p className="font-medium">{getTransactionDisplayName(t)}</p>
                      {(t.description && t.description !== getTransactionDisplayName(t)) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Original: {t.description || t.name}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {t.category || "Uncategorized"}
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
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${t.amount < 0 ? "text-destructive" : "text-green-600"}`}>
                        {formatCurrency(t.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {selectedTransactions.length === 0 && (
                <div className="text-center p-4 text-muted-foreground">
                  No transactions match your criteria
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Summary Footer */}
        <div className="mt-4 text-xs text-muted-foreground text-center">
          {searchTerm ? (
            <p>Filtered to {categoryData.reduce((sum, cat) => sum + cat.count, 0)} transactions matching "{searchTerm}"</p>
          ) : (
            <p>Showing all {activeTab} categories from Claude's enhanced categorization</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdown;
