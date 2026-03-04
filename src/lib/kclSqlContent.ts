import type { KclDataSourceKey } from '@/lib/kclTypes';

export const SQL_CONTENT: Partial<Record<KclDataSourceKey, string>> = {
  programCatalog: `-- Program catalog: all programs for a given year.
-- Year is assigned by START_DATE only — programs that start in 2025 are 2025 programs,
-- even if they end in the following year (e.g. year-long residential tracking programs).
-- Replace 2025 with the target year when running for future years.
--
-- Output columns used by the web app:
--   PROGRAM_ID, PROGRAM_NAME, START_DATE, END_DATE, PROG_CATEGORY_CODE,
--   total_registrations, active_registrations, total_participant_days, is_residential
--
-- is_residential: 1 for year-long residential tracking programs (Staff, Volunteer,
--   Residency Program). Detected by program duration >= 270 days rather than program
--   name, so renaming a tracking program does not break the classification.

SELECT
    prog.PROGRAM_ID,
    prog.PROGRAM_NAME,
    prog.START_DATE,
    prog.END_DATE,
    prog.PROG_CATEGORY_CODE,
    COUNT(reg.REGISTRATION_ID)                                         AS total_registrations,
    COUNT(CASE WHEN reg.CANCELLED IS NULL THEN 1 END)                  AS active_registrations,
    SUM(CASE WHEN reg.CANCELLED IS NULL THEN GREATEST(0, COALESCE(DATEDIFF(
        LEAST(reg.DEPARTURE_DATE,  prog.END_DATE),
        GREATEST(reg.ARRIVAL_DATE, prog.START_DATE)
    ), 0)) ELSE 0 END)                                                 AS total_participant_days,
    CASE WHEN DATEDIFF(prog.END_DATE, prog.START_DATE) >= 270
         THEN 1 ELSE 0 END                                             AS is_residential
FROM program prog
LEFT JOIN registration reg ON reg.PROGRAM_ID = prog.PROGRAM_ID
WHERE YEAR(prog.START_DATE) = 2025
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
-- days_in_year is clamped to [2025-01-01, 2026-01-01) — upper bound is exclusive
-- so that a full-year resident (Jan 1 → Jan 1 next year) gets 365 nights, not 364.

SELECT
    per.FIRST_NAME,
    per.LAST_NAME,
    per.EMAIL_ADDRESS,
    prog.PROGRAM_NAME,
    prog.PROG_CATEGORY_CODE,
    reg.ARRIVAL_DATE,
    reg.DEPARTURE_DATE,
    DATEDIFF(
        LEAST(reg.DEPARTURE_DATE, '2026-01-01'),
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
