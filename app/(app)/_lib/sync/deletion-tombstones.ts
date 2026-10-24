// Durable deletion records, so deleting something on one device actually
// deletes it everywhere instead of being silently undone.
//
// THE BUG THIS EXISTS TO FIX
//
// mergeAtlasSnapshots merges every menace-* collection by id and keeps any
// entity that exists on only one side. That is correct for a creation and
// catastrophic for a deletion: to a structural merge, "device A deleted
// quest Q" and "device B created quest Q" look exactly the same - one side
// has it, the other does not. Deletion therefore always lost, and the
// quest came back on the next sync or reload.
//
// An absence cannot be distinguished from a never-existed. So a deletion
// has to leave something behind that says so. That is a tombstone.
//
// WHY TOMBSTONES ARE THEMSELVES A menace-* COLLECTION
//
// The registry is stored at STORAGE_KEYS.deletionTombstones as an array of
// objects carrying `id` and `updatedAt` - deliberately the exact shape the
// existing generic merge already understands. That means tombstones travel
// in the cloud snapshot and merge between devices through the same code
// path as everything else, with no special case in the transport, and the
// union semantics that are wrong for entities are exactly right here: a
// tombstone known to either side must survive.
//
// The synthetic `id` is `<collection>\0<entityId>`, which makes a tombstone
// unique per (collection, entity) so the generic merge dedupes them
// naturally, and `updatedAt` mirrors `deletedAt` so that when both sides
// hold a tombstone for the same entity, the generic newest-wins tiebreak
// keeps the later deletion.
//
// CONFLICT RESOLUTION: EDIT vs DELETE
//
// When a merged collection still contains an entity that has a tombstone,
// one of two things happened, and the timestamps say which:
//
//   deletedAt >= entity.updatedAt  -> the deletion is the newer intent.
//                                     Drop the entity. This is the normal
//                                     case and the one that fixes the bug.
//
//   entity.updatedAt > deletedAt   -> someone edited this entity AFTER it
//                                     was deleted, which can only mean it
//                                     was deliberately brought back. Keep
//                                     the entity and retire the tombstone,
//                                     so the resurrection is not undone on
//                                     the next merge.
//
//   no entity.updatedAt            -> nothing can prove the edit is newer,
//                                     so the deletion wins. Collections
//                                     without timestamps (Category, for
//                                     one) rely on this, and it fails in
//                                     the safe direction: a wrongly
//                                     deleted entity can be recreated, a
//                                     wrongly resurrected one keeps coming
//                                     back with no way to remove it.
//
// Every rule above is a total order over values that are already present,
// so two devices merging the same pair of snapshots always reach the same
// result regardless of which one runs first.

import { STORAGE_KEYS } from "../storage-keys";

export const TOMBSTONE_ID_SEPARATOR = "\u0000";

// How long a deletion is remembered. A device that has been offline longer
// than this, and still holds the deleted entity, will resurrect it on
// reconnect - that is the honest cost of not keeping deletions forever, and
// the window is deliberately wide enough that it takes months of
// disconnection to reach.
export const TOMBSTONE_RETENTION_DAYS = 180;

// A hard ceiling so a pathological delete loop cannot grow the synced
// snapshot without bound. Only ever trims the OLDEST records, and only once
// the registry is past this size.
export const MAX_TOMBSTONES = 5000;

export type Tombstone = Readonly<{
  id: string;
  collection: string;
  entityId: string;
  deletedAt: string;
  // Mirrors deletedAt purely so the generic entity merge, which knows
  // nothing about tombstones, resolves duplicates newest-first.
  updatedAt: string;
}>;

export function makeTombstoneId(collection: string, entityId: string | number): string {
  return `${collection}${TOMBSTONE_ID_SEPARATOR}${String(entityId)}`;
}

export function createTombstone(collection: string, entityId: string | number, deletedAt = new Date().toISOString()): Tombstone {
  return {
    id: makeTombstoneId(collection, entityId),
    collection,
    entityId: String(entityId),
    deletedAt,
    updatedAt: deletedAt,
  };
}

// Anything that is not a well-formed tombstone is dropped rather than
// repaired. A malformed registry must never throw on a sync path, and a
// record missing its collection or timestamp cannot be acted on anyway.
export function parseTombstones(raw: string | null | undefined): Tombstone[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const valid: Tombstone[] = [];

  for (const item of parsed) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }

    const candidate = item as Partial<Tombstone>;

    if (typeof candidate.collection !== "string" || candidate.collection.length === 0) {
      continue;
    }

    if (typeof candidate.entityId !== "string" || typeof candidate.deletedAt !== "string") {
      continue;
    }

    valid.push({
      id: typeof candidate.id === "string" && candidate.id.length > 0 ? candidate.id : makeTombstoneId(candidate.collection, candidate.entityId),
      collection: candidate.collection,
      entityId: candidate.entityId,
      deletedAt: candidate.deletedAt,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : candidate.deletedAt,
    });
  }

  return valid;
}

export function serializeTombstones(tombstones: ReadonlyArray<Tombstone>): string {
  return JSON.stringify(tombstones);
}

// Union, keeping the latest deletion per (collection, entity). Never drops
// a record known to one side only - that is the whole point of the
// registry.
export function mergeTombstoneLists(a: ReadonlyArray<Tombstone>, b: ReadonlyArray<Tombstone>): Tombstone[] {
  const byId = new Map<string, Tombstone>();

  for (const tombstone of [...a, ...b]) {
    const existing = byId.get(tombstone.id);

    if (!existing || tombstone.deletedAt > existing.deletedAt) {
      byId.set(tombstone.id, tombstone);
    }
  }

  return [...byId.values()];
}

// Trims only what is provably safe to forget: records older than the
// retention window, and then - only if the registry is still over the hard
// ceiling - the oldest of what remains. Recent deletions are never
// discarded to satisfy the cap, because those are exactly the ones an
// offline client still needs.
export function compactTombstones(tombstones: ReadonlyArray<Tombstone>, now = new Date()): Tombstone[] {
  const cutoff = new Date(now.getTime() - TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const retained = tombstones.filter((tombstone) => tombstone.deletedAt >= cutoff);

  if (retained.length <= MAX_TOMBSTONES) {
    return retained;
  }

  return [...retained].sort((left, right) => (left.deletedAt < right.deletedAt ? 1 : -1)).slice(0, MAX_TOMBSTONES);
}

export type IdEntity = Readonly<{ id: string | number; updatedAt?: unknown; [key: string]: unknown }>;

export type TombstoneApplication = Readonly<{
  entities: IdEntity[];
  // Tombstones that this collection proved obsolete, because the entity
  // carries a strictly newer edit. Retiring them is what makes a deliberate
  // recreation stick instead of being deleted again next merge.
  obsoleteIds: ReadonlyArray<string>;
}>;

// Removes every entity whose deletion is newer than its last edit. See the
// conflict table at the top of this file.
export function applyTombstonesToEntities(collection: string, entities: ReadonlyArray<IdEntity>, tombstones: ReadonlyArray<Tombstone>): TombstoneApplication {
  const relevant = new Map<string, Tombstone>();

  for (const tombstone of tombstones) {
    if (tombstone.collection === collection) {
      relevant.set(tombstone.entityId, tombstone);
    }
  }

  if (relevant.size === 0) {
    return { entities: entities as IdEntity[], obsoleteIds: [] };
  }

  const kept: IdEntity[] = [];
  const obsoleteIds: string[] = [];

  for (const entity of entities) {
    const tombstone = relevant.get(String(entity.id));

    if (!tombstone) {
      kept.push(entity);
      continue;
    }

    const updatedAt = typeof entity.updatedAt === "string" ? entity.updatedAt : null;

    if (updatedAt && updatedAt > tombstone.deletedAt) {
      // Edited after it was deleted - a deliberate recreation wins.
      kept.push(entity);
      obsoleteIds.push(tombstone.id);
      continue;
    }

    // Deletion wins. The entity is dropped.
  }

  return { entities: kept, obsoleteIds };
}

// Which ids disappeared between two versions of the same collection.
// Returns an empty list for anything that is not a pair of id-bearing
// arrays, so singleton/settings keys never generate tombstones.
export function findRemovedEntityIds(previous: unknown, next: unknown): string[] {
  if (!isIdEntityArray(previous) || !isIdEntityArray(next)) {
    return [];
  }

  const nextIds = new Set(next.map((entity) => String(entity.id)));

  return previous.map((entity) => String(entity.id)).filter((id) => !nextIds.has(id));
}

export function findPresentEntityIds(next: unknown): string[] {
  if (!isIdEntityArray(next)) {
    return [];
  }

  return next.map((entity) => String(entity.id));
}

// Writes tombstones for everything that disappeared between two versions
// of a collection.
//
// Lives here rather than in the storage hook because deletion does not only
// happen through the hook: clearing a collection from Settings removes the
// key outright. Any such path has to call this, or the cloud simply refills
// what was cleared on the next merge - a missing key is indistinguishable
// from a key this device never had.
//
// Safe to call with anything: a value that is not a pair of id-bearing
// arrays records nothing.
export function recordCollectionDeletions(key: string, previousRaw: string | null, next: unknown): void {
  if (key === STORAGE_KEYS.deletionTombstones) {
    return;
  }

  let previous: unknown;

  try {
    previous = previousRaw === null ? null : JSON.parse(previousRaw);
  } catch {
    // An unreadable previous value cannot prove anything was deleted.
    return;
  }

  const removedIds = findRemovedEntityIds(previous, next);
  // An id written back after having been deleted is a deliberate
  // recreation, so its tombstone has to go - otherwise the next merge would
  // delete it all over again.
  const revivedIds = new Set(findPresentEntityIds(next).map((id) => makeTombstoneId(key, id)));

  if (removedIds.length === 0 && revivedIds.size === 0) {
    return;
  }

  const existing = parseTombstones(window.localStorage.getItem(STORAGE_KEYS.deletionTombstones));
  const kept = existing.filter((tombstone) => !revivedIds.has(tombstone.id));

  if (removedIds.length === 0 && kept.length === existing.length) {
    return;
  }

  const deletedAt = new Date().toISOString();
  const updated = mergeTombstoneLists(
    kept,
    removedIds.map((id) => createTombstone(key, id, deletedAt)),
  );

  window.localStorage.setItem(STORAGE_KEYS.deletionTombstones, serializeTombstones(updated));
}

export function isIdEntityArray(value: unknown): value is IdEntity[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        !Array.isArray(item) &&
        "id" in item &&
        (typeof (item as { id: unknown }).id === "string" || typeof (item as { id: unknown }).id === "number"),
    )
  );
}
