import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useLocalStorageState } from "../use-local-storage-state";
import { parseTombstones } from "../../sync/deletion-tombstones";
import { STORAGE_KEYS } from "../../storage-keys";
import { mergeAtlasSnapshots } from "../../sync/merge-atlas-snapshot";
import { collectAtlasSnapshot } from "../../atlas-snapshot";

// The other half of the deletion fix: the merge engine can only honour a
// tombstone that something actually wrote. These drive the real hook every
// delete handler in the app goes through.

type Quest = { id: string; title: string; updatedAt?: string };

const QUESTS = STORAGE_KEYS.questList;

function storedTombstones() {
  return parseTombstones(window.localStorage.getItem(STORAGE_KEYS.deletionTombstones));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("deleting an entity through the hook", () => {
  it("records a tombstone naming the collection and the entity", () => {
    window.localStorage.setItem(QUESTS, JSON.stringify([{ id: "A", title: "A" }, { id: "B", title: "B" }]));

    const { result } = renderHook(() => useLocalStorageState<Quest[]>(QUESTS, []));

    act(() => {
      result.current[1]((current) => current.filter((quest) => quest.id !== "B"));
    });

    const tombstones = storedTombstones();

    expect(tombstones).toHaveLength(1);
    expect(tombstones[0].collection).toBe(QUESTS);
    expect(tombstones[0].entityId).toBe("B");
  });

  it("survives the round trip through the merge engine, which is the actual bug", () => {
    window.localStorage.setItem(QUESTS, JSON.stringify([{ id: "A", title: "A" }, { id: "B", title: "B" }]));

    const { result } = renderHook(() => useLocalStorageState<Quest[]>(QUESTS, []));

    act(() => {
      result.current[1]((current) => current.filter((quest) => quest.id !== "B"));
    });

    // The cloud still holds the pre-deletion copy.
    const cloud = { [QUESTS]: JSON.stringify([{ id: "A", title: "A" }, { id: "B", title: "B" }]) };
    const merged = mergeAtlasSnapshots(collectAtlasSnapshot(), cloud);

    expect(JSON.parse(merged[QUESTS]).map((quest: Quest) => quest.id)).toEqual(["A"]);
  });

  it("records one tombstone per entity when several go at once", () => {
    window.localStorage.setItem(QUESTS, JSON.stringify([{ id: "A", title: "A" }, { id: "B", title: "B" }, { id: "C", title: "C" }]));

    const { result } = renderHook(() => useLocalStorageState<Quest[]>(QUESTS, []));

    act(() => {
      result.current[1]([]);
    });

    expect(storedTombstones().map((tombstone) => tombstone.entityId).sort()).toEqual(["A", "B", "C"]);
  });
});

describe("writes that are not deletions", () => {
  it("records nothing when an entity is added", () => {
    window.localStorage.setItem(QUESTS, JSON.stringify([{ id: "A", title: "A" }]));

    const { result } = renderHook(() => useLocalStorageState<Quest[]>(QUESTS, []));

    act(() => {
      result.current[1]((current) => [...current, { id: "B", title: "B" }]);
    });

    expect(storedTombstones()).toHaveLength(0);
  });

  it("records nothing when an entity is edited in place", () => {
    window.localStorage.setItem(QUESTS, JSON.stringify([{ id: "A", title: "A" }]));

    const { result } = renderHook(() => useLocalStorageState<Quest[]>(QUESTS, []));

    act(() => {
      result.current[1]((current) => current.map((quest) => ({ ...quest, title: "Renamed" })));
    });

    expect(storedTombstones()).toHaveLength(0);
  });

  it("records nothing for a settings object that is not a collection", () => {
    const { result } = renderHook(() => useLocalStorageState<{ theme: string }>(STORAGE_KEYS.appearance, { theme: "dark" }));

    act(() => {
      result.current[1]({ theme: "light" });
    });

    expect(storedTombstones()).toHaveLength(0);
  });
});

describe("recreating a deleted entity", () => {
  it("retires the tombstone so the recreation is not undone", () => {
    window.localStorage.setItem(QUESTS, JSON.stringify([{ id: "A", title: "A" }, { id: "B", title: "B" }]));

    const { result } = renderHook(() => useLocalStorageState<Quest[]>(QUESTS, []));

    act(() => {
      result.current[1]((current) => current.filter((quest) => quest.id !== "B"));
    });

    expect(storedTombstones()).toHaveLength(1);

    act(() => {
      result.current[1]((current) => [...current, { id: "B", title: "B again" }]);
    });

    expect(storedTombstones()).toHaveLength(0);
  });
});

describe("clearing a whole collection", () => {
  it("tombstones every entity, so the cloud cannot refill it", () => {
    window.localStorage.setItem(QUESTS, JSON.stringify([{ id: "A", title: "A" }, { id: "B", title: "B" }]));

    const { result } = renderHook(() => useLocalStorageState<Quest[]>(QUESTS, []));

    act(() => {
      result.current[3]();
    });

    expect(storedTombstones().map((tombstone) => tombstone.entityId).sort()).toEqual(["A", "B"]);

    const cloud = { [QUESTS]: JSON.stringify([{ id: "A", title: "A" }, { id: "B", title: "B" }]) };
    const merged = mergeAtlasSnapshots(collectAtlasSnapshot(), cloud);

    expect(JSON.parse(merged[QUESTS])).toEqual([]);
  });
});
