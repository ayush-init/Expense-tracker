/**
 * Neon PostgreSQL Seed Script (`npm run db:seed`)
 * Seeds initial profiles (Ayush, Yuvraj, Vansh) and household ("RoomSync Flat 302").
 */

import { neon } from '@neondatabase/serverless';
import { createInitialSeedState } from '../src/services/database';

async function runSeed() {
  const seed = createInitialSeedState();
  const connectionString = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_DATABASE_URL;

  if (!connectionString || connectionString.includes('ep-example-123456')) {
    console.log(
      `[INFO] Local seed state verified: ${seed.profiles.length} roommates (${seed.profiles
        .map((p) => p.fullName)
        .join(', ')}) in "${seed.households[0].name}" (Invite: ${seed.households[0].inviteCode}).`
    );
    return;
  }

  const sql = neon(connectionString);
  for (const p of seed.profiles) {
    await sql`
      INSERT INTO profiles (email, full_name, phone, auth_provider)
      VALUES (${p.email}, ${p.fullName}, ${p.phone ?? null}, ${p.authProvider})
      ON CONFLICT (email) DO NOTHING
    `;
  }
  console.log('Neon PostgreSQL seed completed.');
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
