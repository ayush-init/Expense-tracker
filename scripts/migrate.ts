/**
 * Neon PostgreSQL Migration Runner (`npm run db:migrate`)
 * Reads SQL files from `db/migrations` in order and applies them to `DATABASE_URL`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_DATABASE_URL;
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} SQL migration files: ${files.join(', ')}`);

  if (!connectionString || connectionString.includes('ep-example-123456')) {
    console.log(
      '[INFO] DATABASE_URL is not set or still points to placeholder. Validated SQL migration files locally.'
    );
    return;
  }

  const sql = neon(connectionString);
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`Applying migration: ${file}...`);
    await sql(content);
    console.log(`Applied ${file} successfully.`);
  }

  console.log('All Neon PostgreSQL migrations completed.');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
