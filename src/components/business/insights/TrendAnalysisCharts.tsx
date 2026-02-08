import React, { useMemo } from "react";
import { BusinessTransaction } from "@/lib/types";
import { analyzeCashflowTrends, analyzeSeasonality, calculateForecast } from "@/lib/business/trendAnalysis";
import { analyzeTransactionFrequency } from "@/lib/business/transactionAnalysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

interface TrendAnalysisChartsProps {
  transactions: BusinessTransaction[];
}

const TrendAnalysisCharts: React.FC<TrendAnalysisChartsProps> = ({ transactions }) => {
  const trendData = useMemo(() => {
    if (transactions.length === 0) return null;

    const cashflowTrend = analyzeCashflowTrends(transactions);
    const seasonality = analyzeSeasonality(transactions);
    const frequency = analyzeTransactionFrequency(transactions);

    // Prepare data for charts
    const last30Days = cashflowTrend.daily.slice(-30);
    const forecast = calculateForecast(
      cashflowTrend.daily.map(d => ({ date: d.date, value: d.net })),
      14
    );

    return {
      cashflowTrend,
      seasonality,
      frequency,
      last30Days,
      forecast
    };
  }, [transactions]);

  if (!trendData) {
    return null;
  }

  const getTrendIcon = () => {
    switch (trendData.cashflowTrend.trend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (trendData.cashflowTrend.trend) {
      case 'improving':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declining':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Prepare chart data
  const cashflowChartData = trendData.last30Days.map(d => ({
    date: d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    net: d.net,
    ma: d.ma,
    income: d.income,
    expenses: -d.expenses
  }));

  const monthlyChartData = trendData.cashflowTrend.monthly.map(m => ({
    month: m.month,
    income: m.income,
    expenses: m.expenses,
    net: m.net
  }));

  const seasonalityData = Object.entries(trendData.seasonality.byMonth)
    .map(([month, data]) => ({
      month: month.substring(0, 3),
      income: data.avgIncome,
      expenses: data.avgExpenses,
      net: data.avgIncome - data.avgExpenses
    }));

  // Group transactions by account and calculate frequency per account
  const accountFrequencyData = useMemo(() => {
    const accountGroups = new Map<string, BusinessTransaction[]>();

    transactions.forEach(tx => {
      const accountKey = tx.accountName || tx.accountId || 'Unknown';
      if (!accountGroups.has(accountKey)) {
        accountGroups.set(accountKey, []);
      }
      accountGroups.get(accountKey)!.push(tx);
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayData: any[] = dayNames.map(day => ({ day: day.substring(0, 3) }));

    accountGroups.forEach((txs, accountName) => {
      const freq = analyzeTransactionFrequency(txs);
      dayNames.forEach((day, idx) => {
        dayData[idx][accountName] = freq.byDayOfWeek[day] || 0;
      });
    });

    return {
      data: dayData,
      accounts: Array.from(accountGroups.keys())
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Trend Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <CardTitle>Cashflow Trend Analysis</CardTitle>
            </div>
            <Badge variant="outline" className={getTrendColor()}>
              {trendData.cashflowTrend.trend}
            </Badge>
          </div>
          <CardDescription>
            Mathematical trend analysis with linear regression (R² = {trendData.cashflowTrend.regression.r2.toFixed(3)})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Slope</p>
              <p className="text-lg font-semibold">
                {trendData.cashflowTrend.regression.slope > 0 ? '+' : ''}
                {formatCurrency(trendData.cashflowTrend.regression.slope)}/day
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Monthly Net</p>
              <p className="text-lg font-semibold">
                {formatCurrency(trendData.cashflowTrend.averageMonthlyNet)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Peak Month</p>
              <p className="text-lg font-semibold">
                {trendData.seasonality.peakMonth}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Month</p>
              <p className="text-lg font-semibold">
                {trendData.seasonality.lowMonth}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Cashflow Chart with Moving Average */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Daily Cashflow Trend (Last 30 Days)</CardTitle>
          </div>
          <CardDescription>
            Net cashflow with 7-day moving average to smooth daily volatility and reveal underlying trends.
            The moving average reduces noise from irregular transactions, making it easier to identify
            directional patterns and trend reversals in your cashflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashflowChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#8884d8"
                strokeWidth={1}
                dot={false}
                name="Daily Net"
              />
              <Line
                type="monotone"
                dataKey="ma"
                stroke="#ff7300"
                strokeWidth={2}
                dot={false}
                name="7-Day MA"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Cashflow Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Monthly Cashflow</CardTitle>
          </div>
          <CardDescription>
            Income, expenses, and net cashflow by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10b981" fillOpacity={0.65} name="Income" />
              <Bar dataKey="expenses" fill="#f59e0b" fillOpacity={0.65} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Seasonality Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Patterns</CardTitle>
          <CardDescription>
            Average monthly income and expenses showing seasonal trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={seasonalityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Avg Income"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stackId="2"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.6}
                name="Avg Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Frequency by Day of Week */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Frequency by Day</CardTitle>
          <CardDescription>
            Showing transaction patterns across {accountFrequencyData.accounts.length} account{accountFrequencyData.accounts.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={accountFrequencyData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip labelStyle={{ color: '#000' }} />
              <Legend />
              {accountFrequencyData.accounts.map((accountName, idx) => {
                const colors = [
                  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
                  '#06b6d4', '#14b8a6', '#f97316', '#a855f7', '#ef4444'
                ];
                const color = colors[idx % colors.length];
                return (
                  <Area
                    key={accountName}
                    type="monotone"
                    dataKey={accountName}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.3}
                    name={accountName}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendAnalysisCharts;
