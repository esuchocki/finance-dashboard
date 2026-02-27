-- Per-person donation payment summary: everyone who made a donation payment in the target year.
-- Replace 2025 with the target year when running for future years.
--
-- Filters to pd.DONATION_ID IS NOT NULL so only actual donation payments are included.
-- This excludes program registration payments and residential housing payments, which
-- flow through payment_detail.REGISTRATION_ID instead and are NOT donations.
--
-- Output columns used by the web app:
--   PERSON_ID, donor_name, EMAIL_ADDRESS,
--   num_active_enrollments  (distinct non-cancelled program registrations)
--   payments_made_<YYYY>    (count of donation payment_detail rows applied in the year)
--   total_paid_<YYYY>       (sum of those donation payment amounts)
--
-- Voided payments are excluded. Only people with total_paid > 0 are included.

SELECT
    per.PERSON_ID,
    CONCAT(per.FIRST_NAME, ' ', per.LAST_NAME)     AS donor_name,
    per.EMAIL_ADDRESS,
    COUNT(DISTINCT reg.REGISTRATION_ID)            AS num_active_enrollments,
    COUNT(pd.PAYMENT_DETAIL_ID)                    AS payments_made_2025,
    SUM(pd.AMOUNT)                                 AS total_paid_2025
FROM payment pay
JOIN person per
    ON  per.PERSON_ID        = pay.PERSON_ID
JOIN payment_detail pd
    ON  pd.PAYMENT_ID        = pay.PAYMENT_ID
LEFT JOIN registration reg
    ON  reg.REGISTRATION_ID  = pd.REGISTRATION_ID
    AND reg.CANCELLED       IS NULL
WHERE YEAR(pay.PAYMENT_DATE)    = 2025
  AND pay.VOID_TRANSACTION     IS NULL
  AND pd.DONATION_ID           IS NOT NULL
GROUP BY
    per.PERSON_ID,
    per.FIRST_NAME,
    per.LAST_NAME,
    per.EMAIL_ADDRESS
HAVING SUM(pd.AMOUNT) > 0
ORDER BY total_paid_2025 DESC;
