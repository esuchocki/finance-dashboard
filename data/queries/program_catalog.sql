-- Program catalog: all programs for a given year
-- Year is assigned by START_DATE only — programs that start in 2025 are 2025 programs,
-- even if they end in the following year.
-- Replace 2025 with the target year when running for future years.
--
-- Output columns used by the web app:
--   PROGRAM_ID, PROGRAM_NAME, START_DATE, END_DATE, PROG_CATEGORY_CODE,
--   total_registrations, active_registrations, total_participant_days, is_residential
--
-- is_residential: 1 if any registration has KCL_RESIDENT set (staff/volunteer/residency
--   tracking programs), 0 otherwise. Used to exclude non-revenue residential programs
--   from the overhead denominator and participant-day charts.

SELECT
    prog.PROGRAM_ID,
    prog.PROGRAM_NAME,
    prog.START_DATE,
    prog.END_DATE,
    prog.PROG_CATEGORY_CODE,
    COUNT(reg.REGISTRATION_ID)                                         AS total_registrations,
    COUNT(CASE WHEN reg.CANCELLED IS NULL THEN 1 END)                  AS active_registrations,
    SUM(CASE WHEN reg.CANCELLED IS NULL THEN GREATEST(0, DATEDIFF(
        LEAST(reg.DEPARTURE_DATE,  prog.END_DATE),
        GREATEST(reg.ARRIVAL_DATE, prog.START_DATE)
    )) ELSE 0 END)                                                     AS total_participant_days,
    COALESCE(MAX(CASE WHEN reg.KCL_RESIDENT IS NOT NULL THEN 1 ELSE 0 END), 0)
                                                                       AS is_residential
FROM program prog
LEFT JOIN registration reg ON reg.PROGRAM_ID = prog.PROGRAM_ID
WHERE YEAR(prog.START_DATE) = 2025
GROUP BY
    prog.PROGRAM_ID,
    prog.PROGRAM_NAME,
    prog.START_DATE,
    prog.END_DATE,
    prog.PROG_CATEGORY_CODE
ORDER BY prog.START_DATE, prog.PROGRAM_NAME;
