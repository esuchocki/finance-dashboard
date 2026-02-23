-- Per-person charges billed for strict-year programs.
-- "Strict year" = both START_DATE and END_DATE fall within the calendar year.
-- Replace 2025 with the target year when running for future years.
--
-- Uses the transactions table (what Omnis charged), NOT payment_detail (cash received).
-- This is the billing-side view: everyone who participated in a 2025 program,
-- and what they were charged, regardless of whether they have paid.
--
-- Pair with recurring_donors.sql (cash received) for the complete picture:
--   program_billing.sql  → who participated + what was billed
--   recurring_donors.sql → who paid cash in 2025 + how much was received
--
-- Column notes:
--   registrations_2025   Count of active (non-cancelled) 2025 program registrations
--   charge_lines_2025    Count of individual transaction charge rows (tuition, accommodation, etc.)
--   total_charged_2025   Sum of all charges billed — NOT cash received

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
GROUP BY
    per.PERSON_ID,
    per.FIRST_NAME,
    per.LAST_NAME,
    per.EMAIL_ADDRESS
HAVING COALESCE(SUM(t.AMOUNT), 0) > 0
ORDER BY total_charged_2025 DESC;
