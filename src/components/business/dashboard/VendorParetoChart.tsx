import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { VendorSpending } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";

interface VendorParetoChartProps {
  vendors: VendorSpending[];
}

const VendorParetoChart: React.FC<VendorParetoChartProps> = ({ vendors }) => {
  const topVendors = vendors.slice(0, 20);

  // Calculate cumulative percentages for Pareto line
  let cumulative = 0;
  const chartData = topVendors.map(vendor => {
    cumulative += vendor.percentOfTotal;
    return {
      vendor: vendor.vendor.length > 15 ? vendor.vendor.substring(0, 15) + '...' : vendor.vendor,
      amount: vendor.totalSpent,
      cumulative: cumulative
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Spending Analysis</CardTitle>
        <CardDescription>
          Top 20 vendors by total spending (Pareto chart)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ bottom: 80, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="vendor"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value.toFixed(0)}%`} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'amount') return formatCurrency(value as number);
                  return `${(value as number).toFixed(1)}%`;
                }}
              />
              <Bar yAxisId="left" dataKey="amount" fill="#3B82F6" fillOpacity={0.65} name="Spending" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Cumulative %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorParetoChart;
