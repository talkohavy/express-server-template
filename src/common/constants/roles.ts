export const RoleTypes = {
  Guest: 'guest',
  User: 'user',
  Admin: 'admin',
} as const;

export type RoleTypeValues = (typeof RoleTypes)[keyof typeof RoleTypes];

export const VALID_ROLES = new Set<string>(Object.values(RoleTypes));
