import { RoleTypes } from '@src/common/constants';
import type { RoleTypeValues } from '@src/common/constants';

const ROLE_RANK: Record<RoleTypeValues, number> = {
  [RoleTypes.Guest]: 0,
  [RoleTypes.User]: 1,
  [RoleTypes.Admin]: 2,
};

/**
 * Returns true if `role` meets or exceeds `minRole`.
 * A missing `minRole` means "no restriction" -> always allowed.
 */
export function isRoleAllowed(role: RoleTypeValues, minRole?: RoleTypeValues): boolean {
  if (!minRole) return true;

  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
