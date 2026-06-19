export function getUserCacheKey(userId: string): string {
  return `user:${userId}`;
}
