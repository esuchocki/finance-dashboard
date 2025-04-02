
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
  // Updated colors to more professional, balanced tones - not too pastel, not too vibrant
  const chartConfig = {
    expense: { 
      theme: { light: "#E57373", dark: "#E57373" } // Muted red
    },
    income: { 
      theme: { light: "#81C784", dark: "#81C784" } // Muted green
    },
    balance: { 
      theme: { light: "#9FA8DA", dark: "#9FA8DA" } // Muted purple/blue
    },
  };

  // Format currency values for tooltips to round to nearest dollar without decimal places
  const formatTooltipCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value));
  };

  // Format percentage values for tooltips to include label and round to nearest percent
  const formatTooltipPercentage = (value: number, name: string): string => {
    const label = name === "incomeChange" ? "Income Change" : 
                  name === "expensesChange" ? "Expense Change" : name;
    return `${label}: ${Math.round(value)}%`;
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
              <div className="md:col-span-7 h-[300px]">
                {monthlyTrendData.length > 0 ? (
                  <ChartContainer
                    config={chartConfig}
                    className="h-[300px]"
                  >
                    <BarChart
                      data={monthlyTrendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.7} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickMargin={20}
                        stroke="#888"
                        fontSize={12}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${Math.abs(value) >= 1000 
                          ? `${Math.round(value / 1000)}k` 
                          : Math.round(value)}`}
                        stroke="#888"
                        fontSize={12}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <ChartTooltipContent
                                active={active}
                                payload={payload.map(item => ({
                                  ...item,
                                  name: item.dataKey === "income" ? "Income" : 
                                         item.dataKey === "expenses" ? "Expenses" : 
                                         item.name
                                }))}
                                formatter={(value, name) => {
                                  return `${name}: ${formatTooltipCurrency(value as number)}`;
                                }}
                              />
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="income" 
                        name="Income" 
                        fill="#81C784" // Muted green
                        radius={[3, 3, 0, 0]} // Slightly rounded bar tops
                      />
                      <Bar 
                        dataKey="expenses" 
                        name="Expense" 
                        fill="#E57373" // Muted red
                        radius={[3, 3, 0, 0]} // Slightly rounded bar tops
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 15 }} 
                        iconType="circle"
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No monthly data available
                  </div>
                )}
              </div>
              <div className="md:col-span-5 flex flex-col justify-center pl-4">
                <div className="mb-6">
                  <h4 className="font-bold mb-2">About This Chart</h4>
                  <p className="text-sm text-muted-foreground">
                    This bar chart displays your monthly income and expenses side by side,
                    making it easy to compare the two values for each month.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">How to Use It</h4>
                  <p className="text-sm text-muted-foreground">
                    Look for months where expenses exceed income (red bars taller than green),
                    which might indicate budget issues that need attention. Also watch for seasonal 
                    patterns that could help you anticipate future financial needs.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Trends Tab showing income and expenses as line chart with dollar amounts */}
          <TabsContent value="trends" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 h-[300px]">
                {monthlyTrendData.length > 0 ? (
                  <ChartContainer
                    config={chartConfig}
                    className="h-[300px]"
                  >
                    <LineChart
                      data={monthlyTrendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.7} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickMargin={20}
                        stroke="#888"
                        fontSize={12}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${Math.abs(value) >= 1000 
                          ? `${Math.round(value / 1000)}k` 
                          : Math.round(value)}`}
                        stroke="#888"
                        fontSize={12}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <ChartTooltipContent
                                active={active}
                                payload={payload.map(item => ({
                                  ...item,
                                  name: item.dataKey === "income" ? "Income" : 
                                         item.dataKey === "expenses" ? "Expenses" : 
                                         item.name
                                }))}
                                formatter={(value, name) => {
                                  return `${name}: ${formatTooltipCurrency(value as number)}`;
                                }}
                              />
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="income" 
                        name="Income" 
                        stroke="#81C784" // Muted green
                        activeDot={{ r: 8 }} 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        name="Expenses" 
                        stroke="#E57373" // Muted red
                        activeDot={{ r: 8 }} 
                        strokeWidth={2}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 15 }} 
                        iconType="line"
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </div>
              <div className="md:col-span-5 flex flex-col justify-center pl-4">
                <div className="mb-6">
                  <h4 className="font-bold mb-2">About This Chart</h4>
                  <p className="text-sm text-muted-foreground">
                    This line chart tracks your income and expenses over time,
                    highlighting overall trends and recurring patterns. The line visualization
                    makes it easier to spot growth or decline in your financial flows.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">How to Use It</h4>
                  <p className="text-sm text-muted-foreground">
                    Look for consistent upward or downward trends. Steady income with 
                    rising expenses may indicate lifestyle inflation. Seasonal 
                    fluctuations might suggest predictable budget cycles that you can plan for.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Combined Percentage Change Tab */}
          <TabsContent value="percentage" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 h-[300px]">
                {monthlyTrendData.length > 1 ? (
                  <ChartContainer
                    config={chartConfig}
                    className="h-[300px]"
                  >
                    <LineChart
                      data={monthlyTrendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.7} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickMargin={20}
                        stroke="#888"
                        fontSize={12}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${Math.round(value)}%`}
                        stroke="#888"
                        fontSize={12}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <ChartTooltipContent
                                active={active}
                                payload={payload.map(item => ({
                                  ...item,
                                  name: item.dataKey === "incomeChange" ? "Income Change" : 
                                         item.dataKey === "expensesChange" ? "Expense Change" : 
                                         item.name
                                }))}
                                formatter={(value, name) => {
                                  return `${name}: ${Math.round(value as number)}%`;
                                }}
                              />
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="incomeChange" 
                        name="Income Change" 
                        stroke="#81C784" // Muted green
                        dot={true}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expensesChange" 
                        name="Expense Change" 
                        stroke="#E57373" // Muted red
                        dot={true}
                        strokeWidth={2}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 15 }} 
                        iconType="line"
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Not enough data for percentage changes (need at least 2 months)
                  </div>
                )}
              </div>
              <div className="md:col-span-5 flex flex-col justify-center pl-4">
                <div className="mb-6">
                  <h4 className="font-bold mb-2">About This Chart</h4>
                  <p className="text-sm text-muted-foreground">
                    This chart shows month-over-month percentage changes in your income and expenses,
                    helping you identify growth or reduction rates. Percentage views normalize the data,
                    making changes more comparable regardless of absolute amounts.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">How to Use It</h4>
                  <p className="text-sm text-muted-foreground">
                    Large spikes may indicate unusual financial events. Income growing slower than 
                    expenses (green line below red) suggests increasing financial strain over time.
                    Look for crossover points where the relationship between income and expense growth changes.
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
