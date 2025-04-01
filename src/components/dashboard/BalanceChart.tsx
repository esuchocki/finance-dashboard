
import React from "react";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp } from "lucide-react";

interface BalanceChartProps {
  balanceData: Array<{
    name: string;
    balance: number;
    monthlyChange: number;
  }>;
}

const BalanceChart: React.FC<BalanceChartProps> = ({ balanceData }) => {
  // Configuration for charts - using pastel purple for balance
  const chartConfig = {
    balance: { 
      theme: { light: "#E5DEFF", dark: "#E5DEFF" } // Pastel purple
    },
  };

  return (
    <Card className="dashboard-card animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-finance-accent" />
              Balance Over Time
            </CardTitle>
            <CardDescription>Running balance by month</CardDescription>
          </div>
          {balanceData.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="text-xl font-bold text-accent">
                {formatCurrency(balanceData[balanceData.length - 1]?.balance || 0)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] chart-container">
          {balanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer
                config={chartConfig}
                className="h-[300px]"
              >
                <AreaChart
                  data={balanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E5DEFF" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#E5DEFF" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.6} />
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
                      ? `${(value / 1000).toFixed(1)}k` 
                      : value}`}
                    stroke="#888"
                    fontSize={12}
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
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    name="balance" 
                    stroke="#D0C4FF" // Slightly darker pastel purple for the line
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#balanceGradient)" 
                    activeDot={{ r: 6, stroke: "#D0C4FF", strokeWidth: 2, fill: "white" }}
                  />
                </AreaChart>
              </ChartContainer>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No balance data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceChart;
