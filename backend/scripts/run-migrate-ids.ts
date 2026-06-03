import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

function loadEnvFile(path: string) {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env optional if vars already exported
  }
}

async function main() {
  loadEnvFile(join(__dirname, '..', '.env'));

  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? 'ice_cream_franchise',
  });

  const sql = readFileSync(
    join(__dirname, 'migrate-uuid-to-identity.sql'),
    'utf8',
  );

  await client.connect();
  try {
    await client.query(sql);
    console.log('✅ UUID → identity migration finished');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
