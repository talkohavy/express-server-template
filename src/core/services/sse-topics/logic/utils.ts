/**
 * The SET of topics a user is in: `sse:user:{userId}:topics`.
 */
export function getUserTopicsKey(userId: string): string {
  return `sse:user:${userId}:topics`;
}
