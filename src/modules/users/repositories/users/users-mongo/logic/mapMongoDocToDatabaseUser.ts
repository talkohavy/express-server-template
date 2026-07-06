import type { DatabaseUser } from '../../../../types';

/**
 * Maps a raw Mongo (lean) document into the canonical {@link DatabaseUser} shape.
 *
 * Mongo stores the identifier as `_id` (an ObjectId). The canonical contract uses a
 * string `id`, so this is the single place we bridge `_id` → `id` for the Mongo store.
 *
 * NOTE: the current Mongo user schema only holds `email`, `hashed_password` and
 * `nickname` — it has NO `date_of_birth` / `role`. Those come back `undefined` here,
 * which is exactly why the shadow-read comparator must be projection-aware and only
 * compare the field set that BOTH stores actually hold.
 */
export function mapMongoDocToDatabaseUser(props: { doc: Record<string, any> | undefined | null }): DatabaseUser | null {
  const { doc } = props;

  if (!doc) return null;

  const { _id, ...rest } = doc;

  const mappedUser = {
    ...rest,
    id: String(_id),
  } as DatabaseUser;

  return mappedUser;
}
