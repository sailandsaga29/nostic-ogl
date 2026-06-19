-- Run once on production when Render fails with:
-- "column orderId of relation payments contains null values"
--
-- Safe to re-run (idempotent).

ALTER TABLE payments ADD COLUMN IF NOT EXISTS "partyOrderId" BIGINT;

ALTER TABLE payments ALTER COLUMN "orderId" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_payments_partyOrderId'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT "FK_payments_partyOrderId"
      FOREIGN KEY ("partyOrderId")
      REFERENCES party_orders(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_party_order_id ON payments ("partyOrderId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_status_enum') THEN
    CREATE TYPE orders_status_enum AS ENUM (
      'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'
    );
  END IF;
END $$;

ALTER TABLE party_orders ADD COLUMN IF NOT EXISTS "lineItems" jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'party_orders'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE party_orders
      ADD COLUMN status orders_status_enum NOT NULL DEFAULT 'COMPLETED';
  END IF;
END $$;
