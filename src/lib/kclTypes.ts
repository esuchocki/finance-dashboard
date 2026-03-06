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
  | 'staffSalaries'
  | 'trialBalance'
  | 'donations'
  | 'outstandingAr'
  | 'programTransactions'
  | 'recurringDonors'
  | 'roomBookings'
  | 'allRegistrations'
  | 'programBilling';

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
  totalRegistrations: number;
  activeRegistrations: number;
  isResidential?: boolean;  // true if any registration has KCL_RESIDENT set
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
  categoryCode?: string;  // PROG_CATEGORY_CODE — use to configure rosterTrack once codes are known
  arrivalDate: string;
  departureDate: string;
  daysInYear: number;
}

export interface RoomEntry {
  roomId: string;
  roomType: string;
  accommodation: string;
  occupancyLimit: number;
  priceSingle: number;
  priceShared: number;
  sharedPotential: number;
  seasons: string;
}

export interface StaffSalaryEntry {
  name: string;
  department: string;
  title: string;
  annualSalary: number;
  hourlyRate: number | null;
  hoursPerMonth: number | null;
  medicareMonthly: number | null;  // monthly employer Medicare contribution
  oasdiMonthly: number | null;     // monthly employer OASDI contribution
  startDate?: string;              // ISO date — first day of employment (optional)
  endDate?: string;                // ISO date — last day of employment (optional)
}

export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountType: string;
  accountClass: string;
  debit: number;
  credit: number;
}

export interface DonationEntry {
  donationId: string;
  donorName: string;
  email: string;
  fundName: string;
  glAccount: string;
  pledgedAmount: number;
  donationType: string;    // 'ONE TIME' | 'MONTHLY' | etc.
  paymentCat: string;
  cancelledDate: string;   // ISO YYYY-MM-DD or '' if not cancelled
  paymentDate: string;     // ISO YYYY-MM-DD or ''
  paymentMethod: string;
  voidDate: string;        // ISO YYYY-MM-DD or '' if not voided
  amountPaid: number;
}

export interface ArEntry {
  registrationId: string;
  participantName: string;
  email: string;
  programName: string;
  startDate: string;
  endDate: string;
  totalCharged: number;
  totalPaid: number;
  outstanding: number;
}

export interface ProgramTransactionEntry {
  programId: string;
  programName: string;
  categoryCode: string;
  startDate: string;
  endDate: string;
  glAccount: string;
  transType: string;
  transDesc: string;
  numLines: number;
  totalAmount: number;
  totalDiscount: number;
}

export interface RecurringDonorEntry {
  personId: string;
  donorName: string;
  email: string;
  activeEnrollments: number;
  paymentsMade: number;
  totalPaid: number;
}

export interface ProgramBillingEntry {
  personId: string;
  participantName: string;
  email: string;
  registrations2025: number;
  chargeLines2025: number;
  totalCharged2025: number;
}

export interface RoomBookingEntry {
  bookingId: string;
  roomId: string;
  roomNo: string;
  roomTypeCode: string;
  roomTypeDesc: string;
  registrationId: string;
  programId: string;
  programName: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
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
  donationsUnrestricted: number; // GL 4000, 4050, 4150
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
  // Omnis-sourced monthly breakdown (present when programRevenue.csv is loaded)
  // Assigned by program start month. Not summed into revenueTotal (different source).
  omnisTuition?: number;         // tuitionRevenue from non-residency programs
  omnisAccommodation?: number;   // accommodationRevenue from non-residency programs
  omnisResidency?: number;       // totalRevenue from residency-named programs (long-term residents)
}

// Residential occupancy derived from the roster and revenue
export interface KclOccupancy {
  /** People present per month, split by track, computed from arrival/departure dates.
   *  A person counts in a month if their stay overlaps any day of that month. */
  monthlyByTrack: Record<number, { staff: number; volunteers: number; residency: number }>;
  /** All tracks combined per month (sum of monthlyByTrack). */
  monthlyResidents: Record<number, number>;
  avgMonthlyByTrack: { staff: number; volunteers: number; residency: number };
  avgMonthlyResidents: number;
  /** Total person-days across all tracks, computed from arrival/departure dates (exclusive of departure day, matching SQL DATEDIFF). */
  totalResidentDays: number;
  impliedResidents: number;   // residency revenue / ($1,750 × 12) = full-year FTE (not headcount)
}

// Three-lever break-even analysis
export interface KclBreakEven {
  deficit: number;
  avgProgramRevenue: number;             // avg gross revenue per program (context only)
  avgContributionMargin: number;         // avg (revenue − direct − overhead) per program (context only)
  avgDirectContributionMargin: number;   // avg (revenue − direct costs only, no overhead) — used for programsNeeded
  programsWithRevenueCount: number;      // programs with totalRevenue > 0 — denominator for all averages
  residencyRevenuePerResident: number;   // $21,000/year at $1,750/month (gross)
  residencyNetPerResident: number;       // gross minus est. annual marginal food cost — used as residentsNeeded denominator
  totalDonationRevenue: number;          // unrestricted + restricted donations (GL 4000/4050/4150/4200) — for display
  unrestrictedDonationRevenue: number;   // unrestricted only (GL 4000/4050/4150) — denominator for donationIncreasePct
  totalCampaignRevenue: number;          // GL 3xxx — capital/campaign funds, shown separately
  residentsNeeded: number;
  programsNeeded: number;                // deficit ÷ avgDirectContributionMargin when > 0, else 0
  donationIncreasePct: number;           // deficit as fraction of donations base (GL 4xxx donations only)
  campaignIncreasePct: number;           // deficit as fraction of campaign funds base (GL 3xxx)
}

// Per-program cost components used in contribution margin analysis
export interface KclProgramCosts {
  teacherCost: number;       // GL 5250/5300/5350 — first-claim window attribution (REG only)
  foodCost: number;          // marginal food rate × participant-days (0 for CABN self-catering)
  ccFees: number;            // cc_rate × program revenue
  scholarshipCost: number;   // COGS-SCH/COGS-PC — scholarship rate × program revenue
  utilityMarginal: number;   // above-baseline utility for program's dates
  overheadAlloc: number;     // proportional share of all remaining fixed costs
}

// One participant record within a program (joined from AR + room bookings)
export interface KclParticipantDetail {
  participantName: string;
  totalCharged: number;
  totalPaid: number;
  outstanding: number;
  arrivalDate: string;    // from room booking if available, else program start
  departureDate: string;  // from room booking if available, else program end
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
  participants?: KclParticipantDetail[];
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

// One person from the residential roster
export interface KclRosterPerson {
  name: string;
  arrivalDate: string;
  departureDate: string;
  days: number;
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
  rosterByTrack?: {
    staff: KclRosterPerson[];
    volunteers: KclRosterPerson[];
    residency: KclRosterPerson[];
  };
}

// Key balance sheet line items from the Xero trial balance
export interface KclTrialBalanceSummary {
  trialRevenue: number;         // sum of all revenue account credits
  trialExpenses: number;        // sum of all expense account debits
  trialNetIncome: number;       // trialRevenue - trialExpenses
  depreciation: number;         // GL 6130 debit (0 if not in data)
  retainedEarnings: number;     // account 3000 credit
  programDeposits: number;      // account 2010 — deferred revenue liability
  investmentAccount: number;    // account 1005 (Schwab)
  cashAndBanks: number;         // sum of 1000–1009 bank accounts
  mortgage: number;             // account 2500
  sbaLoan: number;              // account 2501
  totalAssets: number;          // sum of all asset account debits (net, after depreciation credits)
  totalLiabilities: number;     // sum of all liability account credits
  totalEquity: number;          // sum of all equity account credits
}

// Per-fund donation totals
export interface KclDonationFund {
  fundName: string;
  glAccount: string;
  totalPledged: number;
  totalPaid: number;
  transactionCount: number;
}

// Donation aggregate analysis
export interface KclDonationBreakdown {
  funds: KclDonationFund[];     // sorted by totalPaid descending
  totalPledged: number;
  totalPaid: number;
  paymentRate: number;          // totalPaid / totalPledged
  monthlyCount: number;         // DONATION_TYPE === 'MONTHLY'
  monthlyPledged: number;
  monthlyPaid: number;
  oneTimeCount: number;
  oneTimePledged: number;
  oneTimePaid: number;
  cancelledCount: number;
  voidCount: number;
}

// Accounts receivable health metrics
export interface KclArMetrics {
  totalOutstanding: number;
  totalCharged: number;
  totalPaid: number;
  collectionRate: number;       // totalPaid / totalCharged
  debtorCount: number;          // participants with outstanding > 0
  staffExcludedCount: number;   // entries removed because name matched staff salaries
  topDebtors: Array<{
    participantName: string;
    programName: string;
    outstanding: number;
  }>;
}

// Discount analysis from program transactions
export interface KclDiscountSummary {
  totalAmount: number;      // gross billed (sum of total_amount)
  totalDiscount: number;    // sum of total_discount
  netRevenue: number;       // totalAmount - totalDiscount
  discountRate: number;     // totalDiscount / totalAmount
  byCategory: Array<{
    categoryCode: string;
    label: string;
    totalAmount: number;
    totalDiscount: number;
    discountRate: number;
  }>;
}

// Recurring donor base analysis
export interface KclRecurringDonorSummary {
  donorCount: number;
  totalPaid: number;
  avgPaymentsPerDonor: number;
  avgAmountPerDonor: number;
  topDonors: Array<{
    donorName: string;
    payments: number;
    totalPaid: number;
  }>;
}

// Program billing summary — charges billed (complement to KclRecurringDonorSummary)
export interface KclProgramBillingSummary {
  personCount: number;
  totalCharged: number;
  avgChargePerPerson: number;
  avgRegistrationsPerPerson: number;
  topBilled: Array<{
    participantName: string;
    registrations: number;
    totalCharged: number;
  }>;
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
  utilityBaselineMonth: number;   // 1–12 (single lowest month, for display reference)
  utilityBaselineSpend: number;   // spend in the single lowest month
  utilityBaselinePerDay: number;  // avg daily rate of 3 lowest months (used in computation)
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

  // Cost per day — blended and scenario breakdowns
  costPerDay: number;          // totalExpenses / (retreatDays + residentDays)  — blended average
  retreatDays: number;         // participant-days from non-residential programs only
  residentDays: number;        // participant-days from residential revenue programs (Residency)
  staffVolunteerDays: number;  // residential staff + volunteer person-days (from roster)
  costPerDayRetreat: number;   // totalExpenses / retreatDays  — retreat-only scenario
  costPerDayResident: number;  // totalExpenses / residentDays — resident-only scenario
  costPerDayStaff: number;     // -(totalExpenses / staffVolunteerDays) — cost burden per staff day
  marginalCostPerDay: number;  // variable + program-specific costs only / participantDays

  // Capacity
  totalRooms: number;            // private rooms only (Premium, Standard, Double, Accessibility)
  staffRooms: number;            // staff-occupied private rooms
  availableRooms: number;        // totalRooms - staffRooms
  dormBeds: number;              // dorm-style beds (not private rooms)
  cabinRoomCount: number;        // tent cabins
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
  residencyResidentsBilled: number;  // Omnis billing for programs named "residency program" (long-term tenants)

  // Monthly revenue and expenses (indices 0–11, month=1–12)
  monthlyData: KclMonthlyRow[];

  // Occupancy from residential roster (null if roster not loaded)
  occupancy: KclOccupancy | null;
  volunteerMetrics: KclVolunteerMetrics | null;  // null if roster not loaded

  // Balance sheet snapshot from trial balance (null if not loaded)
  balanceSheet: KclTrialBalanceSummary | null;

  // Donation fund breakdown from Omnis (null if not loaded)
  donationBreakdown: KclDonationBreakdown | null;

  // Accounts receivable health from Omnis (null if not loaded)
  arMetrics: KclArMetrics | null;

  // Discount analysis from Omnis program transactions (null if not loaded)
  discountSummary: KclDiscountSummary | null;

  // Recurring donor base analysis — cash received (null if not loaded)
  recurringDonorSummary: KclRecurringDonorSummary | null;

  // Program billing summary — charges billed (null if not loaded)
  programBillingSummary: KclProgramBillingSummary | null;

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
    trialBalance: TrialBalanceEntry[];
    donations: DonationEntry[];
    outstandingAr: ArEntry[];
    programTransactions: ProgramTransactionEntry[];
    recurringDonors: RecurringDonorEntry[];
    roomBookings: RoomBookingEntry[];
    allRegistrations: ArEntry[];
    programBilling: ProgramBillingEntry[];
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
  /** Lowercase substrings matched against zip entry basenames to auto-assign the source key. */
  zipPatterns: string[];
}

export const KCL_SOURCE_META: Record<KclDataSourceKey, KclDataSourceMeta> = {
  glTransactions: {
    label: 'GL Transactions',
    description: 'Xero account transactions — revenue, all expense categories, CC fees. Use the Account Transactions report, NOT the General Ledger Detail report.',
    fileType: 'CSV',
    required: true,
    origin: 'Xero → Reports → Account Transactions → Export CSV',
    expectedColumns: ['Date', 'Account Code', 'Debit', 'Credit', 'Description', 'Source'],
    zipPatterns: ['account_transactions', 'account transactions', 'gl_transactions', 'gl transactions'],
  },
  programCatalog: {
    label: 'Program Catalog',
    description: 'Programs with participant-days for the selected year (strict filter: both start and end within year)',
    fileType: 'CSV',
    required: true,
    origin: 'KCLdb MySQL: data/queries/program_catalog.sql',
    expectedColumns: ['PROGRAM_ID', 'PROGRAM_NAME', 'START_DATE', 'END_DATE', 'total_participant_days'],
    zipPatterns: ['program_catalog', 'program catalog'],
  },
  programRevenue: {
    label: 'Program Revenue',
    description: 'Per-program revenue from KCLdb (GL 4xxx charges billed — excludes balance-sheet accounts)',
    fileType: 'CSV',
    required: true,
    origin: 'KCLdb MySQL: data/queries/program_revenue.sql',
    expectedColumns: ['PROGRAM_NAME', 'total_revenue', 'tuition_revenue', 'registrations'],
    zipPatterns: ['program_revenue', 'program revenue'],
  },
  residentialRoster: {
    label: 'Residential Roster',
    description: 'Actual staff and volunteer arrival/departure dates — used for payroll cross-reference',
    fileType: 'CSV',
    required: false,
    origin: 'KCLdb MySQL: data/queries/residential_staff.sql',
    expectedColumns: ['FIRST_NAME', 'LAST_NAME', 'ARRIVAL_DATE', 'DEPARTURE_DATE', 'days_in_year'],
    zipPatterns: ['residential_staff', 'residential staff', 'residential_roster', 'residential roster'],
  },
  roomInventory: {
    label: 'Room Inventory',
    description: 'Accommodation pricing, capacity, and staff occupancy',
    fileType: 'CSV',
    required: true,
    origin: 'Internal spreadsheet (data/2025/room_inventory.csv) — update annually',
    expectedColumns: ['Room Number', 'Room Type', 'Price for Single Occupancy', 'Occupied by Staff'],
    zipPatterns: ['room_inventory', 'room inventory', 'accommodation', 'kcl_accommodations'],
  },
  staffSalaries: {
    label: 'Staff Salaries',
    description: 'Employee salary records for payroll analysis and gap reconciliation',
    fileType: 'CSV',
    required: false,
    origin: 'HR records (data/2025/salaries.csv) — update annually',
    expectedColumns: ['Employee', 'Department', 'Annual Salary'],
    zipPatterns: ['salaries', 'salary'],
  },
  trialBalance: {
    label: 'Trial Balance',
    description: 'Xero period trial balance — provides balance sheet snapshot, program deposit liability, investment account, and debt balances. Required to see the full financial position including items not in the GL transaction export.',
    fileType: 'CSV',
    required: false,
    origin: 'Xero → Reports → Trial Balance → Export CSV',
    expectedColumns: ['Account Code', 'Account', 'Account Type', 'Account Class', 'Debit', 'Credit'],
    zipPatterns: ['trial_balance', 'trial balance'],
  },
  donations: {
    label: 'Donations',
    description: 'Omnis donation records — fund-level breakdown (Kubera, Saddharma, scholarships), pledge vs. paid, one-time vs. monthly split',
    fileType: 'CSV',
    required: false,
    origin: 'KCLdb MySQL: data/queries/recurring_donors.sql → data/2025/donations.csv',
    expectedColumns: ['DONATION_ID', 'donor_name', 'fund_name', 'pledged_amount', 'amount_paid'],
    zipPatterns: ['donations'],
  },
  outstandingAr: {
    label: 'Outstanding AR',
    description: 'Accounts receivable from Omnis — only participants with unpaid balances. Fully-paid participants are not in this export. Load All Registrations instead for the complete participant list.',
    fileType: 'CSV',
    required: false,
    origin: 'KCLdb MySQL: data/queries/outstanding_ar.sql → data/2025/outstanding_ar.csv',
    expectedColumns: ['participant_name', 'PROGRAM_NAME', 'total_charged', 'total_paid', 'outstanding'],
    zipPatterns: ['outstanding_ar', 'outstanding-ar', 'outstanding', 'receivable'],
  },
  programTransactions: {
    label: 'Program Transactions',
    description: 'Omnis transaction detail by program and GL account — includes discount amounts that reduce effective revenue',
    fileType: 'CSV',
    required: false,
    origin: 'KCLdb MySQL: data/queries/program_transactions.sql → data/2025/program_transactions.csv',
    expectedColumns: ['PROGRAM_ID', 'PROGRAM_NAME', 'GL_ACCOUNT', 'TRANS_TYPE', 'total_amount', 'total_discount'],
    zipPatterns: ['program_transactions', 'program-transactions'],
  },
  recurringDonors: {
    label: 'Recurring Donors',
    description: 'Cash received per person in the year — anchors on payment date, includes program participants and direct donors. Pair with Program Billing for the full picture.',
    fileType: 'CSV',
    required: false,
    origin: 'KCLdb MySQL: data/queries/recurring_donors.sql → data/2025/recurring_donors.csv',
    expectedColumns: ['PERSON_ID', 'donor_name', 'num_active_enrollments', 'payments_made_2025', 'total_paid_2025'],
    zipPatterns: ['recurring-donors', 'recurring_donors'],
  },
  roomBookings: {
    label: 'Room Bookings',
    description: 'Individual room booking records — occupancy by room type, average stay length',
    fileType: 'CSV',
    required: false,
    origin: 'KCLdb MySQL: data/queries/room_bookings.sql → data/2025/room_bookings.csv',
    expectedColumns: ['ROOM_NO', 'ROOM_TYPE_DESC', 'PROGRAM_ID', 'nights'],
    zipPatterns: ['room-bookings', 'room_bookings'],
  },
  allRegistrations: {
    label: 'All Registrations',
    description: 'All active program registrations with charged/paid/outstanding amounts — includes fully-paid participants. Preferred over Outstanding AR for per-program participant lists.',
    fileType: 'CSV',
    required: false,
    origin: 'KCLdb MySQL: data/queries/all_program_registrations.sql → data/2025/all_registrations.csv',
    expectedColumns: ['REGISTRATION_ID', 'participant_name', 'PROGRAM_NAME', 'total_charged', 'total_paid', 'outstanding'],
    zipPatterns: ['all_program_registrations', 'all-program-registrations', 'all_registrations'],
  },
  programBilling: {
    label: 'Program Billing',
    description: 'Per-person charges billed for strict-year programs — includes everyone who registered regardless of payment status. Complement to Recurring Donors (cash received).',
    fileType: 'CSV',
    required: false,
    origin: 'KCLdb MySQL: data/queries/program_billing.sql → data/2025/program_billing.csv',
    expectedColumns: ['PERSON_ID', 'participant_name', 'registrations_2025', 'charge_lines_2025', 'total_charged_2025'],
    zipPatterns: ['program_billing', 'program-billing'],
  },
};

// ─── Zip filename matching ─────────────────────────────────────────────────────

/**
 * Given a zip entry basename, returns the matching KclDataSourceKey or null.
 * Sources are checked in ALL_SOURCES order; first match wins.
 */
export function matchZipFilename(filename: string): KclDataSourceKey | null {
  const lower = filename.toLowerCase();
  for (const key of ALL_SOURCES) {
    if (KCL_SOURCE_META[key].zipPatterns.some(p => lower.includes(p))) return key;
  }
  return null;
}

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
  'trialBalance',
  'donations',
  'outstandingAr',
  'programTransactions',
  'recurringDonors',
  'roomBookings',
  'allRegistrations',
  'programBilling',
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
      trialBalance: { ...emptyStatus },
      donations: { ...emptyStatus },
      outstandingAr: { ...emptyStatus },
      programTransactions: { ...emptyStatus },
      recurringDonors: { ...emptyStatus },
      roomBookings: { ...emptyStatus },
      allRegistrations: { ...emptyStatus },
      programBilling: { ...emptyStatus },
    },
    data: {
      glTransactions: [],
      programCatalog: [],
      programRevenue: [],
      residentialRoster: [],
      roomInventory: [],
      staffSalaries: [],
      trialBalance: [],
      donations: [],
      outstandingAr: [],
      programTransactions: [],
      recurringDonors: [],
      roomBookings: [],
      allRegistrations: [],
      programBilling: [],
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
