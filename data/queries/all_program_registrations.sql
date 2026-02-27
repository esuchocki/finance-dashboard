-- All active registrations for year programs (charged + paid summary).
-- Year is assigned by START_DATE only — programs that start in 2025 are 2025 programs,
-- even if they end in the following year.
-- Replace 2025 with the target year when running for future years.
--
-- Difference from outstanding_ar.sql:
--   This query returns ALL active registrations regardless of payment status.
--   outstanding_ar.sql filters to WHERE outstanding > 0 (unpaid only).
--
-- Use this as the participant source for per-program drill-downs.
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
    SELECT
        t.REGISTRATION_ID,
        SUM(t.AMOUNT) AS total_charged
    FROM transactions t
    WHERE t.REVERSE   = 0
      AND t.INACTIVE IS NULL
    GROUP BY t.REGISTRATION_ID
) charges ON charges.REGISTRATION_ID = reg.REGISTRATION_ID
LEFT JOIN (
    SELECT
        pd.REGISTRATION_ID,
        SUM(pd.AMOUNT) AS total_paid
    FROM payment_detail pd
    GROUP BY pd.REGISTRATION_ID
) paid ON paid.REGISTRATION_ID = reg.REGISTRATION_ID
WHERE YEAR(prog.START_DATE) = 2025
  AND reg.CANCELLED IS NULL
ORDER BY prog.START_DATE, prog.PROGRAM_NAME, participant_name;
