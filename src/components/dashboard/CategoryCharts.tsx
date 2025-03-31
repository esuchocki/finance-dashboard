import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

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
  "Uncategorized": "#9C6644"
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

  // Function to get color for a category, with fallback
  const getCategoryColor = (category: string, index: number) => {
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
        transactions: data.transactions.filter((t: Transaction) => t.subCategory === item.name)
      }));
      
      setSelectedCategory(data.name);
      setDrilldownData(enrichedData);
      setDrilldownTotal(total);
    }
  };

  // Function to go back from drill-down view
  const handleBackClick = () => {
    setSelectedCategory(null);
    setDrilldownData(null);
  };

  // Prepare the data for rendering
  const currentExpenseData = expenseData.map(item => ({
    ...item,
    totalValue: expenseData.reduce((sum, i) => sum + i.value, 0)
  }));
  
  const currentIncomeData = incomeData.map(item => ({
    ...item,
    totalValue: incomeData.reduce((sum, i) => sum + i.value, 0)
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
                {formatCurrency(drilldownTotal)}
              </p>
            </div>
          </div>
          
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
          >
            {data.map((entry, index) => (
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
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
        <CardDescription>
          Your spending and income categorized by type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="expenses" 
          className="w-full" 
          onValueChange={(value) => {
            setActivePieIndex(value === "expenses" ? 0 : 1);
            setSelectedCategory(null);
            setDrilldownData(null);
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
