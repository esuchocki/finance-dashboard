import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { FunctionalExpenses } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";

interface FunctionalExpenseChartProps {
  functionalExpenses: FunctionalExpenses;
}

const COLORS = {
  program: '#10B981', // Green
  management: '#F59E0B', // Amber
  fundraising: '#8B5CF6' // Purple
};

const FunctionalExpenseChart: React.FC<FunctionalExpenseChartProps> = ({ functionalExpenses }) => {
  const data = [
    { name: 'Program Services', value: functionalExpenses.programServices, color: COLORS.program },
    { name: 'Management & General', value: functionalExpenses.managementGeneral, color: COLORS.management },
    { name: 'Fundraising', value: functionalExpenses.fundraising, color: COLORS.fundraising },
  ].filter(item => item.value > 0);

  const programRatio = (functionalExpenses.programServices / functionalExpenses.total) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Functional Expense Breakdown</CardTitle>
        <CardDescription>
          FASB-compliant expense classification • Target: 70%+ Program Services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Program Expense Ratio: <span className={`font-bold ${programRatio >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
              {programRatio.toFixed(1)}%
            </span>
            {programRatio >= 70 ? ' ✓ Meets standard' : ' Below 70% target'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FunctionalExpenseChart;
