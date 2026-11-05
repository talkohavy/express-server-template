import type { Client } from 'pg';

export const FEATURE_FLAGS_TABLE_NAME = 'feature_flags';

export async function createFeatureFlagsTable(pgClient: Client): Promise<void> {
  await pgClient.query(featureFlagsTableSchema);
}

const featureFlagsTableSchema = `
CREATE TABLE IF NOT EXISTS public.${FEATURE_FLAGS_TABLE_NAME}
(
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;
