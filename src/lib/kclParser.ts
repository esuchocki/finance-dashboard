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
  TrialBalanceEntry,
  DonationEntry,
  ArEntry,
  ProgramTransactionEntry,
  RecurringDonorEntry,
  RoomBookingEntry,
  ProgramBillingEntry,
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

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Normalise a date string to ISO YYYY-MM-DD.
 * Handles:
 *   - Already ISO: "2025-01-06" → "2025-01-06"
 *   - Xero Account Transactions format: "06 Jan 2025" → "2025-01-06"
 * Returns empty string if the format is unrecognised.
 */
function normaliseDate(raw: string): string {
  const s = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // "DD MMM YYYY" or "D MMM YYYY"
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (m) {
    const month = MONTH_MAP[m[2].toLowerCase()];
    if (month) return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
  }
  return '';
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
    const rawDate = col(row, ['Date', 'date', 'DATE', 'Transaction Date']);
    const accountCode = col(row, ['Account Code', 'AccountCode', 'account_code', 'GL Code', 'GL Account']);
    if (!rawDate || !accountCode) continue;
    // Normalise date; skip section headers and unrecognised rows
    const date = normaliseDate(rawDate);
    if (!date) continue;

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
      date,
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
      totalRegistrations: int(col(row, ['total_registrations', 'TOTAL_REGISTRATIONS', 'total_reg'])),
      activeRegistrations: int(col(row, ['active_registrations', 'ACTIVE_REGISTRATIONS', 'active_reg'])),
      isResidential: col(row, ['is_residential']) === '1',
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

    const arrivalDate = col(row, ['ARRIVAL_DATE', 'arrival_date', 'Arrival']).substring(0, 10);
    const departureDate = col(row, ['DEPARTURE_DATE', 'departure_date', 'Departure']).substring(0, 10);

    // Skip rows where ARRIVAL_DATE is not a valid ISO date — these are summary or
    // aggregate rows that Omnis occasionally emits at the top of an export, where
    // column values are shifted (e.g. LAST_NAME holds the program name).
    if (!/^\d{4}-\d{2}-\d{2}$/.test(arrivalDate)) continue;

    results.push({
      firstName,
      lastName,
      email: col(row, ['EMAIL_ADDRESS', 'email_address', 'Email', 'email']),
      programName: col(row, ['PROGRAM_NAME', 'program_name', 'Program']),
      arrivalDate,
      departureDate,
      daysInYear: int(row[daysCol] ?? '0'),
    });
  }

  return results;
}

// ─── Room Inventory (kcl_accommodations.csv) ─────────────────────────────────

/**
 * Parses the KCL room inventory CSV.
 *
 * Expected columns (from room_inventory.csv):
 *   Room ID, Room Type, Occupancy Limit, Price for Single Occupancy,
 *   Price for Shared Occupancy, Shared Occupancy Potential, Accommodation, Seasons
 */
export function parseRoomInventory(content: string): RoomEntry[] {
  const rows = parseCSVText(content);
  const results: RoomEntry[] = [];

  for (const row of rows) {
    const roomId = col(row, ['Room ID', 'room_id', 'Room Number', 'room_number', 'Room', 'RoomNumber']);
    if (!roomId) continue;

    results.push({
      roomId,
      roomType: col(row, ['Room Type', 'room_type', 'Type']),
      accommodation: col(row, ['Accommodation', 'accommodation', 'Building']),
      occupancyLimit: int(col(row, ['Occupancy Limit', 'occupancy_limit', 'Shared Occupancy Limit', 'shared_limit', 'Limit'])),
      priceSingle: num(col(row, ['Price for Single Occupancy', 'price_single', 'Single Price', 'Single'])),
      priceShared: num(col(row, ['Price for Shared Occupancy', 'price_shared', 'Shared Price', 'Shared'])),
      sharedPotential: int(col(row, ['Shared Occupancy Potential', 'shared_potential', 'Potential'])),
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
// ─── Trial Balance (Xero export) ──────────────────────────────────────────────

/**
 * Parses a Xero Trial Balance CSV export.
 *
 * The file has the same 4-row preamble as GL Transactions (title, org, date
 * range, blank). We locate the real header by scanning for 'Account Code'.
 *
 * Expected columns: Account Code, Account, Account Type, Account Class, Debit, Credit
 */
export function parseTrialBalance(content: string): TrialBalanceEntry[] {
  const normalised = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalised.split('\n');
  const headerIdx = lines.findIndex(l => /account code/i.test(l));
  const stripped = headerIdx >= 0 ? lines.slice(headerIdx).join('\n') : content;

  const rows = parseCSVText(stripped);
  const results: TrialBalanceEntry[] = [];

  for (const row of rows) {
    const accountCode = col(row, ['Account Code', 'AccountCode', 'account_code']).trim();
    if (!accountCode) continue;

    results.push({
      accountCode,
      accountName: col(row, ['Account', 'account_name', 'Account Name']),
      accountType: col(row, ['Account Type', 'AccountType', 'account_type']),
      accountClass: col(row, ['Account Class', 'AccountClass', 'account_class']),
      debit: num(col(row, ['Debit', 'debit', 'DEBIT'])),
      credit: num(col(row, ['Credit', 'credit', 'CREDIT'])),
    });
  }

  return results;
}

// ─── Donations (Omnis export) ─────────────────────────────────────────────────

/**
 * Parses the Omnis donations CSV.
 *
 * Expected columns: DONATION_ID, donor_name, EMAIL_ADDRESS, fund_name,
 *   GL_ACCOUNT, pledged_amount, DONATION_TYPE, PAYMENT_CAT, CANCELLED,
 *   PAYMENT_DATE, payment_method, VOID_TRANSACTION, amount_paid
 *
 * NULL is the literal string "NULL" in Omnis exports.
 */
export function parseDonations(content: string): DonationEntry[] {
  const rows = parseCSVText(content);
  const results: DonationEntry[] = [];

  const nullStr = (v: string) => (v === 'NULL' || v === '') ? '' : v;
  const nullDate = (v: string) => {
    const s = nullStr(v);
    return s ? s.substring(0, 10) : '';
  };

  for (const row of rows) {
    const fundName = col(row, ['fund_name', 'FUND_NAME', 'Fund Name']);
    if (!fundName || fundName === 'NULL') continue;

    const paidStr = nullStr(col(row, ['amount_paid', 'AMOUNT_PAID', 'Amount Paid']));

    results.push({
      donationId: col(row, ['DONATION_ID', 'donation_id', 'ID']),
      donorName: nullStr(col(row, ['donor_name', 'DONOR_NAME', 'Donor'])),
      email: nullStr(col(row, ['EMAIL_ADDRESS', 'email_address', 'Email'])),
      fundName,
      glAccount: col(row, ['GL_ACCOUNT', 'gl_account', 'GL Account']),
      pledgedAmount: num(col(row, ['pledged_amount', 'PLEDGED_AMOUNT', 'Pledged'])),
      donationType: col(row, ['DONATION_TYPE', 'donation_type', 'Type']),
      paymentCat: col(row, ['PAYMENT_CAT', 'payment_cat', 'Payment Category']),
      cancelledDate: nullDate(col(row, ['CANCELLED', 'cancelled'])),
      paymentDate: nullDate(col(row, ['PAYMENT_DATE', 'payment_date', 'Date'])),
      paymentMethod: nullStr(col(row, ['payment_method', 'PAYMENT_METHOD', 'Method'])),
      voidDate: nullDate(col(row, ['VOID_TRANSACTION', 'void_transaction', 'Void'])),
      amountPaid: paidStr ? num(paidStr) : 0,
    });
  }

  return results;
}

// ─── Outstanding AR (Omnis export) ───────────────────────────────────────────

/**
 * Parses the Omnis outstanding accounts receivable CSV.
 *
 * Expected columns: REGISTRATION_ID, participant_name, EMAIL_ADDRESS,
 *   PROGRAM_NAME, START_DATE, END_DATE, total_charged, total_paid, outstanding
 */
export function parseOutstandingAr(content: string): ArEntry[] {
  const rows = parseCSVText(content);
  const results: ArEntry[] = [];

  for (const row of rows) {
    const participantName = col(row, ['participant_name', 'PARTICIPANT_NAME', 'Participant', 'name']);
    if (!participantName) continue;

    results.push({
      registrationId: col(row, ['REGISTRATION_ID', 'registration_id', 'ID']),
      participantName,
      email: col(row, ['EMAIL_ADDRESS', 'email_address', 'Email']),
      programName: col(row, ['PROGRAM_NAME', 'program_name', 'Program']),
      startDate: col(row, ['START_DATE', 'start_date', 'Start']).substring(0, 10),
      endDate: col(row, ['END_DATE', 'end_date', 'End']).substring(0, 10),
      totalCharged: num(col(row, ['total_charged', 'TOTAL_CHARGED', 'Charged'])),
      totalPaid: num(col(row, ['total_paid', 'TOTAL_PAID', 'Paid'])),
      outstanding: num(col(row, ['outstanding', 'OUTSTANDING', 'Balance'])),
    });
  }

  return results;
}

// ─── Staff Salaries ───────────────────────────────────────────────────────────

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

    const medicareStr = col(row, ['Medicare', 'medicare', 'MEDICARE']);
    const oasdiStr    = col(row, ['OASDI', 'oasdi']);
    const startStr    = col(row, ['start_date', 'Start Date', 'Start', 'Hire Date', 'hire_date']);
    const endStr      = col(row, ['end_date', 'End Date', 'End', 'Last Day', 'last_day', 'Termination Date', 'termination_date']);
    results.push({
      name,
      department: col(row, ['Department', 'department', 'Dept']),
      title: col(row, ['Position/Title', 'position_title', 'Title', 'Position']),
      annualSalary: annual,
      hourlyRate: hourlyStr ? num(hourlyStr) || null : null,
      hoursPerMonth: hoursStr ? int(hoursStr) || null : null,
      medicareMonthly: medicareStr && medicareStr !== 'NULL' ? num(medicareStr) || null : null,
      oasdiMonthly:    oasdiStr    && oasdiStr    !== 'NULL' ? num(oasdiStr)    || null : null,
      ...(startStr ? { startDate: startStr.substring(0, 10) } : {}),
      ...(endStr   ? { endDate:   endStr.substring(0, 10)   } : {}),
    });
  }

  return results;
}

// ─── Program Transactions (Omnis export) ──────────────────────────────────────

/**
 * Parses the Omnis all-program-transactions CSV.
 *
 * Expected columns: PROGRAM_ID, PROGRAM_NAME, PROG_CATEGORY_CODE, START_DATE,
 *   END_DATE, GL_ACCOUNT, TRANS_TYPE, TRANS_DESC, num_lines, total_amount, total_discount
 */
export function parseProgramTransactions(content: string): ProgramTransactionEntry[] {
  const rows = parseCSVText(content);
  const results: ProgramTransactionEntry[] = [];

  for (const row of rows) {
    const programName = col(row, ['PROGRAM_NAME', 'program_name', 'Program Name']);
    if (!programName) continue;

    results.push({
      programId: col(row, ['PROGRAM_ID', 'program_id']),
      programName,
      categoryCode: col(row, ['PROG_CATEGORY_CODE', 'prog_category_code', 'Category']),
      startDate: col(row, ['START_DATE', 'start_date']).substring(0, 10),
      endDate: col(row, ['END_DATE', 'end_date']).substring(0, 10),
      glAccount: col(row, ['GL_ACCOUNT', 'gl_account', 'GL Account']),
      transType: col(row, ['TRANS_TYPE', 'trans_type', 'Transaction Type']),
      transDesc: col(row, ['TRANS_DESC', 'trans_desc', 'Description']),
      numLines: int(col(row, ['num_lines', 'NUM_LINES', 'Lines'])),
      totalAmount: num(col(row, ['total_amount', 'TOTAL_AMOUNT', 'Amount'])),
      totalDiscount: num(col(row, ['total_discount', 'TOTAL_DISCOUNT', 'Discount'])),
    });
  }

  return results;
}

// ─── Recurring Donors (Omnis export) ──────────────────────────────────────────

/**
 * Parses the Omnis recurring-donors CSV.
 *
 * Expected columns: PERSON_ID, donor_name, EMAIL_ADDRESS, num_active_enrollments,
 *   payments_made_<YYYY>, total_paid_<YYYY>
 *
 * The year-specific columns (payments_made_2025, total_paid_2025) are detected
 * dynamically so this parser works for any year's export.
 */
export function parseRecurringDonors(content: string): RecurringDonorEntry[] {
  const rows = parseCSVText(content);
  if (rows.length === 0) return [];

  // Detect year-specific column names
  const sampleRow = rows[0];
  const paymentsCol = Object.keys(sampleRow).find(k =>
    k.toLowerCase().startsWith('payments_made')
  ) ?? 'payments_made';
  const paidCol = Object.keys(sampleRow).find(k =>
    k.toLowerCase().startsWith('total_paid')
  ) ?? 'total_paid';

  const nullStr = (v: string) => (v === 'NULL' || v === '') ? '' : v;
  const results: RecurringDonorEntry[] = [];

  for (const row of rows) {
    const donorName = nullStr(col(row, ['donor_name', 'DONOR_NAME', 'Name']));
    if (!donorName) continue;

    results.push({
      personId: col(row, ['PERSON_ID', 'person_id', 'ID']),
      donorName,
      email: nullStr(col(row, ['EMAIL_ADDRESS', 'email_address', 'Email'])),
      activeEnrollments: int(col(row, ['num_active_enrollments', 'NUM_ACTIVE_ENROLLMENTS', 'Enrollments'])),
      paymentsMade: int(row[paymentsCol] ?? '0'),
      totalPaid: num(row[paidCol] ?? '0'),
    });
  }

  return results;
}

// ─── Room Bookings (Omnis export) ─────────────────────────────────────────────

/**
 * Parses the Omnis room-bookings CSV.
 *
 * Expected columns: ROOM_BOOKING_ID, ROOM_ID, ROOM_NO, ROOM_TYPE_CODE,
 *   ROOM_TYPE_DESC, REGISTRATION_ID, PROGRAM_ID, ARRIVAL_DATE_TIME,
 *   DEPARTURE_DATE_TIME, nights
 */
export function parseRoomBookings(content: string): RoomBookingEntry[] {
  const rows = parseCSVText(content);
  const results: RoomBookingEntry[] = [];

  for (const row of rows) {
    const roomNo = col(row, ['ROOM_NO', 'room_no', 'Room Number', 'Room']);
    if (!roomNo) continue;

    const arrivalRaw = col(row, ['ARRIVAL_DATE_TIME', 'arrival_date_time', 'Arrival']);
    const departureRaw = col(row, ['DEPARTURE_DATE_TIME', 'departure_date_time', 'Departure']);

    results.push({
      bookingId: col(row, ['ROOM_BOOKING_ID', 'room_booking_id', 'ID']),
      roomId: col(row, ['ROOM_ID', 'room_id']),
      roomNo,
      roomTypeCode: col(row, ['ROOM_TYPE_CODE', 'room_type_code']),
      roomTypeDesc: col(row, ['ROOM_TYPE_DESC', 'room_type_desc', 'Room Type']),
      registrationId: col(row, ['REGISTRATION_ID', 'registration_id']),
      programId: col(row, ['PROGRAM_ID', 'program_id']),
      programName: col(row, ['PROGRAM_NAME', 'program_name']),
      arrivalDate: arrivalRaw ? arrivalRaw.substring(0, 10) : '',
      departureDate: departureRaw ? departureRaw.substring(0, 10) : '',
      nights: int(col(row, ['nights', 'NIGHTS', 'Nights'])),
    });
  }

  return results;
}

// ─── All Program Registrations (KCLdb export) ─────────────────────────────────

/**
 * Parses the all-registrations CSV (all active registrations, paid and unpaid).
 *
 * Expected columns: REGISTRATION_ID, participant_name, EMAIL_ADDRESS,
 *   PROGRAM_NAME, START_DATE, END_DATE, ARRIVAL_DATE, DEPARTURE_DATE,
 *   total_charged, total_paid, outstanding
 *
 * Same ArEntry type as parseOutstandingAr — ARRIVAL_DATE and DEPARTURE_DATE
 * are present in the file but not stored (ArEntry does not include them).
 */
export function parseAllRegistrations(content: string): ArEntry[] {
  const rows = parseCSVText(content);
  const results: ArEntry[] = [];

  for (const row of rows) {
    const participantName = col(row, ['participant_name', 'PARTICIPANT_NAME', 'Participant', 'name']);
    if (!participantName) continue;

    results.push({
      registrationId: col(row, ['REGISTRATION_ID', 'registration_id', 'ID']),
      participantName,
      email: col(row, ['EMAIL_ADDRESS', 'email_address', 'Email']),
      programName: col(row, ['PROGRAM_NAME', 'program_name', 'Program']),
      startDate: col(row, ['START_DATE', 'start_date', 'Start']).substring(0, 10),
      endDate: col(row, ['END_DATE', 'end_date', 'End']).substring(0, 10),
      totalCharged: num(col(row, ['total_charged', 'TOTAL_CHARGED', 'Charged'])),
      totalPaid: num(col(row, ['total_paid', 'TOTAL_PAID', 'Paid'])),
      outstanding: num(col(row, ['outstanding', 'OUTSTANDING', 'Balance'])),
    });
  }

  return results;
}

// ─── Program Billing (KCLdb export) ───────────────────────────────────────────

/**
 * Parses the program-billing CSV (per-person charges billed via transactions table).
 *
 * Expected columns: PERSON_ID, participant_name, EMAIL_ADDRESS,
 *   registrations_2025, charge_lines_2025, total_charged_2025
 *
 * Column names are year-generic at parse time: the year suffix is detected
 * dynamically so this parser works for any year's export.
 */
export function parseProgramBilling(content: string): ProgramBillingEntry[] {
  const rows = parseCSVText(content);
  if (rows.length === 0) return [];

  // Detect year-specific column names
  const sampleRow = rows[0];
  const regsCol    = Object.keys(sampleRow).find(k => k.toLowerCase().startsWith('registrations')) ?? 'registrations_2025';
  const linesCol   = Object.keys(sampleRow).find(k => k.toLowerCase().startsWith('charge_lines'))  ?? 'charge_lines_2025';
  const chargedCol = Object.keys(sampleRow).find(k => k.toLowerCase().startsWith('total_charged')) ?? 'total_charged_2025';

  const results: ProgramBillingEntry[] = [];

  for (const row of rows) {
    const participantName = col(row, ['participant_name', 'PARTICIPANT_NAME', 'Name']);
    if (!participantName) continue;

    results.push({
      personId:         col(row, ['PERSON_ID', 'person_id', 'ID']),
      participantName,
      email:            col(row, ['EMAIL_ADDRESS', 'email_address', 'Email']),
      registrations2025: int(row[regsCol]    ?? '0'),
      chargeLines2025:   int(row[linesCol]   ?? '0'),
      totalCharged2025:  num(row[chargedCol] ?? '0'),
    });
  }

  return results;
}
