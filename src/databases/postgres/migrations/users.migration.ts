import type { Client } from 'pg';

export const USERS_TABLE_NAME = 'users';

export async function createUsersTable(pgClient: Client): Promise<void> {
  await pgClient.query(usersTableSchema);
}

const usersTableSchema = `
  CREATE TABLE IF NOT EXISTS public.${USERS_TABLE_NAME}
  (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(255),
    hashed_password VARCHAR(255) NOT NULL,
    date_of_birth BIGINT,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;
