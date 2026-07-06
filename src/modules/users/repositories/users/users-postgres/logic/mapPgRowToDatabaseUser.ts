import type { DatabaseUser } from '../../../../types';

/**
 * Maps a raw Postgres row into the canonical {@link DatabaseUser} shape.
 *
 * The pg driver returns `id` as a JS `number`, but the canonical contract keeps
 * `id` as a `string` (see DatabaseUser). This is the single place that coercion
 * happens for the Postgres store — repositories return domain objects, never raw rows.
 */
export function mapPgRowToDatabaseUser(props: { row: Record<string, any> | undefined | null }): DatabaseUser | null {
  const { row } = props;

  if (!row) return null;

  const mappedUser: DatabaseUser = {
    ...(row as DatabaseUser),
    id: String(row.id),
  };

  return mappedUser;
}
