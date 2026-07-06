import type { DatabaseUser } from '../../../../types';

/**
 * The ONLY fields that exist in BOTH stores today and can therefore be meaningfully
 * compared during shadow-read / reconciliation.
 *
 * Deliberately EXCLUDES:
 * - `id`  — store-local, always differs across stores (join on `email`, never `id`).
 * - `date_of_birth`, `role` — present in Postgres but absent from the Mongo schema.
 *   Comparing them would report permanent divergence and the convergence gate would
 *   never open. Widen this list only once both stores actually hold the field.
 */
export const COMPARABLE_USER_FIELDS: Array<keyof DatabaseUser> = ['email', 'nickname', 'hashed_password'];

export type UserComparison = {
  isEqual: boolean;
  /** Which comparable fields differ, plus 'existence' when one side is missing entirely. */
  differingFields: string[];
};

/**
 * Projection-aware, null-normalized equality over the intersecting field set.
 *
 * `undefined` and `null` are treated as the same "absent" value so that a store which
 * simply doesn't carry an (optional) field doesn't read as divergent. Values are
 * compared as strings to avoid `number` vs stringified-`number` false positives.
 */
export function compareUsers(props: { left: DatabaseUser | null; right: DatabaseUser | null }): UserComparison {
  const { left, right } = props;

  if (!left && !right) {
    const bothMissing: UserComparison = { isEqual: true, differingFields: [] };
    return bothMissing;
  }

  if (!left || !right) {
    const onlyOneSide: UserComparison = { isEqual: false, differingFields: ['existence'] };
    return onlyOneSide;
  }

  const differingFields: string[] = [];

  COMPARABLE_USER_FIELDS.forEach((field) => {
    const leftValue = normalize(left[field]);
    const rightValue = normalize(right[field]);

    if (leftValue !== rightValue) {
      differingFields.push(String(field));
    }
  });

  const comparison: UserComparison = { isEqual: differingFields.length === 0, differingFields };

  return comparison;
}

function normalize(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const normalized = String(value);

  return normalized;
}
