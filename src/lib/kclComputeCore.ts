import type {
  GlTransaction,
  ProgramEntry,
  ProgramRevenueEntry,
  RoomEntry,
  RoomBookingEntry,
  StaffSalaryEntry,
  ResidentialRosterEntry,
  KclExpenseCategory,
  KclRevenueStreams,
  KclMonthlyRow,
  KclProgramSummary,
  Season,
} from './kclTypes';
import {
  GL_CATEGORIES,
  ALL_EXPENSE_CODES,
  PROGRAM_GL,
  RESIDENCY_GL,
  DONATION_GL,
  PRIVATE_ROOM_TYPES,
  STAFF_ROOM_TYPE_CODES,
  txnYear,
  txnMonth,
  getSeason,
  strictYearFilter,
  dimOf,
  SEASON_MONTHS,
} from './kclComputeUtils';

// ─── Revenue ──────────────────────────────────────────────────────────────────

export function computeRevenue(txns: GlTransaction[], year: number): number {
  return txns
    .filter(t => txnYear(t) === year)
    .filter(t => {
      const code = t.accountCode;
      return (code.startsWith('3') || code.startsWith('4')) && code !== '3000';
    })
    .reduce((sum, t) => sum + t.credit - t.debit, 0);
}

// ─── Revenue streams ──────────────────────────────────────────────────────────

export function computeRevenueStreams(txns: GlTransaction[], year: number): KclRevenueStreams {
  const s: KclRevenueStreams = {
    programs: 0, residency: 0, donationsUnrestricted: 0,
    donationsRestricted: 0, campaigns: 0, other: 0,
  };
  for (const t of txns) {
    if (txnYear(t) !== year) continue;
    const net = t.credit - t.debit;
    if (net === 0) continue;
    const code = t.accountCode;
    if (PROGRAM_GL.has(code))                                        s.programs             += net;
    else if (RESIDENCY_GL.has(code))                                 s.residency            += net;
    else if (code === '4000' || code === '4050' || code === '4150') s.donationsUnrestricted += net;
    else if (code === '4200')                                        s.donationsRestricted  += net;
    else if (code.startsWith('3') && code !== '3000')                s.campaigns            += net;
    else if (code.startsWith('4'))                                   s.other                += net;
  }
  return s;
}

// ─── Monthly revenue + expense breakdown ──────────────────────────────────────

export function computeMonthlyData(
  txns: GlTransaction[],
  year: number,
  programRevenue?: ProgramRevenueEntry[],
): KclMonthlyRow[] {
  const rows: Record<number, KclMonthlyRow> = {};
  for (let m = 1; m <= 12; m++) {
    rows[m] = {
      month: m, revenuePrograms: 0, revenueResidency: 0,
      revenueDonations: 0, revenueCampaigns: 0, revenueTotal: 0,
      revenueManualJournal: 0, expenses: 0,
    };
  }
  for (const t of txns) {
    if (txnYear(t) !== year) continue;
    const m = txnMonth(t);
    if (m < 1 || m > 12) continue;
    const code = t.accountCode;
    // Revenue — net credits and debits on income accounts
    const rev = t.credit - t.debit;
    if (rev !== 0) {
      let addedToTotal = false;
      if (PROGRAM_GL.has(code)) {
        rows[m].revenuePrograms += rev;
        rows[m].revenueTotal    += rev;
        addedToTotal = true;
      } else if (RESIDENCY_GL.has(code)) {
        rows[m].revenueResidency += rev;
        rows[m].revenueTotal     += rev;
        addedToTotal = true;
      } else if (DONATION_GL.has(code)) {
        rows[m].revenueDonations += rev;
        rows[m].revenueTotal     += rev;
        addedToTotal = true;
      } else if (code.startsWith('3') && code !== '3000') {
        rows[m].revenueCampaigns += rev;
        rows[m].revenueTotal     += rev;
        addedToTotal = true;
      } else if (code.startsWith('4')) {
        rows[m].revenueTotal     += rev;
        addedToTotal = true;
      }
      if (addedToTotal && t.sourceName?.toLowerCase().includes('manual journal')) {
        rows[m].revenueManualJournal += rev;
      }
    }
    // Expense net (debit - credit) — credits represent refunds/adjustments that reduce the expense
    if (ALL_EXPENSE_CODES.has(code)) {
      rows[m].expenses += t.debit - t.credit;
    }
  }

  // Omnis monthly breakdown — assign by program start month
  if (programRevenue && programRevenue.length > 0) {
    for (let m = 1; m <= 12; m++) {
      rows[m].omnisTuition       = 0;
      rows[m].omnisAccommodation = 0;
      rows[m].omnisResidency     = 0;
    }
    for (const pr of programRevenue) {
      if (!pr.startDate) continue;
      const d = new Date(pr.startDate);
      if (isNaN(d.getTime()) || d.getFullYear() !== year) continue;
      const m = d.getMonth() + 1;
      if (m < 1 || m > 12) continue;
      if (pr.programName.toLowerCase().includes('residency program')) {
        rows[m].omnisResidency! += pr.totalRevenue;
      } else {
        rows[m].omnisTuition!       += pr.tuitionRevenue;
        rows[m].omnisAccommodation! += pr.accommodationRevenue;
      }
    }
  }

  return Array.from({ length: 12 }, (_, i) => rows[i + 1]);
}

// ─── Utility baseline ─────────────────────────────────────────────────────────

export function computeUtilityBaseline(txns: GlTransaction[], year: number): {
  fixedAnnual: number;
  variableAnnual: number;
  baselineMonth: number;
  baselineSpend: number;
  baselinePerDay: number;
  annualTotal: number;
  monthly: Record<number, number>;
} {
  const monthly: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) monthly[m] = 0;

  for (const t of txns) {
    if (txnYear(t) !== year) continue;
    if (!['6270', '6250'].includes(t.accountCode)) continue;
    const m = txnMonth(t);
    if (m >= 1 && m <= 12) monthly[m] += t.debit - t.credit;
  }

  const annualTotal = Object.values(monthly).reduce((a, b) => a + b, 0);

  // Single lowest month — kept for UI display reference only
  let baselineMonth = 1;
  let baselineSpend = Infinity;
  for (let m = 1; m <= 12; m++) {
    if (monthly[m] < baselineSpend) {
      baselineSpend = monthly[m];
      baselineMonth = m;
    }
  }

  // 3-month average daily rate — used for fixed/variable split and per-program attribution.
  const dailyByMonth = Array.from({ length: 12 }, (_, i) => {
    const m   = i + 1;
    const dim = dimOf(year, m);
    return { m, daily: dim > 0 ? monthly[m] / dim : 0 };
  });
  const sorted3 = [...dailyByMonth].sort((a, b) => a.daily - b.daily).slice(0, 3);
  const baselinePerDay = sorted3.reduce((s, x) => s + x.daily, 0) / 3;

  const fixedAnnual    = Math.max(0, baselinePerDay * 365);
  const variableAnnual = Math.max(0, annualTotal - fixedAnnual);

  return { fixedAnnual, variableAnnual, baselineMonth, baselineSpend, baselinePerDay, annualTotal, monthly };
}

// ─── Seasonal utility ─────────────────────────────────────────────────────────

export function computeSeasonalUtility(
  monthly: Record<number, number>,
  baselineMonthlySpend: number,
): {
  seasonalUtility: Record<Season, number>;
  seasonalMultipliers: Record<Season, number>;
} {
  const seasonalUtility: Record<Season, number> = { winter: 0, spring: 0, summer: 0, fall: 0 };

  for (const [season, months] of Object.entries(SEASON_MONTHS) as [Season, number[]][]) {
    for (const m of months) {
      seasonalUtility[season] += monthly[m] ?? 0;
    }
  }

  const divisor = baselineMonthlySpend > 0 ? baselineMonthlySpend : 1;
  const seasonalMultipliers: Record<Season, number> = { winter: 0, spring: 0, summer: 0, fall: 0 };
  for (const season of Object.keys(seasonalUtility) as Season[]) {
    const avgMonthly = seasonalUtility[season] / 3; // 3 months per season
    seasonalMultipliers[season] = parseFloat((avgMonthly / divisor).toFixed(4));
  }

  return { seasonalUtility, seasonalMultipliers };
}

// ─── CC fee rate ──────────────────────────────────────────────────────────────

export function computeCcFeeRate(txns: GlTransaction[], year: number): { rate: number; total: number } {
  const yearTxns = txns.filter(t => txnYear(t) === year);
  const total = yearTxns
    .filter(t => t.accountCode === '6100_1')
    .reduce((s, t) => s + t.debit - t.credit, 0);
  const revenue = yearTxns
    .filter(t => t.accountCode.startsWith('4'))
    .reduce((s, t) => s + t.credit - t.debit, 0);
  return { rate: revenue > 0 ? total / revenue : 0, total };
}

// ─── Expense categories ───────────────────────────────────────────────────────

export function computeExpenseCategories(
  txns: GlTransaction[],
  year: number,
  utilityFixed: number,
  utilityVariable: number,
  utilityMonthly: Record<number, number>,
  ccFeeRate: number,
  participantDays: number,
): Record<string, KclExpenseCategory> {
  const yearTxns = txns.filter(t => txnYear(t) === year);

  const totals: Record<string, number> = {};
  for (const key of Object.keys(GL_CATEGORIES)) totals[key] = 0;

  for (const t of yearTxns) {
    for (const [key, cat] of Object.entries(GL_CATEGORIES)) {
      if (cat.glAccounts.includes(t.accountCode)) {
        totals[key] += t.debit - t.credit;
      }
    }
  }

  const { seasonalMultipliers } = computeSeasonalUtility(utilityMonthly, utilityFixed / 12);

  const categories: Record<string, KclExpenseCategory> = {};
  for (const [key, def] of Object.entries(GL_CATEGORIES)) {
    const total = totals[key];
    const perDay = participantDays > 0 ? total / participantDays : 0;
    const entry: KclExpenseCategory = {
      name: def.name,
      glAccounts: def.glAccounts,
      total,
      perDay,
      type: def.type,
    };
    if (key === 'utilities') {
      entry.fixedAnnual = utilityFixed;
      entry.variableAnnual = utilityVariable;
      entry.seasonalMultipliers = seasonalMultipliers;
    }
    if (key === 'payment_processing') {
      entry.ccFeeRate = ccFeeRate;
    }
    categories[key] = entry;
  }

  return categories;
}

// ─── Participant days ─────────────────────────────────────────────────────────

export function computeParticipantDays(
  programs: ProgramEntry[],
  year: number,
  revenueIds?: Set<string>,
): {
  total: number;
  count: number;
  seasonalDays: Record<Season, number>;
  seasonalPrograms: Record<Season, number>;
} {
  let total = 0;
  let count = 0;
  const seasonalDays: Record<Season, number> = { winter: 0, spring: 0, summer: 0, fall: 0 };
  const seasonalPrograms: Record<Season, number> = { winter: 0, spring: 0, summer: 0, fall: 0 };

  for (const p of programs) {
    if (!strictYearFilter(p.startDate, p.endDate, year)) continue;
    // Exclude residential tracking programs that have no revenue (staff/volunteer trackers).
    // Residency programs with billing revenue are kept (they contribute to overhead).
    if (p.isResidential && revenueIds && !revenueIds.has(p.programId)) continue;
    total += p.participantDays;
    if (p.participantDays > 0) {
      count++;
      const startMonth = parseInt(p.startDate.substring(5, 7), 10);
      const season = getSeason(startMonth);
      seasonalDays[season] += p.participantDays;
      seasonalPrograms[season]++;
    }
  }

  return { total, count, seasonalDays, seasonalPrograms };
}

// ─── Room capacity & opportunity cost ────────────────────────────────────────

export function computeCapacity(rooms: RoomEntry[], bookings: RoomBookingEntry[]): {
  totalRooms: number;
  staffRooms: number;
  availableRooms: number;
  dormBeds: number;
  cabinRoomCount: number;
  opportunityCostAnnual: number;
  avgStaffRoomRate: number;
} {
  const privateRooms = rooms.filter(r => PRIVATE_ROOM_TYPES.has(r.roomType.toLowerCase()));
  const totalRooms = privateRooms.length;

  // Dorms are now consolidated rows — sum occupancyLimit instead of counting rows.
  const dormBeds = rooms
    .filter(r => r.roomType.toLowerCase() === 'dorm')
    .reduce((s, r) => s + r.occupancyLimit, 0);
  const cabinRoomCount = rooms.filter(r => r.roomType.toLowerCase() === 'tent cabin').length;

  // Staff rooms: identified by Omnis ROOM_TYPE_CODE, not program name.
  // KCLSTAFF = year-long residential staff; KCL SPRB = staff private room benefit.
  // Pricing for opportunity cost comes from room_inventory (privateRooms), not Omnis rates.
  const staffRoomNos = new Set(
    bookings
      .filter(b => STAFF_ROOM_TYPE_CODES.has(b.roomTypeCode))
      .map(b => b.roomNo)
      .filter(Boolean),
  );
  const staffOccupied = privateRooms.filter(r => staffRoomNos.has(r.roomId));
  const staffRooms = staffOccupied.length;

  const staffRates = staffOccupied
    .map(r => r.priceSingle)
    .filter(p => p > 0);

  const avgStaffRoomRate = staffRates.length > 0
    ? staffRates.reduce((a, b) => a + b, 0) / staffRates.length
    : 0;

  // Opportunity cost: each staff room could be rented at its single-occupancy rate
  const opportunityCostAnnual = staffRates.reduce((a, b) => a + b, 0) * 365;

  return {
    totalRooms,
    staffRooms,
    availableRooms: totalRooms - staffRooms,
    dormBeds,
    cabinRoomCount,
    opportunityCostAnnual,
    avgStaffRoomRate,
  };
}

// ─── Payroll cross-reference ──────────────────────────────────────────────────

export function computePayroll(
  salaries: StaffSalaryEntry[],
  roster: ResidentialRosterEntry[],
  xeroPayrollTotal: number,
): {
  csvPayrollAnnualized: number;
  payrollGap: number;
  residentialStaffCount: number;
  nonResidentialStaffCount: number;
} {
  const csvPayrollAnnualized = salaries.reduce((s, e) => s + e.annualSalary, 0);
  const payrollGap = csvPayrollAnnualized - xeroPayrollTotal;

  const residentialLastNames = new Set(
    roster.map(r => r.lastName.trim().toLowerCase()).filter(Boolean)
  );

  let residentialStaffCount = 0;
  let nonResidentialStaffCount = 0;

  for (const s of salaries) {
    const raw = s.name;
    let lastName: string;
    if (raw.includes(',')) {
      lastName = raw.split(',')[0].trim().toLowerCase();
    } else {
      const parts = raw.trim().split(/\s+/);
      lastName = (parts[parts.length - 1] ?? '').toLowerCase();
    }
    if (residentialLastNames.has(lastName)) {
      residentialStaffCount++;
    } else {
      nonResidentialStaffCount++;
    }
  }

  return { csvPayrollAnnualized, payrollGap, residentialStaffCount, nonResidentialStaffCount };
}

// ─── Per-program summary ──────────────────────────────────────────────────────

export function buildTopPrograms(revenue: ProgramRevenueEntry[]): KclProgramSummary[] {
  return revenue
    .filter(p => p.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map(p => ({
      programId: p.programId,
      name: p.programName,
      categoryCode: p.categoryCode,
      startDate: p.startDate,
      endDate: p.endDate,
      registrations: p.registrations,
      participants: p.participants,
      totalRevenue: p.totalRevenue,
      tuitionRevenue: p.tuitionRevenue,
      accommodationRevenue: p.accommodationRevenue,
    }));
}

// ─── Data gap reporting ───────────────────────────────────────────────────────

export function identifyDataGaps(
  hasSalaries: boolean,
  hasRoster: boolean,
  hasRevenue: boolean,
  programCount: number,
  participantDays: number,
): string[] {
  const gaps: string[] = [];
  if (!hasSalaries) {
    gaps.push('Staff Salaries not loaded — payroll CSV-vs-Xero reconciliation unavailable');
  }
  if (!hasRoster) {
    gaps.push('Residential Roster not loaded — payroll cross-reference unavailable');
  }
  if (!hasRevenue) {
    gaps.push('Program Revenue not loaded — per-program pricing analysis unavailable');
  }
  if (programCount === 0) {
    gaps.push('No strict-year programs found in Program Catalog — check year filter');
  }
  if (participantDays === 0) {
    gaps.push('Zero participant-days computed — per-day cost rates will be zero');
  }
  return gaps;
}
