/**
 * KCL CSV Parsers
 *
 * One parser per data source. Each accepts a raw file content string and
 * returns a typed array. No external CSV library — raw string parsing
 * following the existing project pattern.
 */

import type {
  GlTransaction,
  ProgramEntry,
  ProgramRevenueEntry,
  ResidentialRosterEntry,
  RoomEntry,
  StaffSalaryEntry,
} from './kclTypes';

// ─── Core CSV utility ─────────────────────────────────────────────────────────

/**
 * Parse CSV text into an array of row objects keyed by header name.
 * Handles quoted fields containing commas and newlines.
 */
function parseCSVText(text: string): Record<string, string>[] {
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalised.split('\n');

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 2) return [];

  const headers = parseRow(nonEmpty[0]).map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const values = parseRow(nonEmpty[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Find the value for a column by checking multiple possible header names.
 * Case-insensitive.
 */
function col(row: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    const found = Object.keys(row).find(k => k.toLowerCase() === c.toLowerCase());
    if (found !== undefined && row[found] !== undefined) return row[found];
  }
  return '';
}

function num(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function int(value: string): number {
  const parsed = parseInt(value.replace(/[,\s]/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

// ─── GL Transactions (Xero export) ───────────────────────────────────────────

/**
 * Parses a Xero Account Transactions CSV export.
 *
 * Source: Xero > Reports > Account Transactions (CSV export).
 * This is the authoritative transaction-level export. Do NOT use the
 * General Ledger Detail report — it contains additional internal journal
 * entries and was used only for investigation during the data exploration phase.
 *
 * Expected columns (flexible matching):
 *   Date, Account Code, Account, Description, Source, Debit, Credit
 *
 * Xero exports have a 4-line preamble (title, org, date range, blank) before
 * the real header row. We scan for the header by looking for 'Account Code'.
 *
 * The Xero Account Transactions export has a known bug where some transactions
 * appear 2–3× (e.g., monthly PayPal fees, certain payments). We deduplicate
 * by transaction signature before returning.
 */
export function parseGlTransactions(content: string): GlTransaction[] {
  // Skip the Xero preamble by finding the real header row.
  const normalised = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalised.split('\n');
  const headerIdx = lines.findIndex(l => /account code/i.test(l));
  const stripped = headerIdx >= 0 ? lines.slice(headerIdx).join('\n') : content;

  const rows = parseCSVText(stripped);
  const seen = new Set<string>();
  const results: GlTransaction[] = [];

  for (const row of rows) {
    const date = col(row, ['Date', 'date', 'DATE', 'Transaction Date']);
    const accountCode = col(row, ['Account Code', 'AccountCode', 'account_code', 'GL Code', 'GL Account']);
    if (!date || !accountCode) continue;
    // Skip section headers, opening/closing balance rows, and blank rows
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) continue;

    const debit  = num(col(row, ['Debit',  'debit',  'DEBIT']));
    const credit = num(col(row, ['Credit', 'credit', 'CREDIT']));
    const description = col(row, ['Description', 'description', 'Narration', 'Memo']);
    const sourceName  = col(row, ['Source Name', 'SourceName', 'source_name', 'Source', 'Payee', 'Name']);

    // Deduplicate: Xero exports can contain duplicate rows for the same transaction.
    // Signature matches the strategy used during the original data exploration
    // (date + accountCode + description + debit + credit).
    const sig = `${date}|${accountCode}|${description}|${debit}|${credit}`;
    if (seen.has(sig)) continue;
    seen.add(sig);

    results.push({
      date: date.substring(0, 10),
      accountCode: accountCode.trim(),
      accountName: col(row, ['Account Name', 'AccountName', 'account_name', 'Account']),
      description,
      sourceName,
      debit,
      credit,
    });
  }

  return results;
}

// ─── Program Catalog (KCLdb query) ───────────────────────────────────────────

/**
 * Parses a program catalog CSV from KCLdb.
 *
 * Expected columns:
 *   PROGRAM_ID, PROGRAM_NAME, START_DATE, END_DATE, PROG_CATEGORY_CODE, PART_DAYS
 *
 * START_DATE / END_DATE accepted as ISO (YYYY-MM-DD) or MySQL date format.
 */
export function parseProgramCatalog(content: string): ProgramEntry[] {
  const rows = parseCSVText(content);
  const results: ProgramEntry[] = [];

  for (const row of rows) {
    const programName = col(row, ['PROGRAM_NAME', 'program_name', 'Program Name', 'name']);
    const startDate = col(row, ['START_DATE', 'start_date', 'Start Date']);
    const endDate = col(row, ['END_DATE', 'end_date', 'End Date']);
    if (!programName || !startDate || !endDate) continue;

    const partDays = int(col(row, ['total_participant_days', 'active_participant_days', 'PART_DAYS', 'part_days', 'Participant Days', 'participant_days']));

    results.push({
      programId: col(row, ['PROGRAM_ID', 'program_id', 'Program ID']),
      programName,
      startDate: startDate.substring(0, 10),
      endDate: endDate.substring(0, 10),
      categoryCode: col(row, ['PROG_CATEGORY_CODE', 'prog_category_code', 'Category Code', 'category']),
      participantDays: partDays,
    });
  }

  return results;
}

// ─── Program Revenue (KCLdb query) ───────────────────────────────────────────

/**
 * Parses per-program revenue CSV from KCLdb (GL 4xxx only).
 *
 * Expected columns:
 *   PROGRAM_ID, PROGRAM_NAME, START_DATE, END_DATE, PROG_CATEGORY_CODE,
 *   registrations, participants, total_revenue, tuition_revenue,
 *   accommodation_revenue, other_revenue
 */
export function parseProgramRevenue(content: string): ProgramRevenueEntry[] {
  const rows = parseCSVText(content);
  const results: ProgramRevenueEntry[] = [];

  for (const row of rows) {
    const programName = col(row, ['PROGRAM_NAME', 'program_name', 'Program Name', 'name']);
    if (!programName) continue;

    results.push({
      programId: col(row, ['PROGRAM_ID', 'program_id']),
      programName,
      startDate: col(row, ['START_DATE', 'start_date']).substring(0, 10),
      endDate: col(row, ['END_DATE', 'end_date']).substring(0, 10),
      categoryCode: col(row, ['PROG_CATEGORY_CODE', 'prog_category_code', 'category']),
      registrations: int(col(row, ['registrations', 'Registrations', 'registration_count'])),
      participants: int(col(row, ['participants', 'Participants', 'participant_count'])),
      totalRevenue: num(col(row, ['total_revenue', 'Total Revenue', 'revenue'])),
      tuitionRevenue: num(col(row, ['tuition_revenue', 'Tuition Revenue', 'tuition'])),
      accommodationRevenue: num(col(row, ['accommodation_revenue', 'Accommodation Revenue', 'accommodation'])),
      otherRevenue: num(col(row, ['other_revenue', 'Other Revenue', 'other'])),
    });
  }

  return results;
}

// ─── Residential Roster (KCLdb query) ────────────────────────────────────────

/**
 * Parses residential staff/volunteer roster CSV from KCLdb.
 *
 * Expected columns:
 *   FIRST_NAME, LAST_NAME, EMAIL_ADDRESS, PROGRAM_NAME,
 *   ARRIVAL_DATE, DEPARTURE_DATE, days_in_year
 *
 * The days_in_year column may also appear as days_in_2025, days_in_2026, etc.
 * The parser checks for any column matching days_in_* if days_in_year is absent.
 */
export function parseResidentialRoster(content: string): ResidentialRosterEntry[] {
  const rows = parseCSVText(content);
  if (rows.length === 0) return [];

  // Find the days_in_* column dynamically
  const sampleRow = rows[0];
  const daysCol = Object.keys(sampleRow).find(k =>
    k.toLowerCase() === 'days_in_year' ||
    /^days_in_\d{4}$/.test(k.toLowerCase())
  ) ?? 'days_in_year';

  const results: ResidentialRosterEntry[] = [];

  for (const row of rows) {
    const firstName = col(row, ['FIRST_NAME', 'first_name', 'First Name']);
    const lastName = col(row, ['LAST_NAME', 'last_name', 'Last Name']);
    if (!firstName && !lastName) continue;

    results.push({
      firstName,
      lastName,
      email: col(row, ['EMAIL_ADDRESS', 'email_address', 'Email', 'email']),
      programName: col(row, ['PROGRAM_NAME', 'program_name', 'Program']),
      arrivalDate: col(row, ['ARRIVAL_DATE', 'arrival_date', 'Arrival']).substring(0, 10),
      departureDate: col(row, ['DEPARTURE_DATE', 'departure_date', 'Departure']).substring(0, 10),
      daysInYear: int(row[daysCol] ?? '0'),
    });
  }

  return results;
}

// ─── Room Inventory (kcl_accommodations.csv) ─────────────────────────────────

/**
 * Parses the KCL room inventory CSV.
 *
 * Expected columns (from kcl_accommodations.csv):
 *   Room Number, Room Type, Accommodation, Price for Single Occupancy,
 *   Price for Shared Occupancy, Shared Occupancy Limit, Shared Occupancy Potential,
 *   Occupied by Staff, Seasons
 */
export function parseRoomInventory(content: string): RoomEntry[] {
  const rows = parseCSVText(content);
  const results: RoomEntry[] = [];

  for (const row of rows) {
    const roomNumber = col(row, ['Room Number', 'room_number', 'Room', 'RoomNumber']);
    if (!roomNumber) continue;

    results.push({
      roomNumber,
      roomType: col(row, ['Room Type', 'room_type', 'Type']),
      accommodation: col(row, ['Accommodation', 'accommodation', 'Building']),
      priceSingle: num(col(row, ['Price for Single Occupancy', 'price_single', 'Single Price', 'Single'])),
      priceShared: num(col(row, ['Price for Shared Occupancy', 'price_shared', 'Shared Price', 'Shared'])),
      sharedLimit: int(col(row, ['Shared Occupancy Limit', 'shared_limit', 'Limit'])),
      sharedPotential: int(col(row, ['Shared Occupancy Potential', 'shared_potential', 'Potential'])),
      occupiedByStaff: col(row, ['Occupied by Staff', 'occupied_by_staff', 'Staff', 'OccupiedByStaff']),
      seasons: col(row, ['Seasons', 'seasons', 'Season']),
    });
  }

  return results;
}

// ─── Staff Salaries ───────────────────────────────────────────────────────────

/**
 * Parses the staff salaries CSV.
 *
 * Expected columns (from salaries.csv):
 *   Employee, Department, Position/Title, Hourly Rate, Hours Per Month,
 *   Monthly Salary, Annual Salary
 */
export function parseStaffSalaries(content: string): StaffSalaryEntry[] {
  const rows = parseCSVText(content);
  const results: StaffSalaryEntry[] = [];

  for (const row of rows) {
    const name = col(row, ['Employee', 'employee', 'Name', 'Staff Member']);
    const annualStr = col(row, ['Annual Salary', 'annual_salary', 'Annual', 'Salary']);
    const annual = num(annualStr);
    if (!name || annual <= 0) continue;

    const hourlyStr = col(row, ['Hourly Rate', 'hourly_rate', 'Hourly']);
    const hoursStr = col(row, ['Hours Per Month', 'hours_per_month', 'Hours/Month', 'Hours']);

    results.push({
      name,
      department: col(row, ['Department', 'department', 'Dept']),
      title: col(row, ['Position/Title', 'position_title', 'Title', 'Position']),
      annualSalary: annual,
      hourlyRate: hourlyStr ? num(hourlyStr) || null : null,
      hoursPerMonth: hoursStr ? int(hoursStr) || null : null,
    });
  }

  return results;
}
