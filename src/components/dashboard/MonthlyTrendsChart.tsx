
import React from "react";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Area, 
  AreaChart,
  Legend,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartBar, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface MonthlyTrendsChartProps {
  monthlyTrendData: Array<{
    name: string;
    income: number;
    expenses: number;
    balance: number;
    incomeChange: number;
    expensesChange: number;
  }>;
}

const MonthlyTrendsChart: React.FC<MonthlyTrendsChartProps> = ({ monthlyTrendData }) => {
  // Configuration for charts - properly typed to fix the errors
  const chartConfig = {
    expense: { 
      theme: { light: "#F97316", dark: "#F97316" } 
    },
    income: { 
      theme: { light: "#10B981", dark: "#10B981" } 
    },
    balance: { 
      theme: { light: "#8B5CF6", dark: "#8B5CF6" } 
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Financial Trends</CardTitle>
        <CardDescription>Income and expense patterns over time</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="combined">
          <TabsList className="mb-4">
            <TabsTrigger value="combined" className="flex items-center gap-1">
              <ChartBar className="h-4 w-4" />
              <span>Combined</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-1">
              <BarChart2 className="h-4 w-4" />
              <span>Trends</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>Income %</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              <span>Expenses %</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="combined" className="mt-0">
            <div className="h-[300px]">
              {monthlyTrendData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="h-[300px]"
                >
                  <BarChart
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
                    <Bar 
                      dataKey="income" 
                      name="income" 
                    />
                    <Bar 
                      dataKey="expenses" 
                      name="expense" 
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No monthly data available
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* New Trends Tab showing income and expenses as line chart with dollar amounts */}
          <TabsContent value="trends" className="mt-0">
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
                  No trend data available
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="income" className="mt-0">
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
                    {/* Add a secondary YAxis with the "right" yAxisId */}
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      tickFormatter={(value) => `${value}%`}
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
                    <defs>
                      <linearGradient id="incomeColorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      name="income"
                      stroke="#10B981" 
                      fillOpacity={1} 
                      fill="url(#incomeColorGradient)" 
                    />
                    {monthlyTrendData.length > 1 && (
                      <Line 
                        type="monotone" 
                        dataKey="incomeChange" 
                        name="% Change" 
                        yAxisId="right"
                        stroke="#8B5CF6" 
                        dot={true}
                        strokeDasharray="5 5"
                      />
                    )}
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No income data available
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="expenses" className="mt-0">
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
                    {/* Add a secondary YAxis with the "right" yAxisId */}
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      tickFormatter={(value) => `${value}%`}
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
                    <defs>
                      <linearGradient id="expenseColorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      name="expense"
                      stroke="#F97316" 
                      fillOpacity={1} 
                      fill="url(#expenseColorGradient)" 
                    />
                    {monthlyTrendData.length > 1 && (
                      <Line 
                        type="monotone" 
                        dataKey="expensesChange" 
                        name="% Change" 
                        yAxisId="right"
                        stroke="#8B5CF6" 
                        dot={true}
                        strokeDasharray="5 5"
                      />
                    )}
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No expense data available
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MonthlyTrendsChart;
