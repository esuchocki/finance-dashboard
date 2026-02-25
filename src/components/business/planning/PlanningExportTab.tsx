import React, { useMemo } from 'react';
import { strToU8, zipSync } from 'fflate';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import type { KclAnnualDataset, KclComputedMetrics, KclMonthlyRow } from '@/lib/kclTypes';
import { ALL_SOURCES, KCL_SOURCE_META, MONTH_NAMES } from '@/lib/kclTypes';

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt$ = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmt$2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

const fmtN = (n: number) => n.toLocaleString('en-US');

const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const mn = (m: number) => MONTH_NAMES[m] ?? String(m);

// ─── Markdown table helpers ───────────────────────────────────────────────────

function mdTable(headers: string[], rows: string[][]): string {
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const header = `| ${headers.join(' | ')} |`;
  const body = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
  return [header, sep, body].join('\n');
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

type CsvCell = string | number;
type CsvRows = CsvCell[][];

function downloadCsv(rows: CsvRows, filename: string): void {
  const content = rows
    .map(r => r.map(cell => {
      const s = String(cell ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Minimal OOXML XLSX generator using fflate (already in project deps, no audit issues).
// Generates a proper multi-sheet .xlsx file without any additional npm package.

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function colName(n: number): string {
  let result = '';
  let col = n + 1;
  while (col > 0) {
    const rem = (col - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    col = Math.floor((col - 1) / 26);
  }
  return result;
}

function downloadXlsx(sheets: { name: string; rows: CsvRows }[], filename: string): void {
  // Build shared strings table and worksheet XMLs in one pass
  const stringsMap = new Map<string, number>();
  const strings: string[] = [];
  const getStr = (s: string): number => {
    const existing = stringsMap.get(s);
    if (existing !== undefined) return existing;
    const idx = strings.length;
    strings.push(s);
    stringsMap.set(s, idx);
    return idx;
  };

  const worksheetXmls: string[] = [];
  for (const { rows } of sheets) {
    const rowsXml: string[] = [];
    for (let ri = 0; ri < rows.length; ri++) {
      const cells: string[] = [];
      for (let ci = 0; ci < rows[ri].length; ci++) {
        const cell = rows[ri][ci];
        if (cell === '' || cell == null) continue;
        const addr = `${colName(ci)}${ri + 1}`;
        if (typeof cell === 'number' && !isNaN(cell)) {
          cells.push(`<c r="${addr}"><v>${cell}</v></c>`);
        } else {
          cells.push(`<c r="${addr}" t="s"><v>${getStr(String(cell))}</v></c>`);
        }
      }
      if (cells.length > 0) rowsXml.push(`<row r="${ri + 1}">${cells.join('')}</row>`);
    }
    worksheetXmls.push(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<sheetData>${rowsXml.join('')}</sheetData></worksheet>`,
    );
  }

  const ns = 'http://schemas.openxmlformats.org/';
  const pkg = `${ns}package/2006/`;
  const odr = `${ns}officeDocument/2006/relationships/`;
  const sml = `${ns}spreadsheetml/2006/main`;

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="${pkg}content-types">` +
    `<Default Extension="rels" ContentType="${pkg}relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    sheets.map((_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    ).join('') +
    `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="${pkg}relationships">` +
    `<Relationship Id="rId1" Type="${odr}officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="${sml}" xmlns:r="${ns}officeDocument/2006/relationships">` +
    `<sheets>` +
    sheets.map((s, i) => `<sheet name="${escXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    `</sheets></workbook>`;

  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="${pkg}relationships">` +
    sheets.map((_, i) =>
      `<Relationship Id="rId${i + 1}" Type="${odr}worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    ).join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="${odr}sharedStrings" Target="sharedStrings.xml"/>` +
    `</Relationships>`;

  const sharedStrings =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="${sml}" count="${strings.length}" uniqueCount="${strings.length}">` +
    strings.map(s => `<si><t xml:space="preserve">${escXml(s)}</t></si>`).join('') +
    `</sst>`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml':      strToU8(contentTypes),
    '_rels/.rels':              strToU8(rootRels),
    'xl/workbook.xml':          strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRels),
    'xl/sharedStrings.xml':     strToU8(sharedStrings),
  };
  worksheetXmls.forEach((xml, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml);
  });

  const zipped = zipSync(files, { level: 0 });
  const blob = new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Sum (debit − credit) per month for the given GL account codes. */
function monthlyExpenseGL(
  txns: KclAnnualDataset['data']['glTransactions'],
  year: number,
  codes: string[],
): Record<number, number> {
  const out: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) out[m] = 0;
  const codeSet = new Set(codes);
  for (const t of txns) {
    if (parseInt(t.date.slice(0, 4), 10) !== year) continue;
    if (!codeSet.has(t.accountCode)) continue;
    const m = parseInt(t.date.slice(5, 7), 10);
    if (m >= 1 && m <= 12) out[m] += t.debit - t.credit;
  }
  return out;
}

/** Sum (credit − debit) per month for the given GL account codes. */
function monthlyRevenueGL(
  txns: KclAnnualDataset['data']['glTransactions'],
  year: number,
  codes: string[],
): Record<number, number> {
  const out: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) out[m] = 0;
  const codeSet = new Set(codes);
  for (const t of txns) {
    if (parseInt(t.date.slice(0, 4), 10) !== year) continue;
    if (!codeSet.has(t.accountCode)) continue;
    const m = parseInt(t.date.slice(5, 7), 10);
    if (m >= 1 && m <= 12) out[m] += t.credit - t.debit;
  }
  return out;
}

/** Actual person-nights per calendar month from the residential roster. */
function monthlyResidentNights(
  roster: KclAnnualDataset['data']['residentialRoster'],
  year: number,
): Record<number, number> {
  const out: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) out[m] = 0;
  const yr = String(year);
  for (const r of roster) {
    if (!r.arrivalDate || !r.departureDate) continue;
    const arrival   = r.arrivalDate   < `${yr}-01-01` ? `${yr}-01-01` : r.arrivalDate;
    // Clamp to year+1-01-01 so December stays get the full 31 days.
    // ${yr}-12-31 would make oEnd = min(Dec31, Jan1) = Dec31, losing the last night.
    const departure = r.departureDate > `${year + 1}-01-01` ? `${year + 1}-01-01` : r.departureDate;
    if (arrival >= departure) continue;
    for (let m = 1; m <= 12; m++) {
      const mStr   = String(m).padStart(2, '0');
      const mStart = `${yr}-${mStr}-01`;
      const mNext  = m < 12 ? `${yr}-${String(m + 1).padStart(2, '0')}-01` : `${year + 1}-01-01`;
      const oStart = arrival   > mStart ? arrival   : mStart;
      const oEnd   = departure < mNext  ? departure : mNext;
      if (oStart < oEnd) {
        const days = Math.round(
          (new Date(oEnd + 'T00:00:00Z').getTime() - new Date(oStart + 'T00:00:00Z').getTime()) / 86400000
        );
        out[m] += days;
      }
    }
  }
  return out;
}

/**
 * Person-nights per month for residency-track participants only.
 * Staff and volunteers are excluded because they live in staff rooms (already subtracted
 * from availableRooms) and do not generate GL 4500/4520 residency revenue.
 */
function residencyParticipantNights(
  roster: KclAnnualDataset['data']['residentialRoster'],
  year: number,
): Record<number, number> {
  return monthlyResidentNights(
    roster.filter(r => r.programName.toLowerCase().includes('residency program')),
    year,
  );
}

/** Build mdByMonth map for quick month-indexed access. */
function indexByMonth(monthlyData: KclMonthlyRow[]): Record<number, KclMonthlyRow> {
  const out: Record<number, KclMonthlyRow> = {};
  for (const md of monthlyData) out[md.month] = md;
  return out;
}

// ─── CSV builder: Monthly Summary ─────────────────────────────────────────────

function buildMonthlySummary(metrics: KclComputedMetrics, dataset: KclAnnualDataset): CsvRows {
  const { year, monthlyData, availableRooms, balanceSheet } = metrics;
  const txns = dataset.data.glTransactions;
  const mdByMonth = indexByMonth(monthlyData);
  const payroll = monthlyExpenseGL(txns, year, ['6105', '6110', '6114', '6116']);

  // Person-nights per month from residency-track roster only.
  // monthlyResidents[m] from KclOccupancy is headcount, not nights; use roster directly.
  // Staff/volunteers excluded: they live in staff rooms (subtracted from availableRooms)
  // and do not generate GL 4500/4520 residency revenue.
  const rosterNights = dataset.data.residentialRoster.length > 0
    ? residencyParticipantNights(dataset.data.residentialRoster, year)
    : null;

  const avgMonthlyExpenses = metrics.totalExpenses / 12;
  // Exclude the Schwab investment account (GL 1005) from liquid cash — it's not immediately
  // accessible operating cash. balanceSheet.cashAndBanks includes all GL 1000–1009.
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

function buildMonthlyPnL(metrics: KclComputedMetrics, dataset: KclAnnualDataset): CsvRows {
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
  // GL 6210 = Repairs & Maintenance; GL 6190/6200 = Facilities — both 'overhead' in kclCompute
  const maintenance = monthlyExpenseGL(txns, year, ['6210', '6190', '6200']);
  const teachers    = monthlyExpenseGL(txns, year, ['5250', '5300', '5350']);
  const admin       = monthlyExpenseGL(txns, year, ['6240', '6120', '6170', '6160', '6180', '6260', '6230']);

  // "Other" expenses = total expenses minus all named categories (scholarships, CC fees,
  // housekeeping, marketing, development, organizational). Allow negatives — they represent
  // net credits in untracked expense accounts and must not be clamped or the row totals
  // (sum of named rows) will not equal the "Total Expenses" row.
  const otherExp: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    const tracked = payroll[m] + food[m] + utilities[m] + insurance[m] + maintenance[m] + teachers[m] + admin[m];
    otherExp[m] = +(mdByMonth[m].expenses - tracked).toFixed(2);
  }

  // "Farm / Retail / Other" = everything in revenue not accounted for by named streams.
  // Must subtract revenueCampaigns (GL 3xxx) separately — it is not in donUnrestricted/donRestricted
  // but is in revenueTotal, so without this subtraction capital contributions end up here.
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
    r('Maintenance',              maintenance),
    r('Teachers',                 teachers),
    r('Admin/Software',           admin),
    r('Other',                    otherExp),
    r('Total Revenue',            Object.fromEntries(months.map(m => [m, mdByMonth[m].revenueTotal]))),
    r('Total Expenses',           Object.fromEntries(months.map(m => [m, mdByMonth[m].expenses]))),
    r('Net Operating Income',     Object.fromEntries(months.map(m => [m, mdByMonth[m].revenueTotal - mdByMonth[m].expenses]))),
  ];
}

// ─── CSV builder: Occupancy and Revenue Metrics ───────────────────────────────

function buildOccupancyMetrics(metrics: KclComputedMetrics, dataset: KclAnnualDataset): CsvRows {
  const { year, monthlyData, availableRooms } = metrics;
  const mdByMonth = indexByMonth(monthlyData);

  // Person-nights from residency-track participants only (they generate GL 4500/4520 revenue)
  const rosterNights = dataset.data.residentialRoster.length > 0
    ? residencyParticipantNights(dataset.data.residentialRoster, year)
    : null;

  // Average tuition per participant: group programRevenue by start month
  const revByMonth:  Record<number, number> = {};
  const regByMonth:  Record<number, number> = {};
  for (let m = 1; m <= 12; m++) { revByMonth[m] = 0; regByMonth[m] = 0; }
  for (const p of dataset.data.programRevenue) {
    // Strict-year filter: consistent with programCatalog (both start and end within year)
    if (!p.startDate || !p.endDate) continue;
    if (parseInt(p.startDate.slice(0, 4), 10) !== year) continue;
    if (parseInt(p.endDate.slice(0, 4), 10) !== year) continue;
    const pm = parseInt(p.startDate.slice(5, 7), 10);
    if (pm >= 1 && pm <= 12) {
      revByMonth[pm] += p.tuitionRevenue;
      regByMonth[pm] += p.participants;  // active registrations only (excludes cancelled)
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
    // Residency revenue only — using revenueTotal would inflate with donations/programs
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

function buildFixedCostBaseline(metrics: KclComputedMetrics, dataset: KclAnnualDataset): CsvRows {
  const { year, monthlyData, availableRooms } = metrics;
  const txns      = dataset.data.glTransactions;
  const mdByMonth = indexByMonth(monthlyData);
  const months    = Array.from({ length: 12 }, (_, i) => i + 1);

  // Fixed cost components (monthly GL totals)
  const payroll     = monthlyExpenseGL(txns, year, ['6105', '6110', '6114', '6116']);
  const insurance   = monthlyExpenseGL(txns, year, ['6150']);
  const utilities   = monthlyExpenseGL(txns, year, ['6270', '6250']);
  // GL 6210 = Repairs; GL 6190/6200 = Facilities — all 'overhead' in kclCompute
  const maintenance = monthlyExpenseGL(txns, year, ['6210', '6190', '6200']);

  // Monthly totals of tracked fixed costs
  const fixedTotal: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    fixedTotal[m] = payroll[m] + insurance[m] + utilities[m] + maintenance[m];
  }

  // Bed nights available per month
  const bedAvail: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) bedAvail[m] = availableRooms * daysInMonth(year, m);

  // Person-nights from residency-track participants only (for revenue per bed night)
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
    // Use residency revenue only — revenueTotal would be inflated by donations/programs
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
    rN('Payroll Baseline', payroll),
    rN('Insurance',        insurance),
    rN('Utilities (actual monthly)',  utilities),
    r ('Property Tax',     Object.fromEntries(months.map(m => [m, '']))),
    r ('Debt Service',     Object.fromEntries(months.map(m => [m, '']))),
    rN('Essential Maintenance', maintenance),
    rN('Monthly Fixed Cost (Total)', fixedTotal),
    r ('Break-Even Residency Occupancy % (total fixed costs \u00f7 residency nightly rate)', breakEvenOcc),
    r ('Fixed Cost per Bed Night Available', fixedPerBed),
    r ('Residency Revenue per Occupied Residency Night', avgRevPerBed),
  ];
}

// ─── Indicator helper utilities ───────────────────────────────────────────────

function computeMedian(vals: number[]): number {
  if (vals.length === 0) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Indicator 1 — Revenue Composition by Account (trial balance)
function indicatorRevenueByAccount(trialBalance: KclAnnualDataset['data']['trialBalance']): string {
  const revenueRows = trialBalance.filter(r => r.accountClass === 'Revenue');
  if (revenueRows.length === 0) return '';
  const total = revenueRows.reduce((s, r) => s + r.credit, 0);
  if (total === 0) return '';
  const sorted = [...revenueRows].sort((a, b) => b.credit - a.credit);
  return `### Revenue Composition by Account (Trial Balance)

${mdTable(
  ['Account Code', 'Account', 'Amount', 'Share'],
  [
    ...sorted.map(r => [r.accountCode, r.accountName, fmt$(r.credit), fmtPct(r.credit / total)]),
    ['**Total**', '', `**${fmt$(total)}**`, '**100%**'],
  ]
)}`;
}

// Indicator 2 — Revenue per Participant-Day
function indicatorRevPerParticipantDay(
  programRevenue: KclAnnualDataset['data']['programRevenue'],
  programCatalog: KclAnnualDataset['data']['programCatalog'],
): string {
  const catalogById = new Map(programCatalog.map(p => [p.programId, p]));
  let flaggedCount = 0;

  const joined = programRevenue
    .map(p => {
      const cat = catalogById.get(p.programId);
      if (!cat || cat.participantDays <= 0 || p.participants <= 0) return null;
      const flagged = cat.activeRegistrations > 0 && cat.activeRegistrations !== p.participants;
      if (flagged) flaggedCount++;
      return {
        name: p.programName,
        categoryCode: p.categoryCode,
        totalRevenue: p.totalRevenue,
        participants: p.participants,
        totalParticipantDays: cat.participantDays,
        revPerDay: p.totalRevenue / cat.participantDays,
        revPerParticipant: p.totalRevenue / p.participants,
        avgStayLength: cat.participantDays / p.participants,
        flagged,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.revPerDay - a.revPerDay);

  if (joined.length === 0) return '';

  const trunc38 = (s: string) => s.length > 38 ? s.slice(0, 37) + '\u2026' : s;

  return `### Revenue per Participant-Day

Sorted by revenue per participant-day (highest first). ${fmtN(joined.length)} programs matched across both files.${flaggedCount > 0 ? ` **${fmtN(flaggedCount)} program(s) flagged (*)** for participant count mismatch between files.` : ''}

${mdTable(
  ['Program', 'Cat', 'Revenue', 'Participants', 'P-Days', 'Rev/P-Day', 'Rev/Participant', 'Avg Stay'],
  joined.map(p => [
    (p.flagged ? '* ' : '') + trunc38(p.name),
    p.categoryCode,
    fmt$(p.totalRevenue),
    fmtN(p.participants),
    fmtN(p.totalParticipantDays),
    fmt$2(p.revPerDay),
    fmt$2(p.revPerParticipant),
    p.avgStayLength.toFixed(1) + ' days',
  ])
)}`;
}

// Indicator 4 — Tuition / Accommodation / Other Revenue Mix
function indicatorRevenueMix(programRevenue: KclAnnualDataset['data']['programRevenue']): string {
  const withRevenue = programRevenue.filter(p => p.totalRevenue > 0);
  if (withRevenue.length === 0) return '';

  const sumField = (arr: typeof withRevenue, f: 'tuitionRevenue' | 'accommodationRevenue' | 'otherRevenue' | 'totalRevenue') =>
    arr.reduce((s, p) => s + p[f], 0);

  const pT = sumField(withRevenue, 'totalRevenue');
  const pTu = sumField(withRevenue, 'tuitionRevenue');
  const pAc = sumField(withRevenue, 'accommodationRevenue');
  const pOt = sumField(withRevenue, 'otherRevenue');

  const catRows = ['REG', 'CABN', 'IHR'].map(c => {
    const progs = withRevenue.filter(p => p.categoryCode === c);
    if (progs.length === 0) return null;
    const t = sumField(progs, 'totalRevenue');
    return [c, fmtPct(t > 0 ? sumField(progs, 'tuitionRevenue') / t : 0), fmtPct(t > 0 ? sumField(progs, 'accommodationRevenue') / t : 0), fmtPct(t > 0 ? sumField(progs, 'otherRevenue') / t : 0), fmt$(t)];
  }).filter((r): r is string[] => r !== null);

  return `### Revenue Mix — Tuition / Accommodation / Other

**Portfolio** (${fmtN(withRevenue.length)} programs with revenue > 0): Tuition **${fmtPct(pT > 0 ? pTu / pT : 0)}** | Accommodation **${fmtPct(pT > 0 ? pAc / pT : 0)}** | Other **${fmtPct(pT > 0 ? pOt / pT : 0)}**

${mdTable(
  ['Category', 'Tuition Share', 'Accommodation Share', 'Other Share', 'Total Revenue'],
  [
    ...catRows,
    ['**Portfolio**', `**${fmtPct(pT > 0 ? pTu / pT : 0)}**`, `**${fmtPct(pT > 0 ? pAc / pT : 0)}**`, `**${fmtPct(pT > 0 ? pOt / pT : 0)}**`, `**${fmt$(pT)}**`],
  ]
)}`;
}

// Indicator 5 — Donor Concentration Index (HHI)
function indicatorDonorConcentration(recurringDonors: KclAnnualDataset['data']['recurringDonors']): string {
  const D = recurringDonors.filter(d => d.totalPaid > 0);
  if (D.length === 0) return '';
  const T = D.reduce((s, d) => s + d.totalPaid, 0);
  const sorted = [...D].sort((a, b) => b.totalPaid - a.totalPaid);

  const topKRows = [1, 5, 10, 20, 50]
    .filter(k => k <= sorted.length)
    .map(k => {
      const topAmt = sorted.slice(0, k).reduce((s, d) => s + d.totalPaid, 0);
      return [`Top ${k} donor${k > 1 ? 's' : ''}`, fmtPct(T > 0 ? topAmt / T : 0), fmt$2(topAmt)];
    });

  const hhi = D.reduce((s, d) => { const sh = d.totalPaid / T; return s + sh * sh; }, 0);
  const n = D.length;
  const hhiNorm = n > 1 ? (hhi - 1 / n) / (1 - 1 / n) : (n === 1 ? 1 : 0);
  const interpretation = hhiNorm < 0.15 ? 'Concentration is low — giving is broadly distributed.'
    : hhiNorm < 0.35 ? 'Concentration is moderate — a handful of donors provide outsized support.'
    : 'Concentration is high — significant dependence on a small number of large donors.';

  return `### Donor Concentration Index

${fmtN(n)} recurring donors with payments in the year. Total cash received: ${fmt$2(T)}.

${mdTable(['Tier', 'Cumulative Share', 'Cumulative Amount'], topKRows)}

| Metric | Value |
| --- | --- |
| HHI (raw, 0–1) | ${hhi.toFixed(4)} |
| HHI Normalized (0 = equal, 1 = single donor) | ${hhiNorm.toFixed(4)} |

${interpretation}`;
}

// Indicator 6 — Effective Recurring Donation Yield
function indicatorRecurringYield(donations: KclAnnualDataset['data']['donations']): string {
  const monthly = donations.filter(d => d.donationType.toUpperCase().includes('MONTHLY'));
  if (monthly.length === 0) return '';

  const grossPledged   = monthly.reduce((s, d) => s + d.pledgedAmount, 0);
  const grossCollected = monthly.filter(d => d.voidDate === '' && d.amountPaid > 0).reduce((s, d) => s + d.amountPaid, 0);
  const collectionRate = grossPledged > 0 ? grossCollected / grossPledged : 0;

  const pledgeMap = new Map<string, { cancelled: boolean; voided: boolean; hasUnpaid: boolean }>();
  for (const d of monthly) {
    const existing = pledgeMap.get(d.donationId) ?? { cancelled: false, voided: false, hasUnpaid: false };
    if (d.cancelledDate !== '') existing.cancelled = true;
    if (d.voidDate !== '')      existing.voided    = true;
    if (d.amountPaid === 0 && d.cancelledDate === '' && d.voidDate === '') existing.hasUnpaid = true;
    pledgeMap.set(d.donationId, existing);
  }
  const uniquePledges    = pledgeMap.size;
  const cancelledPledges = Array.from(pledgeMap.values()).filter(p => p.cancelled).length;
  const voidedPledges    = Array.from(pledgeMap.values()).filter(p => p.voided).length;
  const unpaidPledges    = Array.from(pledgeMap.values()).filter(p => p.hasUnpaid).length;

  return `### Effective Recurring Donation Yield

${mdTable(
  ['Metric', 'Value'],
  [
    ['Unique Monthly Pledges (distinct DONATION_ID)', fmtN(uniquePledges)],
    ['Gross Pledged', fmt$2(grossPledged)],
    ['Gross Collected (non-voided, amount > 0)', fmt$2(grossCollected)],
    ['Collection Rate (collected / pledged)', fmtPct(collectionRate)],
    ['Pledge Cancellation Rate', fmtPct(uniquePledges > 0 ? cancelledPledges / uniquePledges : 0)],
    ['Pledge Void Rate', fmtPct(uniquePledges > 0 ? voidedPledges / uniquePledges : 0)],
    ['Pledge Unpaid Rate (no payment, not cancelled/voided)', fmtPct(uniquePledges > 0 ? unpaidPledges / uniquePledges : 0)],
  ]
)}

A pledge can be both cancelled and voided — rates are not mutually exclusive and may sum above 100%.`;
}

// Indicator 7 — Donation Attrition Timeline
function indicatorAttritionTimeline(donations: KclAnnualDataset['data']['donations'], year: number): string {
  const cancelled = donations.filter(
    d => d.donationType.toUpperCase().includes('MONTHLY')
      && d.cancelledDate !== ''
      && d.cancelledDate.startsWith(String(year)),
  );
  if (cancelled.length === 0) return '';

  const byMonth: Record<string, { donationIds: Set<string>; donorNames: Set<string> }> = {};
  for (const d of cancelled) {
    const m = d.cancelledDate.substring(5, 7);
    if (!byMonth[m]) byMonth[m] = { donationIds: new Set(), donorNames: new Set() };
    byMonth[m].donationIds.add(d.donationId);
    if (d.donorName) byMonth[m].donorNames.add(d.donorName);
  }

  const totalLost = Object.values(byMonth).reduce((s, v) => s + v.donationIds.size, 0);
  const rows = Object.keys(byMonth).sort().map(m => {
    const mo = parseInt(m, 10);
    return [MONTH_NAMES[mo] ?? m, fmtN(byMonth[m].donationIds.size), fmtN(byMonth[m].donorNames.size)];
  });

  return `### Donation Attrition Timeline

Monthly cancellations of recurring pledges in ${year}. Total pledges cancelled: ${fmtN(totalLost)}.

${mdTable(['Month', 'Pledges Cancelled', 'Unique Donors Lost'], rows)}`;
}

// Indicator 8 — Fund Allocation normalized grouping (complement to existing fund table)
function indicatorFundNormalized(donations: KclAnnualDataset['data']['donations']): string {
  const valid = donations.filter(d => d.voidDate === '' && d.amountPaid > 0);
  if (valid.length === 0) return '';
  const totalCollected = valid.reduce((s, d) => s + d.amountPaid, 0);

  const stripYear = (name: string) => name.replace(/^\d{4}(\.\d+)?\s*-\s*/, '').trim();
  const normMap = new Map<string, number>();
  for (const d of valid) {
    const base = stripYear(d.fundName);
    normMap.set(base, (normMap.get(base) ?? 0) + d.amountPaid);
  }

  const rows = Array.from(normMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([base, amt]) => [base, fmt$2(amt), fmtPct(totalCollected > 0 ? amt / totalCollected : 0)]);

  return `### Fund Allocation — Normalized

Year-prefix variants (e.g., "2025 - Saddharma" and "2025.1 - Saddharma") merged under base name. Excludes voided transactions.

${mdTable(['Fund (normalized)', 'Total Collected', 'Share'], rows)}`;
}

// Indicator 9 — Registration Retention Rate
function indicatorRegistrationRetention(programCatalog: KclAnnualDataset['data']['programCatalog']): string {
  if (programCatalog.every(p => p.totalRegistrations === 0 && p.activeRegistrations === 0)) return '';
  const P = programCatalog.filter(p => p.totalRegistrations > 0);
  if (P.length === 0) return '';

  const totalActive = P.reduce((s, p) => s + p.activeRegistrations, 0);
  const totalReg    = P.reduce((s, p) => s + p.totalRegistrations, 0);

  const catRows = ['REG', 'CABN', 'IHR'].map(c => {
    const Pc = P.filter(p => p.categoryCode === c);
    if (Pc.length === 0) return null;
    const a = Pc.reduce((s, p) => s + p.activeRegistrations, 0);
    const t = Pc.reduce((s, p) => s + p.totalRegistrations, 0);
    return [c, fmtN(a), fmtN(t), fmtPct(t > 0 ? a / t : 0)];
  }).filter((r): r is string[] => r !== null);

  const fullDropout  = P.filter(p => p.activeRegistrations === 0);
  const unregistered = programCatalog.filter(p => p.activeRegistrations > p.totalRegistrations);
  const dropoutList  = fullDropout.slice(0, 10).map(p => `  - ${p.programName}`).join('\n')
    + (fullDropout.length > 10 ? `\n  - ... and ${fullDropout.length - 10} more` : '');

  return `### Registration Retention Rate

Non-cancellation rate — fraction of registrations that were not cancelled. **Overall: ${fmtPct(totalReg > 0 ? totalActive / totalReg : 0)}** (${fmtN(totalActive)} active / ${fmtN(totalReg)} total, across ${fmtN(P.length)} programs).

${catRows.length > 0 ? mdTable(['Category', 'Active Registrations', 'Total Registrations', 'Retention Rate'], catRows) : ''}

**Full-dropout programs** (all registrations cancelled): ${fmtN(fullDropout.length)} (${fmtPct(P.length > 0 ? fullDropout.length / P.length : 0)} of programs with registrations).${fullDropout.length > 0 ? '\n' + dropoutList : ''}

${unregistered.length > 0 ? `**Unregistered participation** (active_registrations > total_registrations — data quality flag): ${fmtN(unregistered.length)} program(s).` : 'No unregistered participation anomalies detected.'}`;
}

// Indicator 10 — Program Utilization Rate
function indicatorProgramUtilization(programCatalog: KclAnnualDataset['data']['programCatalog']): string {
  if (programCatalog.length === 0) return '';
  if (programCatalog.every(p => p.totalRegistrations === 0 && p.activeRegistrations === 0)) return '';

  const all      = programCatalog;
  const enrolled = all.filter(p => p.totalRegistrations > 0);
  const attended = all.filter(p => p.activeRegistrations > 0);
  const zeroReg  = all.filter(p => p.totalRegistrations === 0);
  const enrolledNotAttended = enrolled.filter(p => p.activeRegistrations === 0);

  const attendedCounts = attended.map(p => p.activeRegistrations);
  const medianAtt = computeMedian(attendedCounts);
  const meanAtt   = attendedCounts.length > 0 ? attendedCounts.reduce((s, v) => s + v, 0) / attendedCounts.length : 0;

  const catRows = ['REG', 'CABN', 'IHR'].map(c => {
    const allC = all.filter(p => p.categoryCode === c);
    if (allC.length === 0) return null;
    return [c, fmtN(allC.length), fmtPct(allC.length > 0 ? allC.filter(p => p.totalRegistrations > 0).length / allC.length : 0), fmtPct(allC.length > 0 ? allC.filter(p => p.activeRegistrations > 0).length / allC.length : 0)];
  }).filter((r): r is string[] => r !== null);

  return `### Program Utilization Rate

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Programs in Catalog', fmtN(all.length)],
    ['Programs with Any Registrations', `${fmtN(enrolled.length)} (${fmtPct(all.length > 0 ? enrolled.length / all.length : 0)})`],
    ['Programs with Active Attendees', `${fmtN(attended.length)} (${fmtPct(all.length > 0 ? attended.length / all.length : 0)})`],
    ['Enrolled but All Cancelled', `${fmtN(enrolledNotAttended.length)} (${fmtPct(enrolled.length > 0 ? enrolledNotAttended.length / enrolled.length : 0)} of enrolled)`],
    ['Zero-Registration Programs', fmtN(zeroReg.length)],
    ['Median Attendance (programs that ran)', fmtN(Math.round(medianAtt))],
    ['Mean Attendance (programs that ran)', meanAtt.toFixed(1)],
  ]
)}

${catRows.length > 0 ? mdTable(['Category', 'Programs', 'Enrollment Rate', 'Attendance Rate'], catRows) : ''}${zeroReg.length > 0 ? `\n\n**Zero-registration programs** (offered but no sign-ups): ${zeroReg.slice(0, 15).map(p => p.programName).join(', ')}${zeroReg.length > 15 ? ` ... and ${zeroReg.length - 15} more` : ''}` : ''}`;
}

// Indicator 11 — Revenue per Category with median + RevPerParticipant
function indicatorCategoryStats(programRevenue: KclAnnualDataset['data']['programRevenue']): string {
  const rows = ['REG', 'CABN', 'IHR'].map(c => {
    const progs = programRevenue.filter(p => p.categoryCode === c);
    if (progs.length === 0) return null;
    const totalRevenue      = progs.reduce((s, p) => s + p.totalRevenue, 0);
    const totalParticipants = progs.reduce((s, p) => s + p.participants, 0);
    const medianRevenue     = computeMedian(progs.map(p => p.totalRevenue));
    const revPerParticipant = totalParticipants > 0 ? totalRevenue / totalParticipants : 0;
    return [c, fmtN(progs.length), fmt$(totalRevenue), fmt$(progs.length > 0 ? totalRevenue / progs.length : 0), fmt$(medianRevenue), fmtN(totalParticipants), revPerParticipant > 0 ? fmt$2(revPerParticipant) : '—'];
  }).filter((r): r is string[] => r !== null);

  if (rows.length === 0) return '';
  return `### Revenue per Category — Extended Stats

Median is the typical program; mean is skewed by large outliers.

${mdTable(
  ['Category', 'Programs', 'Total Revenue', 'Mean Revenue', 'Median Revenue', 'Participants', 'Rev/Participant'],
  rows
)}`;
}

// Indicator 12 — AR Aging Buckets
function indicatorARaging(outstandingAr: KclAnnualDataset['data']['outstandingAr'], year: number): string {
  if (outstandingAr.length === 0) return '';
  const refDate = new Date(`${year + 1}-01-01T00:00:00Z`);

  interface Bucket { label: string; count: number; totalAR: number; totalCharged: number; totalPaid: number }
  const buckets: Bucket[] = [
    { label: 'Not yet ended',  count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: '0–30 days',      count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: '31–90 days',     count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: '91–180 days',    count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: '181–365 days',   count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: 'Over 1 year',    count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
  ];

  for (const r of outstandingAr) {
    if (!r.endDate) continue;
    const end = new Date(r.endDate + 'T00:00:00Z');
    const daysPast = Math.floor((refDate.getTime() - end.getTime()) / 86400000);
    const b = daysPast <= 0 ? buckets[0]
            : daysPast <= 30 ? buckets[1]
            : daysPast <= 90 ? buckets[2]
            : daysPast <= 180 ? buckets[3]
            : daysPast <= 365 ? buckets[4]
            : buckets[5];
    b.count++; b.totalAR += r.outstanding; b.totalCharged += r.totalCharged; b.totalPaid += r.totalPaid;
  }

  const totalAR = outstandingAr.reduce((s, r) => s + r.outstanding, 0);
  const rows = buckets
    .filter(b => b.count > 0)
    .map(b => [b.label, fmtN(b.count), fmt$2(b.totalAR), fmt$2(b.count > 0 ? b.totalAR / b.count : 0), b.totalCharged > 0 ? fmtPct(b.totalPaid / b.totalCharged) : '—']);

  return `### AR Aging Analysis

Reference date: Jan 1, ${year + 1}. ${fmtN(outstandingAr.length)} records, ${fmt$2(totalAR)} total outstanding.

${mdTable(['Age Bucket', 'Count', 'Total Outstanding', 'Mean Outstanding', 'Payment Rate'], rows)}`;
}

// Indicator 13 — Payroll Burden Ratio
function indicatorPayrollBurden(
  staffSalaries: KclAnnualDataset['data']['staffSalaries'],
  totalRevenue: number,
): string {
  if (staffSalaries.length === 0 || totalRevenue === 0) return '';

  let totalPayroll = 0;
  let imputedCount = 0;
  for (const e of staffSalaries) {
    let employerFICA: number;
    if (e.medicareMonthly !== null && e.oasdiMonthly !== null) {
      employerFICA = (e.medicareMonthly + e.oasdiMonthly) * 12;
    } else {
      employerFICA = e.annualSalary * 0.0765;
      imputedCount++;
    }
    totalPayroll += e.annualSalary + employerFICA;
  }

  const burdenLower = totalRevenue > 0 ? totalPayroll / totalRevenue : 0;
  const burdenUpper = burdenLower * 1.20;

  return `### Payroll Burden Ratio

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Annualized Payroll (salary + employer FICA)', fmt$(totalPayroll)],
    ['Total Revenue (trial balance)', fmt$(totalRevenue)],
    ['Payroll Burden — Lower Bound (salary + FICA only)', fmtPct(burdenLower)],
    ['Payroll Burden — Upper Bound (+20% benefits loading)', fmtPct(burdenUpper)],
    ['Employees using imputed 7.65% FICA rate (no Medicare/OASDI data)', fmtN(imputedCount)],
  ]
)}

Lower bound excludes health insurance, workers' comp, VT SUTA/FUTA, retirement, and payroll processing. Upper bound assumes 20% additional benefit loading (small nonprofit benchmark).`;
}

// Indicator 14 — Daily Cost per Residential Person
function indicatorDailyCostPerResident(
  residentialRoster: KclAnnualDataset['data']['residentialRoster'],
  trialBalance: KclAnnualDataset['data']['trialBalance'],
): string {
  if (residentialRoster.length === 0 || trialBalance.length === 0) return '';
  const totalPersonDays = residentialRoster.reduce((s, r) => s + r.daysInYear, 0);
  if (totalPersonDays === 0) return '';

  const expenseAccounts = trialBalance.filter(r => r.accountClass === 'Expense');
  const matched = expenseAccounts.filter(r => {
    const n = r.accountName.toLowerCase();
    return n.includes('food') || n.includes('kitchen') || n.includes('utilit') || n.includes('maintenance') || n.includes('repair');
  });

  if (matched.length === 0) {
    return `### Daily Cost per Residential Person

_No accounts matched (food, kitchen, utilities, maintenance/repairs). All expense accounts:_

${expenseAccounts.map(r => `- ${r.accountCode}: ${r.accountName}`).join('\n')}`;
  }

  const residentialCost = matched.reduce((s, r) => s + r.debit, 0);
  const costPerDay = totalPersonDays > 0 ? residentialCost / totalPersonDays : 0;

  return `### Daily Cost per Residential Person

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Person-Days (residential roster)', fmtN(totalPersonDays)],
    ['Residential Operating Cost (food + utilities + maintenance)', fmt$2(residentialCost)],
    ['Cost per Residential Person-Day', fmt$2(costPerDay)],
  ]
)}

**Accounts included:**
${matched.map(r => `- ${r.accountCode}: ${r.accountName} — ${fmt$2(r.debit)}`).join('\n')}

_Caveat: Based on ${fmtN(residentialRoster.length)} residential roster entries (staff, volunteers, residency participants). Excludes program guests. These costs serve the entire property — this metric may overstate the true per-person cost when guest populations are large._`;
}

// Indicator 18 — Net Overpayment / Underpayment Position
function indicatorOverpaymentPosition(allRegistrations: KclAnnualDataset['data']['allRegistrations']): string {
  if (allRegistrations.length === 0) return '';

  const netPosition      = allRegistrations.reduce((s, r) => s + r.outstanding, 0);
  const overpaidSet      = allRegistrations.filter(r => r.outstanding < 0);
  const underpaidSet     = allRegistrations.filter(r => r.outstanding > 0);
  const balancedSet      = allRegistrations.filter(r => r.outstanding === 0);
  const overpaymentPool  = overpaidSet.reduce((s, r) => s + r.outstanding, 0);
  const underpaymentPool = underpaidSet.reduce((s, r) => s + r.outstanding, 0);

  const personMap = new Map<string, { overpaid: number; underpaid: number; net: number }>();
  for (const r of allRegistrations) {
    if (!r.participantName) continue;
    const p = personMap.get(r.participantName) ?? { overpaid: 0, underpaid: 0, net: 0 };
    if (r.outstanding < 0) p.overpaid++;
    if (r.outstanding > 0) p.underpaid++;
    p.net += r.outstanding;
    personMap.set(r.participantName, p);
  }
  const crossAllocated = Array.from(personMap.entries())
    .filter(([, p]) => p.overpaid > 0 && p.underpaid > 0)
    .sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net));

  return `### Net Overpayment / Underpayment Position

${mdTable(
  ['Metric', 'Value'],
  [
    ['Net Position across all registrations (negative = net credit held)', fmt$2(netPosition)],
    ['Overpaid registrations (credit balance)', `${fmtN(overpaidSet.length)} — ${fmt$2(overpaymentPool)}`],
    ['Underpaid registrations (balance owed)', `${fmtN(underpaidSet.length)} — ${fmt$2(underpaymentPool)}`],
    ['Balanced registrations (fully paid)', fmtN(balancedSet.length)],
    ['Cross-allocated individuals', fmtN(crossAllocated.length)],
  ]
)}${crossAllocated.length > 0 ? `\n\n**Cross-allocated participants** (have both overpaid and underpaid registrations — likely payment misallocation):\n${mdTable(['Participant', 'Net Position'], crossAllocated.slice(0, 10).map(([name, p]) => [name, fmt$2(p.net)]))}` : ''}`;
}

// ─── Report generator ─────────────────────────────────────────────────────────

function generateKclReport(metrics: KclComputedMetrics, dataset: KclAnnualDataset): string {
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
  // Operating donations only (unrestricted + restricted). Campaigns/capital (GL 3xxx) are
  // capital contributions — not operating donations — and are tracked as a separate stream.
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

Direct costs per program: teacher compensation (GL 5250/5300/5350 attributed by date window), marginal food cost (above-baseline GL 5200 × participant-days; zero for CABN), scholarships/credits (COGS-SCH/COGS-PC, revenue-proportional proxy), CC fees (effective rate × revenue), marginal utilities (above-baseline daily rate × program days). Overhead is the remaining fixed cost pool allocated proportionally by participant-days.

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

${metrics.roomTypeOccupancy
  ? `### Room Booking Occupancy

${mdTable(
  ['Room Type', 'Bookings', 'Total Nights', 'Avg Stay (nights)'],
  metrics.roomTypeOccupancy.byType.map(t => [
    t.roomTypeDesc,
    fmtN(t.bookings),
    fmtN(t.totalNights),
    t.avgNights.toFixed(1),
  ])
)}

**Total bookings:** ${fmtN(metrics.roomTypeOccupancy.totalBookings)} | **Total room-nights booked:** ${fmtN(metrics.roomTypeOccupancy.totalNights)}`
  : `_Room booking occupancy data not loaded. Load room_bookings.csv for occupancy by room type._`}`
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

    // Indicator 8 normalized fund table
    const fundNormalized = indicatorFundNormalized(dataset.data.donations);
    if (fundNormalized) donationSection.push(fundNormalized);

    // Indicator 5 donor concentration
    if (dataset.data.recurringDonors.length > 0) {
      const concentration = indicatorDonorConcentration(dataset.data.recurringDonors);
      if (concentration) donationSection.push(concentration);
    }

    // Indicator 6 recurring donation yield
    const recYield = indicatorRecurringYield(dataset.data.donations);
    if (recYield) donationSection.push(recYield);

    // Indicator 7 attrition timeline
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
- **Contribution margin:** Teacher costs are attributed to REG programs via a first-claim date-window algorithm (program start −7 to end +3 days). Food costs are marginal above a 3-month baseline. Scholarships/credits (COGS-SCH/COGS-PC) are allocated as a revenue-proportional proxy. Overhead is the remaining fixed cost pool allocated proportionally by participant-days.
- **Occupancy:** Monthly headcounts count a person in a month if their stay overlaps any day of that month (exclusive of departure day, matching SQL DATEDIFF semantics).
- **Volunteer labor value:** Estimated at $${metrics.volunteerMetrics?.laborValuePerDay ?? 150}/day (Vermont minimum wage equivalent × 8 hours plus housing/food offset).
- **REVPAR:** Calculated as (residency + program revenue) / (available private rooms × 365). Only private room types are counted (Premium, Standard, Double, Accessibility).`
  );

  return sections.join('\n\n');
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PlanningExportTabProps {
  dataset: KclAnnualDataset;
}

const PlanningExportTab: React.FC<PlanningExportTabProps> = ({ dataset }) => {
  const { computed, year } = dataset;

  const report = useMemo(() => {
    if (!computed) return null;
    return generateKclReport(computed, dataset);
  }, [computed, dataset]);

  const handleDownloadMd = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kcl_financial_report_${year}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsv = (builder: () => CsvRows, filename: string) => () =>
    downloadCsv(builder(), filename);

  const handleXlsx = () => {
    if (!computed) return;
    downloadXlsx([
      { name: 'Monthly Summary',            rows: buildMonthlySummary(computed, dataset) },
      { name: 'Monthly P&L',                rows: buildMonthlyPnL(computed, dataset) },
      { name: 'Occupancy & Revenue Metrics', rows: buildOccupancyMetrics(computed, dataset) },
      { name: 'Fixed Cost Baseline',        rows: buildFixedCostBaseline(computed, dataset) },
    ], `kcl_financial_data_${year}.xlsx`);
  };

  if (!computed) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Load all required data sources to generate the report.</p>
        <p className="text-xs mt-1">Required: GL Transactions, Program Catalog, Program Revenue, Room Inventory.</p>
      </div>
    );
  }

  const lineCount = report?.split('\n').length ?? 0;

  return (
    <div className="space-y-4">

      {/* Markdown report row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">Financial Report — {year}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Markdown report covering all loaded data sources — {lineCount.toLocaleString()} lines.
            Download and feed to an LLM to start a financial analysis conversation.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleDownloadMd}>
          <Download className="h-4 w-4" />
          Download .md
        </Button>
      </div>

      {/* CSV exports */}
      <div className="rounded-lg border px-4 py-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">CSV Exports</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleCsv(() => buildMonthlySummary(computed, dataset), `kcl_monthly_summary_${year}.csv`)}
          >
            <Download className="h-3 w-3" />
            Monthly Summary
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleCsv(() => buildMonthlyPnL(computed, dataset), `kcl_monthly_pnl_${year}.csv`)}
          >
            <Download className="h-3 w-3" />
            Monthly P&amp;L
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleCsv(() => buildOccupancyMetrics(computed, dataset), `kcl_occupancy_metrics_${year}.csv`)}
          >
            <Download className="h-3 w-3" />
            Occupancy &amp; Revenue Metrics
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleCsv(() => buildFixedCostBaseline(computed, dataset), `kcl_fixed_cost_baseline_${year}.csv`)}
          >
            <Download className="h-3 w-3" />
            Fixed Cost Baseline
          </Button>
        </div>
        <div className="border-t pt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">All four sheets in a single file</p>
          <Button
            variant="secondary" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleXlsx}
          >
            <Download className="h-3 w-3" />
            Export All as XLSX
          </Button>
        </div>
      </div>

      {/* Markdown preview */}
      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-xs text-muted-foreground font-mono">kcl_financial_report_{year}.md</span>
          <span className="text-xs text-muted-foreground">{lineCount.toLocaleString()} lines</span>
        </div>
        <div className="overflow-auto max-h-[65vh] p-4">
          <pre className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {report}
          </pre>
        </div>
      </div>

    </div>
  );
};

export default PlanningExportTab;
