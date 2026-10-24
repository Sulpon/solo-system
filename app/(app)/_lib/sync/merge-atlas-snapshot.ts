import type { AtlasSnapshot } from "../atlas-snapshot";
import { STORAGE_KEYS } from "../storage-keys";
import { applyTombstonesToEntities, compactTombstones, type IdEntity, isIdEntityArray, parseTombstones, serializeTombstones } from "./deletion-tombstones";

// The core Milestone 4 conflict-resolution step: given the local snapshot
// (may contain edits never yet pushed) and a freshly-pulled remote snapshot
// (may contain another client's edits since our last sync), produce ONE
// merged snapshot that is safe to push as the new authoritative version.
//
// Reused convention, not a hardcoded key list: every "menace-*" collection
// in this app already stores an array of plain objects with a stable `id`
// (Quest, GoalNode, Note, ChecklistTemplate, ...), most also carrying
// `updatedAt` - see quest.ts/goal-tree.ts/note.ts. Rather than maintaining a
// list of "which keys are collections" here (which would silently go stale
// as new features add their own menace-* key), this merges ANY key whose
// value parses as an array of {id: ...} objects by id - automatically
// covering every current and future collection without per-feature code.
//
// What this does NOT do (the "safest minimal versioned snapshot strategy,
// explicitly documented" the spec asks for when full per-entity resolution
// isn't practical for every shape of data):
// - Non-collection keys (singletons like appearance settings, dashboard
//   layout) have no reliable per-key timestamp to compare, so a genuine
//   simultaneous edit to the SAME singleton key on two clients resolves by
//   preferring the remote (already-committed-elsewhere) value - the local
//   edit to that one key is lost. This never applies to Quest/Goal/Note/etc
//   data, only to whole-value preference/settings blobs.
//
// DELETIONS are handled, and are the one case the id-union above cannot
// resolve on its own: an entity missing from one side is indistinguishable
// from an entity newly created on the other. A deletion therefore records a
// durable tombstone, which merges through this very function (the registry
// is itself an array of {id, updatedAt}) and is then applied to every
// collection below. The full conflict model lives in
// ./deletion-tombstones.ts - read that first.
//
// A snapshot from before tombstones existed simply has no registry key, so
// it merges exactly as it always did.
export function mergeAtlasSnapshots(local: AtlasSnapshot, remote: AtlasSnapshot): AtlasSnapshot {
  const merged: AtlasSnapshot = {};
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const key of allKeys) {
    const localRaw = local[key];
    const remoteRaw = remote[key];

    if (localRaw === undefined) {
      merged[key] = remoteRaw;
      continue;
    }

    if (remoteRaw === undefined) {
      merged[key] = localRaw;
      continue;
    }

    if (localRaw === remoteRaw) {
      merged[key] = localRaw;
      continue;
    }

    merged[key] = mergeValue(localRaw, remoteRaw);
  }

  return applyDeletions(merged);
}

// Second pass: the id-union above has already reunited both sides' view of
// every collection, INCLUDING the tombstone registry. Now subtract what the
// registry says is gone.
//
// Runs after the union rather than inside it because a tombstone recorded on
// one device must be able to delete an entity contributed by the other, and
// only the merged registry knows about both.
function applyDeletions(merged: AtlasSnapshot): AtlasSnapshot {
  const tombstones = parseTombstones(merged[STORAGE_KEYS.deletionTombstones]);

  if (tombstones.length === 0) {
    return merged;
  }

  const obsoleteIds = new Set<string>();

  for (const key of Object.keys(merged)) {
    if (key === STORAGE_KEYS.deletionTombstones) {
      continue;
    }

    const parsed = safeParse(merged[key]);

    if (!parsed.ok || !isIdEntityArray(parsed.value)) {
      continue;
    }

    const { entities, obsoleteIds: obsolete } = applyTombstonesToEntities(key, parsed.value, tombstones);
    obsolete.forEach((id) => obsoleteIds.add(id));

    // Only rewrite a collection that actually changed, so merging an
    // already-merged snapshot is byte-for-byte stable and cannot keep
    // re-triggering a sync.
    if (entities.length !== parsed.value.length) {
      merged[key] = JSON.stringify(entities);
    }
  }

  // Retire tombstones for entities that were deliberately recreated, then
  // forget whatever is old enough to be safe to forget.
  const surviving = compactTombstones(tombstones.filter((tombstone) => !obsoleteIds.has(tombstone.id)));

  if (surviving.length !== tombstones.length) {
    merged[STORAGE_KEYS.deletionTombstones] = serializeTombstones(surviving);
  }

  return merged;
}

function mergeValue(localRaw: string, remoteRaw: string): string {
  const localParsed = safeParse(localRaw);
  const remoteParsed = safeParse(remoteRaw);

  if (localParsed.ok && !remoteParsed.ok) {
    return localRaw;
  }

  if (!localParsed.ok && remoteParsed.ok) {
    return remoteRaw;
  }

  if (!localParsed.ok || !remoteParsed.ok) {
    // Neither side parses - nothing safe to merge structurally; prefer
    // remote (the already-committed, presumably-valid cloud copy) over a
    // value we can't even inspect.
    return remoteRaw;
  }

  if (isIdEntityArray(localParsed.value) && isIdEntityArray(remoteParsed.value)) {
    return JSON.stringify(mergeIdEntityArrays(localParsed.value, remoteParsed.value));
  }

  // Not a mergeable collection shape - see the documented limitation above.
  return remoteRaw;
}

function safeParse(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function mergeIdEntityArrays(localArr: IdEntity[], remoteArr: IdEntity[]): IdEntity[] {
  const remoteById = new Map(remoteArr.map((item) => [item.id, item]));
  const seenIds = new Set<string | number>();
  const merged: IdEntity[] = [];

  for (const localItem of localArr) {
    seenIds.add(localItem.id);
    const remoteItem = remoteById.get(localItem.id);
    merged.push(remoteItem ? pickNewerEntity(localItem, remoteItem) : localItem);
  }

  for (const remoteItem of remoteArr) {
    if (!seenIds.has(remoteItem.id)) {
      merged.push(remoteItem);
    }
  }

  return merged;
}

function pickNewerEntity(local: IdEntity, remote: IdEntity): IdEntity {
  const localUpdatedAt = typeof local.updatedAt === "string" ? local.updatedAt : null;
  const remoteUpdatedAt = typeof remote.updatedAt === "string" ? remote.updatedAt : null;

  if (localUpdatedAt && remoteUpdatedAt) {
    return localUpdatedAt > remoteUpdatedAt ? local : remote;
  }

  if (localUpdatedAt && !remoteUpdatedAt) {
    return local;
  }

  if (!localUpdatedAt && remoteUpdatedAt) {
    return remote;
  }

  // Neither side carries a comparable timestamp for this entity - documented
  // deterministic tiebreak, matching mergeValue's non-collection fallback.
  return remote;
}
