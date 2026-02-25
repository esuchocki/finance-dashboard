import type { KclDataSourceKey } from '@/lib/kclTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Row = Record<string, unknown>;

export interface Col { key: string; label: string; right?: boolean; render?: (v: unknown) => string }

// ─── Formatters ───────────────────────────────────────────────────────────────

export const fmt$ = (n: unknown): string => {
  const v = Number(n);
  if (isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
};

export const fmt$2 = (n: unknown): string => {
  const v = Number(n);
  if (isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
};

export const fmtN = (n: unknown): string => {
  const v = Number(n);
  return isNaN(v) ? '—' : v.toLocaleString('en-US');
};

export const fmtDate = (s: unknown): string => {
  if (!s) return '—';
  const str = String(s);
  if (!str) return '—';
  const d = new Date(str.length === 10 ? str + 'T00:00:00' : str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

export const trunc = (s: unknown, n = 40): string => {
  const str = String(s ?? '');
  return str.length > n ? str.slice(0, n) + '\u2026' : str;
};

export const fmtAxisMoney = (v: number): string =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K`
  : `$${v}`;

// ─── Column definitions ───────────────────────────────────────────────────────

export const COLS: Record<KclDataSourceKey, Col[]> = {
  glTransactions: [
    { key: 'date',        label: 'Date',        render: fmtDate },
    { key: 'accountCode', label: 'Code' },
    { key: 'accountName', label: 'Account',     render: v => trunc(v, 30) },
    { key: 'description', label: 'Description', render: v => trunc(v, 45) },
    { key: 'sourceName',  label: 'Source',      render: v => trunc(v, 22) },
    { key: 'debit',       label: 'Debit',  right: true, render: v => Number(v) ? fmt$2(v) : '' },
    { key: 'credit',      label: 'Credit', right: true, render: v => Number(v) ? fmt$2(v) : '' },
  ],
  programCatalog: [
    { key: 'programId',       label: 'ID' },
    { key: 'programName',     label: 'Program',  render: v => trunc(v, 48) },
    { key: 'startDate',       label: 'Start',    render: fmtDate },
    { key: 'endDate',         label: 'End',      render: fmtDate },
    { key: 'categoryCode',    label: 'Category' },
    { key: 'participantDays', label: 'P-Days', right: true, render: fmtN },
  ],
  programRevenue: [
    { key: 'programName',           label: 'Program',   render: v => trunc(v, 38) },
    { key: 'categoryCode',          label: 'Cat' },
    { key: 'startDate',             label: 'Start',     render: fmtDate },
    { key: 'endDate',               label: 'End',       render: fmtDate },
    { key: 'registrations',         label: 'Reg',  right: true, render: fmtN },
    { key: 'participants',          label: 'Part', right: true, render: fmtN },
    { key: 'totalRevenue',          label: 'Total',    right: true, render: fmt$ },
    { key: 'tuitionRevenue',        label: 'Tuition',  right: true, render: fmt$ },
    { key: 'accommodationRevenue',  label: 'Accom',    right: true, render: fmt$ },
    { key: 'otherRevenue',          label: 'Other',    right: true, render: fmt$ },
  ],
  residentialRoster: [
    { key: 'firstName',     label: 'First' },
    { key: 'lastName',      label: 'Last' },
    { key: 'email',         label: 'Email',     render: v => trunc(v, 28) },
    { key: 'programName',   label: 'Program',   render: v => trunc(v, 28) },
    { key: 'arrivalDate',   label: 'Arrival',   render: fmtDate },
    { key: 'departureDate', label: 'Departure', render: fmtDate },
    { key: 'daysInYear',    label: 'Days', right: true, render: fmtN },
  ],
  roomInventory: [
    { key: 'roomNumber',     label: 'Room' },
    { key: 'roomType',       label: 'Type' },
    { key: 'accommodation',  label: 'Accommodation', render: v => trunc(v, 24) },
    { key: 'priceSingle',    label: 'Single',  right: true, render: fmt$2 },
    { key: 'priceShared',    label: 'Shared',  right: true, render: fmt$2 },
    { key: 'sharedLimit',    label: 'Limit',   right: true, render: fmtN },
    { key: 'occupiedByStaff',label: 'Staff',   render: v => trunc(v, 20) },
    { key: 'seasons',        label: 'Seasons', render: v => trunc(v, 24) },
  ],
  staffSalaries: [
    { key: 'name',          label: 'Name' },
    { key: 'department',    label: 'Department' },
    { key: 'title',         label: 'Title',   render: v => trunc(v, 32) },
    { key: 'annualSalary',  label: 'Annual',  right: true, render: fmt$ },
    { key: 'hourlyRate',    label: 'Hourly',  right: true, render: v => (v != null && v !== '') ? fmt$2(v) : '—' },
    { key: 'hoursPerMonth', label: 'Hrs/Mo',  right: true, render: v => (v != null && v !== '') ? fmtN(v) : '—' },
  ],
  trialBalance: [
    { key: 'accountCode',  label: 'Code' },
    { key: 'accountName',  label: 'Account',  render: v => trunc(v, 40) },
    { key: 'accountType',  label: 'Type' },
    { key: 'accountClass', label: 'Class' },
    { key: 'debit',        label: 'Debit',  right: true, render: v => Number(v) ? fmt$2(v) : '' },
    { key: 'credit',       label: 'Credit', right: true, render: v => Number(v) ? fmt$2(v) : '' },
  ],
  donations: [
    { key: 'donorName',      label: 'Donor',   render: v => trunc(v, 28) },
    { key: 'fundName',       label: 'Fund',    render: v => trunc(v, 24) },
    { key: 'glAccount',      label: 'GL' },
    { key: 'donationType',   label: 'Type' },
    { key: 'paymentDate',    label: 'Date',    render: fmtDate },
    { key: 'pledgedAmount',  label: 'Pledged', right: true, render: fmt$2 },
    { key: 'amountPaid',     label: 'Paid',    right: true, render: fmt$2 },
    { key: 'cancelled',      label: 'Cancelled', render: v => v ? 'Yes' : '' },
  ],
  outstandingAr: [
    { key: 'participantName', label: 'Participant', render: v => trunc(v, 26) },
    { key: 'email',           label: 'Email',       render: v => trunc(v, 26) },
    { key: 'programName',     label: 'Program',     render: v => trunc(v, 34) },
    { key: 'startDate',       label: 'Start',  render: fmtDate },
    { key: 'endDate',         label: 'End',    render: fmtDate },
    { key: 'totalCharged',    label: 'Charged',     right: true, render: fmt$2 },
    { key: 'totalPaid',       label: 'Paid',        right: true, render: fmt$2 },
    { key: 'outstanding',     label: 'Outstanding', right: true, render: fmt$2 },
  ],
  programTransactions: [
    { key: 'programName',   label: 'Program',   render: v => trunc(v, 28) },
    { key: 'categoryCode',  label: 'Cat' },
    { key: 'startDate',     label: 'Start',  render: fmtDate },
    { key: 'endDate',       label: 'End',    render: fmtDate },
    { key: 'glAccount',     label: 'GL' },
    { key: 'transType',     label: 'Type' },
    { key: 'transDesc',     label: 'Desc',      render: v => trunc(v, 26) },
    { key: 'numLines',      label: 'Lines',     right: true, render: fmtN },
    { key: 'totalAmount',   label: 'Amount',    right: true, render: fmt$ },
    { key: 'totalDiscount', label: 'Discount',  right: true, render: v => Number(v) ? fmt$(v) : '' },
  ],
  recurringDonors: [
    { key: 'donorName',        label: 'Donor',       render: v => trunc(v, 30) },
    { key: 'email',            label: 'Email',        render: v => trunc(v, 30) },
    { key: 'activeEnrollments',label: 'Enrollments',  right: true, render: fmtN },
    { key: 'paymentsMade',     label: 'Payments',     right: true, render: fmtN },
    { key: 'totalPaid',        label: 'Total Paid',   right: true, render: fmt$2 },
  ],
  roomBookings: [
    { key: 'bookingId',    label: 'Booking ID' },
    { key: 'roomNo',       label: 'Room' },
    { key: 'roomTypeDesc', label: 'Room Type',  render: v => trunc(v, 22) },
    { key: 'programId',    label: 'Program ID' },
    { key: 'arrivalDate',  label: 'Arrival',    render: fmtDate },
    { key: 'departureDate',label: 'Departure',  render: fmtDate },
    { key: 'nights',       label: 'Nights', right: true, render: v => (v != null && String(v) !== '') ? fmtN(v) : '—' },
  ],
  allRegistrations: [
    { key: 'participantName', label: 'Participant', render: v => trunc(v, 26) },
    { key: 'email',           label: 'Email',       render: v => trunc(v, 26) },
    { key: 'programName',     label: 'Program',     render: v => trunc(v, 34) },
    { key: 'startDate',       label: 'Start',  render: fmtDate },
    { key: 'endDate',         label: 'End',    render: fmtDate },
    { key: 'totalCharged',    label: 'Charged',     right: true, render: fmt$2 },
    { key: 'totalPaid',       label: 'Paid',        right: true, render: fmt$2 },
    { key: 'outstanding',     label: 'Outstanding', right: true, render: fmt$2 },
  ],
  programBilling: [
    { key: 'participantName',  label: 'Participant',   render: v => trunc(v, 32) },
    { key: 'email',            label: 'Email',          render: v => trunc(v, 30) },
    { key: 'registrations2025',label: 'Registrations',  right: true, render: fmtN },
    { key: 'chargeLines2025',  label: 'Charge Lines',   right: true, render: fmtN },
    { key: 'totalCharged2025', label: 'Total Charged',  right: true, render: fmt$2 },
  ],
};

// ─── Search & filter config ───────────────────────────────────────────────────

export const SEARCH_FIELDS: Record<KclDataSourceKey, string[]> = {
  glTransactions:      ['description', 'accountName', 'accountCode', 'sourceName'],
  programCatalog:      ['programName', 'categoryCode', 'programId'],
  programRevenue:      ['programName', 'categoryCode'],
  residentialRoster:   ['firstName', 'lastName', 'email', 'programName'],
  roomInventory:       ['roomNumber', 'roomType', 'accommodation', 'occupiedByStaff', 'seasons'],
  staffSalaries:       ['name', 'department', 'title'],
  trialBalance:        ['accountCode', 'accountName', 'accountType', 'accountClass'],
  donations:           ['donorName', 'email', 'fundName', 'glAccount', 'donationType'],
  outstandingAr:       ['participantName', 'email', 'programName'],
  programTransactions: ['programName', 'glAccount', 'transType', 'transDesc', 'categoryCode'],
  recurringDonors:     ['donorName', 'email'],
  roomBookings:        ['roomNo', 'roomTypeDesc', 'programId', 'bookingId'],
  allRegistrations:    ['participantName', 'email', 'programName'],
  programBilling:      ['participantName', 'email'],
};

// Primary date field for date-range filter (undefined = no date filter)
export const DATE_FIELD: Partial<Record<KclDataSourceKey, string>> = {
  glTransactions:      'date',
  programCatalog:      'startDate',
  programRevenue:      'startDate',
  residentialRoster:   'arrivalDate',
  donations:           'paymentDate',
  outstandingAr:       'startDate',
  programTransactions: 'startDate',
  roomBookings:        'arrivalDate',
  allRegistrations:    'startDate',
};

// Primary numeric field for amount-range filter (undefined = no amount filter)
export const AMOUNT_FIELD: Partial<Record<KclDataSourceKey, string>> = {
  glTransactions:      'credit',
  programRevenue:      'totalRevenue',
  staffSalaries:       'annualSalary',
  trialBalance:        'credit',
  donations:           'amountPaid',
  outstandingAr:       'outstanding',
  programTransactions: 'totalAmount',
  recurringDonors:     'totalPaid',
  allRegistrations:    'outstanding',
  programBilling:      'totalCharged2025',
};

// Field to populate the category dropdown from (undefined = no category filter)
export const CATEGORY_FIELD: Partial<Record<KclDataSourceKey, { field: string; label: string }>> = {
  programCatalog:      { field: 'categoryCode', label: 'Category' },
  programRevenue:      { field: 'categoryCode', label: 'Category' },
  residentialRoster:   { field: 'programName',  label: 'Program' },
  trialBalance:        { field: 'accountClass', label: 'Class' },
  donations:           { field: 'donationType', label: 'Type' },
  programTransactions: { field: 'categoryCode', label: 'Category' },
};
