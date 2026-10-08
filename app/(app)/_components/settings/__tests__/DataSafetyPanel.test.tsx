import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataSafetyPanel from "../DataSafetyPanel";
import { STORAGE_KEYS } from "../../../_lib/storage-keys";

// The document store needs IndexedDB, which jsdom does not provide.
const store = vi.hoisted(() => ({ listDocumentFileIds: vi.fn(), getDocumentFile: vi.fn() }));
vi.mock("../../../_lib/document-store", () => ({
  listDocumentFileIds: store.listDocumentFileIds,
  getDocumentFile: store.getDocumentFile,
  putDocumentFile: vi.fn(),
  deleteDocumentFile: vi.fn(),
}));

const cloud = vi.hoisted(() => ({ value: { isCloudSyncAvailable: false, user: null, syncStatus: "idle", lastSyncedAt: null } }));
vi.mock("../../../_lib/hooks/useCloudSync", () => ({ useCloudSync: () => cloud.value }));

// Downloads: assert what WOULD be written without touching the filesystem.
const downloads: Array<{ name: string; payload: unknown }> = [];

beforeEach(() => {
  window.localStorage.clear();
  downloads.length = 0;
  store.listDocumentFileIds.mockReset().mockResolvedValue([]);
  store.getDocumentFile.mockReset();

  URL.createObjectURL = vi.fn(() => "blob:fake");
  URL.revokeObjectURL = vi.fn();
  // Blob.text() is what the download path stringifies through; capturing
  // the anchor click is enough to know a file was produced.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, payload: null });
  });
});

function seedRealData() {
  window.localStorage.setItem(STORAGE_KEYS.questList, JSON.stringify([{ id: "q1" }, { id: "q2" }]));
  window.localStorage.setItem(STORAGE_KEYS.goalTree, JSON.stringify([{ id: "g1" }]));
  window.localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify([{ id: "n1" }, { id: "n2" }, { id: "n3" }]));
}

describe("DataSafetyPanel", () => {
  it("reports local-only when cloud sync is not configured, instead of implying a connection", async () => {
    render(<DataSafetyPanel />);

    expect(await screen.findByText(/Local only — cloud sync is not configured/)).toBeTruthy();
  });

  it("says a backup has never been taken when none has", async () => {
    render(<DataSafetyPanel />);

    expect(await screen.findByText("Never")).toBeTruthy();
  });

  it("creates, verifies and downloads a backup of the real local data", async () => {
    const user = userEvent.setup();
    seedRealData();
    render(<DataSafetyPanel />);

    await user.click(screen.getByRole("button", { name: "Create Backup" }));

    expect(await screen.findByTestId("backup-verified")).toBeTruthy();
    await waitFor(() => expect(downloads.length).toBeGreaterThan(0));
    expect(downloads[0].name).toMatch(/^atlas-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/);
  });

  it("shows a manifest with the real entity counts, not placeholders", async () => {
    const user = userEvent.setup();
    seedRealData();
    render(<DataSafetyPanel />);

    await user.click(screen.getByRole("button", { name: "Create Backup" }));
    await screen.findByTestId("backup-verified");

    expect(screen.getByText("Quests")).toBeTruthy();
    expect(screen.getByText("Notes")).toBeTruthy();
    // 2 quests, 1 goal, 3 notes.
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("captures every menace-* key, including one no curated list knows about", async () => {
    const user = userEvent.setup();
    seedRealData();
    window.localStorage.setItem("menace-some-future-feature", JSON.stringify([{ id: "x" }]));
    render(<DataSafetyPanel />);

    await user.click(screen.getByRole("button", { name: "Create Backup" }));
    await screen.findByTestId("backup-verified");

    // 3 seeded + 1 unknown = 4 keys in the manifest line.
    expect(screen.getByText(/4 keys/)).toBeTruthy();
  });

  it("counts files on the device and offers to include their contents", async () => {
    store.listDocumentFileIds.mockResolvedValue(["file-1", "file-2"]);
    store.getDocumentFile.mockResolvedValue(new Blob(["x".repeat(500)], { type: "application/pdf" }));
    render(<DataSafetyPanel />);

    expect(await screen.findByText("2 (1000 B)")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Include file contents/ })).toBeTruthy();
  });

  it("rejects a file that is not an Atlas backup and changes nothing", async () => {
    const user = userEvent.setup();
    seedRealData();
    render(<DataSafetyPanel />);

    await user.upload(screen.getByLabelText("Choose a backup file") as HTMLInputElement, new File(['{"hello":"world"}'], "random.json", { type: "application/json" }));

    expect(await screen.findByText(/not a valid Atlas backup/)).toBeTruthy();
    expect(screen.queryByTestId("restore-confirm")).toBeNull();
    // Untouched.
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.questList)!)).toHaveLength(2);
  });

  it("never restores without explicit confirmation", async () => {
    const user = userEvent.setup();
    seedRealData();
    render(<DataSafetyPanel />);

    // Round-trip a real backup through the file input.
    await user.click(screen.getByRole("button", { name: "Create Backup" }));
    await screen.findByTestId("backup-verified");

    const snapshot = {
      backupVersion: 1,
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      appVersion: "0.1.0",
      source: "browser-local",
      origin: "http://localhost",
      localStorage: { [STORAGE_KEYS.questList]: JSON.stringify([{ id: "restored" }]) },
      attachments: [],
      attachmentsExported: false,
      metadata: {
        keys: [STORAGE_KEYS.questList],
        keyCount: 1,
        totalSize: STORAGE_KEYS.questList.length + JSON.stringify([{ id: "restored" }]).length,
        attachmentCount: 0,
        attachmentBytes: 0,
        entityCounts: [],
      },
    };

    await user.upload(screen.getByLabelText("Choose a backup file") as HTMLInputElement, new File([JSON.stringify(snapshot)], "backup.json", { type: "application/json" }));

    expect(await screen.findByTestId("restore-confirm")).toBeTruthy();
    // Still the original data - the confirmation gate has not been passed.
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.questList)!)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByTestId("restore-confirm")).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.questList)!)).toHaveLength(2);
  });
});
