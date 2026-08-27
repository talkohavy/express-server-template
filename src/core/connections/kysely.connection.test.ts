import { Kysely } from 'kysely';
import { createKyselyClient } from '@src/core/connections/kysely.connection';

describe('createKyselyClient', () => {
  it('returns a Kysely instance', async () => {
    const kyselyClient = createKyselyClient({
      connectionString: 'postgres://user:pass@localhost:5432/test_db',
    });

    expect(kyselyClient).toBeInstanceOf(Kysely);

    await kyselyClient.destroy();
  });
});
