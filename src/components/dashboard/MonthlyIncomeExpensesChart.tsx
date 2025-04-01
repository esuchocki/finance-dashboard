
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface MonthlyIncomeExpensesChartProps {
  monthlyTrendData: any[];
}

const MonthlyIncomeExpensesChart: React.FC<MonthlyIncomeExpensesChartProps> = ({ monthlyTrendData }) => {
  // Configuration for charts
  const chartConfig = {
    expense: { 
      theme: { light: "#F97316", dark: "#F97316" } 
    },
    income: { 
      theme: { light: "#10B981", dark: "#10B981" } 
    }
  };
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Income & Expenses Trends</CardTitle>
        <CardDescription>Monthly income and expenses over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {monthlyTrendData.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="h-[300px]"
            >
              <LineChart
                data={monthlyTrendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickMargin={20}
                />
                <YAxis 
                  tickFormatter={(value) => `$${Math.abs(value) >= 1000 
                    ? `${(value / 1000).toFixed(1)}k` 
                    : value}`}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <ChartTooltipContent
                          active={active}
                          payload={payload}
                          formatter={(value) => formatCurrency(value as number)}
                        />
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  name="income" 
                  stroke="#10B981" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  name="expense" 
                  stroke="#F97316" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
                <Legend />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No monthly data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyIncomeExpensesChart;
