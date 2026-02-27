-- Room bookings for the residential programs in the target year.
-- Year is assigned by START_DATE only — programs that start in 2025 are 2025 programs,
-- even if they end in the following year (e.g., staff/volunteer programs end 2026-01-01).
-- Replace 2025 with the target year when running for future years.
--
-- Filters by program START_DATE year rather than arrival date, because many room
-- assignments have NULL ARRIVAL_DATE_TIME even though the booking is active.
-- A year filter on arrival would silently drop them.
--
-- nights is computed as DATEDIFF(departure, arrival); NULL where either date is missing.
--
-- PROGRAM_NAME is included so the web app can distinguish staff room bookings
-- (programs containing "Residential Staff") from participant room bookings.

SELECT
    rb.ROOM_BOOKING_ID,
    rb.ROOM_ID,
    r.ROOM_NO,
    rb.ROOM_TYPE_CODE,
    rt.ROOM_TYPE_DESC,
    rb.REGISTRATION_ID,
    rb.PROGRAM_ID,
    prog.PROGRAM_NAME,
    rb.ARRIVAL_DATE_TIME,
    rb.DEPARTURE_DATE_TIME,
    CASE
        WHEN rb.ARRIVAL_DATE_TIME IS NOT NULL AND rb.DEPARTURE_DATE_TIME IS NOT NULL
        THEN DATEDIFF(DATE(rb.DEPARTURE_DATE_TIME), DATE(rb.ARRIVAL_DATE_TIME))
        ELSE NULL
    END AS nights
FROM room_booking rb
JOIN room      r    ON r.ROOM_ID         = rb.ROOM_ID
JOIN room_type rt   ON rt.ROOM_TYPE_CODE = rb.ROOM_TYPE_CODE
JOIN program   prog ON prog.PROGRAM_ID   = rb.PROGRAM_ID
WHERE rb.INACTIVE IS NULL
  AND YEAR(prog.START_DATE) = 2025
ORDER BY rb.PROGRAM_ID, r.ROOM_NO;
