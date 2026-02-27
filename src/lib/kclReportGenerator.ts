import type { KclAnnualDataset, KclComputedMetrics } from './kclTypes';
import { ALL_SOURCES, KCL_SOURCE_META, MONTH_NAMES } from './kclTypes';
import { fmt$, fmt$2, fmtPct, fmtN, fmtDate, mn, mdTable } from './kclExportUtils';
import {
  indicatorRevenueByAccount,
  indicatorRevPerParticipantDay,
  indicatorRevenueMix,
  indicatorDonorConcentration,
  indicatorRecurringYield,
  indicatorAttritionTimeline,
  indicatorFundNormalized,
  indicatorRegistrationRetention,
  indicatorProgramUtilization,
  indicatorCategoryStats,
  indicatorARaging,
  indicatorPayrollBurden,
  indicatorDailyCostPerResident,
  indicatorOverpaymentPosition,
} from './kclIndicators';

// ─── Report generator ─────────────────────────────────────────────────────────

export function generateKclReport(metrics: KclComputedMetrics, dataset: KclAnnualDataset): string {
  const { year } = metrics;
  const sections: string[] = [];

  const seasons = ['winter', 'spring', 'summer', 'fall'] as const;
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '\u2026' : s;

  const isDeficit = metrics.deficit > 0;
  const netLabel = isDeficit ? 'Net Deficit' : 'Net Surplus';
  const netValue = Math.abs(metrics.deficit);

  // ── 1. Header ──────────────────────────────────────────────────────────────

  const loadedSources = ALL_SOURCES.filter(k => dataset.sources[k].status === 'loaded');
  const generatedAt = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

  sections.push(
`# Karme Choling Financial Report — ${year}

**Generated:** ${generatedAt}
**Data Sources Loaded:** ${loadedSources.length} of ${ALL_SOURCES.length} (${loadedSources.map(k => KCL_SOURCE_META[k].label).join(', ')})

**Report purpose:** Comprehensive financial analysis of Karme Choling for ${year}. Intended as LLM context for financial planning conversations. All monetary figures in USD.

---`
  );

  // ── 2. Executive Summary ───────────────────────────────────────────────────

  sections.push(
`## Executive Summary

${mdTable(
  ['Metric', 'Value'],
  [
    ['Year', String(year)],
    ['Total Revenue (Xero GL)', fmt$(metrics.totalRevenue)],
    ['Total Expenses', fmt$(metrics.totalExpenses)],
    [netLabel, fmt$(netValue)],
    ['Program Count (strict-year)', fmtN(metrics.programCount)],
    ['Total Participant-Days', fmtN(metrics.participantDays)],
    ['Cost per Participant-Day', fmt$2(metrics.costPerDay)],
    ['Omnis Program Billing Total', fmt$(metrics.omnisBilledTotal)],
    ['Xero vs. Omnis Gap', fmt$(metrics.revenueGapAmount)],
    ['CC Fee Rate (effective)', fmtPct(metrics.ccFeeRate, 2)],
    ['CC Fee Alert', metrics.ccFeeAlert ? 'YES — rate exceeds 3.5%' : 'No'],
    ['Total Rooms (private)', fmtN(metrics.totalRooms)],
    ['Available Guest Rooms', fmtN(metrics.availableRooms)],
    ['REVPAR', fmt$2(metrics.revpar)],
  ]
)}

Karme Choling ran **${fmtN(metrics.programCount)} programs** in ${year} generating **${fmtN(metrics.participantDays)} participant-days** of activity. Total Xero revenue of **${fmt$(metrics.totalRevenue)}** against expenses of **${fmt$(metrics.totalExpenses)}** yields a **${isDeficit ? 'deficit' : 'surplus'} of ${fmt$(netValue)}**. The gap between Xero and Omnis billing (${fmt$(metrics.revenueGapAmount)}) reflects donations, residency revenue, and other income not routed through Omnis program billing.`
  );

  // ── 3. Revenue ─────────────────────────────────────────────────────────────

  const rs = metrics.revenueStreams;
  const totalDonations = rs.donationsUnrestricted + rs.donationsRestricted;
  const pctOfRev = (n: number) => fmtPct(metrics.totalRevenue > 0 ? n / metrics.totalRevenue : 0);

  sections.push(
`## Revenue

### Revenue Streams

${mdTable(
  ['Stream', 'GL Accounts', 'Amount', 'Share'],
  [
    ['Programs', '4300, 4310, 4510', fmt$(rs.programs), pctOfRev(rs.programs)],
    ['Residency', '4500, 4520', fmt$(rs.residency), pctOfRev(rs.residency)],
    ['Donations — Unrestricted', '4000, 4050, 4150', fmt$(rs.donationsUnrestricted), pctOfRev(rs.donationsUnrestricted)],
    ['Donations — Restricted', '4200', fmt$(rs.donationsRestricted), pctOfRev(rs.donationsRestricted)],
    ['Campaigns / Capital', '3xxx (excl. 3000)', fmt$(rs.campaigns), pctOfRev(rs.campaigns)],
    ['Other Income', 'remaining 4xxx', fmt$(rs.other), pctOfRev(rs.other)],
    ['**Total**', '', `**${fmt$(metrics.totalRevenue)}**`, '**100%**'],
  ]
)}

Donations total (unrestricted + restricted): **${fmt$(totalDonations)}** (${pctOfRev(totalDonations)} of total revenue). Capital contributions (GL 3xxx): **${fmt$(rs.campaigns)}** (${pctOfRev(rs.campaigns)} of total revenue) — restricted for capital purposes, not included in donations total.

${dataset.data.trialBalance.length > 0 ? indicatorRevenueByAccount(dataset.data.trialBalance) : ''}

### Xero vs. Omnis Reconciliation

Xero captures all cash received including donations and residency. Omnis records only charges billed through program registrations (GL 4xxx). The gap represents revenue outside Omnis program billing.

${mdTable(
  ['Source', 'Amount'],
  [
    ['Xero Total Revenue', fmt$(metrics.totalRevenue)],
    ['Omnis Program Billing Total', fmt$(metrics.omnisBilledTotal)],
    ['Gap (Xero minus Omnis)', fmt$(metrics.revenueGapAmount)],
  ]
)}

### Monthly Revenue and Expenses

${mdTable(
  ['Month', 'Programs', 'Residency', 'Donations', 'Campaigns', 'Total Revenue', 'Expenses', 'Monthly Net'],
  metrics.monthlyData.map(m => [
    mn(m.month),
    fmt$(m.revenuePrograms),
    fmt$(m.revenueResidency),
    fmt$(m.revenueDonations),
    fmt$(m.revenueCampaigns),
    fmt$(m.revenueTotal),
    fmt$(m.expenses),
    fmt$(m.revenueTotal - m.expenses),
  ])
)}

${indicatorRevenueMix(dataset.data.programRevenue)}`
  );

  // ── 4. Program Activity ────────────────────────────────────────────────────

  sections.push(
`## Program Activity

### Program Categories

Programs are classified by Omnis category code. REG = standard retreat programs, CABN = self-catering cabin retreats, IHR = in-house retreats / residency-linked programs.

${mdTable(
  ['Code', 'Category', 'Programs', 'Participant-Days', 'Total Revenue', 'Avg Revenue/Program', 'Total Duration (days)'],
  metrics.programCategories.map(c => [
    c.categoryCode,
    c.label,
    fmtN(c.count),
    fmtN(c.participantDays),
    fmt$(c.totalRevenue),
    fmt$(c.avgRevenuePerProgram),
    fmtN(c.totalDurationDays),
  ])
)}

${indicatorCategoryStats(dataset.data.programRevenue)}

### Seasonal Distribution

${mdTable(
  ['Season', 'Months', 'Participant-Days', 'Programs'],
  [
    ['Winter', 'Dec, Jan, Feb', fmtN(metrics.seasonalDays.winter), fmtN(metrics.seasonalPrograms.winter)],
    ['Spring', 'Mar, Apr, May', fmtN(metrics.seasonalDays.spring), fmtN(metrics.seasonalPrograms.spring)],
    ['Summer', 'Jun, Jul, Aug', fmtN(metrics.seasonalDays.summer), fmtN(metrics.seasonalPrograms.summer)],
    ['Fall',   'Sep, Oct, Nov', fmtN(metrics.seasonalDays.fall),   fmtN(metrics.seasonalPrograms.fall)],
  ]
)}

${indicatorRevPerParticipantDay(dataset.data.programRevenue, dataset.data.programCatalog)}

${indicatorRegistrationRetention(dataset.data.programCatalog)}

${indicatorProgramUtilization(dataset.data.programCatalog)}

### Top Programs by Revenue

${mdTable(
  ['Program', 'Cat', 'Start', 'End', 'Reg.', 'Revenue', 'Tuition', 'Accommodation'],
  metrics.topPrograms.slice(0, 20).map(p => [
    trunc(p.name, 42),
    p.categoryCode,
    fmtDate(p.startDate),
    fmtDate(p.endDate),
    fmtN(p.registrations),
    fmt$(p.totalRevenue),
    fmt$(p.tuitionRevenue),
    fmt$(p.accommodationRevenue),
  ])
)}

### Per-Program Contribution Margin

Direct costs per program: teacher compensation (GL 5250/5300/5350 attributed by date window), marginal food cost (above-baseline GL 5200 × participant-days; zero for CABN), scholarships/credits (COGS-SCH/COGS-PC; REG programs only, revenue-proportional), CC fees (effective rate × revenue), marginal utilities (above-baseline portion of each calendar month distributed proportionally by program overlap days). Overhead is the remaining fixed cost pool allocated proportionally by participant-days, excluding non-revenue residential tracking programs.

${mdTable(
  ['Program', 'Cat', 'Days', 'P-Days', 'Revenue', 'Teacher', 'Food', 'Scholarships', 'CC Fees', 'Utilities', 'Overhead', 'Margin', 'Margin %'],
  metrics.programPnL.map(p => [
    trunc(p.name, 38),
    p.categoryCode,
    fmtN(p.durationDays),
    fmtN(p.participantDays),
    fmt$(p.revenue),
    fmt$(p.costs.teacherCost),
    fmt$(p.costs.foodCost),
    fmt$(p.costs.scholarshipCost),
    fmt$(p.costs.ccFees),
    fmt$(p.costs.utilityMarginal),
    fmt$(p.costs.overheadAlloc),
    fmt$(p.contributionMargin),
    fmtPct(p.marginPct),
  ])
)}`
  );

  // ── 5. Expense Analysis ────────────────────────────────────────────────────

  sections.push(
`## Expense Analysis

### Expenses by GL Category

${mdTable(
  ['Category', 'GL Accounts', 'Type', 'Total', '% of Expenses', 'Per Participant-Day'],
  Object.entries(metrics.expenseCategories).map(([, cat]) => [
    cat.name,
    cat.glAccounts.join(', '),
    cat.type.replace(/_/g, ' '),
    fmt$(cat.total),
    fmtPct(metrics.totalExpenses > 0 ? cat.total / metrics.totalExpenses : 0),
    fmt$2(cat.perDay),
  ])
)}

**Total Expenses:** ${fmt$(metrics.totalExpenses)}
**Cost per Participant-Day:** ${fmt$2(metrics.costPerDay)}

### Payroll Analysis

${mdTable(
  ['Metric', 'Value'],
  [
    ['Xero Payroll Actual (GL 6105/6110/6114/6116)', fmt$(metrics.xeroPayrollActual)],
    ['CSV Salary File Annualized Total', fmt$(metrics.csvPayrollAnnualized)],
    ['Gap (CSV minus Xero)', fmt$(metrics.payrollGap)],
    ['Residential Staff Count', fmtN(metrics.residentialStaffCount)],
    ['Non-Residential Staff Count', fmtN(metrics.nonResidentialStaffCount)],
    ['Total Staff in Salary CSV', fmtN(metrics.residentialStaffCount + metrics.nonResidentialStaffCount)],
  ]
)}

${Math.abs(metrics.payrollGap) > 1000
  ? `The payroll gap of ${fmt$(Math.abs(metrics.payrollGap))} (${metrics.payrollGap > 0 ? 'CSV exceeds Xero' : 'Xero exceeds CSV'}) primarily reflects employer benefits — GL 6110 (payroll taxes ~7.65%), GL 6114 (health insurance), and GL 6116 (retirement contributions) — which add 20–30% above base salary in Xero but are not included in the salary CSV annual_salary column. A Xero-exceeds-CSV gap is structurally expected for a fully-staffed organization.`
  : 'Payroll CSV and Xero figures are closely aligned.'}

${dataset.data.staffSalaries.length > 0 ? indicatorPayrollBurden(dataset.data.staffSalaries, metrics.balanceSheet?.trialRevenue ?? metrics.totalRevenue) : ''}

${dataset.data.residentialRoster.length > 0 && dataset.data.trialBalance.length > 0 ? indicatorDailyCostPerResident(dataset.data.residentialRoster, dataset.data.trialBalance) : ''}

### Utility Analysis

Utilities (GL 6270 heating/electric, GL 6250 phone/internet) are split into a fixed baseline component (average daily rate of the 3 lowest-spend months × 365) and a variable component driven by occupancy and season.

${mdTable(
  ['Metric', 'Value'],
  [
    ['Annual Utility Total', fmt$(metrics.utilityTotal)],
    ['Fixed Component (3-month avg daily rate × 365)', fmt$(metrics.utilityFixed)],
    ['Variable Component', fmt$(metrics.utilityVariable)],
    ['Baseline Month (lowest spend)', `${mn(metrics.utilityBaselineMonth)} — ${fmt$(metrics.utilityBaselineSpend)}/month`],
    ['Variable as % of Total', fmtPct(metrics.utilityTotal > 0 ? metrics.utilityVariable / metrics.utilityTotal : 0)],
  ]
)}

**Seasonal utility multipliers** (average monthly spend in season relative to baseline month):

${mdTable(
  ['Season', 'Seasonal Total', 'Avg Monthly', 'Multiplier vs. Baseline'],
  seasons.map(s => [
    capitalize(s),
    fmt$(metrics.seasonalUtility[s]),
    fmt$(metrics.seasonalUtility[s] / 3),
    `${metrics.seasonalMultipliers[s].toFixed(2)}x`,
  ])
)}

### Credit Card Fee Analysis

${mdTable(
  ['Metric', 'Value'],
  [
    ['Effective CC Fee Rate (GL 6100_1 \u00f7 GL 4xxx revenue)', fmtPct(metrics.ccFeeRate, 2)],
    ['Total CC Fees Paid', fmt$(metrics.ccFeeTotal)],
    ['Industry Benchmark Rate', fmtPct(metrics.ccFeeBenchmarkRate, 1)],
    ['Excess Rate above Benchmark', fmtPct(metrics.ccFeeExcessRate, 2)],
    ['Alert Threshold Exceeded (>3.5%)', metrics.ccFeeAlert ? 'YES' : 'No'],
  ]
)}

${metrics.ccFeeAlert
  ? `**Alert:** The effective CC fee rate of ${fmtPct(metrics.ccFeeRate, 2)} exceeds the 3.5% alert threshold. This warrants reviewing payment processor contracts, negotiating rates, and encouraging participants to pay by ACH or check.`
  : `CC fee rate is within an acceptable range relative to the ${fmtPct(metrics.ccFeeBenchmarkRate, 1)} industry benchmark.`}`
  );

  // ── 6. Capacity & Accommodation ────────────────────────────────────────────

  sections.push(
`## Accommodation and Capacity

Karme Choling's room inventory includes private rooms (Premium, Standard, Double, Accessibility), dorm-style beds, tent cabins, and other accommodation. REVPAR is calculated as (residency revenue + total program revenue, GL 4300/4310/4510) divided by (available private rooms × 365 days).

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Private Rooms', fmtN(metrics.totalRooms)],
    ['Staff-Occupied Private Rooms', fmtN(metrics.staffRooms)],
    ['Available Guest Rooms', fmtN(metrics.availableRooms)],
    ['Dorm Beds', fmtN(metrics.dormBeds)],
    ['Tent Cabin Spaces', fmtN(metrics.cabinRoomCount)],
    ['Avg Staff Room Rate (single occupancy)', fmt$2(metrics.avgStaffRoomRate)],
    ['REVPAR', fmt$2(metrics.revpar)],
    ['Annual Staff-Room Opportunity Cost', fmt$(metrics.opportunityCostAnnual)],
  ]
)}

The opportunity cost of ${fmt$(metrics.opportunityCostAnnual)} represents the estimated revenue forgone by allocating ${fmtN(metrics.staffRooms)} private rooms to residential staff rather than guest use at single-occupancy rack rates (avg ${fmt$2(metrics.avgStaffRoomRate)}/night). This is a conservative estimate — double rooms at shared occupancy could yield more per night.

  );

  // ── 7. Residential Population ──────────────────────────────────────────────

  if (metrics.volunteerMetrics && metrics.occupancy) {
    const vm = metrics.volunteerMetrics;
    const occ = metrics.occupancy;
    const totalPeople = vm.staffCount + vm.volunteerCount + vm.residencyCount;
    const totalDays   = vm.staffDays   + vm.volunteerDays   + vm.residencyDays;

    sections.push(
`## Residential Population

Karme Choling hosts three on-site residential tracks year-round: permanent staff, work-study volunteers, and residency program participants. Days are clamped to the calendar year and computed from actual arrival/departure dates in the Omnis database.

### Population by Track

${mdTable(
  ['Track', 'Headcount', 'Total Days in Year', 'Avg Days/Person'],
  [
    ['Residential Staff',        fmtN(vm.staffCount),     fmtN(vm.staffDays),     vm.staffCount     > 0 ? (vm.staffDays     / vm.staffCount).toFixed(0)     : '—'],
    ['Work-Study Volunteers',    fmtN(vm.volunteerCount), fmtN(vm.volunteerDays), vm.volunteerCount > 0 ? (vm.volunteerDays / vm.volunteerCount).toFixed(0) : '—'],
    ['Residency Participants',   fmtN(vm.residencyCount), fmtN(vm.residencyDays), vm.residencyCount > 0 ? (vm.residencyDays / vm.residencyCount).toFixed(0) : '—'],
    ['**Total**', `**${fmtN(totalPeople)}**`, `**${fmtN(totalDays)}**`, ''],
  ]
)}

**Implied full-year resident equivalents (from residency revenue):** ${fmtN(occ.impliedResidents)} (residency GL revenue ÷ $21,000/yr — full-year equivalents, not headcount)
**Estimated volunteer labor value:** ${fmt$(vm.estimatedLaborValue)} (${fmtN(vm.volunteerDays)} volunteer-days × $${vm.laborValuePerDay}/day equivalent)
**Average monthly resident headcount:** ${occ.avgMonthlyResidents.toFixed(1)}
**Total resident-days across all tracks:** ${fmtN(occ.totalResidentDays)}

### Monthly Residential Headcount by Track

${mdTable(
  ['Month', 'Staff', 'Volunteers', 'Residency', 'Total'],
  Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const track = occ.monthlyByTrack[m];
    const total = occ.monthlyResidents[m];
    return [mn(m), fmtN(track.staff), fmtN(track.volunteers), fmtN(track.residency), fmtN(total)];
  })
)}`
    );
  }

  // ── 8. Donations ───────────────────────────────────────────────────────────

  if (metrics.donationBreakdown) {
    const db = metrics.donationBreakdown;

    const donationSection: string[] = [
`## Donations

Donation data sourced from Omnis. Cancelled and voided donations are excluded from totals.

### Summary

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Pledged', fmt$2(db.totalPledged)],
    ['Total Paid', fmt$2(db.totalPaid)],
    ['Payment Rate (Paid / Pledged)', fmtPct(db.paymentRate)],
    ['Monthly / Recurring Donations', fmtN(db.monthlyCount)],
    ['One-Time Donations', fmtN(db.oneTimeCount)],
    ['Cancelled (excluded)', fmtN(db.cancelledCount)],
    ['Voided (excluded)', fmtN(db.voidCount)],
  ]
)}

### By Fund

${mdTable(
  ['Fund', 'GL Account', 'Pledged', 'Paid', 'Payment Rate', 'Transactions'],
  db.funds.map(f => [
    f.fundName,
    f.glAccount,
    fmt$2(f.totalPledged),
    fmt$2(f.totalPaid),
    fmtPct(f.totalPledged > 0 ? f.totalPaid / f.totalPledged : 0),
    fmtN(f.transactionCount),
  ])
)}`
    ];

    const fundNormalized = indicatorFundNormalized(dataset.data.donations);
    if (fundNormalized) donationSection.push(fundNormalized);

    if (dataset.data.recurringDonors.length > 0) {
      const concentration = indicatorDonorConcentration(dataset.data.recurringDonors);
      if (concentration) donationSection.push(concentration);
    }

    const recYield = indicatorRecurringYield(dataset.data.donations);
    if (recYield) donationSection.push(recYield);

    const attrition = indicatorAttritionTimeline(dataset.data.donations, year);
    if (attrition) donationSection.push(attrition);

    if (metrics.recurringDonorSummary) {
      const rd = metrics.recurringDonorSummary;
      donationSection.push(
`### Recurring Donor Base (Cash Received from Omnis)

These are donors enrolled in a recurring (monthly or scheduled) giving plan in Omnis. Anchored on payment date within the year.

${mdTable(
  ['Metric', 'Value'],
  [
    ['Donors Who Made Payments', fmtN(rd.donorCount)],
    ['Total Cash Received', fmt$2(rd.totalPaid)],
    ['Avg Payments per Donor', rd.avgPaymentsPerDonor.toFixed(1)],
    ['Avg Amount per Donor', fmt$2(rd.avgAmountPerDonor)],
  ]
)}

**Top donors by cash received:**

${mdTable(
  ['Donor', 'Payments Made', 'Total Paid'],
  rd.topDonors.map(d => [d.donorName, fmtN(d.payments), fmt$2(d.totalPaid)])
)}`
      );
    }

    sections.push(donationSection.join('\n\n'));
  }

  // ── 9. Accounts Receivable ─────────────────────────────────────────────────

  if (metrics.arMetrics) {
    const ar = metrics.arMetrics;

    sections.push(
`## Accounts Receivable

AR data sourced from Omnis program registrations. "Charged" = amounts billed via Omnis transactions; "Paid" = cash collected against those charges.

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Charged (Omnis)', fmt$2(ar.totalCharged)],
    ['Total Paid', fmt$2(ar.totalPaid)],
    ['Total Outstanding', fmt$2(ar.totalOutstanding)],
    ['Collection Rate (Paid / Charged)', fmtPct(ar.collectionRate)],
    ['Participants with Unpaid Balances', fmtN(ar.debtorCount)],
  ]
)}

A collection rate of ${fmtPct(ar.collectionRate)} means ${fmtPct(1 - ar.collectionRate)} of billed amounts remain uncollected. Outstanding balances may include scholarship arrangements, payment plans, and genuine bad debt.

${indicatorARaging(dataset.data.outstandingAr, year)}

${dataset.data.allRegistrations.length > 0 ? indicatorOverpaymentPosition(dataset.data.allRegistrations) : ''}

### Top Unpaid Balances

${mdTable(
  ['Participant', 'Program', 'Outstanding'],
  ar.topDebtors.map(d => [d.participantName, trunc(d.programName, 40), fmt$2(d.outstanding)])
)}`
    );
  }

  // ── 10. Program Billing and Discounts ──────────────────────────────────────

  const billingParts: string[] = [];

  if (metrics.programBillingSummary) {
    const pb = metrics.programBillingSummary;
    billingParts.push(
`## Program Billing and Discounts

### Billing Summary (Omnis — Charges Billed)

Includes all active registrations with charges, regardless of payment status. Complements the Recurring Donors section (cash received).

${mdTable(
  ['Metric', 'Value'],
  [
    ['Billed Participants', fmtN(pb.personCount)],
    ['Total Charged', fmt$2(pb.totalCharged)],
    ['Avg Charge per Person', fmt$2(pb.avgChargePerPerson)],
    ['Avg Registrations per Person', pb.avgRegistrationsPerPerson.toFixed(1)],
  ]
)}

**Top billed participants:**

${mdTable(
  ['Participant', 'Registrations', 'Total Charged'],
  pb.topBilled.map(p => [p.participantName, fmtN(p.registrations), fmt$2(p.totalCharged)])
)}`
    );
  }

  if (metrics.discountSummary) {
    const ds = metrics.discountSummary;
    billingParts.push(
`### Discount Analysis (Omnis Program Transactions)

Discounts applied at the transaction level in Omnis reduce effective revenue. These are scholarships, staff rates, and other concessions.

${mdTable(
  ['Metric', 'Value'],
  [
    ['Gross Billed (before discounts)', fmt$2(ds.totalAmount)],
    ['Total Discounts Applied', fmt$2(ds.totalDiscount)],
    ['Net Revenue (after discounts)', fmt$2(ds.netRevenue)],
    ['Overall Discount Rate', fmtPct(ds.discountRate)],
  ]
)}

**By program category:**

${mdTable(
  ['Category', 'Gross Billed', 'Discounts', 'Discount Rate'],
  ds.byCategory.map(c => [
    `${c.categoryCode} — ${c.label}`,
    fmt$2(c.totalAmount),
    fmt$2(c.totalDiscount),
    fmtPct(c.discountRate),
  ])
)}`
    );
  }

  if (billingParts.length > 0) {
    sections.push(billingParts.join('\n\n'));
  }

  // ── 11. Balance Sheet ──────────────────────────────────────────────────────

  if (metrics.balanceSheet) {
    const bs = metrics.balanceSheet;

    sections.push(
`## Balance Sheet Snapshot (Xero Trial Balance)

The trial balance provides a point-in-time snapshot of Karme Choling's financial position. Key items below are not visible in the GL transaction export alone.

### Income Statement (from Trial Balance)

${mdTable(
  ['Line Item', 'Amount'],
  [
    ['Total Revenue (all revenue accounts)', fmt$2(bs.trialRevenue)],
    ['Total Expenses (all expense accounts)', fmt$2(bs.trialExpenses)],
    ['Net Income', fmt$2(bs.trialNetIncome)],
    ['Depreciation (GL 6130)', fmt$2(bs.depreciation)],
  ]
)}

### Key Balance Sheet Positions

${mdTable(
  ['Account', 'Balance'],
  [
    ['Cash and Bank Accounts (GL 1000–1009)', fmt$2(bs.cashAndBanks)],
    ['Investment Account / Schwab (GL 1005)', fmt$2(bs.investmentAccount)],
    ['Program Deposits / Deferred Revenue (GL 2010)', fmt$2(bs.programDeposits)],
    ['Mortgage Payable (GL 2500)', fmt$2(bs.mortgage)],
    ['SBA Loan Payable (GL 2501)', fmt$2(bs.sbaLoan)],
    ['Retained Earnings (GL 3000)', fmt$2(bs.retainedEarnings)],
  ]
)}

### Summary

${mdTable(
  ['', 'Amount'],
  [
    ['Total Assets', fmt$2(bs.totalAssets)],
    ['Total Liabilities', fmt$2(bs.totalLiabilities)],
    ['Total Equity', fmt$2(bs.totalEquity)],
  ]
)}

**Program deposits** of ${fmt$2(bs.programDeposits)} represent pre-paid registration revenue not yet earned — a liability on the balance sheet that converts to income as programs are delivered. This figure indicates near-term revenue visibility.

### Implied Net Operating Margin

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Revenue (trial balance)', fmt$2(bs.trialRevenue)],
    ['Total Expenses (trial balance)', fmt$2(bs.trialExpenses)],
    ['Net Operating Income', fmt$2(bs.trialNetIncome)],
    ['Operating Margin', fmtPct(bs.trialRevenue > 0 ? bs.trialNetIncome / bs.trialRevenue : 0)],
    ['Monthly Expense Rate (expenses \u00f7 12)', fmt$2(bs.trialExpenses / 12)],
    ['Revenue per Dollar of Expense', bs.trialExpenses > 0 ? (bs.trialRevenue / bs.trialExpenses).toFixed(3) : '\u2014'],
  ]
)}`
    );
  }

  // ── 12. Break-Even Analysis ────────────────────────────────────────────────

  const be = metrics.breakEven;

  sections.push(
`## Break-Even Analysis

${isDeficit
  ? `Karme Choling ran a deficit of **${fmt$(netValue)}** in ${year}. The three independent scenarios below each describe a single lever sufficient to close the entire deficit.`
  : `Karme Choling operated at a **surplus of ${fmt$(netValue)}** in ${year}. Break-even has been achieved; the scenarios below show the margin of cushion.`}

${mdTable(
  ['Metric', 'Value'],
  [
    [isDeficit ? 'Deficit to Close' : 'Surplus', fmt$(netValue)],
    ['Avg Revenue per Program', fmt$(be.avgProgramRevenue)],
    ['Annual Revenue per Full-Year Resident ($1,750/month, gross)', fmt$(be.residencyRevenuePerResident)],
    ['Total Donation Revenue (unrestricted + restricted, GL 4000–4200)', fmt$(be.totalDonationRevenue)],
  ]
)}

${isDeficit
  ? `### Scenarios to Close the Deficit

${mdTable(
  ['Lever', 'Requirement', 'Basis'],
  [
    [
      'Additional full-year residential participants',
      `${fmtN(be.residentsNeeded)} residents`,
      `${fmtN(be.residentsNeeded)} × ${fmt$(be.residencyNetPerResident)}/yr net est. (${fmt$(be.residencyRevenuePerResident)} gross − est. annual food cost)`,
    ],
    [
      'Additional programs at avg direct contribution margin',
      `${fmtN(be.programsNeeded)} programs`,
      `${fmtN(be.programsNeeded)} × ${fmt$(be.avgDirectContributionMargin)} avg direct margin (revenue − teacher, food, CC, scholarship, utility)`,
    ],
    [
      'Increase in existing donation base (unrestricted only)',
      fmtPct(be.donationIncreasePct),
      `${fmtPct(be.donationIncreasePct)} increase on unrestricted base of ${fmt$(be.unrestrictedDonationRevenue)}`,
    ],
  ]
)}

These scenarios are independent — any proportional combination of the three levers reduces the requirement accordingly.`
  : `The surplus of ${fmt$(netValue)} provides a buffer equivalent to ${fmtN(Math.floor(netValue / (be.residencyNetPerResident || 1)))} additional full-year residents' worth of net contribution headroom (using ${fmt$(be.residencyNetPerResident)}/yr net est. per resident).`}`
  );

  // ── 13. Data Sources & Limitations ────────────────────────────────────────

  sections.push(
`## Data Sources and Limitations

### Sources Loaded for This Report

${mdTable(
  ['Source', 'Status', 'Records', 'File', 'Required'],
  ALL_SOURCES.map(k => {
    const s = dataset.sources[k];
    const meta = KCL_SOURCE_META[k];
    return [
      meta.label,
      s.status === 'loaded' ? 'Loaded' : s.status === 'error' ? 'Error' : 'Not loaded',
      s.status === 'loaded' ? fmtN(s.recordCount) : '—',
      s.fileName ?? '—',
      meta.required ? 'Required' : 'Optional',
    ];
  })
)}

### Data Gaps and Caveats

${metrics.dataGaps.length > 0
  ? metrics.dataGaps.map(g => `- ${g}`).join('\n')
  : '_No data gaps identified. All tracked sources are loaded._'}

### Methodology Notes

- **Strict-year filter:** Programs are included only when both start and end dates fall within the calendar year ${year}. Programs spanning year boundaries are excluded.
- **Revenue recognition:** Xero records cash received on the collection date. Omnis records charges when billed. The two systems diverge by timing, donations, and residency income.
- **Contribution margin:** Teacher costs are attributed to REG programs via a first-claim date-window algorithm (program start −7 to end +3 days). Food costs are marginal above a 3-month baseline (zero for CABN). Scholarships/credits (COGS-SCH/COGS-PC) are attributed to REG programs only, proportional to revenue. Utility marginals are distributed across programs proportionally by their overlap days in each calendar month. Overhead is the remaining fixed cost pool allocated proportionally by participant-days, excluding non-revenue residential tracking programs.
- **Occupancy:** Monthly headcounts count a person in a month if their stay overlaps any day of that month (exclusive of departure day, matching SQL DATEDIFF semantics).
- **Volunteer labor value:** Estimated at $${metrics.volunteerMetrics?.laborValuePerDay ?? 150}/day (Vermont minimum wage equivalent × 8 hours plus housing/food offset).
- **REVPAR:** Calculated as (residency + program revenue) / (available private rooms × 365). Only private room types are counted (Premium, Standard, Double, Accessibility).`
  );

  return sections.join('\n\n');
}
