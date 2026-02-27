import type { KclAnnualDataset, KclComputedMetrics } from './kclTypes';
import { MONTH_NAMES } from './kclTypes';
import type { CsvCell, CsvRows } from './kclExportUtils';
import {
  indexByMonth,
  monthlyExpenseGL,
  monthlyRevenueGL,
  residencyParticipantNights,
  daysInMonth,
} from './kclExportUtils';

// ─── CSV builder: Monthly Summary ─────────────────────────────────────────────

export function buildMonthlySummary(metrics: KclComputedMetrics, dataset: KclAnnualDataset): CsvRows {
  const { year, monthlyData, availableRooms, balanceSheet } = metrics;
  const txns = dataset.data.glTransactions;
  const mdByMonth = indexByMonth(monthlyData);
  const payroll = monthlyExpenseGL(txns, year, ['6105', '6110', '6114', '6116']);

  // Person-nights per month from residency-track roster only.
  const rosterNights = dataset.data.residentialRoster.length > 0
    ? residencyParticipantNights(dataset.data.residentialRoster, year)
    : null;

  const avgMonthlyExpenses = metrics.totalExpenses / 12;
  // Exclude the Schwab investment account (GL 1005) from liquid cash.
  const cash = balanceSheet != null
    ? balanceSheet.cashAndBanks - balanceSheet.investmentAccount
    : null;

  const rows: CsvRows = [[
    'Month', 'Total Revenue', 'Total Expenses', 'Net Operating Income',
    'Payroll % of Revenue', 'Residency Occupancy % (residency-track nights only)',
    'Liquid Cash on Hand', 'Months of Liquid Cash',
    'YTD Revenue', 'Target', 'Variance',
  ]];

  let ytd = 0;
  for (let m = 1; m <= 12; m++) {
    const md  = mdByMonth[m];
    ytd += md.revenueTotal;
    const payrollPct = md.revenueTotal > 0 ? +((payroll[m] / md.revenueTotal) * 100).toFixed(2) : '';
    const bedAvail = availableRooms * daysInMonth(year, m);
    const occPct = rosterNights && bedAvail > 0
      ? +((rosterNights[m] / bedAvail) * 100).toFixed(2) : '';
    const cashVal      = m === 12 && cash !== null ? +cash.toFixed(2) : '';
    const monthsCash   = m === 12 && cash !== null && avgMonthlyExpenses > 0
      ? +(cash / avgMonthlyExpenses).toFixed(2) : '';
    rows.push([
      MONTH_NAMES[m],
      +md.revenueTotal.toFixed(2),
      +md.expenses.toFixed(2),
      +(md.revenueTotal - md.expenses).toFixed(2),
      payrollPct,
      occPct,
      cashVal,
      monthsCash,
      +ytd.toFixed(2),
      '', '',
    ]);
  }
  return rows;
}

// ─── CSV builder: Monthly P&L ─────────────────────────────────────────────────

export function buildMonthlyPnL(metrics: KclComputedMetrics, dataset: KclAnnualDataset): CsvRows {
  const { year, monthlyData } = metrics;
  const txns    = dataset.data.glTransactions;
  const mdByMonth = indexByMonth(monthlyData);
  const months  = Array.from({ length: 12 }, (_, i) => i + 1);

  // Revenue splits (monthly)
  const donUnrestricted = monthlyRevenueGL(txns, year, ['4000', '4050', '4150']);
  const donRestricted   = monthlyRevenueGL(txns, year, ['4200']);

  // Expense splits (monthly)
  const payroll     = monthlyExpenseGL(txns, year, ['6105', '6110', '6114', '6116']);
  const food        = monthlyExpenseGL(txns, year, ['5200']);
  const utilities   = monthlyExpenseGL(txns, year, ['6270', '6250']);
  const insurance   = monthlyExpenseGL(txns, year, ['6150']);
  const maintenance = monthlyExpenseGL(txns, year, ['6210', '6190', '6200']);
  const teachers    = monthlyExpenseGL(txns, year, ['5250', '5300', '5350']);
  const admin       = monthlyExpenseGL(txns, year, ['6240', '6120', '6170', '6160', '6180', '6260', '6230']);

  // "Other" expenses = total expenses minus all named categories
  const otherExp: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    const tracked = payroll[m] + food[m] + utilities[m] + insurance[m] + maintenance[m] + teachers[m] + admin[m];
    otherExp[m] = +(mdByMonth[m].expenses - tracked).toFixed(2);
  }

  // "Farm / Retail / Other" = everything in revenue not accounted for by named streams.
  const farmOther: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    const md = mdByMonth[m];
    farmOther[m] = +(
      md.revenueTotal - md.revenuePrograms - md.revenueResidency
      - donUnrestricted[m] - donRestricted[m] - md.revenueCampaigns
    ).toFixed(2);
  }

  const r = (label: string, vals: Record<number, number>): CsvCell[] =>
    [label, ...months.map(m => +vals[m].toFixed(2))];

  const zeros = Object.fromEntries(months.map(m => [m, 0]));

  return [
    ['', ...months.map(m => MONTH_NAMES[m])],
    r('Revenue (Total)',          Object.fromEntries(months.map(m => [m, mdByMonth[m].revenueTotal]))),
    r('Tuition',                  Object.fromEntries(months.map(m => [m, mdByMonth[m].revenuePrograms]))),
    r('Room & Board',             Object.fromEntries(months.map(m => [m, mdByMonth[m].revenueResidency]))),
    r('Donations - Unrestricted', donUnrestricted),
    r('Donations - Restricted',   donRestricted),
    r('Campaigns / Capital',      Object.fromEntries(months.map(m => [m, mdByMonth[m].revenueCampaigns]))),
    r('Farm / Retail / Other',    farmOther),
    r('Expenses (Total)',         Object.fromEntries(months.map(m => [m, mdByMonth[m].expenses]))),
    r('Payroll',                  payroll),
    r('Food',                     food),
    r('Utilities',                utilities),
    r('Insurance',                insurance),
    r('Property Taxes (exempt — not tracked)',  zeros),
    r('Essential Maintenance',    maintenance),
    r('Teachers',                 teachers),
    r('Admin/Software',           admin),
    r('Other',                    otherExp),
    r('Total Revenue',            Object.fromEntries(months.map(m => [m, mdByMonth[m].revenueTotal]))),
    r('Total Expenses',           Object.fromEntries(months.map(m => [m, mdByMonth[m].expenses]))),
    r('Net Operating Income',     Object.fromEntries(months.map(m => [m, mdByMonth[m].revenueTotal - mdByMonth[m].expenses]))),
  ];
}

// ─── CSV builder: Occupancy and Revenue Metrics ───────────────────────────────

export function buildOccupancyMetrics(metrics: KclComputedMetrics, dataset: KclAnnualDataset): CsvRows {
  const { year, monthlyData, availableRooms } = metrics;
  const mdByMonth = indexByMonth(monthlyData);

  // Person-nights from residency-track participants only
  const rosterNights = dataset.data.residentialRoster.length > 0
    ? residencyParticipantNights(dataset.data.residentialRoster, year)
    : null;

  // Average tuition per participant: group programRevenue by start month
  const revByMonth:  Record<number, number> = {};
  const regByMonth:  Record<number, number> = {};
  for (let m = 1; m <= 12; m++) { revByMonth[m] = 0; regByMonth[m] = 0; }
  for (const p of dataset.data.programRevenue) {
    if (!p.startDate) continue;
    if (parseInt(p.startDate.slice(0, 4), 10) !== year) continue;
    const pm = parseInt(p.startDate.slice(5, 7), 10);
    if (pm >= 1 && pm <= 12) {
      revByMonth[pm] += p.tuitionRevenue;
      regByMonth[pm] += p.participants;
    }
  }

  const rows: CsvRows = [[
    'Month', 'Bed Nights Available (private rooms)', 'Residency Bed Nights', 'Residency Occupancy %',
    'Total Revenue', 'Residency Revenue per Residency Night', 'Average Tuition per Participant',
  ]];

  for (let m = 1; m <= 12; m++) {
    const md         = mdByMonth[m];
    const bedAvail   = availableRooms * daysInMonth(year, m);
    const bedSold    = rosterNights ? rosterNights[m] : '';
    const occPct     = typeof bedSold === 'number' && bedAvail > 0
      ? +((bedSold / bedAvail) * 100).toFixed(2) : '';
    const revPerBed  = typeof bedSold === 'number' && bedSold > 0
      ? +(md.revenueResidency / bedSold).toFixed(2) : '';
    const avgTuition = regByMonth[m] > 0
      ? +(revByMonth[m] / regByMonth[m]).toFixed(2) : '';

    rows.push([
      MONTH_NAMES[m],
      bedAvail,
      bedSold,
      occPct,
      +md.revenueTotal.toFixed(2),
      revPerBed,
      avgTuition,
    ]);
  }
  return rows;
}

// ─── CSV builder: Fixed Cost Baseline ────────────────────────────────────────

export function buildFixedCostBaseline(metrics: KclComputedMetrics, dataset: KclAnnualDataset): CsvRows {
  const { year, monthlyData, availableRooms } = metrics;
  const txns      = dataset.data.glTransactions;
  const mdByMonth = indexByMonth(monthlyData);
  const months    = Array.from({ length: 12 }, (_, i) => i + 1);

  // Fixed cost components (monthly GL totals) — all overhead GL categories
  const payroll        = monthlyExpenseGL(txns, year, ['6105', '6110', '6114', '6116']);
  const insurance      = monthlyExpenseGL(txns, year, ['6150']);
  const utilities      = monthlyExpenseGL(txns, year, ['6270', '6250']);
  const maintenance    = monthlyExpenseGL(txns, year, ['6210', '6190', '6200']);
  const admin          = monthlyExpenseGL(txns, year, ['6240', '6120', '6170', '6160', '6180', '6260', '6230']);
  const housekeeping   = monthlyExpenseGL(txns, year, ['6280']);
  const marketing      = monthlyExpenseGL(txns, year, ['5100']);
  const development    = monthlyExpenseGL(txns, year, ['6145']);
  const organizational = monthlyExpenseGL(txns, year, ['5900']);

  // Monthly fixed overhead total — excludes program-variable costs (teachers, food, scholarships, CC fees)
  const fixedTotal: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    fixedTotal[m] = payroll[m] + insurance[m] + utilities[m] + maintenance[m]
      + admin[m] + housekeeping[m] + marketing[m] + development[m] + organizational[m];
  }

  // Bed nights available per month
  const bedAvail: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) bedAvail[m] = availableRooms * daysInMonth(year, m);

  // Person-nights from residency-track participants only
  const rosterNights = dataset.data.residentialRoster.length > 0
    ? residencyParticipantNights(dataset.data.residentialRoster, year)
    : null;

  // Per-bed-night fixed cost and break-even occupancy
  const fixedPerBed: Record<number, CsvCell> = {};
  const breakEvenOcc: Record<number, CsvCell> = {};
  const avgRevPerBed: Record<number, CsvCell> = {};

  for (let m = 1; m <= 12; m++) {
    const avail = bedAvail[m];
    fixedPerBed[m] = avail > 0 ? +(fixedTotal[m] / avail).toFixed(2) : '';

    const sold = rosterNights ? rosterNights[m] : 0;
    const rev  = mdByMonth[m].revenueResidency;
    const rPer = sold > 0 ? rev / sold : 0;
    avgRevPerBed[m] = sold > 0 ? +rPer.toFixed(2) : '';

    if (avail > 0 && rPer > 0) {
      breakEvenOcc[m] = +((fixedTotal[m] / avail / rPer) * 100).toFixed(2);
    } else {
      breakEvenOcc[m] = '';
    }
  }

  const r = (label: string, vals: Record<number, CsvCell>): CsvCell[] =>
    [label, ...months.map(m => vals[m])];

  const rN = (label: string, vals: Record<number, number>): CsvCell[] =>
    [label, ...months.map(m => +vals[m].toFixed(2))];

  return [
    ['', ...months.map(m => MONTH_NAMES[m])],
    rN('Payroll',                   payroll),
    rN('Insurance',                 insurance),
    rN('Utilities (actual monthly)', utilities),
    rN('Maintenance & Facilities',  maintenance),
    rN('Admin & Office',            admin),
    rN('Housekeeping',              housekeeping),
    rN('Marketing',                 marketing),
    rN('Development',               development),
    rN('Organizational',            organizational),
    r ('Property Tax (exempt)',      Object.fromEntries(months.map(m => [m, '']))),
    r ('Debt Service',               Object.fromEntries(months.map(m => [m, '']))),
    rN('Monthly Overhead Total (excl. teachers, food, scholarships, CC fees)', fixedTotal),
    r ('Break-Even Residency Occupancy % (overhead total \u00f7 residency nightly rate)', breakEvenOcc),
    r ('Overhead Cost per Bed Night Available', fixedPerBed),
    r ('Residency Revenue per Occupied Residency Night', avgRevPerBed),
  ];
}
