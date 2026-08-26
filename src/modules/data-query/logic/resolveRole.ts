import { RoleTypes } from '@src/common/constants';
import type { RoleTypeValues } from '@src/common/constants';

const VALID_ROLES = new Set<string>(Object.values(RoleTypes));

/**
 * Resolves an (untrusted / possibly absent) role string from `req.user` into
 * a known RoleTypeValues, defaulting to the least-privileged role.
 */
export function resolveRole(role: string | undefined): RoleTypeValues {
  if (role && VALID_ROLES.has(role)) return role as RoleTypeValues;

  return RoleTypes.Guest;
}
