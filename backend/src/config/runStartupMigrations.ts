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

    const monthlyTable = await dataSource.query<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'flavor_monthly'
       ) AS "exists"`,
    );
    const flavorsTable = await dataSource.query<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'flavors'
       ) AS "exists"`,
    );

    if (monthlyTable[0]?.exists && flavorsTable[0]?.exists) {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.query(
          'LOCK TABLE flavor_monthly IN SHARE ROW EXCLUSIVE MODE',
        );
        await queryRunner.query(`
          WITH ranked AS (
            SELECT
              id,
              ROW_NUMBER() OVER (
                PARTITION BY "flavorId", year, month
                ORDER BY "createdAt" ASC, id ASC
              ) AS row_number,
              COUNT(*) OVER (
                PARTITION BY "flavorId", year, month
              ) AS duplicate_count,
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
            AND ranked.row_number = 1
            AND ranked.duplicate_count > 1;
        `);
        await queryRunner.query(`
          WITH ranked AS (
            SELECT
              id,
              ROW_NUMBER() OVER (
                PARTITION BY "flavorId", year, month
                ORDER BY "createdAt" ASC, id ASC
              ) AS row_number
            FROM flavor_monthly
          )
          DELETE FROM flavor_monthly AS monthly
          USING ranked
          WHERE monthly.id = ranked.id
            AND ranked.row_number > 1;
        `);
        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS
            uq_flavor_monthly_flavor_year_month
          ON flavor_monthly ("flavorId", year, month);
        `);
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    if (flavorsTable[0]?.exists) {
      await dataSource.query(`
        ALTER TABLE flavors
        ADD COLUMN IF NOT EXISTS "memberPrice" DOUBLE PRECISION;
      `);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}
