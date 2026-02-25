import { MONTH_NAMES } from './kclTypes';

export function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtPct(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

export function fmtMonth(m: number): string {
  return MONTH_NAMES[m] ?? String(m);
}
