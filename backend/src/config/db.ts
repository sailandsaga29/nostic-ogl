/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Pool } from 'pg';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

export default pool;
