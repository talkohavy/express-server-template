import { hashToken } from './hashToken';

describe('hashToken', () => {
  it('should return the hex SHA-256 of the token', () => {
    const expectedResult = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

    const actualResult = hashToken('hello');

    expect(actualResult).toBe(expectedResult);
  });

  it('should return the same hash for the same token', () => {
    const firstHash = hashToken('some-refresh-token');

    const secondHash = hashToken('some-refresh-token');

    expect(secondHash).toBe(firstHash);
  });

  it('should return different hashes for different tokens', () => {
    const firstHash = hashToken('token-a');

    const secondHash = hashToken('token-b');

    expect(secondHash).not.toBe(firstHash);
  });
});
