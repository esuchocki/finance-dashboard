/**
 * KCL Financial Planning Types
 *
 * All types for the annual data loader and break-even planning tools.
 * Isolated from the main types.ts to keep concerns separate.
 */

// ─── Data source keys ─────────────────────────────────────────────────────────

export type KclDataSourceKey =
  | 'glTransactions'
  | 'programCatalog'
  | 'programRevenue'
  | 'residentialRoster'
  | 'roomInventory'
  | 'staffSalaries';

export type KclLoadStatus = 'missing' | 'loaded' | 'error';

export type Season = 'winter' | 'spring' | 'summer' | 'fall';

// ─── Raw parsed data shapes (one row = one record) ────────────────────────────

export interface GlTransaction {
  date: string;        // ISO: YYYY-MM-DD
  accountCode: string;
  accountName: string;
  description: string;
  sourceName: string;
  debit: number;
  credit: number;
}

export interface ProgramEntry {
  programId: string;
  programName: string;
  startDate: string;   // ISO: YYYY-MM-DD
  endDate: string;
  categoryCode: string;
  participantDays: number;
}

export interface ProgramRevenueEntry {
  programId: string;
  programName: string;
  startDate: string;
  endDate: string;
  categoryCode: string;
  registrations: number;
  participants: number;
  totalRevenue: number;
  tuitionRevenue: number;
  accommodationRevenue: number;
  otherRevenue: number;
}

export interface ResidentialRosterEntry {
  firstName: string;
  lastName: string;
  email: string;
  programName: string;
  arrivalDate: string;
  departureDate: string;
  daysInYear: number;
}

export interface RoomEntry {
  roomNumber: string;
  roomType: string;
  accommodation: string;
  priceSingle: number;
  priceShared: number;
  sharedLimit: number;
  sharedPotential: number;
  occupiedByStaff: string;
  seasons: string;
}

export interface StaffSalaryEntry {
  name: string;
  department: string;
  title: string;
  annualSalary: number;
  hourlyRate: number | null;
  hoursPerMonth: number | null;
}

// ─── Computed output ──────────────────────────────────────────────────────────

export interface KclExpenseCategory {
  name: string;
  glAccounts: string[];
  total: number;
  perDay: number;
  type: 'variable' | 'semi_variable' | 'overhead' | 'program_specific';
  fixedAnnual?: number;     // utilities only
  variableAnnual?: number;  // utilities only
  seasonalMultipliers?: Record<Season, number>;
  ccFeeRate?: number;       // payment_processing only
}

export interface KclProgramSummary {
  programId: string;
  name: string;
  categoryCode: string;
  startDate: string;
  endDate: string;
  registrations: number;
  participants: number;
  totalRevenue: number;
  tuitionRevenue: number;
  accommodationRevenue: number;
}

// Revenue broken into the three operational streams (from Xero GL codes)
export interface KclRevenueStreams {
  programs: number;              // GL 4300, 4310, 4510
  residency: number;             // GL 4500, 4520
  donationsUnrestricted: number; // GL 4000, 4050
  donationsRestricted: number;   // GL 4200
  campaigns: number;             // GL 3xxx excl 3000
  other: number;                 // remaining 4xxx not in named streams
}

// One row per calendar month
export interface KclMonthlyRow {
  month: number;                 // 1–12
  revenuePrograms: number;
  revenueResidency: number;
  revenueDonations: number;      // unrestricted + restricted combined
  revenueCampaigns: number;      // GL 3xxx credits
  revenueTotal: number;
  revenueManualJournal: number;  // subset of revenueTotal: Omnis period-closing batch postings
  expenses: number;              // same GL codes as totalExpenses
}

// Residential occupancy derived from the roster and revenue
export interface KclOccupancy {
  monthlyResidents: Record<number, number>; // people present per month (roster-based)
  avgMonthlyResidents: number;
  totalResidentDays: number;                // sum of daysInYear across all roster entries
  impliedResidents: number;                 // residency revenue / ($1,750 × 12)
}

// Three-lever break-even analysis
export interface KclBreakEven {
  deficit: number;
  avgProgramRevenue: number;
  residencyRevenuePerResident: number;  // $21,000/year at $1,750/month
  totalDonationRevenue: number;
  residentsNeeded: number;
  programsNeeded: number;
  donationIncreasePct: number;          // fraction (0.35 = 35%)
}

// Per-program cost components used in contribution margin analysis
export interface KclProgramCosts {
  teacherCost: number;       // GL 5250/5300/5350 — first-claim window attribution (REG only)
  foodCost: number;          // marginal food rate × participant-days (0 for CABN self-catering)
  ccFees: number;            // cc_rate × program revenue
  utilityMarginal: number;   // above-baseline utility for program's dates
  overheadAlloc: number;     // proportional share of all remaining fixed costs
}

// Full per-program contribution margin record
export interface KclProgramPnL {
  programId: string;
  name: string;
  categoryCode: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  registrations: number;
  participantDays: number;
  revenue: number;
  costs: KclProgramCosts;
  totalCosts: number;
  contributionMargin: number;
  marginPct: number;          // contributionMargin / revenue (0 if revenue = 0)
}

// Revenue and participation by program category (REG / CABN / IHR)
export interface KclProgramCategory {
  categoryCode: string;
  label: string;
  count: number;
  totalRevenue: number;
  participantDays: number;
  avgRevenuePerProgram: number;
  totalDurationDays: number;     // sum of program duration days (strict-year programs only)
}

// Residential population breakdown by track (staff / volunteer / residency participant)
export interface KclVolunteerMetrics {
  volunteerCount: number;
  volunteerDays: number;
  staffCount: number;
  staffDays: number;
  residencyCount: number;
  residencyDays: number;
  estimatedLaborValue: number;   // volunteerDays × laborValuePerDay
  laborValuePerDay: number;      // assumed daily equivalent (e.g. $150)
}

export interface KclComputedMetrics {
  year: number;

  // Revenue
  totalRevenue: number;         // Xero cash collected (GL 3xxx/4xxx credits)
  omnisBilledTotal: number;     // Omnis charges (GL 4xxx) — may differ from Xero
  revenueGapAmount: number;     // totalRevenue - omnisBilledTotal (donations + timing diffs)

  // Participation
  participantDays: number;
  programCount: number;
  seasonalDays: Record<Season, number>;
  seasonalPrograms: Record<Season, number>;

  // Utilities
  utilityTotal: number;
  utilityFixed: number;
  utilityVariable: number;
  utilityBaselineMonth: number;   // 1–12
  utilityBaselineSpend: number;
  seasonalUtility: Record<Season, number>;
  seasonalMultipliers: Record<Season, number>;

  // Payment processing
  ccFeeRate: number;
  ccFeeTotal: number;
  ccFeeBenchmarkRate: number;   // industry standard benchmark (2.5%)
  ccFeeExcessRate: number;      // max(0, ccFeeRate - benchmark)
  ccFeeAlert: boolean;          // true if effective rate > 3.5%

  // Expenses
  expenseCategories: Record<string, KclExpenseCategory>;
  totalExpenses: number;
  deficit: number;
  costPerDay: number;

  // Capacity
  totalRooms: number;
  staffRooms: number;
  availableRooms: number;
  cabinRoomCount: number;        // rooms with roomType === 'Tent Cabin'
  opportunityCostAnnual: number;
  avgStaffRoomRate: number;
  revpar: number;                // residency+room revenue / (availableRooms × 365)

  // Payroll
  csvPayrollAnnualized: number;
  xeroPayrollActual: number;
  payrollGap: number;
  residentialStaffCount: number;
  nonResidentialStaffCount: number;

  // Per-program
  topPrograms: KclProgramSummary[];

  // Revenue streams breakdown
  revenueStreams: KclRevenueStreams;

  // Monthly revenue and expenses (indices 0–11, month=1–12)
  monthlyData: KclMonthlyRow[];

  // Occupancy from residential roster (null if roster not loaded)
  occupancy: KclOccupancy | null;
  volunteerMetrics: KclVolunteerMetrics | null;  // null if roster not loaded

  // Break-even scenario analysis
  breakEven: KclBreakEven;

  // Program breakdown by category code (REG, CABN, IHR…)
  programCategories: KclProgramCategory[];

  // Per-program contribution margin (sorted by margin descending)
  programPnL: KclProgramPnL[];

  // Completeness
  dataGaps: string[];
}

// ─── Dataset container ────────────────────────────────────────────────────────

export interface KclSourceStatus {
  status: KclLoadStatus;
  fileName: string | null;
  recordCount: number;
  loadedAt: string | null;   // ISO datetime string
  error: string | null;
}

export interface KclAnnualDataset {
  year: number;
  lastUpdated: string;       // ISO datetime string
  sources: Record<KclDataSourceKey, KclSourceStatus>;
  data: {
    glTransactions: GlTransaction[];
    programCatalog: ProgramEntry[];
    programRevenue: ProgramRevenueEntry[];
    residentialRoster: ResidentialRosterEntry[];
    roomInventory: RoomEntry[];
    staffSalaries: StaffSalaryEntry[];
  };
  computed: KclComputedMetrics | null;
}

// ─── Metadata (static, used for UI) ──────────────────────────────────────────

export interface KclDataSourceMeta {
  label: string;
  description: string;
  fileType: string;
  required: boolean;
  origin: string;
  expectedColumns: string[];
}

export const KCL_SOURCE_META: Record<KclDataSourceKey, KclDataSourceMeta> = {
  glTransactions: {
    label: 'GL Transactions',
    description: 'Xero account transactions — revenue, all expense categories, CC fees. Use the Account Transactions report, NOT the General Ledger Detail report.',
    fileType: 'CSV',
    required: true,
    origin: 'Xero → Reports → Account Transactions → Export CSV',
    expectedColumns: ['Date', 'Account Code', 'Debit', 'Credit', 'Description', 'Source'],
  },
  programCatalog: {
    label: 'Program Catalog',
    description: 'Programs with participant-days for the selected year (strict filter: both start and end within year)',
    fileType: 'CSV',
    required: true,
    origin: 'KCLdb MySQL: data/queries/program_catalog.sql',
    expectedColumns: ['PROGRAM_ID', 'PROGRAM_NAME', 'START_DATE', 'END_DATE', 'total_participant_days'],
  },
  programRevenue: {
    label: 'Program Revenue',
    description: 'Per-program revenue from KCLdb (GL 4xxx charges billed — excludes balance-sheet accounts)',
    fileType: 'CSV',
    required: true,
    origin: 'KCLdb MySQL: data/queries/program_revenue.sql',
    expectedColumns: ['PROGRAM_NAME', 'total_revenue', 'tuition_revenue', 'registrations'],
  },
  residentialRoster: {
    label: 'Residential Roster',
    description: 'Actual staff and volunteer arrival/departure dates — used for payroll cross-reference',
    fileType: 'CSV',
    required: false,
    origin: 'KCLdb MySQL: data/queries/residential_staff.sql',
    expectedColumns: ['FIRST_NAME', 'LAST_NAME', 'ARRIVAL_DATE', 'DEPARTURE_DATE', 'days_in_year'],
  },
  roomInventory: {
    label: 'Room Inventory',
    description: 'Accommodation pricing, capacity, and staff occupancy',
    fileType: 'CSV',
    required: true,
    origin: 'Internal spreadsheet (kcl_accommodations.csv) — update annually',
    expectedColumns: ['Room Number', 'Room Type', 'Price for Single Occupancy', 'Occupied by Staff'],
  },
  staffSalaries: {
    label: 'Staff Salaries',
    description: 'Employee salary records for payroll analysis and gap reconciliation',
    fileType: 'CSV',
    required: false,
    origin: 'HR records (salaries.csv) — update annually',
    expectedColumns: ['Employee', 'Department', 'Annual Salary'],
  },
};

export const REQUIRED_SOURCES: KclDataSourceKey[] = [
  'glTransactions',
  'programCatalog',
  'programRevenue',
  'roomInventory',
];

export const ALL_SOURCES: KclDataSourceKey[] = [
  'glTransactions',
  'programCatalog',
  'programRevenue',
  'roomInventory',
  'residentialRoster',
  'staffSalaries',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function emptyDataset(year: number): KclAnnualDataset {
  const emptyStatus: KclSourceStatus = {
    status: 'missing',
    fileName: null,
    recordCount: 0,
    loadedAt: null,
    error: null,
  };
  return {
    year,
    lastUpdated: new Date().toISOString(),
    sources: {
      glTransactions: { ...emptyStatus },
      programCatalog: { ...emptyStatus },
      programRevenue: { ...emptyStatus },
      residentialRoster: { ...emptyStatus },
      roomInventory: { ...emptyStatus },
      staffSalaries: { ...emptyStatus },
    },
    data: {
      glTransactions: [],
      programCatalog: [],
      programRevenue: [],
      residentialRoster: [],
      roomInventory: [],
      staffSalaries: [],
    },
    computed: null,
  };
}

export function isDatasetReady(dataset: KclAnnualDataset): boolean {
  return REQUIRED_SOURCES.every(k => dataset.sources[k].status === 'loaded');
}

export const MONTH_NAMES: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
};
