
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
  ResponsiveContainer,
  Label
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { PieChart as PieChartIcon, BarChart } from "lucide-react";

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
  const EXPENSE_COLORS = [
    "#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#FFEDD5",
    "#F43F5E", "#FB7185", "#FDA4AF", "#FECDD3", "#FCE7F3"
  ];
  
  const INCOME_COLORS = [
    "#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5",
    "#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD", "#E0F2FE"
  ];
  
  // Custom legend renderer for better formatting
  const renderCustomizedLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <ul className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center">
            <Badge 
              style={{ backgroundColor: entry.color, color: '#fff' }}
              className="mr-1 whitespace-nowrap"
            >
              {entry.value}
            </Badge>
          </li>
        ))}
      </ul>
    );
  };

  // Calculate totals for center labels
  const expenseTotal = expenseData.reduce((sum, item) => sum + item.value, 0);
  const incomeTotal = incomeData.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Expense Categories Chart */}
      <Card className="dashboard-card animate-fade-in">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2 text-finance-negative" />
                Spending by Category
              </CardTitle>
              <CardDescription>
                {expenseData.length} categories
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Expenses</div>
              <div className="text-xl font-bold text-finance-negative">{formatCurrency(expenseTotal)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] chart-container">
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expenseData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} 
                      />
                    ))}
                    <Label
                      value="Expenses"
                      position="center"
                      fill="#333"
                      style={{ fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend content={renderCustomizedLegend} />
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
      <Card className="dashboard-card animate-fade-in">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <BarChart className="h-5 w-5 mr-2 text-finance-positive" />
                Income Sources
              </CardTitle>
              <CardDescription>
                {incomeData.length} categories
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Income</div>
              <div className="text-xl font-bold text-finance-positive">{formatCurrency(incomeTotal)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] chart-container">
            {incomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#10B981"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {incomeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={INCOME_COLORS[index % INCOME_COLORS.length]} 
                      />
                    ))}
                    <Label
                      value="Income"
                      position="center"
                      fill="#333"
                      style={{ fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend content={renderCustomizedLegend} />
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
