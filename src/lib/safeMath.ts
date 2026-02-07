/**
 * Safe Math Utilities
 *
 * Provides mathematical operations with guards against:
 * - Division by zero
 * - NaN propagation
 * - Infinity values
 * - Floating point precision issues
 *
 * Use these utilities for all financial calculations to ensure accuracy.
 */

/**
 * Safely divide two numbers, returning a fallback value if denominator is zero
 * or would produce invalid result
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback: number = 0
): number {
  // Check for zero, NaN, or Infinity in denominator
  if (
    denominator === 0 ||
    !isFinite(denominator) ||
    isNaN(denominator)
  ) {
    return fallback;
  }

  // Check for NaN in numerator
  if (isNaN(numerator)) {
    return fallback;
  }

  const result = numerator / denominator;

  // Check if result is valid
  if (!isFinite(result) || isNaN(result)) {
    return fallback;
  }

  return result;
}

/**
 * Calculate percentage with safety guards
 * Returns percentage as a number (e.g., 25.5 for 25.5%)
 */
export function safePercentage(
  value: number,
  total: number,
  fallback: number = 0
): number {
  return safeDivide(value, total, fallback / 100) * 100;
}

/**
 * Calculate percentage change between two values
 * Returns percentage change (e.g., 10 for +10% increase)
 */
export function safePercentageChange(
  newValue: number,
  oldValue: number,
  fallback: number = 0
): number {
  if (oldValue === 0) {
    // Special case: if old value is 0, can't calculate percentage change
    if (newValue === 0) return 0;
    // If new value is non-zero and old was zero, return fallback
    return fallback;
  }

  return safeDivide(newValue - oldValue, Math.abs(oldValue), fallback) * 100;
}

/**
 * Sum an array of numbers with validation
 * Skips NaN and Infinity values
 */
export function safeSum(values: number[]): number {
  return values.reduce((sum, value) => {
    if (isFinite(value) && !isNaN(value)) {
      return sum + value;
    }
    return sum;
  }, 0);
}

/**
 * Calculate average with safety guards
 */
export function safeAverage(values: number[], fallback: number = 0): number {
  const validValues = values.filter(v => isFinite(v) && !isNaN(v));

  if (validValues.length === 0) {
    return fallback;
  }

  return safeSum(validValues) / validValues.length;
}

/**
 * Calculate median with safety guards
 */
export function safeMedian(values: number[], fallback: number = 0): number {
  const validValues = values.filter(v => isFinite(v) && !isNaN(v));

  if (validValues.length === 0) {
    return fallback;
  }

  const sorted = [...validValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Round currency to 2 decimal places with proper rounding
 * Handles floating point precision issues
 */
export function roundCurrency(amount: number): number {
  if (!isFinite(amount) || isNaN(amount)) {
    return 0;
  }

  // Use Math.round to avoid floating point errors
  // Multiply by 100, round, divide by 100
  return Math.round(amount * 100) / 100;
}

/**
 * Compare two currency amounts with tolerance for floating point errors
 * Returns true if amounts are equal within 0.01 (one cent)
 */
export function currencyEquals(amount1: number, amount2: number): boolean {
  if (!isFinite(amount1) || !isFinite(amount2)) {
    return false;
  }

  const difference = Math.abs(amount1 - amount2);
  return difference < 0.01; // Within one cent
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  if (isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate coefficient of variation with safety guards
 * Returns value between 0 and 1 (or fallback if invalid)
 */
export function safeCoefficientOfVariation(
  values: number[],
  fallback: number = 0
): number {
  const validValues = values.filter(v => isFinite(v) && !isNaN(v));

  if (validValues.length < 2) {
    return fallback;
  }

  const mean = safeAverage(validValues);
  if (mean === 0) {
    return fallback;
  }

  // Calculate standard deviation
  const squaredDiffs = validValues.map(v => Math.pow(v - mean, 2));
  const variance = safeAverage(squaredDiffs);
  const stdDev = Math.sqrt(variance);

  return safeDivide(stdDev, Math.abs(mean), fallback);
}

/**
 * Calculate standard deviation with safety guards
 */
export function safeStandardDeviation(
  values: number[],
  fallback: number = 0
): number {
  const validValues = values.filter(v => isFinite(v) && !isNaN(v));

  if (validValues.length < 2) {
    return fallback;
  }

  const mean = safeAverage(validValues);
  const squaredDiffs = validValues.map(v => Math.pow(v - mean, 2));
  const variance = safeAverage(squaredDiffs);

  return Math.sqrt(variance);
}

/**
 * Validate that a number is a valid financial amount
 */
export function isValidAmount(amount: number): boolean {
  return isFinite(amount) && !isNaN(amount);
}

/**
 * Ensure a value is a valid number, returning fallback if not
 */
export function ensureNumber(value: any, fallback: number = 0): number {
  const num = Number(value);
  return isValidAmount(num) ? num : fallback;
}

/**
 * Calculate linear regression with safety guards
 * Returns slope, intercept, and R-squared, or null if insufficient data
 */
export function safeLinearRegression(
  xValues: number[],
  yValues: number[]
): { slope: number; intercept: number; rSquared: number } | null {
  const n = xValues.length;

  // Need at least 2 points for regression
  if (n < 2 || xValues.length !== yValues.length) {
    return null;
  }

  // Validate all values
  const validData = xValues.every((x, i) => isValidAmount(x) && isValidAmount(yValues[i]));
  if (!validData) {
    return null;
  }

  const sumX = safeSum(xValues);
  const sumY = safeSum(yValues);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const denominator = n * sumXX - sumX * sumX;

  // Check if all x values are essentially the same (denominator near zero)
  if (Math.abs(denominator) < 1e-10) {
    // Return horizontal line at mean y
    const yMean = sumY / n;
    return {
      slope: 0,
      intercept: yMean,
      rSquared: 0
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);

  // Avoid division by zero in R-squared calculation
  if (Math.abs(ssTotal) < 1e-10) {
    // All y values are the same
    return { slope: 0, intercept: yMean, rSquared: 1 };
  }

  const ssResidual = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);

  const rSquared = clamp(1 - (ssResidual / ssTotal), 0, 1);

  return { slope, intercept, rSquared };
}
