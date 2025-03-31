
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
  CartesianGrid
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatters";

interface BalanceChartProps {
  balanceData: Array<{
    name: string;
    balance: number;
    monthlyChange: number;
  }>;
}

const BalanceChart: React.FC<BalanceChartProps> = ({ balanceData }) => {
  // Configuration for charts
  const chartConfig = {
    balance: { 
      theme: { light: "#8B5CF6", dark: "#8B5CF6" } 
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Over Time</CardTitle>
        <CardDescription>Running balance by month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {balanceData.length > 0 ? (
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
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
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
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  name="balance" 
                  stroke="#8B5CF6" 
                  fillOpacity={1} 
                  fill="url(#balanceGradient)" 
                />
              </AreaChart>
            </ChartContainer>
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
