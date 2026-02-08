import { BusinessTransaction } from '@/lib/types';
import { EnhancedRecurringPattern, PatternType } from './enhancedPatternAnalysis';
import { roundCurrency } from '@/lib/safeMath';

/**
 * Donor Analysis for Fundraising and Outreach Teams
 *
 * Groups transactions by donor name to identify engagement patterns,
 * lapsed donors, and outreach opportunities.
 */

export interface DonorProfile {
  donorName: string;
  accountName: string;

  // Giving history
  firstGiftDate: Date;
  lastGiftDate: Date;
  totalGiven: number;
  giftCount: number;
  averageGiftAmount: number;

  // Pattern analysis
  patternType: PatternType | null; // 'regular', 'sporadic', or null if no pattern
  pattern: EnhancedRecurringPattern | null; // Full pattern details if available

  // Status
  status: 'active-regular' | 'active-sporadic' | 'lapsed' | 'one-time';
  daysSinceLastGift: number;

  // Engagement insights
  givingTrend: 'increasing' | 'decreasing' | 'stable';
  isLapsed: boolean;
  lapsedDays?: number; // Days since expected next gift

  // Raw data
  transactions: BusinessTransaction[];
}

export interface DonorSegment {
  name: string;
  description: string;
  donors: DonorProfile[];
  totalDonors: number;
  totalRevenue: number;
  averageGiftSize: number;
}

/**
 * Build donor profiles from transactions and patterns
 */
export function analyzeDonors(
  transactions: BusinessTransaction[],
  patterns: EnhancedRecurringPattern[],
  accountLastDates: Map<string, Date>
): DonorProfile[] {
  // Group transactions by donor name
  const donorGroups = new Map<string, BusinessTransaction[]>();

  transactions.forEach(tx => {
    const donorKey = normalizeDonorName(tx.name || tx.payee || 'Anonymous');
    const group = donorGroups.get(donorKey) || [];
    group.push(tx);
    donorGroups.set(donorKey, group);
  });

  // Create pattern lookup map
  const patternMap = new Map<string, EnhancedRecurringPattern>();
  patterns.forEach(pattern => {
    const normalizedName = normalizeDonorName(pattern.merchantName);
    patternMap.set(normalizedName, pattern);
  });

  const profiles: DonorProfile[] = [];

  donorGroups.forEach((txs, donorName) => {
    // Skip if only one transaction and no pattern
    const normalizedName = normalizeDonorName(donorName);
    const pattern = patternMap.get(normalizedName);

    if (txs.length === 1 && !pattern) {
      // One-time donor
      const tx = txs[0];
      const accountName = tx.accountName || 'Unknown Account';
      const accountReferenceDate = accountLastDates.get(accountName) || new Date();
      const daysSinceLastGift = (accountReferenceDate.getTime() - tx.date.getTime()) / (1000 * 60 * 60 * 24);

      profiles.push({
        donorName,
        accountName,
        firstGiftDate: tx.date,
        lastGiftDate: tx.date,
        totalGiven: tx.amount,
        giftCount: 1,
        averageGiftAmount: tx.amount,
        patternType: null,
        pattern: null,
        status: 'one-time',
        daysSinceLastGift: Math.round(daysSinceLastGift),
        givingTrend: 'stable',
        isLapsed: false,
        transactions: txs
      });
      return;
    }

    // Multi-time donor
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstGiftDate = sorted[0].date;
    const lastGiftDate = sorted[sorted.length - 1].date;
    const totalGiven = roundCurrency(sorted.reduce((sum, tx) => sum + tx.amount, 0));
    const giftCount = sorted.length;
    const averageGiftAmount = roundCurrency(totalGiven / giftCount);
    const accountName = sorted[0].accountName || 'Unknown Account';
    const accountReferenceDate = accountLastDates.get(accountName) || new Date();
    const daysSinceLastGift = (accountReferenceDate.getTime() - lastGiftDate.getTime()) / (1000 * 60 * 60 * 24);

    // Determine status
    let status: DonorProfile['status'];
    let isLapsed = false;
    let lapsedDays: number | undefined;

    if (pattern) {
      if (pattern.isActive) {
        status = pattern.patternType === 'regular' ? 'active-regular' : 'active-sporadic';
      } else {
        // Pattern was detected but is now inactive (lapsed)
        status = 'lapsed';
        isLapsed = true;
        const expectedDate = pattern.nextExpectedDate;
        lapsedDays = Math.round((accountReferenceDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    } else {
      // No pattern detected, but multiple gifts
      status = 'active-sporadic';
    }

    // Analyze giving trend
    let givingTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (pattern && pattern.trend) {
      givingTrend = pattern.trend.direction;
    } else if (giftCount >= 3) {
      // Simple trend: compare first half to second half
      const midpoint = Math.floor(giftCount / 2);
      const firstHalfAvg = sorted.slice(0, midpoint).reduce((sum, tx) => sum + tx.amount, 0) / midpoint;
      const secondHalfAvg = sorted.slice(midpoint).reduce((sum, tx) => sum + tx.amount, 0) / (giftCount - midpoint);
      const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

      if (changePercent > 10) {
        givingTrend = 'increasing';
      } else if (changePercent < -10) {
        givingTrend = 'decreasing';
      }
    }

    profiles.push({
      donorName,
      accountName,
      firstGiftDate,
      lastGiftDate,
      totalGiven,
      giftCount,
      averageGiftAmount,
      patternType: pattern ? pattern.patternType : null,
      pattern,
      status,
      daysSinceLastGift: Math.round(daysSinceLastGift),
      givingTrend,
      isLapsed,
      lapsedDays,
      transactions: sorted
    });
  });

  // Sort by total given (descending)
  return profiles.sort((a, b) => b.totalGiven - a.totalGiven);
}

/**
 * Segment donors for targeted outreach
 */
export function segmentDonors(profiles: DonorProfile[]): DonorSegment[] {
  const segments: DonorSegment[] = [];

  // Regular Monthly Donors (most valuable for forecasting)
  const regularDonors = profiles.filter(p => p.status === 'active-regular');
  if (regularDonors.length > 0) {
    segments.push({
      name: 'Regular Monthly Donors',
      description: 'Reliable recurring donors with predictable giving patterns',
      donors: regularDonors,
      totalDonors: regularDonors.length,
      totalRevenue: roundCurrency(regularDonors.reduce((sum, d) => sum + d.totalGiven, 0)),
      averageGiftSize: roundCurrency(regularDonors.reduce((sum, d) => sum + d.averageGiftAmount, 0) / regularDonors.length)
    });
  }

  // Lapsed Donors (re-engagement opportunity)
  const lapsedDonors = profiles.filter(p => p.isLapsed);
  if (lapsedDonors.length > 0) {
    segments.push({
      name: 'Lapsed Donors',
      description: 'Previously recurring donors who have stopped giving - prime for re-engagement',
      donors: lapsedDonors.sort((a, b) => (b.lapsedDays || 0) - (a.lapsedDays || 0)),
      totalDonors: lapsedDonors.length,
      totalRevenue: roundCurrency(lapsedDonors.reduce((sum, d) => sum + d.totalGiven, 0)),
      averageGiftSize: roundCurrency(lapsedDonors.reduce((sum, d) => sum + d.averageGiftAmount, 0) / lapsedDonors.length)
    });
  }

  // Sporadic Multi-Time Donors (cultivation opportunity)
  const sporadicDonors = profiles.filter(p =>
    p.status === 'active-sporadic' && p.giftCount >= 2
  );
  if (sporadicDonors.length > 0) {
    segments.push({
      name: 'Sporadic Multi-Time Donors',
      description: 'Engaged donors without regular patterns - opportunity to cultivate into monthly giving',
      donors: sporadicDonors,
      totalDonors: sporadicDonors.length,
      totalRevenue: roundCurrency(sporadicDonors.reduce((sum, d) => sum + d.totalGiven, 0)),
      averageGiftSize: roundCurrency(sporadicDonors.reduce((sum, d) => sum + d.averageGiftAmount, 0) / sporadicDonors.length)
    });
  }

  // Major Donors (top 10% by total given, excluding regular monthly)
  const nonRegularDonors = profiles.filter(p => p.status !== 'active-regular');
  const sortedByTotal = [...nonRegularDonors].sort((a, b) => b.totalGiven - a.totalGiven);
  const top10Percent = Math.max(1, Math.ceil(sortedByTotal.length * 0.1));
  const majorDonors = sortedByTotal.slice(0, top10Percent);
  if (majorDonors.length > 0) {
    segments.push({
      name: 'Major Donors',
      description: 'Top 10% by total lifetime giving - high-value cultivation prospects',
      donors: majorDonors,
      totalDonors: majorDonors.length,
      totalRevenue: roundCurrency(majorDonors.reduce((sum, d) => sum + d.totalGiven, 0)),
      averageGiftSize: roundCurrency(majorDonors.reduce((sum, d) => sum + d.averageGiftAmount, 0) / majorDonors.length)
    });
  }

  // Increasing Trend Donors (engagement growing)
  const increasingDonors = profiles.filter(p =>
    p.givingTrend === 'increasing' && p.giftCount >= 3 && !p.isLapsed
  );
  if (increasingDonors.length > 0) {
    segments.push({
      name: 'Growing Engagement',
      description: 'Donors showing increasing gift amounts over time - strong cultivation prospects',
      donors: increasingDonors,
      totalDonors: increasingDonors.length,
      totalRevenue: roundCurrency(increasingDonors.reduce((sum, d) => sum + d.totalGiven, 0)),
      averageGiftSize: roundCurrency(increasingDonors.reduce((sum, d) => sum + d.averageGiftAmount, 0) / increasingDonors.length)
    });
  }

  return segments;
}

/**
 * Normalize donor names for consistent grouping
 * Handles PayPal name variations
 */
function normalizeDonorName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^(payment from|donation from|transfer from|gift from)\s*/i, '') // Remove prefixes
    .replace(/\s*-\s*paypal$/i, '') // Remove PayPal suffix
    .replace(/\s*\(\d+\)$/, ''); // Remove trailing numbers like (2)
}

/**
 * Get donor-centric summary statistics
 */
export function getDonorSummaryStats(profiles: DonorProfile[]): {
  totalDonors: number;
  regularDonors: number;
  sporadicDonors: number;
  lapsedDonors: number;
  oneTimeDonors: number;
  totalRevenue: number;
  averageLifetimeValue: number;
  retentionRate: number;
} {
  const totalDonors = profiles.length;
  const regularDonors = profiles.filter(p => p.status === 'active-regular').length;
  const sporadicDonors = profiles.filter(p => p.status === 'active-sporadic').length;
  const lapsedDonors = profiles.filter(p => p.isLapsed).length;
  const oneTimeDonors = profiles.filter(p => p.status === 'one-time').length;

  const totalRevenue = roundCurrency(profiles.reduce((sum, p) => sum + p.totalGiven, 0));
  const averageLifetimeValue = totalDonors > 0 ? roundCurrency(totalRevenue / totalDonors) : 0;

  // Retention rate: (active donors) / (active + lapsed)
  const activeDonors = regularDonors + sporadicDonors;
  const repeatDonors = activeDonors + lapsedDonors;
  const retentionRate = repeatDonors > 0 ? (activeDonors / repeatDonors) * 100 : 100;

  return {
    totalDonors,
    regularDonors,
    sporadicDonors,
    lapsedDonors,
    oneTimeDonors,
    totalRevenue,
    averageLifetimeValue,
    retentionRate: Math.round(retentionRate * 10) / 10
  };
}
