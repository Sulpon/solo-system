import type { AtlasSnapshot } from "../atlas-snapshot";

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
// - There are no deletion tombstones. Deleting an item on one device while
//   another device still has unsynced edits from before the deletion can
//   cause the merge to "resurrect" the deleted item (it looks, structurally,
//   identical to "a new item only one side knows about"). This is the
//   documented limitation section 6 of the Milestone 4 spec invites instead
//   of a full event-sourcing rewrite - see the Milestone 4 report.
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

type IdEntity = Readonly<{ id: string | number; updatedAt?: unknown; [key: string]: unknown }>;

function isIdEntityArray(value: unknown): value is IdEntity[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "object" && item !== null && !Array.isArray(item) && ("id" in item) && (typeof (item as { id: unknown }).id === "string" || typeof (item as { id: unknown }).id === "number"),
    )
  );
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
