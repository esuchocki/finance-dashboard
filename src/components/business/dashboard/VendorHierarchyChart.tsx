import React, { useMemo } from "react";
import { VendorHierarchyNode, VendorGranularity } from "@/lib/types";
import { buildVendorChartData } from "@/lib/business/vendorAnalysis";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface VendorHierarchyChartProps {
  title: string;
  hierarchyNodes: VendorHierarchyNode[];
  granularity: VendorGranularity;
  type: 'income' | 'expense';
}

const VendorHierarchyChart: React.FC<VendorHierarchyChartProps> = ({
  title,
  hierarchyNodes,
  granularity,
  type
}) => {
  const chartData = useMemo(() => {
    return buildVendorChartData(hierarchyNodes, granularity).slice(0, 10);
  }, [hierarchyNodes, granularity]);

  if (chartData.length === 0) {
    return null;
  }

  const barColor = type === 'expense' ? '#F59E0B' : '#10B981';

  const getGranularityDescription = () => {
    switch (granularity) {
      case 'consolidated':
        return 'Core vendor names';
      case 'standard':
        return 'IDs removed';
      case 'detailed':
        return 'Full original names';
      default:
        return 'Top 10 vendors';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {getGranularityDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ bottom: 80, left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="vendor"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Bar dataKey="total" fill={barColor} fillOpacity={0.65} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorHierarchyChart;
