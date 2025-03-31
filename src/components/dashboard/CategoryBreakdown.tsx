
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  PieChart, Pie, Cell, Sector, ResponsiveContainer,
  Legend, Tooltip as RechartsTooltip
} from "recharts";
import { ChevronLeft, Info, Search } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatCurrency } from "@/lib/formatters";
import { Transaction } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

// Consistent color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
  "Housing": "#0088FE",
  "Food": "#00C49F",
  "Transportation": "#FFBB28",
  "Entertainment": "#FF8042",
  "Shopping": "#A4DE6C",
  "Healthcare": "#8884D8",
  "Personal": "#FF6B6B",
  "Education": "#6A6AFF",
  "Travel": "#FFDDA1",
  "Business": "#7FB069",
  "Finance": "#D1495B",
  "Income": "#9C6644",
  "Utilities": "#EDAE49",
  "Insurance": "#30638E",
  "Childcare": "#803D5F",
  "Investments": "#2196F3",
  "Gifts": "#E91E63",
  "Taxes": "#795548",
  "Other": "#9E9E9E",
  "Uncategorized": "#AAAAAA"
};

// Fallback colors for categories without specific colors
const FALLBACK_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A4DE6C", 
  "#8884D8", "#FF6B6B", "#6A6AFF", "#FFDDA1", "#7FB069",
  "#D1495B", "#9C6644", "#EDAE49", "#30638E", "#803D5F"
];

// Type definitions for our chart data
interface CategoryData {
  name: string;
  value: number;
  transactions: Transaction[];
  subcategories?: SubcategoryData[];
  totalValue?: number;
  transactionCount?: number;
}

interface SubcategoryData {
  name: string;
  value: number;
  transactions: Transaction[];
  totalValue?: number;
}

// Props for our component
interface CategoryBreakdownProps {
  transactions: Transaction[];
}

// Custom tooltip component for the pie chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = data.totalValue 
      ? ((data.value / data.totalValue) * 100).toFixed(1) 
      : 0;
    
    return (
      <div className="bg-background border rounded p-3 shadow-md">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
        <p className="text-xs text-muted-foreground">{percentage}% of total</p>
        {data.transactions?.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {data.transactions.length} transactions
          </p>
        )}
        {data.subcategories && data.subcategories.length > 0 && (
          <p className="text-xs text-primary mt-1">Click to see details</p>
        )}
      </div>
    );
  }
  return null;
};

// Active shape renderer for selected pie slice
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

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ transactions }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<SubcategoryData[] | null>(null);
  const [drilldownTransactions, setDrilldownTransactions] = useState<Transaction[] | null>(null);
  const [drilldownTotal, setDrilldownTotal] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("expenses");

  // Function to get color for a category
  const getCategoryColor = (category: string, index: number): string => {
    return CATEGORY_COLORS[category] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  };

  // Process transactions into category data
  const processTransactions = () => {
    // Expense transactions
    const expenseTransactions = transactions.filter(t => 
      t.categoryType === "expense" || 
      (!t.categoryType && (t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE"))
    );
    
    // Income transactions
    const incomeTransactions = transactions.filter(t => 
      t.categoryType === "income" || 
      (!t.categoryType && (t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST"))
    );
    
    // Process expenses by category
    const expenseCategories = processCategorizedTransactions(expenseTransactions);
    
    // Process income by category
    const incomeCategories = processCategorizedTransactions(incomeTransactions);
    
    return { expenseCategories, incomeCategories };
  };

  // Helper function to categorize transactions
  const processCategorizedTransactions = (transactions: Transaction[]): CategoryData[] => {
    const categoryMap = new Map<string, {
      value: number;
      transactions: Transaction[];
      subcategories: Map<string, {
        value: number;
        transactions: Transaction[];
      }>;
    }>();
    
    // Group transactions by category and subcategory
    transactions.forEach(transaction => {
      const category = transaction.category || "Uncategorized";
      const subcategory = transaction.subCategory || "Other";
      
      // Initialize category if it doesn't exist
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          value: 0,
          transactions: [],
          subcategories: new Map()
        });
      }
      
      // Add transaction to category
      const categoryData = categoryMap.get(category)!;
      categoryData.value += transaction.amount;
      categoryData.transactions.push(transaction);
      
      // Initialize subcategory if it doesn't exist
      if (!categoryData.subcategories.has(subcategory)) {
        categoryData.subcategories.set(subcategory, {
          value: 0,
          transactions: []
        });
      }
      
      // Add transaction to subcategory
      const subcategoryData = categoryData.subcategories.get(subcategory)!;
      subcategoryData.value += transaction.amount;
      subcategoryData.transactions.push(transaction);
    });
    
    // Convert to array format for charts
    const totalValue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.value, 0);
    
    const result = Array.from(categoryMap.entries())
      .map(([name, data]): CategoryData => ({
        name,
        value: data.value,
        totalValue,
        transactions: data.transactions,
        transactionCount: data.transactions.length,
        subcategories: Array.from(data.subcategories.entries())
          .map(([subName, subData]): SubcategoryData => ({
            name: subName,
            value: subData.value,
            transactions: subData.transactions
          }))
          .sort((a, b) => b.value - a.value)
      }))
      .filter(category => category.value > 0)
      .sort((a, b) => b.value - a.value);
    
    return result;
  };

  // Event handlers
  const handlePieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const handlePieLeave = () => {
    setActiveIndex(null);
  };
  
  const handlePieClick = (data: CategoryData) => {
    if (data.subcategories && data.subcategories.length > 0) {
      // Add totalValue to subcategories for percentage calculation
      const subcategoriesWithTotal = data.subcategories.map(sub => ({
        ...sub,
        totalValue: data.value
      }));
      
      setSelectedCategory(data.name);
      setDrilldownData(subcategoriesWithTotal);
      setDrilldownTotal(data.value);
      setDrilldownTransactions(data.transactions);
    }
  };
  
  const handleBackClick = () => {
    setSelectedCategory(null);
    setDrilldownData(null);
    setDrilldownTransactions(null);
    setSearchQuery("");
  };

  // Filter transactions when searching
  const filteredDrilldownTransactions = drilldownTransactions
    ? drilldownTransactions.filter(t => 
        (t.verboseDescription || t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.payee || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.subCategory || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Process data for charts
  const { expenseCategories, incomeCategories } = processTransactions();
  
  // Calculate percentage of categorized transactions
  const calculateCategorizedPercentage = () => {
    const totalCount = transactions.length;
    if (totalCount === 0) return 100;
    
    const categorizedCount = transactions.filter(
      t => t.category && t.category !== "Uncategorized" && t.category !== "Other"
    ).length;
    
    return Math.round((categorizedCount / totalCount) * 100);
  };
  
  const categorizedPercentage = calculateCategorizedPercentage();

  // Render the pie chart or drilldown view
  const renderPieChart = (data: CategoryData[], isEmpty: boolean) => {
    // If we're in drilldown mode
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
                      onMouseEnter={handlePieEnter}
                      onMouseLeave={handlePieLeave}
                      nameKey="name"
                    >
                      {drilldownData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getCategoryColor(entry.name, index)}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      formatter={(value, entry, index) => (
                        <span className="text-xs">
                          {value} ({((drilldownData[index].value / drilldownData[index].totalValue!) * 100).toFixed(0)}%)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">No subcategories available</p>
                </div>
              )}
            </div>
            
            {/* Transactions list for the selected category */}
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
                                {t.confidence && 
                                  <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                                    {t.confidence}
                                  </Badge>
                                }
                              </span>
                            </div>
                          </li>
                        ))}
                        {filteredDrilldownTransactions.length > 20 && (
                          <li className="text-xs text-muted-foreground text-center p-1">
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
    
    // Show the main category pie chart
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
            onMouseEnter={handlePieEnter}
            onMouseLeave={handlePieLeave}
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
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
            formatter={(value, entry, index) => (
              <span className="text-xs">
                {value} ({((data[index].value / data[index].totalValue!) * 100).toFixed(0)}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>
              Your spending and income categorized by type
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
                  {categorizedPercentage}% of your transactions have been categorized.
                  Click on any category to see subcategories and transactions.
                </p>
                <p className="text-sm text-muted-foreground">
                  Transactions are hierarchically organized into main categories and subcategories
                  for detailed analysis.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="expenses" 
          className="w-full" 
          onValueChange={(value) => {
            setActiveTab(value);
            setSelectedCategory(null);
            setDrilldownData(null);
            setSearchQuery("");
          }}
        >
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
          
          <TabsContent value="expenses" className="mt-0">
            <div className="animate-in zoom-in-50 duration-300">
              {renderPieChart(
                expenseCategories, 
                expenseCategories.length === 0
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="income" className="mt-0">
            <div className="animate-in zoom-in-50 duration-300">
              {renderPieChart(
                incomeCategories, 
                incomeCategories.length === 0
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdown;
