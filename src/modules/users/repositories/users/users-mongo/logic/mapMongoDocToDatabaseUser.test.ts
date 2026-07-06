import { mapMongoDocToDatabaseUser } from './mapMongoDocToDatabaseUser';

describe('mapMongoDocToDatabaseUser', () => {
  it('bridges the ObjectId _id into a string id', () => {
    const expectedResult = '507f1f77bcf86cd799439011';

    const objectIdLike = { toString: () => '507f1f77bcf86cd799439011' };
    const mapped = mapMongoDocToDatabaseUser({ doc: { _id: objectIdLike, email: 'a@b.com' } });
    const actualResult = mapped?.id;

    expect(actualResult).toEqual(expectedResult);
  });

  it('drops _id and keeps the remaining fields', () => {
    const expectedResult = { id: '1', email: 'a@b.com', nickname: 'alice' };

    const actualResult = mapMongoDocToDatabaseUser({ doc: { _id: '1', email: 'a@b.com', nickname: 'alice' } });

    expect(actualResult).toEqual(expectedResult);
  });

  it('returns null for a missing doc', () => {
    const expectedResult = null;

    const actualResult = mapMongoDocToDatabaseUser({ doc: null });

    expect(actualResult).toEqual(expectedResult);
  });
});
