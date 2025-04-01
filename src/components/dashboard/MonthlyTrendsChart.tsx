
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
import { ChartBar, TrendingUp, TrendingDown, BarChart2, Info } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  // Configuration for charts - update colors to match dashboard
  const chartConfig = {
    expense: { 
      theme: { light: "#EF4444", dark: "#EF4444" } 
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
        <CardTitle className="flex items-center gap-2">
          Monthly Financial Trends
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-sm">
                  These visualizations help you track your finances over time.
                  Compare changes month-to-month to identify patterns.
                </p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </CardTitle>
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
            <TabsTrigger value="percentage" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>% Change</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="combined" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-9 h-[300px]">
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
                        fill="#10B981" /* Green color to match Dashboard */
                      />
                      <Bar 
                        dataKey="expenses" 
                        name="expense" 
                        fill="#EF4444" /* Red color to match Dashboard */
                      />
                      <Legend />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No monthly data available
                  </div>
                )}
              </div>
              <div className="md:col-span-3 flex flex-col justify-center">
                <div className="mb-4">
                  <h4 className="font-bold mb-2">About This Chart</h4>
                  <p className="text-sm text-muted-foreground">
                    This bar chart displays your monthly income and expenses side by side,
                    making it easy to compare the two values for each month.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">How to Use</h4>
                  <p className="text-sm text-muted-foreground">
                    Look for months where expenses exceed income (red bars taller than green),
                    which might indicate budget issues that need attention.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Trends Tab showing income and expenses as line chart with dollar amounts */}
          <TabsContent value="trends" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-9 h-[300px]">
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
                        stroke="#10B981" /* Green color to match Dashboard */
                        activeDot={{ r: 8 }} 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        name="expense" 
                        stroke="#EF4444" /* Red color to match Dashboard */
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
              <div className="md:col-span-3 flex flex-col justify-center">
                <div className="mb-4">
                  <h4 className="font-bold mb-2">About This Chart</h4>
                  <p className="text-sm text-muted-foreground">
                    This line chart tracks your income and expenses over time,
                    highlighting overall trends and recurring patterns.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">How to Use</h4>
                  <p className="text-sm text-muted-foreground">
                    Look for consistent upward or downward trends. Steady income with 
                    rising expenses may indicate lifestyle inflation. Seasonal 
                    fluctuations might suggest predictable budget cycles.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Combined Percentage Change Tab */}
          <TabsContent value="percentage" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-9 h-[300px]">
                {monthlyTrendData.length > 1 ? (
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
                        tickFormatter={(value) => `${value}%`}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <ChartTooltipContent
                                active={active}
                                payload={payload}
                                formatter={(value) => `${value}%`}
                              />
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="incomeChange" 
                        name="Income % Change" 
                        stroke="#10B981" /* Green color to match Dashboard */
                        dot={true}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expensesChange" 
                        name="Expense % Change" 
                        stroke="#EF4444" /* Red color to match Dashboard */
                        dot={true}
                        strokeWidth={2}
                      />
                      <Legend />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Not enough data for percentage changes (need at least 2 months)
                  </div>
                )}
              </div>
              <div className="md:col-span-3 flex flex-col justify-center">
                <div className="mb-4">
                  <h4 className="font-bold mb-2">About This Chart</h4>
                  <p className="text-sm text-muted-foreground">
                    This chart shows month-over-month percentage changes in your income and expenses,
                    helping you identify growth or reduction rates.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">How to Use</h4>
                  <p className="text-sm text-muted-foreground">
                    Large spikes may indicate unusual financial events. Income growing slower than 
                    expenses (green line below red) suggests increasing financial strain over time.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MonthlyTrendsChart;
