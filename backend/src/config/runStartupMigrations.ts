import { DataSource, type DataSourceOptions } from 'typeorm';

/**
 * Runs before TypeORM synchronize so production DBs can adopt schema changes
 * that synchronize cannot apply when rows already exist (e.g. nullable orderId).
 */
export async function runStartupMigrations(
  options: DataSourceOptions,
): Promise<void> {
  const dataSource = new DataSource({
    ...options,
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();

    const paymentsTable = await dataSource.query<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'payments'
       ) AS "exists"`,
    );

    if (paymentsTable[0]?.exists) {
      await dataSource.query(`
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS "partyOrderId" BIGINT;
      `);

      await dataSource.query(`
        ALTER TABLE payments
        ALTER COLUMN "orderId" DROP NOT NULL;
      `);

      await dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'FK_payments_partyOrderId'
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
      `);

      await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_payments_party_order_id
        ON payments ("partyOrderId");
      `);
    }

    const partyOrdersTable = await dataSource.query<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'party_orders'
       ) AS "exists"`,
    );

    if (partyOrdersTable[0]?.exists) {
      await dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_status_enum') THEN
            CREATE TYPE orders_status_enum AS ENUM (
              'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'
            );
          END IF;
        END $$;
      `);

      await dataSource.query(`
        ALTER TABLE party_orders
        ADD COLUMN IF NOT EXISTS "lineItems" jsonb;
      `);

      await dataSource.query(`
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
      `);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}
