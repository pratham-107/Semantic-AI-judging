import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set in environment.');
    process.exit(1);
  }

  console.log(' Connecting to Supabase PostgreSQL database...');
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const timeRes = await pool.query('SELECT NOW() as current_time');
    console.log(' Connection established! Database time:', timeRes.rows[0].current_time);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log(' Running schema migrations...');
    await pool.query(sql);
    console.log(' Schema tables created / verified successfully in Supabase!');

    const tableRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(' Live tables in public schema:', tableRes.rows.map((r) => r.table_name));

    await pool.end();
    console.log('🎉 Supabase is fully configured and ready!');
  } catch (err: unknown) {
    console.error('❌ Migration failed:', (err as Error).message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
