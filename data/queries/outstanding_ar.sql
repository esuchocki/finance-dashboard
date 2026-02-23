-- Outstanding accounts receivable for strict-year programs.
-- "Strict year" = both START_DATE and END_DATE fall within the calendar year.
-- Replace 2025 with the target year when running for future years.
--
-- Shows amounts billed in Omnis that have not yet been collected.
-- These appear in Xero in a future period when the participant pays.
--
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
  AND YEAR(prog.END_DATE)   = 2025
  AND reg.CANCELLED IS NULL
  AND COALESCE(charges.total_charged, 0) > COALESCE(paid.total_paid, 0)
ORDER BY outstanding DESC;
