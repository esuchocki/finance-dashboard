import { BusinessTransaction } from '@/lib/types';
import { safeLinearRegression, safeDivide, roundCurrency } from '@/lib/safeMath';
import { isValidDate } from '@/lib/dateUtils';

/**
 * Calculate moving average for time series data
 */
export function calculateMovingAverage(
  data: Array<{ date: Date; value: number }>,
  windowSize: number = 7
): Array<{ date: Date; value: number; ma: number }> {
  const result: Array<{ date: Date; value: number; ma: number }> = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const ma = window.reduce((sum, d) => sum + d.value, 0) / window.length;

    result.push({
      date: data[i].date,
      value: data[i].value,
      ma
    });
  }

  return result;
}

/**
 * Calculate linear regression for trend line
 */
export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
}

export function calculateLinearRegression(
  data: Array<{ date: Date; value: number }>
): RegressionResult {
  const n = data.length;
  if (n === 0) {
    return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };
  }

  // Validate all dates
  const validData = data.filter(d => isValidDate(d.date) && isFinite(d.value));
  if (validData.length < 2) {
    return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };
  }

  // Convert dates to numeric x values (days since first date)
  const baseTime = validData[0].date.getTime();
  const xValues = validData.map(d =>
    (d.date.getTime() - baseTime) / (1000 * 60 * 60 * 24)
  );
  const yValues = validData.map(d => d.value);

  // Use safe linear regression
  const result = safeLinearRegression(xValues, yValues);

  if (result === null) {
    return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };
  }

  return {
    slope: result.slope,
    intercept: result.intercept,
    r2: result.rSquared,
    predict: (x: number) => result.slope * x + result.intercept
  };
}

/**
 * Analyze cashflow trends
 */
export interface CashflowTrend {
  daily: Array<{ date: Date; income: number; expenses: number; net: number; ma: number }>;
  monthly: Array<{ month: string; income: number; expenses: number; net: number }>;
  regression: RegressionResult;
  trend: 'improving' | 'declining' | 'stable';
  averageMonthlyNet: number;
}

export function analyzeCashflowTrends(
  transactions: BusinessTransaction[]
): CashflowTrend {
  if (transactions.length === 0) {
    return {
      daily: [],
      monthly: [],
      regression: { slope: 0, intercept: 0, r2: 0, predict: () => 0 },
      trend: 'stable',
      averageMonthlyNet: 0
    };
  }

  // Sort by date
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate daily cashflow
  const dailyMap = new Map<string, { income: number; expenses: number }>();

  sorted.forEach(tx => {
    const dateKey = tx.date.toISOString().split('T')[0];
    const current = dailyMap.get(dateKey) || { income: 0, expenses: 0 };

    if (tx.categoryType === 'income') {
      current.income += tx.amount;
    } else if (tx.categoryType === 'expense') {
      current.expenses += tx.amount;
    }

    dailyMap.set(dateKey, current);
  });

  // Convert to array and add moving average
  const dailyData = Array.from(dailyMap.entries())
    .map(([dateStr, data]) => ({
      date: new Date(dateStr),
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
      ma: 0
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate 7-day moving average
  const withMA = calculateMovingAverage(
    dailyData.map(d => ({ date: d.date, value: d.net })),
    7
  );

  const daily = dailyData.map((d, i) => ({
    ...d,
    ma: withMA[i]?.ma || 0
  }));

  // Calculate monthly cashflow
  const monthlyMap = new Map<string, { income: number; expenses: number }>();

  sorted.forEach(tx => {
    const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
    const current = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };

    if (tx.categoryType === 'income') {
      current.income += tx.amount;
    } else if (tx.categoryType === 'expense') {
      current.expenses += tx.amount;
    }

    monthlyMap.set(monthKey, current);
  });

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Calculate regression on net cashflow
  const regression = calculateLinearRegression(
    daily.map(d => ({ date: d.date, value: d.net }))
  );

  // Determine trend
  let trend: 'improving' | 'declining' | 'stable';
  if (regression.slope > 10) {
    trend = 'improving';
  } else if (regression.slope < -10) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // Calculate average monthly net
  const averageMonthlyNet = monthly.length > 0
    ? roundCurrency(safeDivide(
        monthly.reduce((sum, m) => sum + m.net, 0),
        monthly.length,
        0
      ))
    : 0;

  return {
    daily,
    monthly,
    regression,
    trend,
    averageMonthlyNet
  };
}

/**
 * Detect seasonality patterns
 */
export interface SeasonalityAnalysis {
  byMonth: Record<string, { avgIncome: number; avgExpenses: number; count: number }>;
  byQuarter: Record<string, { avgIncome: number; avgExpenses: number; count: number }>;
  peakMonth: string;
  lowMonth: string;
}

export function analyzeSeasonality(
  transactions: BusinessTransaction[]
): SeasonalityAnalysis {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const byMonth: Record<string, { totalIncome: number; totalExpenses: number; count: number }> = {};
  monthNames.forEach(month => {
    byMonth[month] = { totalIncome: 0, totalExpenses: 0, count: 0 };
  });

  const byQuarter: Record<string, { totalIncome: number; totalExpenses: number; count: number }> = {
    'Q1': { totalIncome: 0, totalExpenses: 0, count: 0 },
    'Q2': { totalIncome: 0, totalExpenses: 0, count: 0 },
    'Q3': { totalIncome: 0, totalExpenses: 0, count: 0 },
    'Q4': { totalIncome: 0, totalExpenses: 0, count: 0 }
  };

  transactions.forEach(tx => {
    const monthIndex = tx.date.getMonth();
    const monthName = monthNames[monthIndex];
    const quarter = `Q${Math.floor(monthIndex / 3) + 1}`;

    if (tx.categoryType === 'income') {
      byMonth[monthName].totalIncome += tx.amount;
      byQuarter[quarter].totalIncome += tx.amount;
    } else if (tx.categoryType === 'expense') {
      byMonth[monthName].totalExpenses += tx.amount;
      byQuarter[quarter].totalExpenses += tx.amount;
    }

    byMonth[monthName].count++;
    byQuarter[quarter].count++;
  });

  // Calculate averages
  const monthAvgs = Object.entries(byMonth).reduce((acc, [month, data]) => {
    acc[month] = {
      avgIncome: data.count > 0 ? data.totalIncome / data.count : 0,
      avgExpenses: data.count > 0 ? data.totalExpenses / data.count : 0,
      count: data.count
    };
    return acc;
  }, {} as Record<string, { avgIncome: number; avgExpenses: number; count: number }>);

  const quarterAvgs = Object.entries(byQuarter).reduce((acc, [quarter, data]) => {
    acc[quarter] = {
      avgIncome: data.count > 0 ? data.totalIncome / data.count : 0,
      avgExpenses: data.count > 0 ? data.totalExpenses / data.count : 0,
      count: data.count
    };
    return acc;
  }, {} as Record<string, { avgIncome: number; avgExpenses: number; count: number }>);

  // Find peak and low months
  const monthsWithData = Object.entries(monthAvgs)
    .filter(([_, data]) => data.count > 0)
    .map(([month, data]) => ({
      month,
      netAvg: roundCurrency(data.avgIncome - data.avgExpenses)
    }))
    .sort((a, b) => b.netAvg - a.netAvg);

  const peakMonth = monthsWithData[0]?.month || 'January';
  const lowMonth = monthsWithData[monthsWithData.length - 1]?.month || 'December';

  return {
    byMonth: monthAvgs,
    byQuarter: quarterAvgs,
    peakMonth,
    lowMonth
  };
}

/**
 * Calculate confidence intervals for forecasting
 */
export interface ForecastWithConfidence {
  date: Date;
  predicted: number;
  lower: number; // 95% confidence interval lower bound
  upper: number; // 95% confidence interval upper bound
}

export function calculateForecast(
  historicalData: Array<{ date: Date; value: number }>,
  daysAhead: number = 30
): ForecastWithConfidence[] {
  // Need at least 3 data points for meaningful forecast with standard error
  if (historicalData.length < 3) return [];

  // Validate all dates
  const validData = historicalData.filter(d => isValidDate(d.date) && isFinite(d.value));
  if (validData.length < 3) return [];

  const regression = calculateLinearRegression(validData);

  // Calculate standard error
  const baseTime = validData[0].date.getTime();
  const residuals = validData.map((d, i) => {
    const x = (d.date.getTime() - baseTime) / (1000 * 60 * 60 * 24);
    const predicted = regression.predict(x);
    return d.value - predicted;
  });

  // Standard error calculation requires n >= 3 for (n-2) denominator
  const n = validData.length;
  const sumSquaredResiduals = residuals.reduce((sum, r) => sum + r * r, 0);
  const standardError = Math.sqrt(safeDivide(sumSquaredResiduals, n - 2, 0));

  // Generate forecast
  const lastDate = historicalData[historicalData.length - 1].date;
  const lastX = (lastDate.getTime() - baseTime) / (1000 * 60 * 60 * 24);

  const forecast: ForecastWithConfidence[] = [];

  for (let i = 1; i <= daysAhead; i++) {
    const futureX = lastX + i;
    const predicted = regression.predict(futureX);

    // 95% confidence interval (approximately ±2 standard errors)
    const margin = 1.96 * standardError;

    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);

    forecast.push({
      date: futureDate,
      predicted,
      lower: predicted - margin,
      upper: predicted + margin
    });
  }

  return forecast;
}
