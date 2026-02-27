import type {
  GlTransaction,
  ProgramEntry,
  ProgramRevenueEntry,
  ArEntry,
  RoomBookingEntry,
  KclProgramPnL,
  KclProgramCategory,
  KclParticipantDetail,
} from './kclTypes';
import {
  PROG_CATEGORY_LABELS,
  strictYearFilter,
  txnYear,
  dimOf,
  shiftDate,
  daySpan,
} from './kclComputeUtils';

// ─── Per-program contribution margin ─────────────────────────────────────────

export function computeProgramPnL(
  year: number,
  programRevenue: ProgramRevenueEntry[],
  programCatalog: ProgramEntry[],
  glTransactions: GlTransaction[],
  ccFeeRate: number,
  utilityMonthly: Record<number, number>,
  utilityBaselinePerDay: number,
  totalParticipantDays: number,
  totalExpenses: number,
  arEntries: ArEntry[],
  roomBookings: RoomBookingEntry[],
): KclProgramPnL[] {

  const yr     = String(year);
  const yrNext = String(year + 1);

  // ── 1. Participant-days by programId from catalog ─────────────────────────
  const pdByProgramId: Record<string, number> = {};
  for (const p of programCatalog) {
    if (!strictYearFilter(p.startDate, p.endDate, year)) continue;
    if (p.programId) pdByProgramId[p.programId] = (pdByProgramId[p.programId] ?? 0) + p.participantDays;
  }

  // ── 2. Eligible PnL programs ──────────────────────────────────────────────
  const eligibleRevenue = programRevenue.filter(
    r => strictYearFilter(r.startDate, r.endDate, year) && (r.totalRevenue > 0 || r.registrations > 0)
  );

  // Set of program IDs that appear in revenue — used to exclude non-revenue residential.
  const revenueIds = new Set(eligibleRevenue.map(r => r.programId).filter(Boolean));

  // ── 3. Food marginal rate (GL 5200) ───────────────────────────────────────
  const foodMonthly: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) foodMonthly[m] = 0;
  for (const t of glTransactions) {
    if (txnYear(t) !== year || t.accountCode !== '5200') continue;
    const m = parseInt(t.date.substring(5, 7), 10);
    if (m >= 1 && m <= 12) foodMonthly[m] += t.debit - t.credit;
  }
  const foodTotal = Object.values(foodMonthly).reduce((a, b) => a + b, 0);

  // Baseline: average daily rate of the 3 lowest-spend months
  const foodDailyByMonth = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      return [m, dimOf(year, m) > 0 ? foodMonthly[m] / dimOf(year, m) : 0];
    })
  );
  const sortedByRate = Array.from({ length: 12 }, (_, i) => i + 1)
    .sort((a, b) => foodDailyByMonth[a] - foodDailyByMonth[b]);
  const baselineMonths    = sortedByRate.slice(0, 3);
  const foodBaselinePerDay = baselineMonths.reduce((s, m) => s + foodDailyByMonth[m], 0) / 3;
  const foodMarginalTotal  = Math.max(0, foodTotal - foodBaselinePerDay * 365);

  // Non-CABN participant-days for food marginal rate denominator.
  // Exclude non-revenue residential tracking programs (same logic as computeParticipantDays).
  const nonCabnPartDays = programCatalog
    .filter(p =>
      strictYearFilter(p.startDate, p.endDate, year) &&
      (p.categoryCode ?? '').trim().toUpperCase() !== 'CABN' &&
      !(p.isResidential && !revenueIds.has(p.programId))
    )
    .reduce((s, p) => s + p.participantDays, 0);
  const foodMarginalRate = nonCabnPartDays > 0 ? foodMarginalTotal / nonCabnPartDays : 0;

  // ── 4. Teacher first-claim attribution (REG only, not CABN/IHR) ───────────
  const teacherTxns = glTransactions
    .filter(t => txnYear(t) === year && ['5250', '5300', '5350'].includes(t.accountCode))
    .map(t => ({ date: t.date, amount: t.debit - t.credit, claimed: false }));

  const teacherCostById: Record<string, number> = {};
  const regPrograms = [...eligibleRevenue]
    .filter(r => (r.categoryCode ?? '').trim().toUpperCase() === 'REG')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  for (const r of regPrograms) {
    const key = r.programId || r.programName;
    const clampedStart = r.startDate < `${yr}-01-01` ? `${yr}-01-01` : r.startDate;
    const clampedEnd   = r.endDate   > `${yr}-12-31` ? `${yr}-12-31` : r.endDate;
    const winStart = shiftDate(clampedStart, -7);
    const winEnd   = shiftDate(clampedEnd,    3);
    let cost = 0;
    for (const t of teacherTxns) {
      if (!t.claimed && t.date >= winStart && t.date <= winEnd) {
        cost += t.amount;
        t.claimed = true;
      }
    }
    teacherCostById[key] = cost;
  }

  const teacherClaimed = Object.values(teacherCostById).reduce((s, v) => s + v, 0);

  // ── 5. Scholarships (COGS-SCH, COGS-PC) — REG programs only ─────────────
  // Scholarship credits are issued to program participants, not year-round
  // residents or cabin retreatants. Attributed proportionally by REG revenue.
  const scholarshipTotal = glTransactions
    .filter(t => txnYear(t) === year && ['COGS - SCH', 'COGS - PC'].includes(t.accountCode))
    .reduce((s, t) => s + t.debit - t.credit, 0);
  const regRevenueTotal = regPrograms.reduce((s, r) => s + r.totalRevenue, 0);
  const schRate         = regRevenueTotal > 0 ? scholarshipTotal / regRevenueTotal : 0;

  // ── 6. Utility — proportional per-month marginal allocation ──────────────
  // For each calendar month, compute the above-baseline utility cost.
  // Distribute that month's marginal to programs proportionally by their
  // overlap days in that month. This ensures the sum of per-program utility
  // charges equals the total attributed marginal (no double-counting when
  // programs run concurrently).
  const monthMarginals: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    const dim      = dimOf(year, m);
    const dailyRate = dim > 0 ? (utilityMonthly[m] ?? 0) / dim : 0;
    monthMarginals[m] = Math.max(0, dailyRate - utilityBaselinePerDay) * dim;
  }

  // Exclusive overlap: days of [pStart, pEnd) that fall within month m.
  // pEnd is treated as exclusive (departure day not counted).
  function monthOverlapDays(pStart: string, pEnd: string, m: number): number {
    const mStr     = String(m).padStart(2, '0');
    const mStart   = `${yr}-${mStr}-01`;
    const mEndExcl = m < 12
      ? `${yr}-${String(m + 1).padStart(2, '0')}-01`
      : `${yrNext}-01-01`;
    const oStart = pStart > mStart   ? pStart   : mStart;
    const oEnd   = pEnd   < mEndExcl ? pEnd     : mEndExcl;
    if (oStart >= oEnd) return 0;
    return Math.round(
      (new Date(oEnd + 'T00:00:00Z').getTime() - new Date(oStart + 'T00:00:00Z').getTime()) / 86400000
    );
  }

  // Build per-program month overlap map (clamp to year boundaries).
  const programMonthOverlap: Record<string, Record<number, number>> = {};
  for (const r of eligibleRevenue) {
    if (!r.startDate || !r.endDate) continue;
    const key    = r.programId || r.programName;
    const pStart = r.startDate < `${yr}-01-01`      ? `${yr}-01-01`      : r.startDate;
    const pEnd   = r.endDate   > `${yrNext}-01-01`  ? `${yrNext}-01-01`  : r.endDate;
    const byMonth: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      const d = monthOverlapDays(pStart, pEnd, m);
      if (d > 0) byMonth[m] = d;
    }
    programMonthOverlap[key] = byMonth;
  }

  // Total overlap days per month across all programs.
  const totalMonthOverlap: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) totalMonthOverlap[m] = 0;
  for (const byMonth of Object.values(programMonthOverlap)) {
    for (const mStr of Object.keys(byMonth)) {
      totalMonthOverlap[+mStr] += byMonth[+mStr];
    }
  }

  // Only attribute marginals for months where at least one program runs.
  // Months with no program overlap have their marginal remain in overhead.
  let utilityMarginalTotal = 0;
  for (let m = 1; m <= 12; m++) {
    if (totalMonthOverlap[m] > 0) utilityMarginalTotal += monthMarginals[m];
  }

  // ── 7. Overhead pool ──────────────────────────────────────────────────────
  const omnisProgramTotal = eligibleRevenue.reduce((s, r) => s + r.totalRevenue, 0);
  const ccFeesAttributed  = ccFeeRate * omnisProgramTotal;

  const overheadPool = totalExpenses
    - foodMarginalTotal
    - teacherClaimed
    - ccFeesAttributed
    - scholarshipTotal
    - utilityMarginalTotal;
  const overheadPerPartDay = totalParticipantDays > 0 ? overheadPool / totalParticipantDays : 0;

  // ── 8. Participant lookup: AR joined to room bookings via registrationId ──
  const bookingByRegId: Record<string, RoomBookingEntry> = {};
  for (const b of roomBookings) {
    if (b.registrationId) bookingByRegId[b.registrationId] = b;
  }
  const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

  const arByNormName: Record<string, KclParticipantDetail[]> = {};
  for (const ar of arEntries) {
    const key = normName(ar.programName);
    if (!arByNormName[key]) arByNormName[key] = [];
    const booking = bookingByRegId[ar.registrationId];
    arByNormName[key].push({
      participantName: ar.participantName,
      totalCharged: ar.totalCharged,
      totalPaid: ar.totalPaid,
      outstanding: ar.outstanding,
      arrivalDate: booking?.arrivalDate ?? ar.startDate,
      departureDate: booking?.departureDate ?? ar.endDate,
      roomTypeDesc: booking?.roomTypeDesc,
    });
  }

  // ── 9. Build per-program records ──────────────────────────────────────────
  const results: KclProgramPnL[] = [];
  for (const r of eligibleRevenue) {
    const key          = r.programId || r.programName;
    const cat          = (r.categoryCode ?? '').trim().toUpperCase();
    const participantDays = pdByProgramId[r.programId ?? ''] ?? 0;
    const durationDays = r.startDate && r.endDate
      ? Math.max(1, daySpan(r.startDate, r.endDate))
      : 0;

    const teacherCost     = teacherCostById[key] ?? 0;
    const foodCost        = cat === 'CABN' ? 0 : foodMarginalRate * participantDays;
    const ccFees          = ccFeeRate * r.totalRevenue;
    const scholarshipCost = cat === 'REG' ? schRate * r.totalRevenue : 0;

    // Proportional share of each month's above-baseline utility.
    const byMonth = programMonthOverlap[key] ?? {};
    let utilityMarginal = 0;
    for (let m = 1; m <= 12; m++) {
      const progDays = byMonth[m] ?? 0;
      const totDays  = totalMonthOverlap[m];
      if (progDays > 0 && totDays > 0) {
        utilityMarginal += monthMarginals[m] * progDays / totDays;
      }
    }

    const overheadAlloc      = overheadPerPartDay * participantDays;
    const totalCosts         = teacherCost + foodCost + ccFees + scholarshipCost + utilityMarginal + overheadAlloc;
    const contributionMargin = r.totalRevenue - totalCosts;

    const participants = (arByNormName[normName(r.programName)] ?? [])
      .sort((a, b) => a.participantName.localeCompare(b.participantName));

    results.push({
      programId:          r.programId,
      name:               r.programName,
      categoryCode:       r.categoryCode,
      startDate:          r.startDate,
      endDate:            r.endDate,
      durationDays,
      registrations:      r.registrations,
      participantDays,
      revenue:            r.totalRevenue,
      costs: { teacherCost, foodCost, ccFees, scholarshipCost, utilityMarginal, overheadAlloc },
      totalCosts,
      contributionMargin,
      marginPct: r.totalRevenue > 0 ? contributionMargin / r.totalRevenue : 0,
      participants,
    });
  }

  return results.sort((a, b) => b.contributionMargin - a.contributionMargin);
}

// ─── Program category breakdown ───────────────────────────────────────────────

export function computeProgramCategories(
  catalog: ProgramEntry[],
  revenue: ProgramRevenueEntry[],
  year: number,
): KclProgramCategory[] {
  const cats: Record<string, {
    count: number; partDays: number; revenue: number; revenueCount: number; durationDays: number;
  }> = {};

  for (const p of catalog) {
    if (!strictYearFilter(p.startDate, p.endDate, year)) continue;
    const code = (p.categoryCode ?? '').trim().toUpperCase() || 'OTHER';
    if (!cats[code]) cats[code] = { count: 0, partDays: 0, revenue: 0, revenueCount: 0, durationDays: 0 };
    cats[code].count++;
    cats[code].partDays += p.participantDays;
    if (p.startDate && p.endDate) {
      cats[code].durationDays += Math.max(1, daySpan(p.startDate, p.endDate));
    }
  }
  for (const r of revenue) {
    if (!strictYearFilter(r.startDate, r.endDate, year)) continue;
    const code = (r.categoryCode ?? '').trim().toUpperCase() || 'OTHER';
    if (!cats[code]) cats[code] = { count: 0, partDays: 0, revenue: 0, revenueCount: 0, durationDays: 0 };
    cats[code].revenue += r.totalRevenue;
    if (r.totalRevenue > 0) cats[code].revenueCount++;
  }

  return Object.entries(cats)
    .map(([code, d]) => ({
      categoryCode: code,
      label: PROG_CATEGORY_LABELS[code] ?? code,
      count: d.count,
      totalRevenue: d.revenue,
      participantDays: d.partDays,
      avgRevenuePerProgram: d.revenueCount > 0 ? d.revenue / d.revenueCount : 0,
      totalDurationDays: d.durationDays,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}
