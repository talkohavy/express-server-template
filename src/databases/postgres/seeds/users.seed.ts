import { USERS_TABLE_NAME } from '../migrations';
import type { Client } from 'pg';

const DUMMY_USERS = [
  { email: 'john.doe@example.com', nickname: 'johnd', dateOfBirth: 631152000000 },
  { email: 'jane.smith@example.com', nickname: 'janes', dateOfBirth: 662688000000 },
  { email: 'mike.wilson@example.com', nickname: 'mikew', dateOfBirth: 694224000000 },
  { email: 'sarah.johnson@example.com', nickname: 'sarahj', dateOfBirth: 725846400000 },
  { email: 'david.brown@example.com', nickname: 'davidb', dateOfBirth: 757382400000 },
  { email: 'emily.davis@example.com', nickname: 'emilyd', dateOfBirth: 788918400000 },
  { email: 'chris.miller@example.com', nickname: 'chrism', dateOfBirth: 820454400000 },
  { email: 'lisa.garcia@example.com', nickname: 'lisag', dateOfBirth: 852076800000 },
  { email: 'james.martinez@example.com', nickname: 'jamesm', dateOfBirth: 883612800000 },
  { email: 'anna.rodriguez@example.com', nickname: 'annar', dateOfBirth: 915148800000 },
  { email: 'robert.taylor@example.com', nickname: 'robertt', dateOfBirth: 631152000000 },
  { email: 'maria.anderson@example.com', nickname: 'mariaa', dateOfBirth: 662688000000 },
  { email: 'kevin.thomas@example.com', nickname: 'kevint', dateOfBirth: 694224000000 },
  { email: 'jennifer.jackson@example.com', nickname: 'jenniferj', dateOfBirth: 725846400000 },
  { email: 'william.white@example.com', nickname: 'williamw', dateOfBirth: 757382400000 },
  { email: 'amanda.harris@example.com', nickname: 'amandah', dateOfBirth: 788918400000 },
  { email: 'daniel.clark@example.com', nickname: 'danielc', dateOfBirth: 820454400000 },
  { email: 'jessica.lewis@example.com', nickname: 'jessical', dateOfBirth: 852076800000 },
  { email: 'matthew.walker@example.com', nickname: 'mattheww', dateOfBirth: 883612800000 },
  { email: 'ashley.hall@example.com', nickname: 'ashleyh', dateOfBirth: 915148800000 },
] as const;

/**
 * A dummy hashed password for seed users.
 * Raw password for login is: 1111
 * In production, each user would have their own unique hashed password.
 */
const SEED_HASHED_PASSWORD =
  'seed:42c5d754f315b8a4b17728da6106d843a4dd53c888a2d00f6f0a303ec138beb650ccf5a5b4c7787b2e03e198966a3081f537985c38d5f8d12901b4566a9b671f';

export type SeedUsersOptions = {
  /**
   * If true, skips seeding if users already exist. Default: true
   */
  skipIfExists?: boolean;
  /**
   * If true, clears existing users before seeding. Default: false
   */
  clearBeforeSeeding?: boolean;
};

/**
 * Seeds the users table with 20 dummy users.
 * Ensures the table exists before seeding.
 */
export async function seedUsers(pgClient: Client, options: SeedUsersOptions = {}): Promise<number> {
  const { skipIfExists = true, clearBeforeSeeding = false } = options;

  // Check if users already exist
  if (skipIfExists && !clearBeforeSeeding) {
    const existingCount = await getUserCount(pgClient);
    if (existingCount > 0) {
      console.log(`⏭️  Skipping users seed: ${existingCount} users already exist`);
      return 0;
    }
  }

  // Clear existing users if requested
  if (clearBeforeSeeding) {
    await pgClient.query(`DELETE FROM ${USERS_TABLE_NAME}`);
    console.log('🗑️  Cleared existing users');
  }

  // Insert dummy users
  const insertedCount = await insertDummyUsers(pgClient);
  console.log(`🌱 Seeded ${insertedCount} users successfully`);

  return insertedCount;
}

async function getUserCount(pgClient: Client): Promise<number> {
  const result = await pgClient.query(`SELECT COUNT(*) FROM ${USERS_TABLE_NAME}`);

  return Number.parseInt(result.rows[0].count, 10);
}

async function insertDummyUsers(pgClient: Client): Promise<number> {
  const insertQuery = `
    INSERT INTO ${USERS_TABLE_NAME} (email, hashed_password, nickname, date_of_birth, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING
  `;

  let insertedCount = 0;

  for (const user of DUMMY_USERS) {
    const result = await pgClient.query(insertQuery, [
      user.email,
      SEED_HASHED_PASSWORD,
      user.nickname,
      user.dateOfBirth,
    ]);
    if (result.rowCount && result.rowCount > 0) {
      insertedCount++;
    }
  }

  return insertedCount;
}
