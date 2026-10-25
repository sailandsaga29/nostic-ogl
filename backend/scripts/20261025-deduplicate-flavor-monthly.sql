BEGIN;

LOCK TABLE flavor_monthly IN SHARE ROW EXCLUSIVE MODE;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "flavorId", year, month
      ORDER BY "createdAt" DESC, id DESC
    ) AS row_number,
    SUM(quantity) OVER (
      PARTITION BY "flavorId", year, month
    ) AS merged_quantity,
    SUM(cost) OVER (
      PARTITION BY "flavorId", year, month
    ) AS merged_cost,
    MAX("carryForwarded") OVER (
      PARTITION BY "flavorId", year, month
    ) AS merged_carry_forwarded,
    FIRST_VALUE(rate) OVER (
      PARTITION BY "flavorId", year, month
      ORDER BY "createdAt" DESC, id DESC
    ) AS latest_rate,
    FIRST_VALUE(category) OVER (
      PARTITION BY "flavorId", year, month
      ORDER BY "createdAt" DESC, id DESC
    ) AS latest_category
  FROM flavor_monthly
)
UPDATE flavor_monthly AS monthly
SET
  quantity = ranked.merged_quantity,
  cost = ranked.merged_cost,
  "carryForwarded" = ranked.merged_carry_forwarded,
  rate = ranked.latest_rate,
  category = ranked.latest_category
FROM ranked
WHERE monthly.id = ranked.id
  AND ranked.row_number = 1;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "flavorId", year, month
      ORDER BY "createdAt" DESC, id DESC
    ) AS row_number
  FROM flavor_monthly
)
DELETE FROM flavor_monthly AS monthly
USING ranked
WHERE monthly.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS
  uq_flavor_monthly_flavor_year_month
ON flavor_monthly ("flavorId", year, month);

COMMIT;
