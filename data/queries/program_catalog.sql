-- Program catalog: all programs for a given year
-- Year is assigned by START_DATE only — programs that start in 2025 are 2025 programs,
-- even if they end in the following year.
-- Replace 2025 with the target year when running for future years.
--
-- Output columns used by the web app:
--   PROGRAM_ID, PROGRAM_NAME, START_DATE, END_DATE, PROG_CATEGORY_CODE,
--   total_registrations, active_registrations, total_participant_days, is_residential
--
-- is_residential: 1 for year-long residential tracking programs (Staff, Volunteer,
--   Residency Program), 0 for all other programs. Identified by program name because
--   KCL_RESIDENT is a person-level flag set on all registrations for long-term residents,
--   including when they attend regular retreat programs — making it unsuitable for
--   classifying programs.

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
    CASE WHEN prog.PROGRAM_NAME LIKE '%Residential Staff%'
              OR prog.PROGRAM_NAME LIKE '%Residential Volunteer%'
              OR prog.PROGRAM_NAME LIKE '%Residency Program%'
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
ORDER BY prog.START_DATE, prog.PROGRAM_NAME;
