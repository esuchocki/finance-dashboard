-- Room bookings for the residential programs in the target year.
-- Outputs columns in the format expected by the web app parser.
-- Replace the PROGRAM_ID list with values from find_residential_programs.sql each year.
--
-- Filters to the three residential programs (staff, volunteer, residency) rather than
-- by arrival date, because many room assignments have NULL ARRIVAL_DATE_TIME even
-- though the booking is active. A year filter on arrival would silently drop them.
--
-- nights is computed as DATEDIFF(departure, arrival); NULL where either date is missing.

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
JOIN room      r   ON r.ROOM_ID          = rb.ROOM_ID
JOIN room_type rt  ON rt.ROOM_TYPE_CODE  = rb.ROOM_TYPE_CODE
WHERE rb.INACTIVE  IS NULL
  AND rb.PROGRAM_ID IN (7241, 7242, 7320)
ORDER BY rb.PROGRAM_ID, r.ROOM_NO;
