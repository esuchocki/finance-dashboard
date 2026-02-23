-- All Omnis transactions by program, GL account, and transaction type.
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
    COUNT(*)                                           AS num_lines,
    SUM(t.AMOUNT)                                      AS total_amount,
    SUM(t.DISCOUNT)                                    AS total_discount
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
    prog.PROGRAM_ID,
    prog.PROGRAM_NAME,
    prog.PROG_CATEGORY_CODE,
    prog.START_DATE,
    prog.END_DATE,
    t.GL_ACCOUNT,
    t.TRANS_TYPE,
    t.TRANS_DESC
ORDER BY prog.START_DATE, prog.PROGRAM_NAME, t.GL_ACCOUNT;
