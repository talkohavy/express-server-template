import { compareUsers } from './compareUsers';
import type { DatabaseUser } from '../../../../types';

function buildUser(overrides: Partial<DatabaseUser> = {}): DatabaseUser {
  const user: DatabaseUser = {
    id: '1',
    email: 'a@example.com',
    nickname: 'alice',
    hashed_password: 'hash',
    date_of_birth: 0,
    role: 'user' as DatabaseUser['role'],
    ...overrides,
  };

  return user;
}

describe('compareUsers', () => {
  it('treats users equal when comparable fields match even if ids differ', () => {
    const expectedResult = { isEqual: true, differingFields: [] };

    const actualResult = compareUsers({
      left: buildUser({ id: 'mongo-objectid' }),
      right: buildUser({ id: '42' }),
    });

    expect(actualResult).toEqual(expectedResult);
  });

  it('ignores fields absent from one store (date_of_birth / role not compared)', () => {
    const expectedResult = { isEqual: true, differingFields: [] };

    const actualResult = compareUsers({
      left: buildUser({ date_of_birth: 1990, role: 'admin' as DatabaseUser['role'] }),
      right: buildUser({ date_of_birth: undefined as any, role: undefined as any }),
    });

    expect(actualResult).toEqual(expectedResult);
  });

  it('reports the specific comparable field that diverges', () => {
    const expectedResult = { isEqual: false, differingFields: ['nickname'] };

    const actualResult = compareUsers({
      left: buildUser({ nickname: 'alice' }),
      right: buildUser({ nickname: 'bob' }),
    });

    expect(actualResult).toEqual(expectedResult);
  });

  it('flags existence divergence when only one side is present', () => {
    const expectedResult = { isEqual: false, differingFields: ['existence'] };

    const actualResult = compareUsers({ left: buildUser(), right: null });

    expect(actualResult).toEqual(expectedResult);
  });

  it('treats both-missing as equal', () => {
    const expectedResult = { isEqual: true, differingFields: [] };

    const actualResult = compareUsers({ left: null, right: null });

    expect(actualResult).toEqual(expectedResult);
  });
});
