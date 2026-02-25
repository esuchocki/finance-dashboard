import { strToU8, zipSync } from 'fflate';
import type { KclAnnualDataset, KclMonthlyRow } from './kclTypes';
import { MONTH_NAMES } from './kclTypes';

// ─── Formatters ───────────────────────────────────────────────────────────────

export const fmt$ = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const fmt$2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const fmtPct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

export const fmtN = (n: number) => n.toLocaleString('en-US');

export const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const mn = (m: number) => MONTH_NAMES[m] ?? String(m);

// ─── Markdown table helpers ───────────────────────────────────────────────────

export function mdTable(headers: string[], rows: string[][]): string {
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const header = `| ${headers.join(' | ')} |`;
  const body = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
  return [header, sep, body].join('\n');
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

export type CsvCell = string | number;
export type CsvRows = CsvCell[][];

export function downloadCsv(rows: CsvRows, filename: string): void {
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

export function downloadXlsx(sheets: { name: string; rows: CsvRows }[], filename: string): void {
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

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Sum (debit − credit) per month for the given GL account codes. */
export function monthlyExpenseGL(
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
export function monthlyRevenueGL(
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
export function monthlyResidentNights(
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
export function residencyParticipantNights(
  roster: KclAnnualDataset['data']['residentialRoster'],
  year: number,
): Record<number, number> {
  return monthlyResidentNights(
    roster.filter(r => r.programName.toLowerCase().includes('residency program')),
    year,
  );
}

/** Build mdByMonth map for quick month-indexed access. */
export function indexByMonth(monthlyData: KclMonthlyRow[]): Record<number, KclMonthlyRow> {
  const out: Record<number, KclMonthlyRow> = {};
  for (const md of monthlyData) out[md.month] = md;
  return out;
}
