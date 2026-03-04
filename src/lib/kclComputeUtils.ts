import type { GlTransaction, KclExpenseCategory, Season } from './kclTypes';

// ─── GL category definitions ──────────────────────────────────────────────────

export const GL_CATEGORIES: Record<string, {
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

export const SEASON_MONTHS: Record<Season, number[]> = {
  winter: [12, 1, 2],
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  fall:   [9, 10, 11],
};

// All GL codes tracked as expenses (mirrors GL_CATEGORIES — used for monthly expense totals)
export const ALL_EXPENSE_CODES = new Set<string>(
  Object.values(GL_CATEGORIES).flatMap(c => c.glAccounts)
);

// GL codes for each revenue stream
export const PROGRAM_GL   = new Set(['4300', '4310', '4510']);
export const RESIDENCY_GL = new Set(['4500', '4520']);
export const DONATION_GL  = new Set(['4000', '4050', '4150', '4200']);

// Category labels for known Omnis program category codes
export const PROG_CATEGORY_LABELS: Record<string, string> = {
  REG:  'Regular Programs',
  IHR:  'In-House Retreat / Residency',
  CABN: 'Cabin Retreats',
};

// Map PROG_CATEGORY_CODE → residential track for roster classification.
// Populate once you have verified the codes from your Omnis data (query
// SELECT DISTINCT PROG_CATEGORY_CODE FROM program WHERE PROGRAM_ID IN (<staff/vol/residency IDs>)).
// Example: { 'RSTF': 'staff', 'RVOL': 'volunteer', 'RRES': 'residency' }
export const RESIDENTIAL_CATEGORY_CODES: Record<string, 'staff' | 'volunteer' | 'residency'> = {};

// Assumed monthly residency rate for implied-resident count (from requirements.md)
export const RESIDENT_MONTHLY_RATE = 1750;

// Volunteer labor: estimated daily equivalent value (VT min wage × 8h + housing/food offset)
export const VOLUNTEER_VALUE_PER_DAY = 150;

// CC fee benchmark: typical nonprofit payment processor rate
export const CC_BENCHMARK_RATE = 0.025;

// Residential staff and residents only occupy private room types.
// Dorm beds, tent cabins, shrine floors, and campground are not "rooms" for
// capacity or REVPAR purposes.
export const PRIVATE_ROOM_TYPES = new Set(['premium', 'standard', 'double', 'accessibility']);

// Omnis ROOM_TYPE_CODE values by occupancy category.
// Source: data/room_type_codes.csv — use these to classify room_booking rows,
// not program names (which change each year).
//
// Staff (year-long private room, $0 rate — subtracts from available guest rooms):
//   KCLSTAFF  = Residential Staff
//   KCL SPRB  = Staff Private Room Benefit
export const STAFF_ROOM_TYPE_CODES = new Set(['KCLSTAFF', 'KCL SPRB']);

// Volunteers ($0 rate, typically dorm or lower-tier rooms):
//   KCL VOL   = KCL Volunteer
export const VOLUNTEER_ROOM_TYPE_CODES = new Set(['KCL VOL']);

// Long-term residents, Residency Program participants ($0 rate, private room):
//   KCL RESI  = KCL Residents
export const RESIDENT_ROOM_TYPE_CODES = new Set(['KCL RESI']);

// Paying guest private rooms (GL 4250):
//   KCL PSGL  = Premium single     KCL PDBL  = Premium shared
//   KCL LSGL  = Luxury single      KCL PFAM  = Premium family
//   KCL SING  = Standard single    KCL DBL   = Standard shared
export const GUEST_PRIVATE_ROOM_TYPE_CODES = new Set([
  'KCL PSGL', 'KCL PDBL', 'KCL LSGL', 'KCL PFAM',
  'KCL SING', 'KCL DBL',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a person name to lowercase "firstname lastname" for comparison.
 * Handles both "First Last" and "Last, First" orderings so that salary CSV
 * entries can be matched against Omnis participant names regardless of format.
 */
export function normalizePersonName(name: string): string {
  const s = name.trim();
  if (s.includes(',')) {
    const comma = s.indexOf(',');
    const last  = s.slice(0, comma).trim();
    const first = s.slice(comma + 1).trim();
    return `${first} ${last}`.toLowerCase().replace(/\s+/g, ' ');
  }
  return s.toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Days a roster entry spends within the target calendar year, computed directly
 * from arrival/departure dates.  Mirrors SQL DATEDIFF semantics (exclusive of
 * departure day, i.e. number of nights).
 */
export function clampedDays(arrival: string, departure: string, year: number): number {
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
 * Classify a roster entry into one of three on-site tracks.
 *
 * Uses PROG_CATEGORY_CODE first if the entry carries one and it appears in
 * RESIDENTIAL_CATEGORY_CODES — populate that map once you know the codes.
 * Falls back to program-name heuristics so existing data keeps working.
 *
 * The three programs in the residential roster query are:
 *   "2025 KCL Residential Staff"     → 'staff'
 *   "2025 KCL Residential Volunteer" → 'volunteer'
 *   "2025 Residency Program"         → 'residency'
 */
export function rosterTrack(
  entry: { programName: string; categoryCode?: string },
): 'staff' | 'volunteer' | 'residency' {
  if (entry.categoryCode) {
    const mapped = RESIDENTIAL_CATEGORY_CODES[entry.categoryCode];
    if (mapped) return mapped;
  }
  const lower = entry.programName.toLowerCase();
  if (lower.includes('volunteer')) return 'volunteer';
  if (lower.includes('residency program')) return 'residency';
  return 'staff';
}

export function txnYear(t: GlTransaction): number {
  return parseInt(t.date.substring(0, 4), 10);
}

export function txnMonth(t: GlTransaction): number {
  return parseInt(t.date.substring(5, 7), 10);
}

export function getSeason(month: number): Season {
  if ([12, 1, 2].includes(month)) return 'winter';
  if ([3, 4, 5].includes(month))  return 'spring';
  if ([6, 7, 8].includes(month))  return 'summer';
  return 'fall';
}

export function strictYearFilter(startDate: string, endDate: string, year: number): boolean {
  if (!startDate) return false;
  return parseInt(startDate.substring(0, 4), 10) === year;
}

/** Last day (1–31) of a 1-based month in the given year. */
export function dimOf(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Add `days` to an ISO date string (handles negatives). */
export function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Calendar days from ISO a to ISO b, inclusive. */
export function daySpan(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime();
  return Math.round(ms / 86400000) + 1;
}
