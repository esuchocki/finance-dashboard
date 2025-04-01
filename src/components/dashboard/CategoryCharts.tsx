
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Info, Search } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";

// Custom colors for the chart
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A4DE6C", 
  "#8884D8", "#FF6B6B", "#6A6AFF", "#FFDDA1", "#7FB069",
  "#D1495B", "#9C6644", "#EDAE49", "#30638E", "#803D5F"
];

// Map categories to specific colors for consistency
const CATEGORY_COLORS: Record<string, string> = {
  "Food": "#00C49F",
  "Groceries": "#4CAF50",
  "Dining": "#8BC34A",
  "Housing": "#0088FE",
  "Rent": "#2196F3",
  "Mortgage": "#03A9F4",
  "Transportation": "#FFBB28",
  "Car": "#FFC107",
  "Public Transit": "#FF9800",
  "Entertainment": "#FF8042",
  "Shopping": "#A4DE6C",
  "Healthcare": "#8884D8",
  "Insurance": "#673AB7",
  "Personal": "#FF6B6B",
  "Education": "#E91E63",
  "Travel": "#6A6AFF",
  "Finance": "#FFDDA1",
  "Debt": "#795548",
  "Income": "#7FB069",
  "Salary": "#4CAF50",
  "Business": "#D1495B",
  "Donations": "#9E9E9E",
  "Childcare": "#FF5722",
  "Utilities": "#607D8B",
  "Other": "#9C6644",
  "Uncategorized": "#AAAAAA" // Gray for uncategorized (should be minimal)
};

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
        {data.transactionCount > 0 && (
          <p className="text-xs text-muted-foreground">{data.transactionCount} transactions</p>
        )}
        {data.subcategories && data.subcategories.length > 0 && (
          <p className="text-xs text-finance-primary mt-1">Click to see details</p>
        )}
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

interface CategoryChartsProps {
  expenseData: any[];
  incomeData: any[];
  transactions: Transaction[];
}

const CategoryCharts: React.FC<CategoryChartsProps> = ({ 
  expenseData, 
  incomeData,
  transactions 
}) => {
  // State for controlling the UI
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<any[] | null>(null);
  const [drilldownTotal, setDrilldownTotal] = useState<number>(0);
  const [drilldownTransactions, setDrilldownTransactions] = useState<Transaction[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Combine the expense and income data for the "All" tab
  const allCategoriesData = useMemo(() => {
    return [...expenseData, ...incomeData].map(item => ({
      ...item,
      totalValue: [...expenseData, ...incomeData].reduce((sum, i) => sum + i.value, 0),
      transactionCount: item.transactions?.length || 0
    }));
  }, [expenseData, incomeData]);
  
  // Filter transactions based on active tab
  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") return transactions;
    
    return transactions.filter(transaction => {
      if (activeTab === "expenses") return transaction.categoryType === "expense";
      if (activeTab === "income") return transaction.categoryType === "income";
      if (activeTab === "transfers") return transaction.categoryType === "transfer";
      return true;
    });
  }, [transactions, activeTab]);
  
  // Get the appropriate category data based on the active tab
  const getCategoryData = () => {
    if (activeTab === "all") return allCategoriesData;
    if (activeTab === "expenses") return expenseData.map(item => ({
      ...item,
      totalValue: expenseData.reduce((sum, i) => sum + i.value, 0),
      transactionCount: item.transactions?.length || 0
    }));
    if (activeTab === "income") return incomeData.map(item => ({
      ...item,
      totalValue: incomeData.reduce((sum, i) => sum + i.value, 0),
      transactionCount: item.transactions?.length || 0
    }));
    // For transfers tab - we could add transfer data here if needed
    return [];
  };

  // Function to get color for a category, with fallback
  const getCategoryColor = (category: string, index: number) => {
    if (!category) return COLORS[index % COLORS.length];
    return CATEGORY_COLORS[category] || COLORS[index % COLORS.length];
  };

  // Function to handle mouse hover on pie slices
  const onPieEnter = (_, index: number) => {
    setActiveIndex(index);
  };
  
  // Function to handle mouse leave on pie slices
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Function to handle click on pie slices for drill-down
  const handlePieClick = (data: any) => {
    if (data.subcategories && data.subcategories.length > 0) {
      // Add total value to each item for percentage calculation in tooltip
      const total = data.subcategories.reduce((sum: number, item: any) => sum + item.value, 0);
      const enrichedData = data.subcategories.map((item: any) => ({
        ...item,
        totalValue: total,
        transactions: data.transactions.filter((t: Transaction) => 
          t.subCategory === item.name || (item.name === "Other" && !t.subCategory)
        )
      }));
      
      setSelectedCategory(data.name);
      setDrilldownData(enrichedData);
      setDrilldownTotal(total);
      setDrilldownTransactions(data.transactions);
    }
  };

  // Function to go back from drill-down view
  const handleBackClick = () => {
    setSelectedCategory(null);
    setDrilldownData(null);
    setDrilldownTransactions(null);
  };

  // Filter drilldown transactions by search query
  const filteredDrilldownTransactions = drilldownTransactions 
    ? drilldownTransactions.filter(t => 
        (t.verboseDescription || t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.payee || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.memo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.subCategory || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Get the data for the current view
  const currentData = getCategoryData()
    .filter(item => item.name !== "Uncategorized" || item.value > 0); // Only show Uncategorized if it has value

  // Helper for rendering either the main pie chart or drill-down view
  const renderPieChart = (data: any[], title: string, isEmpty: boolean) => {
    // If we're in drill-down mode
    if (selectedCategory && drilldownData) {
      return (
        <div className="h-full flex flex-col">
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
            <div>
              <h3 className="text-sm font-medium">{selectedCategory}</h3>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(drilldownTotal)} · {drilldownTransactions?.length || 0} transactions
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              {drilldownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={drilldownData}
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
                      {drilldownData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getCategoryColor(entry.name, index)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">No subcategories available</p>
                </div>
              )}
            </div>
            
            {/* Show transactions for the selected category */}
            <div className="flex flex-col h-[300px]">
              {drilldownTransactions && drilldownTransactions.length > 0 && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Transactions in {selectedCategory}</h4>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transactions..."
                        className="pl-8 h-9 w-[200px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {filteredDrilldownTransactions.length > 0 ? (
                      <ul className="space-y-1">
                        {filteredDrilldownTransactions.slice(0, 20).map((t) => (
                          <li key={t.id} className="text-xs p-2 border rounded-md">
                            <div className="flex justify-between">
                              <div className="truncate max-w-[70%]">
                                {t.verboseDescription || t.payee || t.description}
                              </div>
                              <div className="font-medium">{formatCurrency(t.amount)}</div>
                            </div>
                            <div className="text-muted-foreground mt-1 flex justify-between">
                              <span>{new Date(t.date).toLocaleDateString()}</span>
                              <span>
                                {t.subCategory ? t.subCategory : "No subcategory"}
                                {t.confidence && ` · ${t.confidence} confidence`}
                              </span>
                            </div>
                          </li>
                        ))}
                        {filteredDrilldownTransactions.length > 20 && (
                          <li className="text-xs text-muted-foreground text-center">
                            +{filteredDrilldownTransactions.length - 20} more transactions
                          </li>
                        )}
                      </ul>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">No matching transactions</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // Otherwise show the main chart
    return isEmpty ? (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    ) : (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={1}
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            onClick={handlePieClick}
            nameKey="name"
          >
            {data.map((entry, index) => (
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
                {value} ({((data[index].value / data[index].totalValue) * 100).toFixed(0)}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Calculate the percentage of transactions that are categorized
  const calculateCategorizedPercentage = () => {
    const totalTransactionCount = transactions.length;
    const uncategorizedCount = transactions.filter(t => 
      t.category === "Uncategorized" || t.category === "Other"
    ).length;
    
    if (totalTransactionCount === 0) return 100;
    return Math.round(((totalTransactionCount - uncategorizedCount) / totalTransactionCount) * 100);
  };

  const categorizedPercentage = calculateCategorizedPercentage();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI-Enhanced Categories</CardTitle>
            <CardDescription>
              Claude AI-powered transaction categorization
            </CardDescription>
          </div>
          
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
                  {categorizedPercentage}% of your transactions have been categorized by Claude AI.
                  Click on any category to see subcategories and transactions.
                </p>
                <p className="text-sm text-muted-foreground">
                  Transactions are hierarchically organized into main categories and subcategories
                  for detailed analysis. Claude AI has also generated more descriptive transaction names.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="all" 
          className="w-full"
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setActivePieIndex(0);
            setSelectedCategory(null);
            setDrilldownData(null);
            setSearchQuery("");
          }}
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="all">All Categories</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <div className="animate-in zoom-in-50 duration-300">
              {renderPieChart(
                currentData, 
                "All Categories", 
                currentData.length === 0
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="expenses" className="mt-0">
            <div className="animate-in zoom-in-50 duration-300">
              {renderPieChart(
                expenseData.map(item => ({
                  ...item,
                  totalValue: expenseData.reduce((sum, i) => sum + i.value, 0),
                  transactionCount: item.transactions?.length || 0
                })), 
                "Expenses", 
                expenseData.length === 0
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="income" className="mt-0">
            <div className="animate-in zoom-in-50 duration-300">
              {renderPieChart(
                incomeData.map(item => ({
                  ...item,
                  totalValue: incomeData.reduce((sum, i) => sum + i.value, 0),
                  transactionCount: item.transactions?.length || 0
                })), 
                "Income", 
                incomeData.length === 0
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="transfers" className="mt-0">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              {transactions.filter(t => t.categoryType === "transfer").length > 0 ? (
                <div className="text-center">
                  <p>Transfer categories will be displayed here</p>
                  <p className="text-sm mt-2">
                    {transactions.filter(t => t.categoryType === "transfer").length} transfer transactions found
                  </p>
                </div>
              ) : (
                <p>No transfer transactions found</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CategoryCharts;
