import { pickReadBackend } from './pickReadBackend';

describe('pickReadBackend', () => {
  it('always serves postgres once the read backend is postgres', () => {
    const expectedResult = 'postgres';

    const actualResult = pickReadBackend({ readBackend: 'postgres', canaryPercent: 0, key: 'a@b.com' });

    expect(actualResult).toEqual(expectedResult);
  });

  it('serves mongo when read backend is mongo and canary is 0', () => {
    const expectedResult = 'mongo';

    const actualResult = pickReadBackend({ readBackend: 'mongo', canaryPercent: 0, key: 'a@b.com' });

    expect(actualResult).toEqual(expectedResult);
  });

  it('serves postgres for everyone at 100% canary', () => {
    const expectedResult = 'postgres';

    const actualResult = pickReadBackend({ readBackend: 'mongo', canaryPercent: 100, key: 'a@b.com' });

    expect(actualResult).toEqual(expectedResult);
  });

  it('is sticky: the same key routes the same way across calls', () => {
    const firstCall = pickReadBackend({ readBackend: 'mongo', canaryPercent: 50, key: 'sticky@b.com' });
    const secondCall = pickReadBackend({ readBackend: 'mongo', canaryPercent: 50, key: 'sticky@b.com' });

    expect(actualToExpected(firstCall, secondCall)).toEqual(true);
  });

  it('falls back to the base backend when there is no key', () => {
    const expectedResult = 'mongo';

    const actualResult = pickReadBackend({ readBackend: 'mongo', canaryPercent: 50, key: undefined });

    expect(actualResult).toEqual(expectedResult);
  });
});

function actualToExpected(a: string, b: string): boolean {
  const areEqual = a === b;
  return areEqual;
}
