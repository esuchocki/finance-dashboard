/**
 * KCL Computed Metrics
 *
 * Pure computation layer — no React, no side effects.
 * Ports the logic from context/programscalc/data_loader.py.
 *
 * GL code reference (from requirements.md and data_loader.py):
 *   Revenue : 3xxx, 4xxx credits (excl. 3000 retained earnings)
 *   CC fees : 61001 debits
 *   Utilities: 6270 (heating/electric), 6250 (phone/internet)
 *   Food    : 5200
 *   Payroll : 6105, 6110, 6114, 6116
 *   Teachers: 5250, 5300, 5350
 *   Repairs : 6210
 *   Insurance: 6150
 *   Facilities: 6190, 6200
 *   Payment processing: 5400, 6100, 61001
 *   Admin   : 6240, 6120, 6170, 6160, 6180, 6260, 6230
 *   Housekeeping: 6280
 *   Marketing: 5100
 *   Development: 6145
 *   Organizational: 5900
 */

import type {
  GlTransaction,
  ProgramEntry,
  ProgramRevenueEntry,
  ResidentialRosterEntry,
  RoomEntry,
  StaffSalaryEntry,
  KclComputedMetrics,
  KclExpenseCategory,
  KclProgramSummary,
  Season,
} from './kclTypes';
import { MONTH_NAMES } from './kclTypes';

// ─── GL category definitions ──────────────────────────────────────────────────

const GL_CATEGORIES: Record<string, {
  name: string;
  glAccounts: string[];
  type: KclExpenseCategory['type'];
}> = {
  food:               { name: 'Food & Meals',            glAccounts: ['5200'],                                         type: 'variable' },
  utilities:          { name: 'Utilities',                glAccounts: ['6270', '6250'],                                 type: 'semi_variable' },
  payroll:            { name: 'Payroll & Contract Labour',glAccounts: ['6105', '6110', '6114', '6116'],                 type: 'overhead' },
  teachers:           { name: 'Teacher Compensation',     glAccounts: ['5250', '5300', '5350'],                         type: 'program_specific' },
  repairs:            { name: 'Repairs & Maintenance',    glAccounts: ['6210'],                                         type: 'overhead' },
  insurance:          { name: 'Insurance',                glAccounts: ['6150'],                                         type: 'overhead' },
  facilities:         { name: 'Facilities',               glAccounts: ['6190', '6200'],                                 type: 'overhead' },
  payment_processing: { name: 'Payment Processing',       glAccounts: ['5400', '6100', '61001'],                        type: 'overhead' },
  admin:              { name: 'Office & Admin',           glAccounts: ['6240', '6120', '6170', '6160', '6180', '6260', '6230'], type: 'overhead' },
  housekeeping:       { name: 'Housekeeping & Supplies',  glAccounts: ['6280'],                                         type: 'overhead' },
  marketing:          { name: 'Marketing & Advertising',  glAccounts: ['5100'],                                         type: 'overhead' },
  development:        { name: 'Development & Community',  glAccounts: ['6145'],                                         type: 'overhead' },
  organizational:     { name: 'Organizational Dues',      glAccounts: ['5900'],                                         type: 'overhead' },
};

const SEASON_MONTHS: Record<Season, number[]> = {
  winter: [12, 1, 2],
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  fall:   [9, 10, 11],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txnYear(t: GlTransaction): number {
  return parseInt(t.date.substring(0, 4), 10);
}

function txnMonth(t: GlTransaction): number {
  return parseInt(t.date.substring(5, 7), 10);
}

function getSeason(month: number): Season {
  if ([12, 1, 2].includes(month)) return 'winter';
  if ([3, 4, 5].includes(month))  return 'spring';
  if ([6, 7, 8].includes(month))  return 'summer';
  return 'fall';
}

function strictYearFilter(startDate: string, endDate: string, year: number): boolean {
  if (!startDate || !endDate) return false;
  const sy = parseInt(startDate.substring(0, 4), 10);
  const ey = parseInt(endDate.substring(0, 4), 10);
  return sy === year && ey === year;
}

// ─── Revenue ──────────────────────────────────────────────────────────────────

function computeRevenue(txns: GlTransaction[], year: number): number {
  return txns
    .filter(t => txnYear(t) === year)
    .filter(t => {
      const code = t.accountCode;
      return (code.startsWith('3') || code.startsWith('4')) && code !== '3000';
    })
    .reduce((sum, t) => sum + t.credit, 0);
}

// ─── Utility baseline ─────────────────────────────────────────────────────────

function computeUtilityBaseline(txns: GlTransaction[], year: number): {
  fixedAnnual: number;
  variableAnnual: number;
  baselineMonth: number;
  baselineSpend: number;
  annualTotal: number;
  monthly: Record<number, number>;
} {
  const monthly: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) monthly[m] = 0;

  for (const t of txns) {
    if (txnYear(t) !== year) continue;
    if (!['6270', '6250'].includes(t.accountCode)) continue;
    const m = txnMonth(t);
    if (m >= 1 && m <= 12) monthly[m] += t.debit;
  }

  const annualTotal = Object.values(monthly).reduce((a, b) => a + b, 0);

  let baselineMonth = 1;
  let baselineSpend = Infinity;
  for (let m = 1; m <= 12; m++) {
    if (monthly[m] < baselineSpend) {
      baselineSpend = monthly[m];
      baselineMonth = m;
    }
  }

  const fixedAnnual = baselineSpend * 12;
  const variableAnnual = annualTotal - fixedAnnual;

  return { fixedAnnual, variableAnnual, baselineMonth, baselineSpend, annualTotal, monthly };
}

// ─── Seasonal utility ─────────────────────────────────────────────────────────

function computeSeasonalUtility(monthly: Record<number, number>): {
  seasonalUtility: Record<Season, number>;
  seasonalMultipliers: Record<Season, number>;
} {
  const seasonalUtility: Record<Season, number> = { winter: 0, spring: 0, summer: 0, fall: 0 };

  for (const [season, months] of Object.entries(SEASON_MONTHS) as [Season, number[]][]) {
    for (const m of months) {
      seasonalUtility[season] += monthly[m] ?? 0;
    }
  }

  const annualTotal = Object.values(seasonalUtility).reduce((a, b) => a + b, 0);
  const quarterlyAvg = annualTotal / 4 || 1;

  const seasonalMultipliers: Record<Season, number> = { winter: 0, spring: 0, summer: 0, fall: 0 };
  for (const season of Object.keys(seasonalUtility) as Season[]) {
    seasonalMultipliers[season] = parseFloat((seasonalUtility[season] / quarterlyAvg).toFixed(4));
  }

  return { seasonalUtility, seasonalMultipliers };
}

// ─── CC fee rate ──────────────────────────────────────────────────────────────

function computeCcFeeRate(txns: GlTransaction[], year: number): { rate: number; total: number } {
  const yearTxns = txns.filter(t => txnYear(t) === year);
  const total = yearTxns
    .filter(t => t.accountCode === '61001')
    .reduce((s, t) => s + t.debit, 0);
  const revenue = yearTxns
    .filter(t => (t.accountCode.startsWith('3') || t.accountCode.startsWith('4')) && t.accountCode !== '3000')
    .reduce((s, t) => s + t.credit, 0);
  return { rate: revenue > 0 ? total / revenue : 0, total };
}

// ─── Expense categories ───────────────────────────────────────────────────────

function computeExpenseCategories(
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
        totals[key] += t.debit;
      }
    }
  }

  const { seasonalMultipliers } = computeSeasonalUtility(utilityMonthly);

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

function computeParticipantDays(programs: ProgramEntry[], year: number): {
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

function computeCapacity(rooms: RoomEntry[]): {
  totalRooms: number;
  staffRooms: number;
  availableRooms: number;
  opportunityCostAnnual: number;
  avgStaffRoomRate: number;
} {
  const totalRooms = rooms.length;
  const staffOccupied = rooms.filter(r => r.occupiedByStaff && r.occupiedByStaff.trim() !== '');
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
    opportunityCostAnnual,
    avgStaffRoomRate,
  };
}

// ─── Payroll cross-reference ──────────────────────────────────────────────────

function computePayroll(
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

function buildTopPrograms(revenue: ProgramRevenueEntry[]): KclProgramSummary[] {
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

function identifyDataGaps(
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

// ─── Main entry point ─────────────────────────────────────────────────────────

export function computeKclMetrics(
  year: number,
  glTransactions: GlTransaction[],
  programCatalog: ProgramEntry[],
  programRevenue: ProgramRevenueEntry[],
  roomInventory: RoomEntry[],
  residentialRoster: ResidentialRosterEntry[],
  staffSalaries: StaffSalaryEntry[],
): KclComputedMetrics {

  // Revenue
  const totalRevenue = computeRevenue(glTransactions, year);

  // Omnis billed total
  const omnisBilledTotal = programRevenue.reduce((s, p) => s + p.totalRevenue, 0);

  // Participation
  const { total: participantDays, count: programCount, seasonalDays, seasonalPrograms } =
    computeParticipantDays(programCatalog, year);

  // Utilities
  const { fixedAnnual, variableAnnual, baselineMonth, baselineSpend, annualTotal: utilityTotal, monthly: utilityMonthly } =
    computeUtilityBaseline(glTransactions, year);
  const { seasonalUtility, seasonalMultipliers } = computeSeasonalUtility(utilityMonthly);

  // CC fees
  const { rate: ccFeeRate, total: ccFeeTotal } = computeCcFeeRate(glTransactions, year);

  // Expense categories
  const expenseCategories = computeExpenseCategories(
    glTransactions, year,
    fixedAnnual, variableAnnual, utilityMonthly,
    ccFeeRate, participantDays,
  );
  const totalExpenses = Object.values(expenseCategories).reduce((s, c) => s + c.total, 0);

  // Payroll actual (Xero)
  const xeroPayrollActual = expenseCategories['payroll']?.total ?? 0;

  // Capacity
  const { totalRooms, staffRooms, availableRooms, opportunityCostAnnual, avgStaffRoomRate } =
    computeCapacity(roomInventory);

  // Payroll cross-reference
  const { csvPayrollAnnualized, payrollGap, residentialStaffCount, nonResidentialStaffCount } =
    computePayroll(staffSalaries, residentialRoster, xeroPayrollActual);

  // Per-program
  const topPrograms = buildTopPrograms(programRevenue);

  // Data gaps
  const dataGaps = identifyDataGaps(
    staffSalaries.length > 0,
    residentialRoster.length > 0,
    programRevenue.length > 0,
    programCount,
    participantDays,
  );

  return {
    year,
    totalRevenue,
    omnisBilledTotal,
    participantDays,
    programCount,
    seasonalDays,
    seasonalPrograms,
    utilityTotal,
    utilityFixed: fixedAnnual,
    utilityVariable: variableAnnual,
    utilityBaselineMonth: baselineMonth,
    utilityBaselineSpend: baselineSpend,
    seasonalUtility,
    seasonalMultipliers,
    ccFeeRate,
    ccFeeTotal,
    expenseCategories,
    totalExpenses,
    deficit: totalExpenses - totalRevenue,
    costPerDay: participantDays > 0 ? totalExpenses / participantDays : 0,
    totalRooms,
    staffRooms,
    availableRooms,
    opportunityCostAnnual,
    avgStaffRoomRate,
    csvPayrollAnnualized,
    xeroPayrollActual,
    payrollGap,
    residentialStaffCount,
    nonResidentialStaffCount,
    topPrograms,
    dataGaps,
  };
}

// ─── Formatting helpers (for display) ────────────────────────────────────────

export function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtPct(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

export function fmtMonth(m: number): string {
  return MONTH_NAMES[m] ?? String(m);
}
