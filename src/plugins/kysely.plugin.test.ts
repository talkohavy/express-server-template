import { createKyselyClient } from '@src/core/connections/kysely.connection';
import { ConfigKeys } from './config-service';
import { kyselyPlugin } from './kysely.plugin';
import type { Application } from 'express';

jest.mock('@src/core/connections/kysely.connection', () => ({
  createKyselyClient: jest.fn(),
}));

describe('kyselyPlugin', () => {
  const connectionString = 'postgres://user:pass@localhost:5432/test_db';
  const kyselyClient = { id: 'kysely-client' };

  function createApp(): Application {
    const app = {
      configService: {
        get: jest.fn().mockReturnValue({ connectionString }),
      },
    } as unknown as Application;

    return app;
  }

  beforeEach(() => {
    jest.mocked(createKyselyClient).mockReset();
    jest.mocked(createKyselyClient).mockReturnValue(kyselyClient as unknown as ReturnType<typeof createKyselyClient>);
  });

  it('attaches a Kysely client to app', () => {
    const app = createApp();

    kyselyPlugin(app);

    const expectedResult = kyselyClient;
    const actualResult = app.kysely;

    expect(actualResult).toEqual(expectedResult);
  });

  it('reads the postgres connection string from config', () => {
    const app = createApp();

    kyselyPlugin(app);

    expect(app.configService.get).toHaveBeenCalledWith(ConfigKeys.Postgres);
  });

  it('creates the Kysely client with the configured connection string', () => {
    const app = createApp();

    kyselyPlugin(app);

    expect(createKyselyClient).toHaveBeenCalledWith({ connectionString });
  });
});
