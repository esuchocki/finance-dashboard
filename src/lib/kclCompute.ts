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
import { strictYearFilter, CC_BENCHMARK_RATE } from './kclComputeUtils';
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
  computeRoomTypeOccupancy,
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

  // Prefer allRegistrations over outstandingAr for participant data.
  const participantEntries = allRegistrations.length > 0 ? allRegistrations : arEntries;

  // Revenue
  const totalRevenue = computeRevenue(glTransactions, year);
  const revenueStreams = computeRevenueStreams(glTransactions, year);

  // Year-filtered program revenue
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

  // Accounts receivable health
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
    fixedAnnual,
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
  const residencyIhrRevenue = programCategories.find(c => c.categoryCode.toUpperCase() === 'IHR')?.totalRevenue ?? 0;

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
    residencyIhrRevenue,
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
