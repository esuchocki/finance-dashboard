
import React, { useState } from "react";
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
  "Housing": "#0088FE",
  "Transportation": "#FFBB28",
  "Entertainment": "#FF8042",
  "Shopping": "#A4DE6C",
  "Healthcare": "#8884D8",
  "Personal": "#FF6B6B",
  "Travel": "#6A6AFF",
  "Finance": "#FFDDA1",
  "Income": "#7FB069",
  "Business": "#D1495B",
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<any[] | null>(null);
  const [drilldownTotal, setDrilldownTotal] = useState<number>(0);
  const [drilldownTransactions, setDrilldownTransactions] = useState<Transaction[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

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
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.payee && t.payee.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.memo && t.memo.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // Prepare the data for rendering
  const currentExpenseData = expenseData
    .filter(item => item.name !== "Uncategorized" || item.value > 0) // Only show Uncategorized if it has value
    .map(item => ({
      ...item,
      totalValue: expenseData.reduce((sum, i) => sum + i.value, 0),
      transactionCount: item.transactions?.length || 0
    }));
  
  const currentIncomeData = incomeData
    .filter(item => item.name !== "Uncategorized" || item.value > 0) // Only show Uncategorized if it has value
    .map(item => ({
      ...item,
      totalValue: incomeData.reduce((sum, i) => sum + i.value, 0),
      transactionCount: item.transactions?.length || 0
    }));

  // Helper for rendering either the main pie chart or drill-down view
  const renderPieChart = (data: any[], title: string, isEmpty: boolean) => {
    // If we're in drill-down mode for this chart
    if (selectedCategory && drilldownData && 
        ((activePieIndex === 0 && title.includes("Spending")) || 
         (activePieIndex === 1 && title.includes("Income")))) {
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
                              <div className="truncate max-w-[70%]">{t.payee || t.description}</div>
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
    const totalExpenseCount = expenseData.reduce((sum, category) => 
      sum + (category.transactions?.length || 0), 0);
    
    const uncategorizedCount = expenseData.find(c => c.name === "Uncategorized")?.transactions?.length || 0;
    
    if (totalExpenseCount === 0) return 100;
    return Math.round(((totalExpenseCount - uncategorizedCount) / totalExpenseCount) * 100);
  };

  const categorizedPercentage = calculateCategorizedPercentage();

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
                  {categorizedPercentage}% of your transactions have been categorized by Claude AI.
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
            setActivePieIndex(value === "expenses" ? 0 : 1);
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
                currentExpenseData, 
                "Spending by Category", 
                currentExpenseData.length === 0
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="income" className="mt-0">
            <div className="animate-in zoom-in-50 duration-300">
              {renderPieChart(
                currentIncomeData, 
                "Income Sources", 
                currentIncomeData.length === 0
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CategoryCharts;
