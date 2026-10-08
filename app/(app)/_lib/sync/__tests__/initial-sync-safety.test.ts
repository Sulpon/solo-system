import { describe, expect, it, beforeEach } from "vitest";
import { applyAtlasSnapshot, collectAtlasSnapshot } from "../../atlas-snapshot";
import { mergeAtlasSnapshots } from "../merge-atlas-snapshot";
import { compareSnapshots, isSafeForAutomaticInitialSync } from "../snapshot-comparison";
import { STORAGE_KEYS } from "../../storage-keys";

// THE critical data-safety regression: a new, empty cloud project must
// never be able to empty a populated local Atlas.
//
// These exercise the real snapshot/merge/apply functions the sync store
// calls - not stand-ins - so a change that reintroduces the destructive
// path fails here.

const QUEST_A = { id: "A", title: "Quest A" };
const QUEST_B = { id: "B", title: "Quest B" };
const QUEST_C = { id: "C", title: "Quest C" };

function seedLocalAtlas() {
  window.localStorage.setItem(STORAGE_KEYS.questList, JSON.stringify([QUEST_A, QUEST_B, QUEST_C]));
  window.localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify([{ id: "n1" }]));
  window.localStorage.setItem(STORAGE_KEYS.goalTree, JSON.stringify([]));
}

function localQuestIds(): string[] {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.questList) ?? "[]").map((quest: { id: string }) => quest.id);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("empty cloud + populated local", () => {
  it("leaves local untouched when the cloud snapshot is empty", () => {
    seedLocalAtlas();
    const local = collectAtlasSnapshot();

    const merged = mergeAtlasSnapshots(local, {});
    applyAtlasSnapshot(merged, "merge");

    expect(localQuestIds()).toEqual(["A", "B", "C"]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.notes)!)).toHaveLength(1);
  });

  it("produces a cloud payload that carries the local quests, so LOCAL -> CLOUD is what gets pushed", () => {
    seedLocalAtlas();

    const merged = mergeAtlasSnapshots(collectAtlasSnapshot(), {});

    expect(JSON.parse(merged[STORAGE_KEYS.questList]).map((quest: { id: string }) => quest.id)).toEqual(["A", "B", "C"]);
  });

  it("never deletes a local key in merge mode, even when the incoming snapshot omits it entirely", () => {
    seedLocalAtlas();

    // The exact shape of the danger: a cloud row that knows nothing about
    // these keys.
    applyAtlasSnapshot({}, "merge");

    expect(localQuestIds()).toEqual(["A", "B", "C"]);
    expect(window.localStorage.getItem(STORAGE_KEYS.notes)).not.toBeNull();
  });

  it("still deletes in replace mode, because an explicit restore must be able to", () => {
    seedLocalAtlas();

    applyAtlasSnapshot({ [STORAGE_KEYS.questList]: JSON.stringify([QUEST_A]) }, "replace");

    expect(localQuestIds()).toEqual(["A"]);
    expect(window.localStorage.getItem(STORAGE_KEYS.notes)).toBeNull();
  });
});

describe("initial-sync safety decision", () => {
  it("permits an automatic initial sync only when the cloud is genuinely empty", () => {
    seedLocalAtlas();

    expect(isSafeForAutomaticInitialSync(compareSnapshots(collectAtlasSnapshot(), {}))).toBe(true);
  });

  it("refuses an automatic initial sync when the cloud holds anything at all", () => {
    seedLocalAtlas();
    const cloud = { [STORAGE_KEYS.questList]: JSON.stringify([{ id: "Z" }]) };

    expect(isSafeForAutomaticInitialSync(compareSnapshots(collectAtlasSnapshot(), cloud))).toBe(false);
  });
});

describe("compareSnapshots", () => {
  it("reports an empty cloud against populated local without resolving anything", () => {
    seedLocalAtlas();
    const comparison = compareSnapshots(collectAtlasSnapshot(), {});

    expect(comparison.isCloudEmpty).toBe(true);
    expect(comparison.cloudKeyCount).toBe(0);
    expect(comparison.localKeyCount).toBe(3);
    expect(comparison.localOnlyKeys).toContain(STORAGE_KEYS.questList);
    expect(comparison.cloudOnlyKeys).toHaveLength(0);
  });

  it("separates local-only, cloud-only, differing and identical keys", () => {
    const local = { "menace-a": "1", "menace-b": "2", "menace-same": "x" };
    const cloud = { "menace-b": "99", "menace-c": "3", "menace-same": "x" };

    const comparison = compareSnapshots(local, cloud);

    expect(comparison.localOnlyKeys).toEqual(["menace-a"]);
    expect(comparison.cloudOnlyKeys).toEqual(["menace-c"]);
    expect(comparison.differingKeys).toEqual(["menace-b"]);
    expect(comparison.identicalKeys).toEqual(["menace-same"]);
  });

  it("gives per-entity counts for both sides", () => {
    const local = { [STORAGE_KEYS.questList]: JSON.stringify([QUEST_A, QUEST_B, QUEST_C]) };
    const cloud = { [STORAGE_KEYS.questList]: JSON.stringify([QUEST_A]) };

    const quests = compareSnapshots(local, cloud).entities.find((entry) => entry.key === STORAGE_KEYS.questList);

    expect(quests).toMatchObject({ local: 3, cloud: 1 });
  });

  it("reports a collection absent from one side as null, not as zero", () => {
    const quests = compareSnapshots({ [STORAGE_KEYS.questList]: JSON.stringify([QUEST_A]) }, {}).entities.find((entry) => entry.key === STORAGE_KEYS.questList);

    expect(quests).toMatchObject({ local: 1, cloud: null });
  });

  it("omits entities neither side has, so the comparison shows only what matters", () => {
    expect(compareSnapshots({}, {}).entities).toHaveLength(0);
  });
});

describe("merge direction", () => {
  it("keeps both sides' entities when each has one the other lacks", () => {
    const local = { [STORAGE_KEYS.questList]: JSON.stringify([QUEST_A, QUEST_B]) };
    const cloud = { [STORAGE_KEYS.questList]: JSON.stringify([QUEST_C]) };

    const ids = JSON.parse(mergeAtlasSnapshots(local, cloud)[STORAGE_KEYS.questList]).map((quest: { id: string }) => quest.id).sort();

    expect(ids).toEqual(["A", "B", "C"]);
  });
});
