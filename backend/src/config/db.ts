/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Pool } from 'pg';
import { normalizeDatabaseUrl } from './normalizeDatabaseUrl';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pool = new Pool({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
  user: process.env.DB_USERNAME ?? process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  ssl:
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
});

export default pool;
