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

export interface KclComputedMetrics {
  year: number;

  // Revenue
  totalRevenue: number;         // Xero cash collected (GL 3xxx/4xxx credits)
  omnisBilledTotal: number;     // Omnis charges (GL 4xxx) — may differ from Xero

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

  // Expenses
  expenseCategories: Record<string, KclExpenseCategory>;
  totalExpenses: number;
  deficit: number;
  costPerDay: number;

  // Capacity
  totalRooms: number;
  staffRooms: number;
  availableRooms: number;
  opportunityCostAnnual: number;
  avgStaffRoomRate: number;

  // Payroll
  csvPayrollAnnualized: number;
  xeroPayrollActual: number;
  payrollGap: number;
  residentialStaffCount: number;
  nonResidentialStaffCount: number;

  // Per-program
  topPrograms: KclProgramSummary[];

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
