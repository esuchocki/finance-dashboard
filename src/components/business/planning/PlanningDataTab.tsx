import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, ChevronDown, ChevronUp, SlidersHorizontal, Code2, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KclAnnualDataset, KclDataSourceKey } from '@/lib/kclTypes';
import { ALL_SOURCES, KCL_SOURCE_META, MONTH_NAMES } from '@/lib/kclTypes';

// ─── Embedded SQL ─────────────────────────────────────────────────────────────

const SQL_CONTENT: Partial<Record<KclDataSourceKey, string>> = {
  programCatalog: `-- Program catalog: all programs for a given year
-- "Strict year" = both START_DATE and END_DATE fall within the calendar year.
-- Replace 2025 with the target year when running for future years.
--
-- Output columns used by the web app:
--   PROGRAM_ID, PROGRAM_NAME, START_DATE, END_DATE, PROG_CATEGORY_CODE,
--   total_registrations, active_registrations, total_participant_days

SELECT
    prog.PROGRAM_ID,
    prog.PROGRAM_NAME,
    prog.START_DATE,
    prog.END_DATE,
    prog.PROG_CATEGORY_CODE,
    COUNT(reg.REGISTRATION_ID)                                         AS total_registrations,
    COUNT(CASE WHEN reg.CANCELLED IS NULL THEN 1 END)                  AS active_registrations,
    SUM(CASE WHEN reg.CANCELLED IS NULL THEN DATEDIFF(
        LEAST(reg.DEPARTURE_DATE,  prog.END_DATE),
        GREATEST(reg.ARRIVAL_DATE, prog.START_DATE)
    ) ELSE 0 END)                                                      AS total_participant_days
FROM program prog
LEFT JOIN registration reg ON reg.PROGRAM_ID = prog.PROGRAM_ID
WHERE YEAR(prog.START_DATE) = 2025
  AND YEAR(prog.END_DATE)   = 2025
GROUP BY
    prog.PROGRAM_ID,
    prog.PROGRAM_NAME,
    prog.START_DATE,
    prog.END_DATE,
    prog.PROG_CATEGORY_CODE
ORDER BY prog.START_DATE, prog.PROGRAM_NAME;`,

  programRevenue: `-- Per-program revenue for strict-year programs (GL 4xxx charges only)
-- "Strict year" = both START_DATE and END_DATE fall within the calendar year.
-- Replace 2025 with the target year when running for future years.
--
-- Revenue source: transactions table, GL accounts 4xxx (program charges).
-- Reversed (REVERSE = 1) and voided (INACTIVE IS NOT NULL) transactions excluded.
-- Cancelled registrations excluded.

SELECT
    prog.PROGRAM_ID,
    prog.PROGRAM_NAME,
    prog.START_DATE,
    prog.END_DATE,
    prog.PROG_CATEGORY_CODE,
    COUNT(DISTINCT reg.REGISTRATION_ID)                                              AS registrations,
    COUNT(DISTINCT reg.PERSON_ID)                                                    AS participants,
    COALESCE(SUM(t.AMOUNT), 0)                                                       AS total_revenue,
    COALESCE(SUM(CASE WHEN t.GL_ACCOUNT = '4100' THEN t.AMOUNT ELSE 0 END), 0)      AS tuition_revenue,
    COALESCE(SUM(CASE WHEN t.GL_ACCOUNT IN ('4200','4250') THEN t.AMOUNT ELSE 0 END), 0) AS accommodation_revenue,
    COALESCE(SUM(CASE WHEN t.GL_ACCOUNT NOT IN ('4100','4200','4250') THEN t.AMOUNT ELSE 0 END), 0) AS other_revenue
FROM program prog
JOIN registration reg
    ON reg.PROGRAM_ID = prog.PROGRAM_ID
    AND reg.CANCELLED IS NULL
LEFT JOIN transactions t
    ON t.REGISTRATION_ID = reg.REGISTRATION_ID
    AND t.REVERSE = 0
    AND t.INACTIVE IS NULL
    AND t.GL_ACCOUNT LIKE '4%'
WHERE YEAR(prog.START_DATE) = 2025
  AND YEAR(prog.END_DATE)   = 2025
GROUP BY
    prog.PROGRAM_ID,
    prog.PROGRAM_NAME,
    prog.START_DATE,
    prog.END_DATE,
    prog.PROG_CATEGORY_CODE
ORDER BY total_revenue DESC;`,

  residentialRoster: `-- Residential staff and volunteer actual arrival/departure dates
-- Programs included:
--   7241  "2025 KCL Residential Staff"     (2025-01-01 to 2026-01-01)
--   7242  "2025 KCL Residential Volunteer"  (2025-01-01 to 2026-01-01)
--   7320  "2025 Residency Program"          (2025-01-01 to 2025-12-31)
--
-- Replace the program IDs and year literals when running for future years.
-- The days_in_year column is clamped to the calendar year (2025-01-01 / 2025-12-31).

SELECT
    per.FIRST_NAME,
    per.LAST_NAME,
    per.EMAIL_ADDRESS,
    prog.PROGRAM_NAME,
    prog.PROG_CATEGORY_CODE,
    reg.ARRIVAL_DATE,
    reg.DEPARTURE_DATE,
    DATEDIFF(
        LEAST(reg.DEPARTURE_DATE, '2025-12-31'),
        GREATEST(reg.ARRIVAL_DATE, '2025-01-01')
    ) AS days_in_year,
    reg.KCL_RESIDENT,
    reg.PROGRAM_STAFF,
    reg.REGISTRATION_ID
FROM registration reg
JOIN program prog ON reg.PROGRAM_ID = prog.PROGRAM_ID
JOIN person per ON reg.PERSON_ID = per.PERSON_ID
WHERE prog.PROGRAM_ID IN (7241, 7242, 7320)
  AND reg.CANCELLED IS NULL
  AND reg.ARRIVAL_DATE IS NOT NULL
  AND reg.ARRIVAL_DATE < '2026-01-01'
ORDER BY prog.PROGRAM_NAME, reg.ARRIVAL_DATE, per.LAST_NAME;`,

  outstandingAr: `-- Outstanding accounts receivable for strict-year programs.
-- "Strict year" = both START_DATE and END_DATE fall within the calendar year.
-- Replace 2025 with the target year when running for future years.
--
-- Shows amounts billed in Omnis that have not yet been collected.
-- For ALL participants (paid and unpaid), use all_program_registrations.sql instead.

SELECT
    reg.REGISTRATION_ID,
    CONCAT(per.FIRST_NAME, ' ', per.LAST_NAME)         AS participant_name,
    per.EMAIL_ADDRESS,
    prog.PROGRAM_NAME,
    prog.START_DATE,
    prog.END_DATE,
    COALESCE(charges.total_charged, 0)                 AS total_charged,
    COALESCE(paid.total_paid,       0)                 AS total_paid,
    COALESCE(charges.total_charged, 0)
        - COALESCE(paid.total_paid, 0)                 AS outstanding
FROM registration reg
JOIN program  prog ON prog.PROGRAM_ID  = reg.PROGRAM_ID
JOIN person   per  ON per.PERSON_ID    = reg.PERSON_ID
LEFT JOIN (
    SELECT t.REGISTRATION_ID, SUM(t.AMOUNT) AS total_charged
    FROM transactions t WHERE t.REVERSE = 0 AND t.INACTIVE IS NULL
    GROUP BY t.REGISTRATION_ID
) charges ON charges.REGISTRATION_ID = reg.REGISTRATION_ID
LEFT JOIN (
    SELECT pd.REGISTRATION_ID, SUM(pd.AMOUNT) AS total_paid
    FROM payment_detail pd GROUP BY pd.REGISTRATION_ID
) paid ON paid.REGISTRATION_ID = reg.REGISTRATION_ID
WHERE YEAR(prog.START_DATE) = 2025
  AND YEAR(prog.END_DATE)   = 2025
  AND reg.CANCELLED IS NULL
  AND COALESCE(charges.total_charged, 0) > COALESCE(paid.total_paid, 0)
ORDER BY outstanding DESC;`,

  programTransactions: `-- All Omnis transactions by program, GL account, and transaction type.
-- Includes ALL GL accounts (not just 4xxx) — use for diagnosing unexpected codes.
-- "Strict year" = both START_DATE and END_DATE fall within the calendar year.
-- Replace 2025 with the target year when running for future years.
--
-- Cross-reference with program_revenue.sql (GL 4xxx only, aggregated per program)
-- to understand the full transaction breakdown behind each program's revenue figure.

SELECT
    prog.PROGRAM_ID,
    prog.PROGRAM_NAME,
    prog.PROG_CATEGORY_CODE,
    prog.START_DATE,
    prog.END_DATE,
    t.GL_ACCOUNT,
    t.TRANS_TYPE,
    t.TRANS_DESC,
    COUNT(*)         AS num_lines,
    SUM(t.AMOUNT)    AS total_amount,
    SUM(t.DISCOUNT)  AS total_discount
FROM program prog
JOIN registration reg
    ON  reg.PROGRAM_ID  = prog.PROGRAM_ID
    AND reg.CANCELLED  IS NULL
JOIN transactions t
    ON  t.REGISTRATION_ID = reg.REGISTRATION_ID
    AND t.REVERSE   = 0
    AND t.INACTIVE IS NULL
WHERE YEAR(prog.START_DATE) = 2025
  AND YEAR(prog.END_DATE)   = 2025
GROUP BY
    prog.PROGRAM_ID, prog.PROGRAM_NAME, prog.PROG_CATEGORY_CODE,
    prog.START_DATE, prog.END_DATE, t.GL_ACCOUNT, t.TRANS_TYPE, t.TRANS_DESC
ORDER BY prog.START_DATE, prog.PROGRAM_NAME, t.GL_ACCOUNT;`,

  recurringDonors: `-- Per-person payment summary: everyone who made a payment in the target year.
-- Replace 2025 with the target year when running for future years.
--
-- Anchors on payment.PERSON_ID so it captures both:
--   - Program participants (payment_detail.REGISTRATION_ID IS NOT NULL)
--   - Direct donors     (payment_detail.DONATION_ID IS NOT NULL, no registration)
--
-- Voided payments are excluded. Only people with total_paid > 0 are included.

SELECT
    per.PERSON_ID,
    CONCAT(per.FIRST_NAME, ' ', per.LAST_NAME)     AS donor_name,
    per.EMAIL_ADDRESS,
    COUNT(DISTINCT reg.REGISTRATION_ID)            AS num_active_enrollments,
    COUNT(pd.PAYMENT_DETAIL_ID)                    AS payments_made_2025,
    SUM(pd.AMOUNT)                                 AS total_paid_2025
FROM payment pay
JOIN person per ON per.PERSON_ID = pay.PERSON_ID
JOIN payment_detail pd ON pd.PAYMENT_ID = pay.PAYMENT_ID
LEFT JOIN registration reg
    ON  reg.REGISTRATION_ID  = pd.REGISTRATION_ID
    AND reg.CANCELLED       IS NULL
WHERE YEAR(pay.PAYMENT_DATE) = 2025
  AND pay.VOID_TRANSACTION  IS NULL
GROUP BY per.PERSON_ID, per.FIRST_NAME, per.LAST_NAME, per.EMAIL_ADDRESS
HAVING SUM(pd.AMOUNT) > 0
ORDER BY total_paid_2025 DESC;`,

  roomBookings: `-- Room bookings for the residential programs in the target year.
-- Replace the PROGRAM_ID list with values from find_residential_programs.sql each year.
--
-- Filters to the three residential programs (staff, volunteer, residency) rather than
-- by arrival date, because many room assignments have NULL ARRIVAL_DATE_TIME even
-- though the booking is active. A year filter on arrival would silently drop them.

SELECT
    rb.ROOM_BOOKING_ID,
    rb.ROOM_ID,
    r.ROOM_NO,
    rb.ROOM_TYPE_CODE,
    rt.ROOM_TYPE_DESC,
    rb.REGISTRATION_ID,
    rb.PROGRAM_ID,
    rb.ARRIVAL_DATE_TIME,
    rb.DEPARTURE_DATE_TIME,
    CASE
        WHEN rb.ARRIVAL_DATE_TIME IS NOT NULL AND rb.DEPARTURE_DATE_TIME IS NOT NULL
        THEN DATEDIFF(DATE(rb.DEPARTURE_DATE_TIME), DATE(rb.ARRIVAL_DATE_TIME))
        ELSE NULL
    END AS nights
FROM room_booking rb
JOIN room      r  ON r.ROOM_ID          = rb.ROOM_ID
JOIN room_type rt ON rt.ROOM_TYPE_CODE  = rb.ROOM_TYPE_CODE
WHERE rb.INACTIVE  IS NULL
  AND rb.PROGRAM_ID IN (7241, 7242, 7320)
ORDER BY rb.PROGRAM_ID, r.ROOM_NO;`,

  allRegistrations: `-- All active registrations for strict-year programs (charged + paid summary).
-- "Strict year" = both START_DATE and END_DATE fall within the calendar year.
-- Replace 2025 with the target year when running for future years.
--
-- Returns ALL active registrations regardless of payment status.
-- outstanding_ar.sql filters to WHERE outstanding > 0 (unpaid only).
-- Participants with total_charged = 0 are scholarship / comp registrations.

SELECT
    reg.REGISTRATION_ID,
    CONCAT(per.FIRST_NAME, ' ', per.LAST_NAME)         AS participant_name,
    per.EMAIL_ADDRESS,
    prog.PROGRAM_NAME,
    prog.START_DATE,
    prog.END_DATE,
    reg.ARRIVAL_DATE,
    reg.DEPARTURE_DATE,
    COALESCE(charges.total_charged, 0)                 AS total_charged,
    COALESCE(paid.total_paid,       0)                 AS total_paid,
    COALESCE(charges.total_charged, 0)
        - COALESCE(paid.total_paid, 0)                 AS outstanding
FROM registration reg
JOIN program  prog ON prog.PROGRAM_ID  = reg.PROGRAM_ID
JOIN person   per  ON per.PERSON_ID    = reg.PERSON_ID
LEFT JOIN (
    SELECT t.REGISTRATION_ID, SUM(t.AMOUNT) AS total_charged
    FROM transactions t WHERE t.REVERSE = 0 AND t.INACTIVE IS NULL
    GROUP BY t.REGISTRATION_ID
) charges ON charges.REGISTRATION_ID = reg.REGISTRATION_ID
LEFT JOIN (
    SELECT pd.REGISTRATION_ID, SUM(pd.AMOUNT) AS total_paid
    FROM payment_detail pd GROUP BY pd.REGISTRATION_ID
) paid ON paid.REGISTRATION_ID = reg.REGISTRATION_ID
WHERE YEAR(prog.START_DATE) = 2025
  AND YEAR(prog.END_DATE)   = 2025
  AND reg.CANCELLED IS NULL
ORDER BY prog.START_DATE, prog.PROGRAM_NAME, participant_name;`,

  programBilling: `-- Per-person charges billed for strict-year programs.
-- "Strict year" = both START_DATE and END_DATE fall within the calendar year.
-- Replace 2025 with the target year when running for future years.
--
-- Uses the transactions table (what Omnis charged), NOT payment_detail (cash received).
-- Pair with recurring_donors.sql (cash received) for the complete picture:
--   program_billing.sql  -> who participated + what was billed
--   recurring_donors.sql -> who paid cash in the year + how much was received

SELECT
    per.PERSON_ID,
    CONCAT(per.FIRST_NAME, ' ', per.LAST_NAME)     AS participant_name,
    per.EMAIL_ADDRESS,
    COUNT(DISTINCT reg.REGISTRATION_ID)            AS registrations_2025,
    COUNT(t.TRANSACTIONS_ID)                       AS charge_lines_2025,
    COALESCE(SUM(t.AMOUNT), 0)                     AS total_charged_2025
FROM person per
JOIN registration reg
    ON  reg.PERSON_ID   = per.PERSON_ID
    AND reg.CANCELLED  IS NULL
JOIN program prog
    ON  prog.PROGRAM_ID        = reg.PROGRAM_ID
    AND YEAR(prog.START_DATE)  = 2025
    AND YEAR(prog.END_DATE)    = 2025
LEFT JOIN transactions t
    ON  t.REGISTRATION_ID = reg.REGISTRATION_ID
    AND t.REVERSE   = 0
    AND t.INACTIVE IS NULL
GROUP BY per.PERSON_ID, per.FIRST_NAME, per.LAST_NAME, per.EMAIL_ADDRESS
HAVING COALESCE(SUM(t.AMOUNT), 0) > 0
ORDER BY total_charged_2025 DESC;`,
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt$ = (n: unknown): string => {
  const v = Number(n);
  if (isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
};

const fmt$2 = (n: unknown): string => {
  const v = Number(n);
  if (isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
};

const fmtN = (n: unknown): string => {
  const v = Number(n);
  return isNaN(v) ? '—' : v.toLocaleString('en-US');
};

const fmtDate = (s: unknown): string => {
  if (!s) return '—';
  const str = String(s);
  if (!str) return '—';
  const d = new Date(str.length === 10 ? str + 'T00:00:00' : str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

const trunc = (s: unknown, n = 40): string => {
  const str = String(s ?? '');
  return str.length > n ? str.slice(0, n) + '\u2026' : str;
};

const fmtAxisMoney = (v: number): string =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K`
  : `$${v}`;

// ─── Chart palette ────────────────────────────────────────────────────────────

const C = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899'];

// ─── Column definitions ───────────────────────────────────────────────────────

interface Col { key: string; label: string; right?: boolean; render?: (v: unknown) => string }

const COLS: Record<KclDataSourceKey, Col[]> = {
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

const SEARCH_FIELDS: Record<KclDataSourceKey, string[]> = {
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
const DATE_FIELD: Partial<Record<KclDataSourceKey, string>> = {
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
const AMOUNT_FIELD: Partial<Record<KclDataSourceKey, string>> = {
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
const CATEGORY_FIELD: Partial<Record<KclDataSourceKey, { field: string; label: string }>> = {
  programCatalog:      { field: 'categoryCode', label: 'Category' },
  programRevenue:      { field: 'categoryCode', label: 'Category' },
  residentialRoster:   { field: 'programName',  label: 'Program' },
  trialBalance:        { field: 'accountClass', label: 'Class' },
  donations:           { field: 'donationType', label: 'Type' },
  programTransactions: { field: 'categoryCode', label: 'Category' },
};

const PAGE_SIZE = 25;

// ─── Per-source charts ────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function SourceCharts({ sourceKey, data }: { sourceKey: KclDataSourceKey; data: Row[] }) {
  if (data.length === 0) return null;

  // GL Transactions: monthly debit/credit + top account codes
  if (sourceKey === 'glTransactions') {
    const monthly: Record<number, { debit: number; credit: number }> = {};
    for (let i = 1; i <= 12; i++) monthly[i] = { debit: 0, credit: 0 };
    data.forEach(r => {
      const d = new Date(String(r.date || '') + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        const m = d.getMonth() + 1;
        monthly[m].debit  += Number(r.debit)  || 0;
        monthly[m].credit += Number(r.credit) || 0;
      }
    });
    const monthlyData = Object.entries(monthly).map(([m, v]) => ({
      month: MONTH_NAMES[+m], debit: v.debit, credit: v.credit,
    }));

    const byAccount: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.accountCode || '(none)');
      byAccount[k] = (byAccount[k] || 0) + (Number(r.debit) || 0) + (Number(r.credit) || 0);
    });
    const topAccounts = Object.entries(byAccount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Debit vs Credit">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="debit"  name="Debit"  fill={C[3]} radius={[2,2,0,0]} />
              <Bar dataKey="credit" name="Credit" fill={C[1]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top Account Codes by Volume">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topAccounts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={48} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="value" name="Volume" radius={[0,2,2,0]}>
                {topAccounts.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Program Catalog: programs by category + participant days by month
  if (sourceKey === 'programCatalog') {
    const byCat: Record<string, { count: number; pDays: number }> = {};
    data.forEach(r => {
      const k = String(r.categoryCode || 'Other');
      if (!byCat[k]) byCat[k] = { count: 0, pDays: 0 };
      byCat[k].count++;
      byCat[k].pDays += Number(r.participantDays) || 0;
    });
    const catData = Object.entries(byCat).map(([name, v]) => ({ name, count: v.count, pDays: v.pDays }));

    const byMonth: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) byMonth[i] = 0;
    data.forEach(r => {
      const d = new Date(String(r.startDate || '') + 'T00:00:00');
      if (!isNaN(d.getTime())) byMonth[d.getMonth() + 1] += Number(r.participantDays) || 0;
    });
    const monthData = Object.entries(byMonth).map(([m, v]) => ({ month: MONTH_NAMES[+m], pDays: v }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Programs by Category">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" name="Programs"       fill={C[0]} radius={[2,2,0,0]} />
              <Bar dataKey="pDays" name="Participant Days" fill={C[1]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Participant Days by Start Month">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtN} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => fmtN(v)} />
              <Bar dataKey="pDays" name="P-Days" fill={C[2]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Program Revenue: revenue by category + top 10 programs
  if (sourceKey === 'programRevenue') {
    const byCat: Record<string, { tuition: number; accommodation: number; other: number }> = {};
    data.forEach(r => {
      const k = String(r.categoryCode || 'Other');
      if (!byCat[k]) byCat[k] = { tuition: 0, accommodation: 0, other: 0 };
      byCat[k].tuition       += Number(r.tuitionRevenue) || 0;
      byCat[k].accommodation += Number(r.accommodationRevenue) || 0;
      byCat[k].other         += Number(r.otherRevenue) || 0;
    });
    const catData = Object.entries(byCat).map(([name, v]) => ({ name, ...v }));

    const top10 = [...data]
      .sort((a, b) => (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0))
      .slice(0, 10)
      .map(r => ({ name: trunc(r.programName, 28), value: Number(r.totalRevenue) || 0 }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue by Category">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="tuition"       name="Tuition"       fill={C[0]} radius={[2,2,0,0]} stackId="a" />
              <Bar dataKey="accommodation" name="Accommodation"  fill={C[1]} radius={[0,0,0,0]} stackId="a" />
              <Bar dataKey="other"         name="Other"          fill={C[2]} radius={[2,2,0,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top 10 Programs by Revenue">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={top10} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="value" name="Revenue" radius={[0,2,2,0]}>
                {top10.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Residential Roster: days per person (top 20) + headcount by program track
  if (sourceKey === 'residentialRoster') {
    const top20 = [...data]
      .sort((a, b) => (Number(b.daysInYear) || 0) - (Number(a.daysInYear) || 0))
      .slice(0, 20)
      .map(r => ({
        name: trunc(`${r.firstName || ''} ${r.lastName || ''}`.trim(), 22),
        days: Number(r.daysInYear) || 0,
      }));

    const byProgram: Record<string, number> = {};
    data.forEach(r => {
      const k = trunc(r.programName, 30);
      byProgram[k] = (byProgram[k] || 0) + 1;
    });
    const programData = Object.entries(byProgram).map(([name, count]) => ({ name, count }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 20 by Days in Year">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top20} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="days" name="Days" fill={C[4]} radius={[0,2,2,0]}>
                {top20.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Headcount by Program Track">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={programData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar dataKey="count" name="People" radius={[2,2,0,0]}>
                {programData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Room Inventory: rooms by type + single vs shared price comparison
  if (sourceKey === 'roomInventory') {
    const byType: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.roomType || 'Other');
      byType[k] = (byType[k] || 0) + 1;
    });
    const typeData = Object.entries(byType).map(([name, count]) => ({ name, count }));

    const priceData = Object.entries(
      data.reduce<Record<string, { single: number; shared: number; n: number }>>((acc, r) => {
        const k = String(r.roomType || 'Other');
        if (!acc[k]) acc[k] = { single: 0, shared: 0, n: 0 };
        acc[k].single += Number(r.priceSingle) || 0;
        acc[k].shared += Number(r.priceShared) || 0;
        acc[k].n++;
        return acc;
      }, {})
    ).map(([name, v]) => ({
      name,
      single: v.n ? +(v.single / v.n).toFixed(0) : 0,
      shared: v.n ? +(v.shared / v.n).toFixed(0) : 0,
    }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Rooms by Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar dataKey="count" name="Rooms" radius={[2,2,0,0]}>
                {typeData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Avg Price: Single vs Shared by Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priceData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} width={48} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="single" name="Single" fill={C[0]} radius={[2,2,0,0]} />
              <Bar dataKey="shared" name="Shared" fill={C[5]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Staff Salaries: salary by department
  if (sourceKey === 'staffSalaries') {
    const byDept: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.department || 'Other');
      byDept[k] = (byDept[k] || 0) + (Number(r.annualSalary) || 0);
    });
    const deptData = Object.entries(byDept)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    return (
      <ChartCard title="Total Annual Salary by Department">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={deptData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v: number) => fmt$(v)} />
            <Bar dataKey="value" name="Salary" radius={[2,2,0,0]}>
              {deptData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // Trial Balance: net by account class + net by account type
  if (sourceKey === 'trialBalance') {
    const byClass: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.accountClass || 'Other');
      byClass[k] = (byClass[k] || 0) + (Number(r.credit) || 0) - (Number(r.debit) || 0);
    });
    const classData = Object.entries(byClass).map(([name, net]) => ({ name, net }));

    const byType: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.accountType || 'Other');
      byType[k] = (byType[k] || 0) + (Number(r.credit) || 0) - (Number(r.debit) || 0);
    });
    const typeData = Object.entries(byType)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 12)
      .map(([name, net]) => ({ name, net }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Net (Credit - Debit) by Account Class">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={classData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="net" name="Net" radius={[2,2,0,0]}>
                {classData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Net by Account Type (top 12)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="net" name="Net" radius={[0,2,2,0]}>
                {typeData.map((e, i) => <Cell key={i} fill={e.net >= 0 ? C[1] : C[3]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Donations: paid by fund + pledged vs paid comparison
  if (sourceKey === 'donations') {
    const byFund: Record<string, { pledged: number; paid: number }> = {};
    data.forEach(r => {
      const k = trunc(r.fundName, 22);
      if (!byFund[k]) byFund[k] = { pledged: 0, paid: 0 };
      byFund[k].pledged += Number(r.pledgedAmount) || 0;
      byFund[k].paid    += Number(r.amountPaid)    || 0;
    });
    const fundData = Object.entries(byFund)
      .sort((a, b) => b[1].paid - a[1].paid)
      .map(([name, v]) => ({ name, ...v }));

    const byType: Record<string, number> = {};
    data.forEach(r => { const k = String(r.donationType || 'Unknown'); byType[k] = (byType[k] || 0) + (Number(r.amountPaid) || 0); });
    const typeData = Object.entries(byType).map(([name, paid]) => ({ name, paid }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Pledged vs Paid by Fund">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fundData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="pledged" name="Pledged" fill={C[2]} radius={[2,2,0,0]} />
              <Bar dataKey="paid"    name="Paid"    fill={C[1]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Amount Paid by Donation Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="paid" name="Paid" radius={[2,2,0,0]}>
                {typeData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Outstanding AR: outstanding by program (top 10)
  if (sourceKey === 'outstandingAr') {
    const byProgram: Record<string, { charged: number; paid: number; outstanding: number }> = {};
    data.forEach(r => {
      const k = trunc(r.programName, 28);
      if (!byProgram[k]) byProgram[k] = { charged: 0, paid: 0, outstanding: 0 };
      byProgram[k].charged     += Number(r.totalCharged) || 0;
      byProgram[k].paid        += Number(r.totalPaid)    || 0;
      byProgram[k].outstanding += Number(r.outstanding)  || 0;
    });
    const top10 = Object.entries(byProgram)
      .sort((a, b) => b[1].outstanding - a[1].outstanding)
      .slice(0, 10)
      .map(([name, v]) => ({ name, ...v }));

    const totals = data.reduce(
      (acc, r) => ({
        charged:     acc.charged     + (Number(r.totalCharged) || 0),
        paid:        acc.paid        + (Number(r.totalPaid)    || 0),
        outstanding: acc.outstanding + (Number(r.outstanding)  || 0),
      }),
      { charged: 0, paid: 0, outstanding: 0 }
    );
    const totalsData = [
      { name: 'Charged',     value: totals.charged },
      { name: 'Paid',        value: totals.paid },
      { name: 'Outstanding', value: totals.outstanding },
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Outstanding by Program (top 10)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top10} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="outstanding" name="Outstanding" fill={C[3]} radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Total Charged vs Paid vs Outstanding">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={totalsData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="value" name="Amount" radius={[2,2,0,0]}>
                {totalsData.map((_, i) => <Cell key={i} fill={[C[0], C[1], C[3]][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Program Transactions: amount by GL account + discount by category
  if (sourceKey === 'programTransactions') {
    const byGL: Record<string, number> = {};
    data.forEach(r => { const k = String(r.glAccount || '?'); byGL[k] = (byGL[k] || 0) + (Number(r.totalAmount) || 0); });
    const glData = Object.entries(byGL)
      .sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([name, value]) => ({ name, value }));

    const byCat: Record<string, { amount: number; discount: number }> = {};
    data.forEach(r => {
      const k = String(r.categoryCode || 'Other');
      if (!byCat[k]) byCat[k] = { amount: 0, discount: 0 };
      byCat[k].amount   += Number(r.totalAmount)   || 0;
      byCat[k].discount += Number(r.totalDiscount) || 0;
    });
    const catData = Object.entries(byCat).map(([name, v]) => ({ name, ...v }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Amount by GL Account (top 12)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={glData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="value" name="Amount" fill={C[0]} radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Amount vs Discount by Category">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="amount"   name="Amount"   fill={C[0]} radius={[2,2,0,0]} />
              <Bar dataKey="discount" name="Discount" fill={C[3]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Recurring Donors: top 15 by total paid
  if (sourceKey === 'recurringDonors') {
    const top15 = [...data]
      .sort((a, b) => (Number(b.totalPaid) || 0) - (Number(a.totalPaid) || 0))
      .slice(0, 15)
      .map(r => ({ name: trunc(r.donorName, 24), value: Number(r.totalPaid) || 0 }));
    return (
      <ChartCard title="Top 15 Donors by Total Paid">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={top15} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
            <Tooltip formatter={(v: number) => fmt$2(v)} />
            <Bar dataKey="value" name="Total Paid" radius={[0,2,2,0]}>
              {top15.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // Room Bookings: bookings by room type + avg nights by room type
  if (sourceKey === 'roomBookings') {
    const byType: Record<string, { bookings: number; nights: number }> = {};
    data.forEach(r => {
      const k = trunc(r.roomTypeDesc, 22);
      if (!byType[k]) byType[k] = { bookings: 0, nights: 0 };
      byType[k].bookings++;
      byType[k].nights += Number(r.nights) || 0;
    });
    const typeData = Object.entries(byType).map(([name, v]) => ({
      name,
      bookings: v.bookings,
      avgNights: v.bookings ? +(v.nights / v.bookings).toFixed(1) : 0,
    }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Bookings by Room Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Bar dataKey="bookings" name="Bookings" radius={[2,2,0,0]}>
                {typeData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Avg Nights by Room Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Bar dataKey="avgNights" name="Avg Nights" fill={C[5]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // All Registrations: charged vs paid by top 10 programs + collection rate
  if (sourceKey === 'allRegistrations') {
    const byProgram: Record<string, { charged: number; paid: number }> = {};
    data.forEach(r => {
      const k = trunc(r.programName, 28);
      if (!byProgram[k]) byProgram[k] = { charged: 0, paid: 0 };
      byProgram[k].charged += Number(r.totalCharged) || 0;
      byProgram[k].paid    += Number(r.totalPaid)    || 0;
    });
    const top10 = Object.entries(byProgram)
      .sort((a, b) => b[1].charged - a[1].charged).slice(0, 10)
      .map(([name, v]) => ({ name, charged: v.charged, paid: v.paid }));

    const totalCharged = data.reduce((s, r) => s + (Number(r.totalCharged) || 0), 0);
    const totalPaid    = data.reduce((s, r) => s + (Number(r.totalPaid)    || 0), 0);
    const totalOut     = totalCharged - totalPaid;
    const summaryData  = [
      { name: 'Charged', value: totalCharged },
      { name: 'Paid',    value: totalPaid },
      { name: 'Outstanding', value: totalOut },
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Charged vs Paid — Top 10 Programs">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top10} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="charged" name="Charged" fill={C[0]} radius={[0,2,2,0]} />
              <Bar dataKey="paid"    name="Paid"    fill={C[1]} radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Portfolio Totals">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summaryData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="value" name="Amount" radius={[2,2,0,0]}>
                {summaryData.map((_, i) => <Cell key={i} fill={[C[0], C[1], C[3]][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Program Billing: top 15 by total charged
  if (sourceKey === 'programBilling') {
    const top15 = [...data]
      .sort((a, b) => (Number(b.totalCharged2025) || 0) - (Number(a.totalCharged2025) || 0))
      .slice(0, 15)
      .map(r => ({ name: trunc(r.participantName, 24), value: Number(r.totalCharged2025) || 0 }));
    return (
      <ChartCard title="Top 15 by Total Charged">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={top15} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
            <Tooltip formatter={(v: number) => fmt$2(v)} />
            <Bar dataKey="value" name="Total Charged" radius={[0,2,2,0]}>
              {top15.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  return null;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground mb-3">{title}</p>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PlanningDataTabProps {
  dataset: KclAnnualDataset;
}

const PlanningDataTab: React.FC<PlanningDataTabProps> = ({ dataset }) => {
  const [selectedKey, setSelectedKey] = useState<KclDataSourceKey | null>(null);
  const [text, setText] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [category, setCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [sqlOpen, setSqlOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const loadedSources = useMemo(
    () => ALL_SOURCES.filter(k => dataset.sources[k].status === 'loaded'),
    [dataset.sources]
  );

  const activeKey: KclDataSourceKey | null =
    selectedKey && loadedSources.includes(selectedKey) ? selectedKey : loadedSources[0] ?? null;

  // Clear stale selected key if it's been removed
  useEffect(() => {
    if (selectedKey && !loadedSources.includes(selectedKey)) setSelectedKey(null);
  }, [loadedSources, selectedKey]);

  // Reset filters and page when source changes
  useEffect(() => {
    setText('');
    setDateStart('');
    setDateEnd('');
    setAmountMin('');
    setAmountMax('');
    setCategory('all');
    setPage(1);
    setSqlOpen(false);
    setSortKey(null);
    setSortDir('asc');
  }, [activeKey]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [text, dateStart, dateEnd, amountMin, amountMax, category]);

  const rawData = useMemo((): Row[] => {
    if (!activeKey) return [];
    return (dataset.data[activeKey] as Row[]) ?? [];
  }, [activeKey, dataset.data]);

  const categoryOptions = useMemo(() => {
    if (!activeKey) return [];
    const cfg = CATEGORY_FIELD[activeKey];
    if (!cfg) return [];
    const seen = new Set<string>();
    rawData.forEach(r => { const v = String(r[cfg.field] ?? ''); if (v) seen.add(v); });
    return Array.from(seen).sort();
  }, [activeKey, rawData]);

  const filteredData = useMemo((): Row[] => {
    if (!activeKey) return [];
    const searchFields = SEARCH_FIELDS[activeKey];
    const dateField    = DATE_FIELD[activeKey];
    const amountField  = AMOUNT_FIELD[activeKey];
    const catCfg       = CATEGORY_FIELD[activeKey];
    const textLower    = text.toLowerCase();

    return rawData.filter(row => {
      if (textLower) {
        const match = searchFields.some(f => String(row[f] ?? '').toLowerCase().includes(textLower));
        if (!match) return false;
      }
      if (dateStart && dateField) {
        const d = new Date(String(row[dateField] || '') + 'T00:00:00');
        if (!isNaN(d.getTime()) && d < new Date(dateStart + 'T00:00:00')) return false;
      }
      if (dateEnd && dateField) {
        const d = new Date(String(row[dateField] || '') + 'T00:00:00');
        if (!isNaN(d.getTime()) && d > new Date(dateEnd + 'T23:59:59')) return false;
      }
      if (amountMin && amountField) {
        const v = Number(row[amountField]);
        if (!isNaN(v) && v < parseFloat(amountMin)) return false;
      }
      if (amountMax && amountField) {
        const v = Number(row[amountField]);
        if (!isNaN(v) && v > parseFloat(amountMax)) return false;
      }
      if (category !== 'all' && catCfg) {
        if (String(row[catCfg.field]) !== category) return false;
      }
      return true;
    });
  }, [activeKey, rawData, text, dateStart, dateEnd, amountMin, amountMax, category]);

  const sortedData = useMemo((): Row[] => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const aEmpty = av == null || av === '';
      const bEmpty = bv == null || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      const an = Number(av);
      const bn = Number(bv);
      const cmp = (!isNaN(an) && !isNaN(bn))
        ? an - bn
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleExport = () => {
    if (!activeKey || sortedData.length === 0) return;
    const exportCols = COLS[activeKey];
    const header = exportCols.map(c => `"${c.label}"`).join(',');
    const rows = sortedData.map(row =>
      exportCols.map(c => {
        const v = row[c.key];
        if (v == null) return '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeKey}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages  = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData    = sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const cols        = activeKey ? COLS[activeKey] : [];

  const hasActiveFilters = dateStart || dateEnd || amountMin || amountMax || (category !== 'all');
  const showDateFilter   = activeKey ? !!DATE_FIELD[activeKey]   : false;
  const showAmountFilter = activeKey ? !!AMOUNT_FIELD[activeKey] : false;
  const showCatFilter    = activeKey ? !!CATEGORY_FIELD[activeKey] : false;
  const hasAnyFilter     = showDateFilter || showAmountFilter || showCatFilter;

  const sqlContent = activeKey ? SQL_CONTENT[activeKey] : undefined;
  const origin     = activeKey ? KCL_SOURCE_META[activeKey].origin : '';

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (loadedSources.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <p className="text-sm font-medium">No data sources loaded yet.</p>
        <p className="text-xs mt-1">Upload data in the Upload tab to explore it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Source selector */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {loadedSources.map(k => (
            <button
              key={k}
              onClick={() => setSelectedKey(k)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
                activeKey === k
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/60 hover:text-foreground'
              )}
            >
              {KCL_SOURCE_META[k].label}
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0 font-normal',
                activeKey === k ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-muted-foreground'
              )}>
                {dataset.sources[k].recordCount.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeKey && (
        <>
          {/* Source header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{KCL_SOURCE_META[activeKey].label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{KCL_SOURCE_META[activeKey].description}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {filteredData.length < rawData.length
                  ? `${filteredData.length.toLocaleString()} of ${rawData.length.toLocaleString()} records`
                  : `${rawData.length.toLocaleString()} records`}
                {dataset.sources[activeKey].fileName && (
                  <span className="ml-2 text-muted-foreground/60">{dataset.sources[activeKey].fileName}</span>
                )}
              </p>
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleExport} disabled={sortedData.length === 0}>
                <Download className="h-3 w-3" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`Search ${KCL_SOURCE_META[activeKey].label.toLowerCase()}...`}
                className="pl-9"
              />
            </div>
            {hasAnyFilter && (
              <Button
                variant="outline"
                size="sm"
                className={cn('gap-1.5', hasActiveFilters && 'border-primary text-primary')}
                onClick={() => setShowFilters(v => !v)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
            {(text || hasActiveFilters) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setText(''); setDateStart(''); setDateEnd(''); setAmountMin(''); setAmountMax(''); setCategory('all'); }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Advanced filters */}
          {showFilters && hasAnyFilter && (
            <div className="flex flex-wrap gap-4 rounded-lg border px-4 py-3 bg-muted/20">
              {showDateFilter && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Date range</Label>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="h-8 text-sm w-36" />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input type="date" value={dateEnd}   onChange={e => setDateEnd(e.target.value)}   className="h-8 text-sm w-36" />
                  </div>
                </div>
              )}
              {showAmountFilter && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Amount range</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Min" value={amountMin} onChange={e => setAmountMin(e.target.value)} className="h-8 text-sm w-28" />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input type="number" placeholder="Max" value={amountMax} onChange={e => setAmountMax(e.target.value)} className="h-8 text-sm w-28" />
                  </div>
                </div>
              )}
              {showCatFilter && categoryOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{CATEGORY_FIELD[activeKey]!.label}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-8 text-sm w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {categoryOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Charts */}
          <SourceCharts sourceKey={activeKey} data={rawData as Row[]} />

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {cols.map(c => (
                      <TableHead
                        key={c.key}
                        className="text-xs font-medium whitespace-nowrap py-2.5 cursor-pointer select-none hover:text-foreground"
                        onClick={() => handleSort(c.key)}
                      >
                        <div className={cn('flex items-center gap-1', c.right && 'justify-end')}>
                          {c.label}
                          {sortKey === c.key
                            ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                            : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={cols.length} className="text-center py-12 text-sm text-muted-foreground">
                        No records match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageData.map((row, i) => (
                      <TableRow key={i} className="hover:bg-muted/20">
                        {cols.map(c => {
                          const raw = row[c.key];
                          const display = c.render ? c.render(raw) : (raw != null ? String(raw) : '');
                          return (
                            <TableCell
                              key={c.key}
                              className={cn('py-2 text-sm', c.right && 'text-right tabular-nums')}
                              title={display.length > 30 ? String(raw ?? '') : undefined}
                            >
                              {display}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(currentPage * PAGE_SIZE, sortedData.length).toLocaleString()} of {sortedData.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(1)}>First</Button>
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <span className="px-3 text-sm">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>Last</Button>
              </div>
            </div>
          )}

          {/* SQL viewer */}
          <div className="rounded-lg border overflow-hidden">
            <button
              onClick={() => setSqlOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Code2 className="h-3.5 w-3.5" />
                {sqlContent ? `SQL query — data/queries/${origin.split('data/queries/').pop()?.split(' ')[0] ?? ''}` : `Source — ${origin}`}
              </span>
              {sqlOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {sqlOpen && (
              <div className="border-t bg-muted/10 px-4 py-3">
                {sqlContent ? (
                  <pre className="text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre">
                    {sqlContent}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">{origin}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PlanningDataTab;
