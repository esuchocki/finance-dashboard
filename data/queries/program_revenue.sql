-- Per-program revenue for strict-year programs (GL 4xxx charges only)
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
ORDER BY total_revenue DESC;
