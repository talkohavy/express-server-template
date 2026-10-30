import { handleCors } from './handleCors';

function checkOrigin(props: { isStrict: boolean; origin: string | undefined }): boolean {
  const { isStrict, origin } = props;

  const originHandler = handleCors(isStrict);

  let isAllowed = false;
  originHandler(origin as string, (error: Error | null) => {
    isAllowed = error === null;
  });

  return isAllowed;
}

describe('handleCors', () => {
  it('should allow requests with no origin', () => {
    const actualResult = checkOrigin({ isStrict: true, origin: undefined });

    expect(actualResult).toBe(true);
  });

  it('should allow an exact allowed origin in strict mode', () => {
    const actualResult = checkOrigin({ isStrict: true, origin: 'http://localhost:3004' });

    expect(actualResult).toBe(true);
  });

  it('should reject a subdomain origin in strict mode', () => {
    const actualResult = checkOrigin({ isStrict: true, origin: 'https://preview.luckylove.co.il' });

    expect(actualResult).toBe(false);
  });

  it('should allow a subdomain origin in non-strict mode', () => {
    const actualResult = checkOrigin({ isStrict: false, origin: 'https://preview.luckylove.co.il' });

    expect(actualResult).toBe(true);
  });

  it('should reject an unknown origin in non-strict mode', () => {
    const actualResult = checkOrigin({ isStrict: false, origin: 'https://evil.com' });

    expect(actualResult).toBe(false);
  });
});
