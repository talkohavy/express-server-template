export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach((pair) => {
    const [key, ...rest] = pair.trim().split('=');
    cookies[key!.trim()] = decodeURIComponent(rest.join('=').trim());
  });

  return cookies;
}
