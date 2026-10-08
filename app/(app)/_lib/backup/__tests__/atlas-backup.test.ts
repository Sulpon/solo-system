import { describe, expect, it } from "vitest";
import { ATLAS_BACKUP_VERSION, backupFileName, buildBackup, countEntities, measureSnapshotSize, verifyBackup } from "../atlas-backup";
import { STORAGE_KEYS } from "../../storage-keys";

function snapshot(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    [STORAGE_KEYS.questList]: JSON.stringify([{ id: "q1" }, { id: "q2" }, { id: "q3" }]),
    [STORAGE_KEYS.goalTree]: JSON.stringify([{ id: "g1" }]),
    [STORAGE_KEYS.appearance]: JSON.stringify({ theme: "dark" }),
    ...overrides,
  };
}

function backup(overrides: Partial<Parameters<typeof buildBackup>[0]> = {}) {
  return buildBackup({ snapshot: snapshot(), attachments: [], attachmentsExported: false, origin: "https://example.test", appVersion: "0.1.0", ...overrides });
}

describe("countEntities", () => {
  it("counts array-shaped collections from the real payload", () => {
    const counts = countEntities(snapshot());

    expect(counts.find((entry) => entry.key === STORAGE_KEYS.questList)).toMatchObject({ count: 3, present: true });
    expect(counts.find((entry) => entry.key === STORAGE_KEYS.goalTree)).toMatchObject({ count: 1, present: true });
  });

  it("reports an absent collection as absent rather than as zero", () => {
    const entry = countEntities({})?.find((item) => item.key === STORAGE_KEYS.questList);

    expect(entry).toMatchObject({ present: false, count: null });
  });

  it("does not invent a count for a singleton object", () => {
    const entry = countEntities(snapshot()).find((item) => item.key === STORAGE_KEYS.attributes);

    expect(entry?.count).toBeNull();
  });

  it("returns null rather than throwing for a value that is not JSON", () => {
    const entry = countEntities({ [STORAGE_KEYS.questList]: "not json" }).find((item) => item.key === STORAGE_KEYS.questList);

    expect(entry).toMatchObject({ present: true, count: null });
  });
});

describe("buildBackup", () => {
  it("records every key it was given, with a manifest that matches the payload", () => {
    const result = backup();

    expect(result.metadata.keyCount).toBe(3);
    expect(result.metadata.keys).toEqual(Object.keys(snapshot()).sort());
    expect(result.metadata.totalSize).toBe(measureSnapshotSize(snapshot()));
    expect(result.source).toBe("browser-local");
    expect(result.backupVersion).toBe(ATLAS_BACKUP_VERSION);
  });

  it("records the origin, because Atlas's three origins hold different data", () => {
    expect(backup({ origin: "http://127.0.0.1:3000" }).origin).toBe("http://127.0.0.1:3000");
  });

  it("totals attachment bytes from the real records", () => {
    const result = backup({ attachments: [{ id: "a", byteSize: 100 }, { id: "b", byteSize: 250 }], attachmentsExported: true });

    expect(result.metadata.attachmentCount).toBe(2);
    expect(result.metadata.attachmentBytes).toBe(350);
  });
});

describe("verifyBackup", () => {
  it("accepts a backup it just built", () => {
    expect(verifyBackup(backup())).toMatchObject({ ok: true });
  });

  it("rejects anything that is not an object", () => {
    expect(verifyBackup("nope").ok).toBe(false);
    expect(verifyBackup(null).ok).toBe(false);
    expect(verifyBackup([]).ok).toBe(false);
  });

  it("rejects a foreign file that is merely valid JSON", () => {
    expect(verifyBackup({ hello: "world" }).ok).toBe(false);
  });

  it("catches a key silently dropped from the payload after the manifest was written", () => {
    const tampered = structuredClone(backup()) as ReturnType<typeof backup> & { localStorage: Record<string, string> };
    delete tampered.localStorage[STORAGE_KEYS.goalTree];

    const result = verifyBackup(tampered);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("absent from the payload"))).toBe(true);
  });

  it("catches a key present in the payload but missing from the manifest", () => {
    const tampered = structuredClone(backup()) as ReturnType<typeof backup> & { localStorage: Record<string, string> };
    tampered.localStorage["menace-sneaky"] = "[]";

    expect(verifyBackup(tampered).ok).toBe(false);
  });

  it("catches a manifest key count that disagrees with the payload", () => {
    const tampered = structuredClone(backup()) as { metadata: { keyCount: number } };
    tampered.metadata.keyCount = 99;

    expect(verifyBackup(tampered).ok).toBe(false);
  });

  it("rejects a backup carrying non-menace keys the restore path would not handle", () => {
    const result = verifyBackup(buildBackup({ snapshot: { "atlas-focus-active-session": "{}" }, attachments: [], attachmentsExported: false, origin: "o", appVersion: "0.1.0" }));

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("non-menace"))).toBe(true);
  });

  it("refuses a backup written by a newer Atlas than this build", () => {
    const tampered = structuredClone(backup()) as { backupVersion: number };
    tampered.backupVersion = ATLAS_BACKUP_VERSION + 1;

    expect(verifyBackup(tampered).ok).toBe(false);
  });

  it("warns, but still passes, when attachments exist without their bytes", () => {
    const result = verifyBackup(backup({ attachments: [{ id: "a", byteSize: 10 }], attachmentsExported: false }));

    expect(result.ok).toBe(true);
    expect(result.issues.some((issue) => issue.severity === "warning" && issue.message.includes("NOT exported"))).toBe(true);
  });

  it("treats an empty Atlas as a valid backup, with a warning", () => {
    const result = verifyBackup(buildBackup({ snapshot: {}, attachments: [], attachmentsExported: false, origin: "o", appVersion: "0.1.0" }));

    expect(result.ok).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes("empty Atlas"))).toBe(true);
  });

  it("warns about values that are not valid JSON instead of rejecting them", () => {
    const result = verifyBackup(buildBackup({ snapshot: { "menace-odd": "raw text" }, attachments: [], attachmentsExported: false, origin: "o", appVersion: "0.1.0" }));

    expect(result.ok).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes("not valid JSON"))).toBe(true);
  });
});

describe("backupFileName", () => {
  it("is sortable and carries the local date and time", () => {
    expect(backupFileName(new Date(2026, 8, 30, 9, 5))).toBe("atlas-backup-2026-09-30-09-05.json");
  });
});
