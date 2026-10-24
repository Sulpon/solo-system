import { beforeEach, describe, expect, it } from "vitest";
import { applyAtlasSnapshot, collectAtlasSnapshot, type AtlasSnapshot } from "../../atlas-snapshot";
import { mergeAtlasSnapshots } from "../merge-atlas-snapshot";
import { compactTombstones, createTombstone, MAX_TOMBSTONES, parseTombstones, serializeTombstones, TOMBSTONE_RETENTION_DAYS } from "../deletion-tombstones";
import { STORAGE_KEYS } from "../../storage-keys";

// The regression this file exists for: a deleted quest came back.
//
// These drive the REAL merge engine the sync store calls, with snapshots
// shaped exactly like the ones that travel to Supabase, so a change that
// reintroduces resurrection fails here rather than in production.

const QUEST_A = { id: "A", title: "Quest A" };
const QUEST_B = { id: "B", title: "Quest B" };
const QUEST_C = { id: "C", title: "Quest C" };

const QUESTS = STORAGE_KEYS.questList;
const TOMBSTONES = STORAGE_KEYS.deletionTombstones;

function snapshotOf(quests: ReadonlyArray<object>, tombstones: ReadonlyArray<object> = []): AtlasSnapshot {
  const snapshot: AtlasSnapshot = { [QUESTS]: JSON.stringify(quests) };

  if (tombstones.length > 0) {
    snapshot[TOMBSTONES] = JSON.stringify(tombstones);
  }

  return snapshot;
}

function questIdsIn(snapshot: AtlasSnapshot): string[] {
  return JSON.parse(snapshot[QUESTS] ?? "[]").map((quest: { id: string }) => quest.id);
}

function localQuestIds(): string[] {
  return JSON.parse(window.localStorage.getItem(QUESTS) ?? "[]").map((quest: { id: string }) => quest.id);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("local deletion versus an older remote snapshot", () => {
  it("does not resurrect a quest this device deleted", () => {
    const local = snapshotOf([QUEST_A, QUEST_C], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);
    const remote = snapshotOf([QUEST_A, QUEST_B, QUEST_C]);

    expect(questIdsIn(mergeAtlasSnapshots(local, remote))).toEqual(["A", "C"]);
  });

  it("carries the tombstone into the merged snapshot, so the cloud learns about the deletion", () => {
    const local = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);
    const merged = mergeAtlasSnapshots(local, snapshotOf([QUEST_A, QUEST_B]));

    expect(parseTombstones(merged[TOMBSTONES]).map((tombstone) => tombstone.entityId)).toEqual(["B"]);
  });
});

describe("remote deletion versus an older local snapshot", () => {
  it("removes a quest another device deleted", () => {
    const local = snapshotOf([QUEST_A, QUEST_B]);
    const remote = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);

    expect(questIdsIn(mergeAtlasSnapshots(local, remote))).toEqual(["A"]);
  });

  it("applies that deletion to local storage when the merged snapshot is applied", () => {
    window.localStorage.setItem(QUESTS, JSON.stringify([QUEST_A, QUEST_B]));

    const remote = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);
    applyAtlasSnapshot(mergeAtlasSnapshots(collectAtlasSnapshot(), remote), "merge");

    expect(localQuestIds()).toEqual(["A"]);
  });
});

describe("deletion followed by a page reload", () => {
  it("keeps the quest deleted when the stored snapshot is re-read and re-merged", () => {
    window.localStorage.setItem(QUESTS, JSON.stringify([QUEST_A]));
    window.localStorage.setItem(TOMBSTONES, serializeTombstones([createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]));

    // A reload re-collects from localStorage; the tombstone is there too.
    const afterReload = collectAtlasSnapshot();
    const merged = mergeAtlasSnapshots(afterReload, snapshotOf([QUEST_A, QUEST_B]));

    expect(questIdsIn(merged)).toEqual(["A"]);
  });
});

describe("deletion followed by a sync from another device", () => {
  it("does not let a second device push the quest back", () => {
    const deletingDevice = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);
    const cloudAfterFirstPush = mergeAtlasSnapshots(deletingDevice, snapshotOf([QUEST_A, QUEST_B]));

    // The other device still has B and knows nothing about the deletion.
    const otherDevice = snapshotOf([QUEST_A, QUEST_B]);

    expect(questIdsIn(mergeAtlasSnapshots(otherDevice, cloudAfterFirstPush))).toEqual(["A"]);
  });
});

describe("a stale offline client reconnecting", () => {
  it("loses its copy of an entity deleted while it was away", () => {
    const staleClient = snapshotOf([QUEST_A, QUEST_B, QUEST_C]);
    const cloud = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z"), createTombstone(QUESTS, "C", "2026-10-24T12:05:00.000Z")]);

    expect(questIdsIn(mergeAtlasSnapshots(staleClient, cloud))).toEqual(["A"]);
  });

  it("still contributes work it did offline on entities that were not deleted", () => {
    const staleClient = snapshotOf([QUEST_A, QUEST_B, { id: "D", title: "Made offline" }]);
    const cloud = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);

    expect(questIdsIn(mergeAtlasSnapshots(staleClient, cloud)).sort()).toEqual(["A", "D"]);
  });
});

describe("concurrent edit and deletion", () => {
  it("lets the deletion win when the edit is older", () => {
    const edited = { id: "B", title: "Edited before the delete", updatedAt: "2026-10-24T11:00:00.000Z" };
    const local = snapshotOf([QUEST_A, edited]);
    const remote = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);

    expect(questIdsIn(mergeAtlasSnapshots(local, remote))).toEqual(["A"]);
  });

  it("lets a strictly newer edit win, treating it as a deliberate recreation", () => {
    const revived = { id: "B", title: "Brought back on purpose", updatedAt: "2026-10-24T13:00:00.000Z" };
    const local = snapshotOf([QUEST_A, revived]);
    const remote = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);
    const merged = mergeAtlasSnapshots(local, remote);

    expect(questIdsIn(merged).sort()).toEqual(["A", "B"]);
    // ...and the obsolete tombstone is retired, or the next merge would
    // delete the revived quest all over again.
    expect(parseTombstones(merged[TOMBSTONES])).toHaveLength(0);
  });

  it("lets the deletion win for an entity that carries no timestamp at all", () => {
    // Category/attribute records have no updatedAt. Nothing can prove the
    // edit is newer, so the deletion stands.
    const local = snapshotOf([QUEST_A, QUEST_B]);
    const remote = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);

    expect(questIdsIn(mergeAtlasSnapshots(local, remote))).toEqual(["A"]);
  });

  it("resolves the same way regardless of which side is called local", () => {
    const local = snapshotOf([QUEST_A, QUEST_B]);
    const remote = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);

    expect(questIdsIn(mergeAtlasSnapshots(local, remote))).toEqual(questIdsIn(mergeAtlasSnapshots(remote, local)));
  });
});

describe("ordinary creation and update are unchanged", () => {
  it("keeps entities created on either side", () => {
    const local = snapshotOf([QUEST_A, QUEST_B]);
    const remote = snapshotOf([QUEST_A, QUEST_C]);

    expect(questIdsIn(mergeAtlasSnapshots(local, remote)).sort()).toEqual(["A", "B", "C"]);
  });

  it("still prefers the newer edit of an entity both sides changed", () => {
    const local = snapshotOf([{ id: "A", title: "Newer", updatedAt: "2026-10-24T13:00:00.000Z" }]);
    const remote = snapshotOf([{ id: "A", title: "Older", updatedAt: "2026-10-24T09:00:00.000Z" }]);

    expect(JSON.parse(mergeAtlasSnapshots(local, remote)[QUESTS])[0].title).toBe("Newer");
  });

  it("leaves unrelated collections completely intact", () => {
    const local: AtlasSnapshot = {
      ...snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]),
      [STORAGE_KEYS.journalEntries]: JSON.stringify([{ id: "j1" }, { id: "j2" }]),
      [STORAGE_KEYS.appearance]: JSON.stringify({ theme: "dark" }),
    };
    const remote: AtlasSnapshot = {
      ...snapshotOf([QUEST_A, QUEST_B]),
      [STORAGE_KEYS.journalEntries]: JSON.stringify([{ id: "j1" }, { id: "j3" }]),
    };

    const merged = mergeAtlasSnapshots(local, remote);

    expect(JSON.parse(merged[STORAGE_KEYS.journalEntries]).map((entry: { id: string }) => entry.id).sort()).toEqual(["j1", "j2", "j3"]);
    expect(JSON.parse(merged[STORAGE_KEYS.appearance])).toEqual({ theme: "dark" });
  });

  it("only tombstones the collection the deletion happened in", () => {
    const local: AtlasSnapshot = {
      ...snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]),
      // Same id, different collection - must survive.
      [STORAGE_KEYS.notes]: JSON.stringify([{ id: "B", text: "A note that happens to share an id" }]),
    };

    const merged = mergeAtlasSnapshots(local, snapshotOf([QUEST_A, QUEST_B]));

    expect(JSON.parse(merged[STORAGE_KEYS.notes])).toHaveLength(1);
  });
});

describe("repeated synchronization", () => {
  it("is idempotent - merging an already-merged snapshot changes nothing", () => {
    const local = snapshotOf([QUEST_A, QUEST_B]);
    const remote = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);

    const once = mergeAtlasSnapshots(local, remote);
    const twice = mergeAtlasSnapshots(once, once);
    const thrice = mergeAtlasSnapshots(twice, once);

    // Byte-for-byte stable: a merge that kept rewriting the snapshot would
    // keep marking it dirty and re-triggering a push forever.
    expect(twice).toEqual(once);
    expect(thrice).toEqual(once);
  });

  it("never resurrects across repeated round trips between two devices", () => {
    let cloud = snapshotOf([QUEST_A], [createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]);
    const stubbornDevice = snapshotOf([QUEST_A, QUEST_B]);

    for (let round = 0; round < 5; round += 1) {
      cloud = mergeAtlasSnapshots(stubbornDevice, cloud);
      expect(questIdsIn(cloud)).toEqual(["A"]);
    }
  });
});

describe("legacy and malformed data", () => {
  it("merges a snapshot that predates tombstones exactly as before", () => {
    const local = snapshotOf([QUEST_A, QUEST_B]);
    const remote = snapshotOf([QUEST_A, QUEST_C]);

    const merged = mergeAtlasSnapshots(local, remote);

    expect(questIdsIn(merged).sort()).toEqual(["A", "B", "C"]);
    expect(merged[TOMBSTONES]).toBeUndefined();
  });

  it("ignores a tombstone registry that is not valid JSON", () => {
    const local: AtlasSnapshot = { [QUESTS]: JSON.stringify([QUEST_A, QUEST_B]), [TOMBSTONES]: "{not json" };

    expect(questIdsIn(mergeAtlasSnapshots(local, snapshotOf([QUEST_A])))).toEqual(["A", "B"]);
  });

  it("drops individual malformed tombstone records without discarding the good ones", () => {
    const registry = JSON.stringify([
      { nonsense: true },
      null,
      "a string",
      { collection: QUESTS, entityId: "B", deletedAt: "2026-10-24T12:00:00.000Z" },
    ]);
    const local: AtlasSnapshot = { [QUESTS]: JSON.stringify([QUEST_A, QUEST_B]), [TOMBSTONES]: registry };

    expect(questIdsIn(mergeAtlasSnapshots(local, snapshotOf([QUEST_A, QUEST_B])))).toEqual(["A"]);
  });

  it("survives a collection whose stored value is not valid JSON", () => {
    const local: AtlasSnapshot = { [QUESTS]: "{broken", [TOMBSTONES]: serializeTombstones([createTombstone(QUESTS, "B", "2026-10-24T12:00:00.000Z")]) };

    expect(() => mergeAtlasSnapshots(local, snapshotOf([QUEST_A]))).not.toThrow();
  });

  it("tolerates numeric entity ids", () => {
    const local: AtlasSnapshot = { [QUESTS]: JSON.stringify([{ id: 1 }, { id: 2 }]), [TOMBSTONES]: serializeTombstones([createTombstone(QUESTS, 2, "2026-10-24T12:00:00.000Z")]) };

    expect(JSON.parse(mergeAtlasSnapshots(local, { [QUESTS]: JSON.stringify([{ id: 1 }, { id: 2 }]) })[QUESTS])).toEqual([{ id: 1 }]);
  });
});

// The reported symptom: attributes the user never chose kept reappearing
// as pages. Category records carry no updatedAt at all, so before
// tombstones the merge's "neither side has a timestamp" tiebreak returned
// the remote copy every single time, and the cloud always won.
describe("attribute pages", () => {
  const ATTRIBUTES = STORAGE_KEYS.attributes;
  const DISCIPLINE = { id: "discipline", name: "Discipline", icon: "D", accent: "bg-purple-500" };
  const CREATIVITY = { id: "creativity", name: "Creativity", icon: "C", accent: "bg-fuchsia-400" };
  const BUSINESS = { id: "business", name: "Business", icon: "B", accent: "bg-orange-400" };

  it("keeps a removed attribute removed, even though Category has no updatedAt", () => {
    const local: AtlasSnapshot = {
      [ATTRIBUTES]: JSON.stringify([DISCIPLINE]),
      [TOMBSTONES]: serializeTombstones([createTombstone(ATTRIBUTES, "creativity", "2026-10-24T12:00:00.000Z"), createTombstone(ATTRIBUTES, "business", "2026-10-24T12:00:00.000Z")]),
    };
    const cloud: AtlasSnapshot = { [ATTRIBUTES]: JSON.stringify([DISCIPLINE, CREATIVITY, BUSINESS]) };

    const merged = mergeAtlasSnapshots(local, cloud);

    expect(JSON.parse(merged[ATTRIBUTES]).map((attribute: { id: string }) => attribute.id)).toEqual(["discipline"]);
  });

  it("does not delete the quests that were filed under it", () => {
    const local: AtlasSnapshot = {
      [ATTRIBUTES]: JSON.stringify([DISCIPLINE]),
      [QUESTS]: JSON.stringify([{ id: "q1", title: "A creative quest", categoryId: "creativity" }]),
      [TOMBSTONES]: serializeTombstones([createTombstone(ATTRIBUTES, "creativity", "2026-10-24T12:00:00.000Z")]),
    };

    const merged = mergeAtlasSnapshots(local, { [ATTRIBUTES]: JSON.stringify([DISCIPLINE, CREATIVITY]), ...snapshotOf([{ id: "q1", title: "A creative quest", categoryId: "creativity" }]) });

    expect(JSON.parse(merged[QUESTS])).toHaveLength(1);
  });

  it("brings the attribute back if it is deliberately recreated with the same id", () => {
    // Recreation is how an accidental removal is undone, and how orphaned
    // quests find their page again.
    const recreated = { ...CREATIVITY, updatedAt: "2026-10-24T13:00:00.000Z" };
    const local: AtlasSnapshot = {
      [ATTRIBUTES]: JSON.stringify([DISCIPLINE, recreated]),
      [TOMBSTONES]: serializeTombstones([createTombstone(ATTRIBUTES, "creativity", "2026-10-24T12:00:00.000Z")]),
    };

    const merged = mergeAtlasSnapshots(local, { [ATTRIBUTES]: JSON.stringify([DISCIPLINE]) });

    expect(JSON.parse(merged[ATTRIBUTES]).map((attribute: { id: string }) => attribute.id).sort()).toEqual(["creativity", "discipline"]);
  });
});

describe("compaction", () => {
  it("keeps recent deletions", () => {
    const recent = createTombstone(QUESTS, "B", new Date().toISOString());

    expect(compactTombstones([recent])).toHaveLength(1);
  });

  it("forgets deletions past the retention window", () => {
    const ancient = createTombstone(QUESTS, "B", new Date(Date.now() - (TOMBSTONE_RETENTION_DAYS + 10) * 24 * 60 * 60 * 1000).toISOString());

    expect(compactTombstones([ancient])).toHaveLength(0);
  });

  it("never trims below the cap while every record is still inside the window", () => {
    const now = Date.now();
    const many = Array.from({ length: MAX_TOMBSTONES + 50 }, (_, index) => createTombstone(QUESTS, `q${index}`, new Date(now - index * 1000).toISOString()));

    const compacted = compactTombstones(many);

    expect(compacted).toHaveLength(MAX_TOMBSTONES);
    // The survivors are the newest ones - the oldest are the only ones an
    // offline client is unlikely to still need.
    expect(compacted.some((tombstone) => tombstone.entityId === "q0")).toBe(true);
  });
});
