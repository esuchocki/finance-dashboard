/**
 * KCL Computed Metrics — orchestrator
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
} from './kclTypes';
import { strictYearFilter, CC_BENCHMARK_RATE, normalizePersonName, rosterTrack } from './kclComputeUtils';
import {
  computeRevenue,
  computeRevenueStreams,
  computeMonthlyData,
  computeUtilityBaseline,
  computeSeasonalUtility,
  computeCcFeeRate,
  computeExpenseCategories,
  computeParticipantDays,
  computeCapacity,
  computePayroll,
  buildTopPrograms,
  identifyDataGaps,
} from './kclComputeCore';
import { computeProgramPnL, computeProgramCategories } from './kclComputePrograms';
import {
  computeOccupancy,
  computeVolunteerMetrics,
  computeBreakEven,
  computeTrialBalanceSummary,
  computeDonationBreakdown,
  computeArMetrics,
  computeDiscountSummary,
  computeRecurringDonorSummary,
  computeProgramBillingSummary,
} from './kclComputeSupplementary';

export { fmtCurrency, fmtPct, fmtMonth } from './kclFormatters';

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

  // Build a name → employment period map from staff salaries for AR exclusion.
  // Names in the salary CSV may be "First Last" or "Last, First"; both are
  // normalised to lowercase "first last" for comparison against Omnis names.
  // If a staff entry carries no dates, the person is excluded for the full year.
  // If dates are present, only AR entries whose program period overlaps with the
  // employment period are excluded — allowing for mid-year staff changes.
  const staffByName = new Map<string, { startDate?: string; endDate?: string }>();
  for (const s of staffSalaries) {
    staffByName.set(normalizePersonName(s.name), { startDate: s.startDate, endDate: s.endDate });
  }

  const baseEntries = allRegistrations.length > 0 ? allRegistrations : arEntries;
  const participantEntries = baseEntries.filter(e => {
    const staff = staffByName.get(normalizePersonName(e.participantName));
    if (!staff) return true;
    if (!staff.startDate && !staff.endDate) return false; // full-year exclusion
    // Date-range exclusion: drop entry only when program overlaps employment period.
    const empStart  = staff.startDate ?? `${year}-01-01`;
    const empEnd    = staff.endDate   ?? `${year + 1}-01-01`;
    const progStart = e.startDate     || `${year}-01-01`;
    const progEnd   = e.endDate       || `${year + 1}-01-01`;
    return !(progStart < empEnd && progEnd > empStart);
  });
  const staffExcludedCount = baseEntries.length - participantEntries.length;

  // Revenue
  const totalRevenue = computeRevenue(glTransactions, year);
  const revenueStreams = computeRevenueStreams(glTransactions, year);

  // Year-filtered program revenue
  const yearProgramRevenue = programRevenue.filter(r => strictYearFilter(r.startDate, r.endDate, year));

  // Omnis billed total
  const omnisBilledTotal = yearProgramRevenue.reduce((s, p) => s + p.totalRevenue, 0);

  // Set of program IDs with revenue — used to exclude non-revenue residential tracking programs.
  const revenueIds = new Set(yearProgramRevenue.map(r => r.programId).filter(Boolean));

  // Participation (excludes non-revenue residential programs from overhead denominator)
  const { total: participantDays, count: programCount, seasonalDays, seasonalPrograms } =
    computeParticipantDays(programCatalog, year, revenueIds);

  // Utilities
  const {
    fixedAnnual, variableAnnual, baselineMonth, baselineSpend, baselinePerDay,
    annualTotal: utilityTotal, monthly: utilityMonthly,
  } = computeUtilityBaseline(glTransactions, year);
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

  // Cost-per-day population segments ──────────────────────────────────────────
  // retreatDays: non-residential programs (regular retreats, IHR, cabins).
  // residentDays: residential programs that have revenue (Residency Program).
  //   retreatDays + residentDays = participantDays (the existing blended denominator).
  // staffVolunteerDays: residential staff + volunteer person-days from the roster.
  //   The roster is the authoritative source here — it uses calendar-year-clamped
  //   arrival/departure dates, and these programs are excluded from participantDays.
  const retreatDays = programCatalog
    .filter(p => strictYearFilter(p.startDate, p.endDate, year) && !p.isResidential)
    .reduce((s, p) => s + p.participantDays, 0);
  const residentDays = programCatalog
    .filter(p => strictYearFilter(p.startDate, p.endDate, year) && !!p.isResidential && revenueIds.has(p.programId))
    .reduce((s, p) => s + p.participantDays, 0);
  const staffVolunteerDays = residentialRoster
    .filter(e => rosterTrack(e) !== 'residency')
    .reduce((s, e) => s + e.daysInYear, 0);

  // Scenario cost-per-day metrics.
  // Each answers: "if this were the only population, what would totalExpenses
  // cost per person-day?" Staff/volunteer is expressed as negative because it
  // represents a pure cost burden — they incur expenses but generate no revenue.
  const costPerDayRetreat   = retreatDays        > 0 ? totalExpenses / retreatDays        : 0;
  const costPerDayResident  = residentDays       > 0 ? totalExpenses / residentDays       : 0;
  const costPerDayStaff     = staffVolunteerDays > 0 ? -(totalExpenses / staffVolunteerDays) : 0;

  // Marginal cost per day: only costs that scale with participant activity
  // (food, teacher compensation, scholarships) plus the variable portion of
  // utilities. Fixed overhead (payroll, insurance, facilities, admin, etc.)
  // is excluded — these are sunk costs that don't change with one more guest.
  const marginalExpenses =
    Object.values(expenseCategories)
      .filter(c => c.type === 'variable' || c.type === 'program_specific')
      .reduce((s, c) => s + c.total, 0)
    + variableAnnual; // variable portion of utilities (semi_variable — above baseline)
  const marginalCostPerDay = participantDays > 0 ? marginalExpenses / participantDays : 0;

  // Payroll actual (Xero)
  const xeroPayrollActual = expenseCategories['payroll']?.total ?? 0;

  // Capacity
  const { totalRooms, staffRooms, availableRooms, dormBeds, cabinRoomCount, opportunityCostAnnual, avgStaffRoomRate } =
    computeCapacity(roomInventory, roomBookings);

  // Payroll cross-reference
  const { csvPayrollAnnualized, payrollGap, residentialStaffCount, nonResidentialStaffCount } =
    computePayroll(staffSalaries, residentialRoster, xeroPayrollActual);

  // Per-program
  const topPrograms = buildTopPrograms(yearProgramRevenue);

  // Monthly breakdown
  const monthlyData = computeMonthlyData(glTransactions, year, yearProgramRevenue.length > 0 ? yearProgramRevenue : undefined);

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

  // Accounts receivable health
  const arMetrics = participantEntries.length > 0
    ? { ...computeArMetrics(participantEntries), staffExcludedCount }
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

  // CC fee benchmark
  const ccFeeBenchmarkRate = CC_BENCHMARK_RATE;
  const ccFeeExcessRate = Math.max(0, ccFeeRate - CC_BENCHMARK_RATE);
  const ccFeeAlert = ccFeeRate > 0.035;

  // REVPAR: room + residency revenue per available room-night
  const revpar = availableRooms > 0
    ? (revenueStreams.residency + revenueStreams.programs) / (availableRooms * 365)
    : 0;

  // Revenue recognition gap
  const revenueGapAmount = totalRevenue - omnisBilledTotal;

  // Per-program contribution margin
  const programPnL = computeProgramPnL(
    year,
    yearProgramRevenue,
    programCatalog,
    glTransactions,
    ccFeeRate,
    utilityMonthly,
    baselinePerDay,
    participantDays,
    totalExpenses,
    participantEntries,
    roomBookings,
  );

  // Break-even
  const deficit = totalExpenses - totalRevenue;

  const pnlFoodTotal       = programPnL.reduce((s, p) => s + p.costs.foodCost, 0);
  const pnlNonCabnPartDays = programPnL
    .filter(p => (p.categoryCode ?? '').trim().toUpperCase() !== 'CABN')
    .reduce((s, p) => s + p.participantDays, 0);
  const foodMarginalRatePerDay = pnlNonCabnPartDays > 0 ? pnlFoodTotal / pnlNonCabnPartDays : 0;

  const breakEven = computeBreakEven(deficit, yearProgramRevenue, revenueStreams, programPnL, foodMarginalRatePerDay);

  // Program categories
  const programCategories = computeProgramCategories(programCatalog, yearProgramRevenue, year);
  // Revenue from programs whose name contains "residency program" — these are the long-term
  // tenants registered as a program in Omnis (mirrors the rosterTrack 'residency' logic).
  const residencyResidentsBilled = yearProgramRevenue
    .filter(r => r.programName.toLowerCase().includes('residency program'))
    .reduce((s, r) => s + r.totalRevenue, 0);

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
    retreatDays,
    residentDays,
    staffVolunteerDays,
    costPerDayRetreat,
    costPerDayResident,
    costPerDayStaff,
    marginalCostPerDay,
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
    residencyResidentsBilled,
    monthlyData,
    occupancy,
    volunteerMetrics,
    balanceSheet,
    donationBreakdown,
    arMetrics,
    discountSummary,
    recurringDonorSummary,
    programBillingSummary,
    breakEven,
    programCategories,
    programPnL,
    dataGaps,
  };
}
