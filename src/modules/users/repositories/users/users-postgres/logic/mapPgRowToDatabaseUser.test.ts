import { mapPgRowToDatabaseUser } from './mapPgRowToDatabaseUser';

describe('mapPgRowToDatabaseUser', () => {
  it('coerces the numeric pg id into a string id', () => {
    const expectedResult = '42';

    const mapped = mapPgRowToDatabaseUser({ row: { id: 42, email: 'a@b.com' } });
    const actualResult = mapped?.id;

    expect(actualResult).toEqual(expectedResult);
  });

  it('preserves the other fields verbatim', () => {
    const expectedResult = { id: '42', email: 'a@b.com', nickname: 'alice' };

    const actualResult = mapPgRowToDatabaseUser({ row: { id: 42, email: 'a@b.com', nickname: 'alice' } });

    expect(actualResult).toEqual(expectedResult);
  });

  it('returns null for a missing row', () => {
    const expectedResult = null;

    const actualResult = mapPgRowToDatabaseUser({ row: undefined });

    expect(actualResult).toEqual(expectedResult);
  });
});
