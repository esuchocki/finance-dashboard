
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { prepareChartData, prepareIncomeChartData } from "./utils/chartDataUtils";

interface CategoryBreakdownProps {
  transactions: Transaction[];
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A4DE6C", 
  "#8884D8", "#FF6B6B", "#6A6AFF", "#FFDDA1", "#7FB069"
];

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ transactions }) => {
  const [viewType, setViewType] = useState<"expense" | "income">("expense");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Prepare data based on selected view type
  const expenseData = prepareChartData(transactions);
  const incomeData = prepareIncomeChartData(transactions);
  
  const chartData = viewType === "expense" ? expenseData : incomeData;
  
  // If a category is selected, show its subcategories
  const selectedCategoryData = selectedCategory
    ? chartData.find(item => item.name === selectedCategory)?.subcategories || []
    : [];
  
  // Handle clicking on a category to see subcategories
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };
  
  // Format tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-2 border rounded-md shadow-sm">
          <p className="text-sm font-medium">{payload[0].payload.name}</p>
          <p className="text-xs">{formatCurrency(payload[0].value)}</p>
          {payload[0].payload.count && (
            <p className="text-xs text-muted-foreground">
              {payload[0].payload.count} transactions
            </p>
          )}
        </div>
      );
    }
    return null;
  };
  
  // Format data for chart
  const formatDataForChart = (data: any[]) => {
    return data.map(item => ({
      ...item,
      // Use .name for display, add .count if available
      name: item.name,
      count: item.transactions?.length || 0
    }));
  };
  
  const displayData = selectedCategory
    ? formatDataForChart(selectedCategoryData)
    : formatDataForChart(chartData);
  
  // Calculate totals for percentage display
  const totalAmount = selectedCategory
    ? selectedCategoryData.reduce((sum, item) => sum + item.value, 0)
    : chartData.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>
              {selectedCategory 
                ? `${selectedCategory} Breakdown` 
                : "Category Breakdown"}
            </CardTitle>
            <CardDescription>
              {selectedCategory 
                ? `Subcategories of ${selectedCategory}` 
                : `Your ${viewType === "expense" ? "spending" : "income"} by category`}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-finance-primary hover:underline"
              >
                Back to all categories
              </button>
            )}
            
            <Select 
              value={viewType} 
              onValueChange={(value) => {
                setViewType(value as "expense" | "income");
                setSelectedCategory(null);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {displayData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={150}
                  tick={{
                    fontSize: 12,
                    width: 130, // Control width of the text
                    overflow: 'hidden'
                    // Removed the invalid textOverflow property
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8" 
                  onClick={(data) => {
                    // Only allow drilling down on main categories, not subcategories
                    if (!selectedCategory && data.subcategories?.length > 0) {
                      handleCategorySelect(data.name);
                    }
                  }}
                  cursor={!selectedCategory ? 'pointer' : undefined}
                >
                  {displayData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        )}
        
        {/* Category data table with percentages */}
        <div className="mt-4 space-y-1 text-sm max-h-40 overflow-y-auto">
          {displayData.map((item) => (
            <div 
              key={item.name}
              className="flex justify-between items-center py-1 px-2 hover:bg-muted/50 rounded cursor-pointer"
              onClick={() => {
                if (!selectedCategory && item.subcategories?.length > 0) {
                  handleCategorySelect(item.name);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[displayData.indexOf(item) % COLORS.length] }}
                />
                <span className="font-medium">{item.name}</span>
                {!selectedCategory && item.subcategories?.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({item.subcategories.length} subcategories)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {item.count} txns
                </span>
                <span>{formatCurrency(item.value)}</span>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {Math.round((item.value / totalAmount) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdown;
