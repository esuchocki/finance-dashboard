/**
 * KCL Computed Metrics
 *
 * Pure computation layer — no React, no side effects.
 * Ports the logic from context/programscalc/data_loader.py.
 *
 * GL code reference (from requirements.md and data_loader.py):
 *   Revenue : 3xxx, 4xxx credits (excl. 3000 retained earnings)
 *   CC fees : 6100_1 debits (Xero account code uses underscore, not concatenated digits)
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
  TrialBalanceEntry,
  DonationEntry,
  ArEntry,
  ProgramTransactionEntry,
  RecurringDonorEntry,
  RoomBookingEntry,
  ProgramBillingEntry,
  KclComputedMetrics,
  KclExpenseCategory,
  KclProgramSummary,
  KclRevenueStreams,
  KclMonthlyRow,
  KclOccupancy,
  KclBreakEven,
  KclProgramCategory,
  KclProgramCosts,
  KclProgramPnL,
  KclVolunteerMetrics,
  KclTrialBalanceSummary,
  KclDonationFund,
  KclDonationBreakdown,
  KclArMetrics,
  KclDiscountSummary,
  KclRecurringDonorSummary,
  KclProgramBillingSummary,
  KclRoomTypeOccupancy,
  KclRosterPerson,
  KclParticipantDetail,
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
  // Xero uses text account codes 'COGS - SCH' and 'COGS - PC' (not numeric).
  // These ARE the exact Account Code values that appear in the GL export.
  scholarships:       { name: 'Scholarships & Credits',   glAccounts: ['COGS - SCH', 'COGS - PC'],                     type: 'program_specific' },
  repairs:            { name: 'Repairs & Maintenance',    glAccounts: ['6210'],                                         type: 'overhead' },
  insurance:          { name: 'Insurance',                glAccounts: ['6150'],                                         type: 'overhead' },
  facilities:         { name: 'Facilities',               glAccounts: ['6190', '6200'],                                 type: 'overhead' },
  // Credit Card Fees: Xero account code is '6100_1' (with underscore), NOT '61001'.
  // Bank Fees is '6100'. Payment Processing Costs is '5400'.
  payment_processing: { name: 'Payment Processing',       glAccounts: ['5400', '6100', '6100_1'],                      type: 'overhead' },
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

// All GL codes tracked as expenses (mirrors GL_CATEGORIES — used for monthly expense totals)
const ALL_EXPENSE_CODES = new Set<string>(
  Object.values(GL_CATEGORIES).flatMap(c => c.glAccounts)
);

// GL codes for each revenue stream
const PROGRAM_GL   = new Set(['4300', '4310', '4510']);
const RESIDENCY_GL = new Set(['4500', '4520']);
const DONATION_GL  = new Set(['4000', '4050', '4150', '4200']);

// Category labels for known Omnis program category codes
const PROG_CATEGORY_LABELS: Record<string, string> = {
  REG:  'Regular Programs',
  IHR:  'In-House Retreat / Residency',
  CABN: 'Cabin Retreats',
};

// Assumed monthly residency rate for implied-resident count (from requirements.md)
const RESIDENT_MONTHLY_RATE = 1750;

// Volunteer labor: estimated daily equivalent value (VT min wage × 8h + housing/food offset)
const VOLUNTEER_VALUE_PER_DAY = 150;

// CC fee benchmark: typical nonprofit payment processor rate
const CC_BENCHMARK_RATE = 0.025;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Days a roster entry spends within the target calendar year, computed directly
 * from arrival/departure dates.  Mirrors SQL DATEDIFF semantics (exclusive of
 * departure day, i.e. number of nights).
 */
function clampedDays(arrival: string, departure: string, year: number): number {
  const yr  = String(year);
  const yrN = String(year + 1);
  const a = arrival   < `${yr}-01-01`  ? `${yr}-01-01`  : arrival;
  // Clamp to year+1-01-01 so a Dec 1→Jan 5 stay gets 31 nights, not 30.
  const d = departure > `${yrN}-01-01` ? `${yrN}-01-01` : departure;
  if (!a || !d || a >= d) return 0;
  return Math.round(
    (new Date(d + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000
  );
}

/**
 * Classify a roster entry into one of three on-site tracks based on program name.
 * The three programs in the residential roster query are:
 *   "2025 KCL Residential Staff"     → 'staff'
 *   "2025 KCL Residential Volunteer" → 'volunteer'
 *   "2025 Residency Program"         → 'residency'
 */
function rosterTrack(programName: string): 'staff' | 'volunteer' | 'residency' {
  const lower = programName.toLowerCase();
  if (lower.includes('volunteer')) return 'volunteer';
  if (lower.includes('residency program')) return 'residency';
  return 'staff';
}

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
    .reduce((sum, t) => sum + t.credit - t.debit, 0);
}

// ─── Utility baseline ─────────────────────────────────────────────────────────

function computeUtilityBaseline(txns: GlTransaction[], year: number): {
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
  // Mirrors the food baseline approach: averaging 3 lowest months is more robust to billing
  // timing anomalies than a single month.
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

function computeSeasonalUtility(
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

  // Multiplier = avg monthly spend in this season ÷ baseline monthly spend (fixedAnnual / 12).
  // A multiplier of 2× means this season's avg month costs 2× the baseline level.
  // Baseline = avg daily rate of 3 lowest months × 365 / 12 — consistent with fixed/variable split.
  const divisor = baselineMonthlySpend > 0 ? baselineMonthlySpend : 1;
  const seasonalMultipliers: Record<Season, number> = { winter: 0, spring: 0, summer: 0, fall: 0 };
  for (const season of Object.keys(seasonalUtility) as Season[]) {
    const avgMonthly = seasonalUtility[season] / 3; // 3 months per season
    seasonalMultipliers[season] = parseFloat((avgMonthly / divisor).toFixed(4));
  }

  return { seasonalUtility, seasonalMultipliers };
}

// ─── CC fee rate ──────────────────────────────────────────────────────────────

function computeCcFeeRate(txns: GlTransaction[], year: number): { rate: number; total: number } {
  const yearTxns = txns.filter(t => txnYear(t) === year);
  const total = yearTxns
    .filter(t => t.accountCode === '6100_1')
    .reduce((s, t) => s + t.debit - t.credit, 0);
  // Denominator: GL 4xxx only — GL 3xxx (campaign/capital funds) are typically major-donor
  // checks or wire transfers and are not processed through the card payment system.
  // Including 3xxx would deflate the effective rate and understate per-program CC costs.
  const revenue = yearTxns
    .filter(t => t.accountCode.startsWith('4'))
    .reduce((s, t) => s + t.credit - t.debit, 0);
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

// Residential staff and residents only occupy private room types.
// Dorm beds, tent cabins, shrine floors, and campground are not "rooms" for
// capacity or REVPAR purposes.
const PRIVATE_ROOM_TYPES = new Set(['premium', 'standard', 'double', 'accessibility']);

function computeCapacity(rooms: RoomEntry[]): {
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
  const staffOccupied = privateRooms.filter(r => r.occupiedByStaff && r.occupiedByStaff.trim() !== '');
  const staffRooms = staffOccupied.length;

  const dormBeds = rooms.filter(r => r.roomType.toLowerCase() === 'dorm').length;
  const cabinRoomCount = rooms.filter(r => r.roomType.toLowerCase() === 'tent cabin').length;

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

// ─── Revenue streams ──────────────────────────────────────────────────────────

function computeRevenueStreams(txns: GlTransaction[], year: number): KclRevenueStreams {
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

function computeMonthlyData(txns: GlTransaction[], year: number): KclMonthlyRow[] {
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
  return Array.from({ length: 12 }, (_, i) => rows[i + 1]);
}

// ─── Occupancy from residential roster ───────────────────────────────────────

function computeOccupancy(
  roster: ResidentialRosterEntry[],
  year: number,
  residencyRevenue: number,
): KclOccupancy {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const lastDay = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const yr = String(year);

  const monthlyResidents: Record<number, number> = {};
  const monthlyByTrack: Record<number, { staff: number; volunteers: number; residency: number }> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyResidents[m] = 0;
    monthlyByTrack[m] = { staff: 0, volunteers: 0, residency: 0 };
  }

  let totalResidentDays = 0;

  for (const r of roster) {
    if (!r.arrivalDate || !r.departureDate) continue;
    // Clamp stay to the target year
    const start = r.arrivalDate < `${yr}-01-01` ? `${yr}-01-01` : r.arrivalDate;
    const end   = r.departureDate > `${yr}-12-31` ? `${yr}-12-31` : r.departureDate;
    if (start > end) continue;

    const track = rosterTrack(r.programName);
    totalResidentDays += clampedDays(r.arrivalDate, r.departureDate, year);

    for (let m = 1; m <= 12; m++) {
      const mStr   = String(m).padStart(2, '0');
      const mStart = `${yr}-${mStr}-01`;
      const mEnd   = `${yr}-${mStr}-${String(lastDay[m]).padStart(2, '0')}`;
      // end > mStart (strict): departure on the first of a month means the person
      // left that morning and is not counted as a resident for that month.
      // This matches SQL DATEDIFF semantics where the departure day is exclusive.
      if (start <= mEnd && end > mStart) {
        monthlyResidents[m]++;
        if (track === 'volunteer')  monthlyByTrack[m].volunteers++;
        else if (track === 'residency') monthlyByTrack[m].residency++;
        else monthlyByTrack[m].staff++;
      }
    }
  }

  const avgMonthlyResidents = Object.values(monthlyResidents).reduce((a, b) => a + b, 0) / 12;
  const avgMonthlyByTrack = {
    staff:      Object.values(monthlyByTrack).reduce((a, b) => a + b.staff, 0) / 12,
    volunteers: Object.values(monthlyByTrack).reduce((a, b) => a + b.volunteers, 0) / 12,
    residency:  Object.values(monthlyByTrack).reduce((a, b) => a + b.residency, 0) / 12,
  };

  const impliedResidents = residencyRevenue > 0
    ? Math.round(residencyRevenue / (RESIDENT_MONTHLY_RATE * 12))
    : 0;

  return { monthlyByTrack, monthlyResidents, avgMonthlyByTrack, avgMonthlyResidents, totalResidentDays, impliedResidents };
}

// ─── Break-even scenario ──────────────────────────────────────────────────────

function computeBreakEven(
  deficit: number,
  programRevenue: ProgramRevenueEntry[],
  revenueStreams: KclRevenueStreams,
  programPnL: KclProgramPnL[],
  foodMarginalRatePerDay: number,
): KclBreakEven {
  const revenuePerResident = RESIDENT_MONTHLY_RATE * 12; // $21,000 gross

  // Net residency contribution per resident per year:
  // A new resident adds $21K in revenue but also marginal kitchen cost every day.
  // foodMarginalRatePerDay × 365 approximates that annual food cost.
  // Using net rather than gross gives a more accurate residentsNeeded count —
  // dividing by gross (21K) underestimates residents needed by ~30–50% when
  // food is a significant marginal cost per person-year.
  const residencyNetPerResident = Math.max(1, revenuePerResident - foodMarginalRatePerDay * 365);

  const programsWithRevenue = programRevenue.filter(p => p.totalRevenue > 0);
  const totalProgramRevenue = programsWithRevenue.reduce((s, p) => s + p.totalRevenue, 0);
  const avgProgramRevenue   = programsWithRevenue.length > 0
    ? totalProgramRevenue / programsWithRevenue.length
    : 0;

  // Use actual contribution margins from PnL when available.
  // avgContributionMargin (full): revenue − direct − overhead (context only).
  // avgDirectContributionMargin: revenue − direct only (used for programsNeeded).
  //   Overhead is a fixed pool that does not change when one more program is added,
  //   so the incremental closing effect of a new program is (revenue − direct costs).
  const pnlWithRevenue = programPnL.filter(p => p.revenue > 0);
  const avgContributionMargin = pnlWithRevenue.length > 0
    ? pnlWithRevenue.reduce((s, p) => s + p.contributionMargin, 0) / pnlWithRevenue.length
    : 0;
  const avgDirectContributionMargin = pnlWithRevenue.length > 0
    ? pnlWithRevenue.reduce(
        (s, p) => s + p.revenue - p.costs.teacherCost - p.costs.foodCost - p.costs.ccFees - p.costs.scholarshipCost - p.costs.utilityMarginal,
        0,
      ) / pnlWithRevenue.length
    : 0;

  // Separate donations into restricted (GL 4200) and unrestricted (GL 4000/4050/4150).
  // The "increase donations" lever uses only unrestricted donations as the denominator:
  // restricted donations are designated for specific purposes and cannot be redirected
  // to cover an operating deficit.
  const unrestrictedDonationRevenue = revenueStreams.donationsUnrestricted;
  const totalDonationRevenue =
    revenueStreams.donationsUnrestricted +
    revenueStreams.donationsRestricted;
  const totalCampaignRevenue = revenueStreams.campaigns;

  const d = Math.max(deficit, 0);
  return {
    deficit,
    avgProgramRevenue,
    avgContributionMargin,
    avgDirectContributionMargin,
    programsWithRevenueCount: programsWithRevenue.length,
    residencyRevenuePerResident: revenuePerResident,
    residencyNetPerResident,
    totalDonationRevenue,
    unrestrictedDonationRevenue,
    totalCampaignRevenue,
    residentsNeeded:            residencyNetPerResident > 0              ? Math.ceil(d / residencyNetPerResident)        : 0,
    programsNeeded:             avgDirectContributionMargin > 0         ? Math.ceil(d / avgDirectContributionMargin)    : 0,
    donationIncreasePct:        unrestrictedDonationRevenue > 0         ? d / unrestrictedDonationRevenue               : 0,
    campaignIncreasePct:        totalCampaignRevenue > 0                ? d / totalCampaignRevenue                      : 0,
  };
}

// ─── Program category breakdown ───────────────────────────────────────────────

function computeProgramCategories(
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

// ─── Per-program contribution margin ─────────────────────────────────────────

// ---- Date helpers (UTC-safe, no external deps) --------------------------------

/** Last day (1–31) of a 1-based month in the given year. */
function dimOf(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Add `days` to an ISO date string (handles negatives). */
function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Calendar days from ISO a to ISO b, inclusive. */
function daySpan(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime();
  return Math.round(ms / 86400000) + 1;
}

// ---- Utility marginal for a program's date range ----------------------------

function programUtilityMarginal(
  rawStart: string,
  rawEnd: string,
  year: number,
  utilityMonthly: Record<number, number>,
  baselinePerDay: number,
): number {
  const yr = String(year);
  const start = rawStart < `${yr}-01-01` ? `${yr}-01-01` : rawStart;
  const end   = rawEnd   > `${yr}-12-31` ? `${yr}-12-31` : rawEnd;
  if (start > end) return 0;

  let marginal = 0;
  for (let m = 1; m <= 12; m++) {
    const mStr   = String(m).padStart(2, '0');
    const mStart = `${yr}-${mStr}-01`;
    const dim    = dimOf(year, m);
    const mEnd   = `${yr}-${mStr}-${String(dim).padStart(2, '0')}`;

    const oStart = start > mStart ? start : mStart;
    const oEnd   = end   < mEnd   ? end   : mEnd;
    if (oStart > oEnd) continue;

    const days       = daySpan(oStart, oEnd);
    const dailyRate  = dim > 0 ? (utilityMonthly[m] ?? 0) / dim : 0;
    const margDaily  = Math.max(0, dailyRate - baselinePerDay);
    marginal += margDaily * days;
  }
  return marginal;
}

// ---- Main computation -------------------------------------------------------

function computeProgramPnL(
  year: number,
  programRevenue: ProgramRevenueEntry[],
  programCatalog: ProgramEntry[],
  glTransactions: GlTransaction[],
  ccFeeRate: number,
  utilityMonthly: Record<number, number>,
  utilityBaselinePerDay: number,
  totalParticipantDays: number,
  totalExpenses: number,
  utilityFixed: number,
  arEntries: ArEntry[],
  roomBookings: RoomBookingEntry[],
): KclProgramPnL[] {

  // ── 1. Participant-days by programId from catalog ─────────────────────────
  const pdByProgramId: Record<string, number> = {};
  for (const p of programCatalog) {
    if (!strictYearFilter(p.startDate, p.endDate, year)) continue;
    if (p.programId) pdByProgramId[p.programId] = (pdByProgramId[p.programId] ?? 0) + p.participantDays;
  }

  // ── 2. Utility baseline per day (passed in — avg of 3 lowest months) ─────

  // ── 3. Food marginal rate (GL 5200) ───────────────────────────────────────
  const foodMonthly: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) foodMonthly[m] = 0;
  for (const t of glTransactions) {
    if (txnYear(t) !== year || t.accountCode !== '5200') continue;
    const m = txnMonth(t);
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
  const baselineMonths = sortedByRate.slice(0, 3);
  const foodBaselinePerDay = baselineMonths.reduce((s, m) => s + foodDailyByMonth[m], 0) / 3;
  const foodMarginalTotal  = Math.max(0, foodTotal - foodBaselinePerDay * 365);

  // Non-CABN participant-days for rate denominator.
  // Normalize categoryCode against whitespace and case before comparing — the CSV
  // column may carry trailing spaces or inconsistent capitalisation.
  const nonCabnPartDays = programCatalog
    .filter(p => strictYearFilter(p.startDate, p.endDate, year) && (p.categoryCode ?? '').trim().toUpperCase() !== 'CABN')
    .reduce((s, p) => s + p.participantDays, 0);
  const foodMarginalRate = nonCabnPartDays > 0 ? foodMarginalTotal / nonCabnPartDays : 0;

  // ── 4. Teacher first-claim attribution (REG only, not CABN/IHR) ───────────
  // Visiting teachers are specific to retreat programs, not year-long residency or self-guided cabins.
  // Must run before overhead pool so only *claimed* teacher cost is excluded from overhead.
  const teacherTxns = glTransactions
    .filter(t => txnYear(t) === year && ['5250', '5300', '5350'].includes(t.accountCode))
    .map(t => ({ date: t.date, amount: t.debit - t.credit, claimed: false }));

  const teacherCostById: Record<string, number> = {};
  const regPrograms = [...programRevenue]
    .filter(r => (r.categoryCode ?? '').trim().toUpperCase() === 'REG' && strictYearFilter(r.startDate, r.endDate, year))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const yr = String(year);
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

  // Unclaimed teacher payments (outside all REG program windows) fall back to overhead
  // so total attributed costs always reconcile to totalExpenses.
  const teacherClaimed = Object.values(teacherCostById).reduce((s, v) => s + v, 0);

  // ── 5. Overhead pool ──────────────────────────────────────────────────────
  // Directly attributed costs are removed from overhead and assigned per-program:
  //   foodMarginalTotal  — program-driven food (mirrors how utilityVar is treated)
  //   teacherClaimed     — only attributed teacher payments; unclaimed stay in overhead
  //   ccFeesAttributed   — ccFeeRate × omnis program revenue only (NOT ccFeeTotal).
  //                        CC fees on donation/residency card transactions stay in overhead.
  //   schAttributed      — scholarship/credit costs (COGS-SCH, COGS-PC) attributed at
  //                        schRate × program revenue. Scholarships are program-specific
  //                        costs (not organisational overhead), so spreading by participant-
  //                        days would dilute them into every program, including unrelated ones.
  //   utilityVar         — above-baseline heating/electric, attributed via programUtilityMarginal
  //
  // Food BASELINE (foodTotal − foodMarginalTotal) stays in overhead, the same way
  // utilityFixed does: it is an always-on cost that does not vary with program load.
  const utilityTotal       = Object.values(utilityMonthly).reduce((a, b) => a + b, 0);
  const utilityVar         = Math.max(0, utilityTotal - utilityFixed);
  // Defensive year filter: programRevenue may contain multi-year entries if upstream
  // caller did not pre-filter. Only include programs whose start AND end fall in `year`.
  const omnisProgramTotal  = programRevenue
    .filter(r => strictYearFilter(r.startDate, r.endDate, year))
    .reduce((s, r) => s + r.totalRevenue, 0);
  const ccFeesAttributed   = ccFeeRate * omnisProgramTotal;

  // Scholarship rate: total COGS-SCH + COGS-PC ÷ omnis program revenue.
  // Applying as a revenue-proportional rate (like CC fees) is a proxy — ideally each
  // program's actual scholarship grants would be attributed directly, but the GL export
  // does not tie COGS entries to individual programs.
  const scholarshipTotal   = glTransactions
    .filter(t => txnYear(t) === year && ['COGS - SCH', 'COGS - PC'].includes(t.accountCode))
    .reduce((s, t) => s + t.debit - t.credit, 0);
  const schRate            = omnisProgramTotal > 0 ? scholarshipTotal / omnisProgramTotal : 0;
  const schAttributed      = schRate * omnisProgramTotal; // === scholarshipTotal when omnisProgramTotal > 0

  const overheadPool = totalExpenses - foodMarginalTotal - teacherClaimed - ccFeesAttributed - schAttributed - utilityVar;
  const overheadPerPartDay = totalParticipantDays > 0 ? overheadPool / totalParticipantDays : 0;

  // ── 6. Participant lookup: AR joined to room bookings via registrationId ──
  const bookingByRegId: Record<string, RoomBookingEntry> = {};
  for (const b of roomBookings) {
    if (b.registrationId) bookingByRegId[b.registrationId] = b;
  }
  // Normalize program names for matching — different Omnis exports can have
  // subtle whitespace or casing differences for the same program.
  const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

  // Group AR entries by normalized program name (AR has no programId)
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
    });
  }

  // ── 7. Build per-program records ──────────────────────────────────────────
  const results: KclProgramPnL[] = [];
  for (const r of programRevenue) {
    if (r.totalRevenue <= 0 && r.registrations === 0) continue;
    if (!strictYearFilter(r.startDate, r.endDate, year)) continue;

    const key          = r.programId || r.programName;
    const cat          = (r.categoryCode ?? '').trim().toUpperCase();
    const participantDays = pdByProgramId[r.programId ?? ''] ?? 0;
    const durationDays = r.startDate && r.endDate
      ? Math.max(1, daySpan(r.startDate, r.endDate))
      : 0;

    const teacherCost    = teacherCostById[key] ?? 0;
    // Cabin retreats are self-catering — no main-kitchen food cost
    const foodCost       = cat === 'CABN' ? 0 : foodMarginalRate * participantDays;
    const ccFees         = ccFeeRate * r.totalRevenue;
    // Scholarship cost: revenue-proportional proxy for COGS-SCH / COGS-PC attribution
    const scholarshipCost = schRate * r.totalRevenue;
    const utilityMarginal = r.startDate && r.endDate
      ? programUtilityMarginal(r.startDate, r.endDate, year, utilityMonthly, utilityBaselinePerDay)
      : 0;
    const overheadAlloc  = overheadPerPartDay * participantDays;

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

// ─── Trial balance summary ────────────────────────────────────────────────────

function computeTrialBalanceSummary(entries: TrialBalanceEntry[]): KclTrialBalanceSummary {
  let trialRevenue = 0, trialExpenses = 0, depreciation = 0;
  let retainedEarnings = 0, programDeposits = 0, investmentAccount = 0;
  let cashAndBanks = 0, mortgage = 0, sbaLoan = 0;
  let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

  for (const e of entries) {
    const code = e.accountCode.trim();
    const cls  = e.accountClass.toLowerCase();

    if (cls === 'revenue') {
      trialRevenue += e.credit;
    } else if (cls === 'expense') {
      trialExpenses += e.debit;
      if (code === '6130') depreciation = e.debit;
    } else if (cls === 'asset') {
      // Net: assets carry debit balances; accumulated depreciation carries credits
      totalAssets += e.debit - e.credit;
      // Bank accounts: codes 1000–1009, excluding 1005 (investment account tracked separately)
      if (/^100\d$/.test(code) && code !== '1005') cashAndBanks += e.debit;
      if (code === '1005') investmentAccount = e.debit;
    } else if (cls === 'liability') {
      totalLiabilities += e.credit;
      if (code === '2010') programDeposits = e.credit;
      if (code === '2500') mortgage = e.credit;
      if (code === '2501') sbaLoan = e.credit;
    } else if (cls === 'equity') {
      totalEquity += e.credit - e.debit;
      if (code === '3000') retainedEarnings = e.credit - e.debit;
    }
  }

  return {
    trialRevenue,
    trialExpenses,
    trialNetIncome: trialRevenue - trialExpenses,
    depreciation,
    retainedEarnings,
    programDeposits,
    investmentAccount,
    cashAndBanks,
    mortgage,
    sbaLoan,
    totalAssets,
    totalLiabilities,
    totalEquity,
  };
}

// ─── Donation breakdown ───────────────────────────────────────────────────────

function computeDonationBreakdown(donations: DonationEntry[]): KclDonationBreakdown {
  const fundMap: Record<string, KclDonationFund> = {};
  let totalPledged = 0, totalPaid = 0;
  let monthlyCount = 0, oneTimeCount = 0, cancelledCount = 0, voidCount = 0;

  for (const d of donations) {
    if (d.cancelled) { cancelledCount++; continue; }
    if (d.voidTransaction) { voidCount++; continue; }

    const type = d.donationType.toUpperCase();
    if (type.includes('MONTHLY') || type.includes('RECURRING')) monthlyCount++;
    else oneTimeCount++;

    totalPledged += d.pledgedAmount;
    totalPaid += d.amountPaid;

    if (!fundMap[d.fundName]) {
      fundMap[d.fundName] = {
        fundName: d.fundName,
        glAccount: d.glAccount,
        totalPledged: 0,
        totalPaid: 0,
        transactionCount: 0,
      };
    }
    fundMap[d.fundName].totalPledged += d.pledgedAmount;
    fundMap[d.fundName].totalPaid += d.amountPaid;
    fundMap[d.fundName].transactionCount++;
  }

  return {
    funds: Object.values(fundMap).sort((a, b) => b.totalPaid - a.totalPaid),
    totalPledged,
    totalPaid,
    paymentRate: totalPledged > 0 ? totalPaid / totalPledged : 0,
    monthlyCount,
    oneTimeCount,
    cancelledCount,
    voidCount,
  };
}

// ─── Accounts receivable ──────────────────────────────────────────────────────

function computeArMetrics(arEntries: ArEntry[]): KclArMetrics {
  const totalOutstanding = arEntries.reduce((s, e) => s + e.outstanding, 0);
  const totalCharged     = arEntries.reduce((s, e) => s + e.totalCharged, 0);
  const totalPaid        = arEntries.reduce((s, e) => s + e.totalPaid, 0);

  const topDebtors = [...arEntries]
    .filter(e => e.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 10)
    .map(e => ({
      participantName: e.participantName,
      programName: e.programName,
      outstanding: e.outstanding,
    }));

  return {
    totalOutstanding,
    totalCharged,
    totalPaid,
    collectionRate: totalCharged > 0 ? totalPaid / totalCharged : 0,
    debtorCount: arEntries.filter(e => e.outstanding > 0).length,
    topDebtors,
  };
}

// ─── Volunteer / residential population breakdown ─────────────────────────────

function computeVolunteerMetrics(roster: ResidentialRosterEntry[], year: number): KclVolunteerMetrics {
  let volunteerCount = 0, volunteerDays = 0;
  let staffCount = 0, staffDays = 0;
  let residencyCount = 0, residencyDays = 0;

  const rosterByTrack: {
    staff: KclRosterPerson[];
    volunteers: KclRosterPerson[];
    residency: KclRosterPerson[];
  } = { staff: [], volunteers: [], residency: [] };

  for (const r of roster) {
    const days = clampedDays(r.arrivalDate, r.departureDate, year);
    const track = rosterTrack(r.programName);
    const person: KclRosterPerson = {
      name: `${r.firstName} ${r.lastName}`.trim(),
      arrivalDate: r.arrivalDate,
      departureDate: r.departureDate,
      days,
    };
    if (track === 'volunteer') {
      volunteerCount++;
      volunteerDays += days;
      rosterByTrack.volunteers.push(person);
    } else if (track === 'residency') {
      residencyCount++;
      residencyDays += days;
      rosterByTrack.residency.push(person);
    } else {
      staffCount++;
      staffDays += days;
      rosterByTrack.staff.push(person);
    }
  }

  for (const track of ['staff', 'volunteers', 'residency'] as const) {
    rosterByTrack[track].sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    volunteerCount,
    volunteerDays,
    staffCount,
    staffDays,
    residencyCount,
    residencyDays,
    estimatedLaborValue: volunteerDays * VOLUNTEER_VALUE_PER_DAY,
    laborValuePerDay: VOLUNTEER_VALUE_PER_DAY,
    rosterByTrack,
  };
}

// ─── Discount summary ─────────────────────────────────────────────────────────

function computeDiscountSummary(txns: ProgramTransactionEntry[], year: number): KclDiscountSummary {
  const cats: Record<string, { totalAmount: number; totalDiscount: number }> = {};
  let totalAmount = 0;
  let totalDiscount = 0;

  for (const t of txns) {
    if (!strictYearFilter(t.startDate, t.endDate, year)) continue;
    totalAmount += t.totalAmount;
    totalDiscount += t.totalDiscount;
    const code = (t.categoryCode ?? '').trim().toUpperCase() || 'OTHER';
    if (!cats[code]) cats[code] = { totalAmount: 0, totalDiscount: 0 };
    cats[code].totalAmount += t.totalAmount;
    cats[code].totalDiscount += t.totalDiscount;
  }

  const byCategory = Object.entries(cats)
    .map(([code, d]) => ({
      categoryCode: code,
      label: PROG_CATEGORY_LABELS[code] ?? code,
      totalAmount: d.totalAmount,
      totalDiscount: d.totalDiscount,
      discountRate: d.totalAmount > 0 ? d.totalDiscount / d.totalAmount : 0,
    }))
    .sort((a, b) => b.totalDiscount - a.totalDiscount);

  return {
    totalAmount,
    totalDiscount,
    netRevenue: totalAmount - totalDiscount,
    discountRate: totalAmount > 0 ? totalDiscount / totalAmount : 0,
    byCategory,
  };
}

// ─── Recurring donor summary ──────────────────────────────────────────────────

function computeRecurringDonorSummary(donors: RecurringDonorEntry[]): KclRecurringDonorSummary {
  const donorCount = donors.length;
  const totalPaid = donors.reduce((s, d) => s + d.totalPaid, 0);
  const totalPayments = donors.reduce((s, d) => s + d.paymentsMade, 0);

  const topDonors = [...donors]
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 10)
    .map(d => ({ donorName: d.donorName, payments: d.paymentsMade, totalPaid: d.totalPaid }));

  return {
    donorCount,
    totalPaid,
    avgPaymentsPerDonor: donorCount > 0 ? totalPayments / donorCount : 0,
    avgAmountPerDonor: donorCount > 0 ? totalPaid / donorCount : 0,
    topDonors,
  };
}

// ─── Room type occupancy ──────────────────────────────────────────────────────

function computeRoomTypeOccupancy(bookings: RoomBookingEntry[]): KclRoomTypeOccupancy {
  const valid = bookings.filter(b => b.nights > 0);
  const typeMap: Record<string, { bookings: number; totalNights: number }> = {};

  for (const b of valid) {
    const type = b.roomTypeDesc || b.roomTypeCode || 'Unknown';
    if (!typeMap[type]) typeMap[type] = { bookings: 0, totalNights: 0 };
    typeMap[type].bookings++;
    typeMap[type].totalNights += b.nights;
  }

  const byType = Object.entries(typeMap)
    .map(([roomTypeDesc, d]) => ({
      roomTypeDesc,
      bookings: d.bookings,
      totalNights: d.totalNights,
      avgNights: d.bookings > 0 ? d.totalNights / d.bookings : 0,
    }))
    .sort((a, b) => b.totalNights - a.totalNights);

  return {
    totalNights: valid.reduce((s, b) => s + b.nights, 0),
    totalBookings: valid.length,
    byType,
  };
}

// ─── Program billing summary ──────────────────────────────────────────────────

function computeProgramBillingSummary(billing: ProgramBillingEntry[]): KclProgramBillingSummary {
  const personCount = billing.length;
  const totalCharged = billing.reduce((s, e) => s + e.totalCharged2025, 0);
  const totalRegs    = billing.reduce((s, e) => s + e.registrations2025, 0);

  const topBilled = [...billing]
    .sort((a, b) => b.totalCharged2025 - a.totalCharged2025)
    .slice(0, 10)
    .map(e => ({
      participantName: e.participantName,
      registrations: e.registrations2025,
      totalCharged: e.totalCharged2025,
    }));

  return {
    personCount,
    totalCharged,
    avgChargePerPerson: personCount > 0 ? totalCharged / personCount : 0,
    avgRegistrationsPerPerson: personCount > 0 ? totalRegs / personCount : 0,
    topBilled,
  };
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
  trialBalanceEntries: TrialBalanceEntry[],
  donations: DonationEntry[],
  arEntries: ArEntry[],
  programTransactions: ProgramTransactionEntry[],
  recurringDonors: RecurringDonorEntry[],
  roomBookings: RoomBookingEntry[],
  allRegistrations: ArEntry[],
  programBilling: ProgramBillingEntry[],
): KclComputedMetrics {

  // Prefer allRegistrations over outstandingAr for participant data.
  // allRegistrations includes fully-paid participants; outstandingAr is unpaid-only.
  const participantEntries = allRegistrations.length > 0 ? allRegistrations : arEntries;

  // Revenue
  const totalRevenue = computeRevenue(glTransactions, year);
  const revenueStreams = computeRevenueStreams(glTransactions, year);

  // Year-filtered program revenue — guards against multi-year CSVs or year-selector
  // changes without re-uploading data. All downstream aggregates use this.
  const yearProgramRevenue = programRevenue.filter(r => strictYearFilter(r.startDate, r.endDate, year));

  // Omnis billed total
  const omnisBilledTotal = yearProgramRevenue.reduce((s, p) => s + p.totalRevenue, 0);

  // Participation
  const { total: participantDays, count: programCount, seasonalDays, seasonalPrograms } =
    computeParticipantDays(programCatalog, year);

  // Utilities
  const {
    fixedAnnual, variableAnnual, baselineMonth, baselineSpend, baselinePerDay,
    annualTotal: utilityTotal, monthly: utilityMonthly,
  } = computeUtilityBaseline(glTransactions, year);
  // Divisor = fixedAnnual / 12 (avg monthly baseline, 3-month average daily rate × 365/12).
  // Consistent with how fixed/variable split is computed. Previously used single-lowest-month
  // spend (baselineSpend), which was slightly lower and produced inflated multipliers.
  const { seasonalUtility, seasonalMultipliers } = computeSeasonalUtility(utilityMonthly, fixedAnnual / 12);

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
  const { totalRooms, staffRooms, availableRooms, dormBeds, cabinRoomCount, opportunityCostAnnual, avgStaffRoomRate } =
    computeCapacity(roomInventory);

  // Payroll cross-reference
  const { csvPayrollAnnualized, payrollGap, residentialStaffCount, nonResidentialStaffCount } =
    computePayroll(staffSalaries, residentialRoster, xeroPayrollActual);

  // Per-program
  const topPrograms = buildTopPrograms(yearProgramRevenue);

  // Monthly breakdown
  const monthlyData = computeMonthlyData(glTransactions, year);

  // Occupancy
  const occupancy = residentialRoster.length > 0
    ? computeOccupancy(residentialRoster, year, revenueStreams.residency)
    : null;

  // Volunteer / residential population breakdown
  const volunteerMetrics = residentialRoster.length > 0
    ? computeVolunteerMetrics(residentialRoster, year)
    : null;

  // Trial balance summary
  const balanceSheet = trialBalanceEntries.length > 0
    ? computeTrialBalanceSummary(trialBalanceEntries)
    : null;

  // Donation fund breakdown
  const donationBreakdown = donations.length > 0
    ? computeDonationBreakdown(donations)
    : null;

  // Accounts receivable health — use allRegistrations if available for accurate totals
  const arMetrics = participantEntries.length > 0
    ? computeArMetrics(participantEntries)
    : null;

  // Discount summary from program transactions
  const discountSummary = programTransactions.length > 0
    ? computeDiscountSummary(programTransactions, year)
    : null;

  // Recurring donor base (cash received)
  const recurringDonorSummary = recurringDonors.length > 0
    ? computeRecurringDonorSummary(recurringDonors)
    : null;

  // Program billing summary (charges billed)
  const programBillingSummary = programBilling.length > 0
    ? computeProgramBillingSummary(programBilling)
    : null;

  // Room type occupancy
  const roomTypeOccupancy = roomBookings.length > 0
    ? computeRoomTypeOccupancy(roomBookings)
    : null;

  // CC fee benchmark
  const ccFeeBenchmarkRate = CC_BENCHMARK_RATE;
  const ccFeeExcessRate = Math.max(0, ccFeeRate - CC_BENCHMARK_RATE);
  const ccFeeAlert = ccFeeRate > 0.035;

  // REVPAR: room + residency revenue per available room-night
  const revpar = availableRooms > 0
    ? (revenueStreams.residency + revenueStreams.programs) / (availableRooms * 365)
    : 0;

  // Revenue recognition gap (donations + timing diffs explain this)
  const revenueGapAmount = totalRevenue - omnisBilledTotal;

  // Per-program contribution margin (computed before break-even so margins feed into it)
  const programPnL = computeProgramPnL(
    year,
    yearProgramRevenue,
    programCatalog,
    glTransactions,
    ccFeeRate,
    utilityMonthly,
    baselinePerDay,       // avg daily rate of 3 lowest utility months
    participantDays,
    totalExpenses,
    fixedAnnual,          // utilityFixed = baselinePerDay × 365
    participantEntries,
    roomBookings,
  );

  // Break-even (uses programPnL margins for the programs lever)
  const deficit = totalExpenses - totalRevenue;

  // Derive marginal food rate per participant-day from PnL for residency net contribution estimate.
  // foodCost is only non-zero for non-CABN programs, so divide by their participant-days.
  // This is exact: foodCost = foodMarginalRate × partDays for non-CABN, so the
  // reverse gives back the same rate used in computeProgramPnL.
  const pnlFoodTotal       = programPnL.reduce((s, p) => s + p.costs.foodCost, 0);
  const pnlNonCabnPartDays = programPnL
    .filter(p => (p.categoryCode ?? '').trim().toUpperCase() !== 'CABN')
    .reduce((s, p) => s + p.participantDays, 0);
  const foodMarginalRatePerDay = pnlNonCabnPartDays > 0 ? pnlFoodTotal / pnlNonCabnPartDays : 0;

  const breakEven = computeBreakEven(deficit, yearProgramRevenue, revenueStreams, programPnL, foodMarginalRatePerDay);

  // Program categories
  const programCategories = computeProgramCategories(programCatalog, yearProgramRevenue, year);

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
    revenueGapAmount,
    participantDays,
    programCount,
    seasonalDays,
    seasonalPrograms,
    utilityTotal,
    utilityFixed: fixedAnnual,
    utilityVariable: variableAnnual,
    utilityBaselineMonth: baselineMonth,
    utilityBaselineSpend: baselineSpend,
    utilityBaselinePerDay: baselinePerDay,
    seasonalUtility,
    seasonalMultipliers,
    ccFeeRate,
    ccFeeTotal,
    ccFeeBenchmarkRate,
    ccFeeExcessRate,
    ccFeeAlert,
    expenseCategories,
    totalExpenses,
    deficit,
    costPerDay: participantDays > 0 ? totalExpenses / participantDays : 0,
    totalRooms,
    staffRooms,
    availableRooms,
    dormBeds,
    cabinRoomCount,
    opportunityCostAnnual,
    avgStaffRoomRate,
    revpar,
    csvPayrollAnnualized,
    xeroPayrollActual,
    payrollGap,
    residentialStaffCount,
    nonResidentialStaffCount,
    topPrograms,
    revenueStreams,
    monthlyData,
    occupancy,
    volunteerMetrics,
    balanceSheet,
    donationBreakdown,
    arMetrics,
    discountSummary,
    recurringDonorSummary,
    programBillingSummary,
    roomTypeOccupancy,
    breakEven,
    programCategories,
    programPnL,
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
