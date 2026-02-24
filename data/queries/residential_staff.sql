-- Residential staff and volunteer actual arrival/departure dates
-- Programs included:
--   7241  "2025 KCL Residential Staff"     (2025-01-01 to 2026-01-01)
--   7242  "2025 KCL Residential Volunteer"  (2025-01-01 to 2026-01-01)
--   7320  "2025 Residency Program"          (2025-01-01 to 2025-12-31)
--
-- Replace the program IDs and year literals when running for future years.
-- The days_in_year column is clamped to the calendar year (2025-01-01 / 2026-01-01).
-- Upper bound is 2026-01-01 (exclusive), not 2025-12-31 (inclusive), so that a full-year
-- resident (Jan 1 → Jan 1) gets DATEDIFF('2026-01-01','2025-01-01') = 365 nights, not 364.
--
-- Note: Staff/Volunteer programs span into 2026, so they are excluded from the
-- strict-year program filter. Individual registration dates tell us exactly
-- when each person was actually on-site in the target year.

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
ORDER BY prog.PROGRAM_NAME, reg.ARRIVAL_DATE, per.LAST_NAME;
