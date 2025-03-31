
import React from "react";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryChartsProps {
  expenseData: CategoryData[];
  incomeData: CategoryData[];
}

const CategoryCharts: React.FC<CategoryChartsProps> = ({ expenseData, incomeData }) => {
  // Define chart colors
  const CHART_COLORS = [
    "#0EA5E9", "#06B6D4", "#14B8A6", "#10B981", "#34D399", 
    "#8B5CF6", "#A855F7", "#EC4899", "#F472B6", "#FB7185"
  ];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Expense Categories Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>
            {expenseData.length} categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expenseData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Income Categories Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income Sources</CardTitle>
          <CardDescription>
            {incomeData.length} categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {incomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#10B981"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {incomeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No income data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryCharts;
