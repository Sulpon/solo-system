import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttachmentsPanel from "../AttachmentsPanel";
import { formatFileSize } from "../../../_lib/types/attachment";
import type { EntityAttachment } from "../../../_lib/types/attachment";

// IndexedDB has no jsdom implementation; the store is the boundary under
// test here, so it is mocked and asserted against directly.
const store = vi.hoisted(() => ({
  getDocumentFile: vi.fn(),
  deleteDocumentFile: vi.fn(),
}));

vi.mock("../../../_lib/document-store", () => ({
  getDocumentFile: store.getDocumentFile,
  deleteDocumentFile: store.deleteDocumentFile,
  putDocumentFile: vi.fn(),
}));

function attachment(overrides: Partial<EntityAttachment> = {}): EntityAttachment {
  return { id: "file-1", fileName: "thesis-draft.pdf", fileType: "application/pdf", fileSize: 2048, uploadedAt: "2026-09-30T10:00:00.000Z", ...overrides };
}

beforeEach(() => {
  store.getDocumentFile.mockReset();
  store.deleteDocumentFile.mockReset().mockResolvedValue(undefined);
});

describe("formatFileSize", () => {
  it("scales units and never reports a negative or unusable size as bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatFileSize(Number.NaN)).toBe("Unknown size");
    expect(formatFileSize(-1)).toBe("Unknown size");
  });
});

describe("AttachmentsPanel", () => {
  it("shows an honest empty state rather than a fake file row", () => {
    render(<AttachmentsPanel attachments={[]} onAdd={vi.fn()} onRemove={vi.fn()} emptyHint="No files attached yet." />);

    expect(screen.getByText("No files attached yet.")).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("lists real attachments with their size", () => {
    render(<AttachmentsPanel attachments={[attachment()]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("thesis-draft.pdf")).toBeTruthy();
    expect(screen.getByText("2.0 KB")).toBeTruthy();
  });

  it("hands picked files to the caller", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AttachmentsPanel attachments={[]} onAdd={onAdd} onRemove={vi.fn()} label="Files" />);

    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await user.upload(screen.getByLabelText("Add files") as HTMLInputElement, file);

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd.mock.calls[0][0][0].name).toBe("notes.txt");
  });

  it("says plainly when the bytes are not on this device instead of failing silently", async () => {
    const user = userEvent.setup();
    store.getDocumentFile.mockResolvedValue(undefined);
    render(<AttachmentsPanel attachments={[attachment()]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    await user.click(screen.getByTitle("Download thesis-draft.pdf"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("isn't available on this device");
  });

  it("removes the stored bytes before dropping the row, so no blob is orphaned", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<AttachmentsPanel attachments={[attachment()]} onAdd={vi.fn()} onRemove={onRemove} />);

    await user.click(screen.getByRole("button", { name: "Remove thesis-draft.pdf" }));

    await waitFor(() => expect(onRemove).toHaveBeenCalledWith("file-1"));
    expect(store.deleteDocumentFile).toHaveBeenCalledWith("file-1");
    expect(store.deleteDocumentFile.mock.invocationCallOrder[0]).toBeLessThan(onRemove.mock.invocationCallOrder[0]);
  });

  it("surfaces an upload failure instead of pretending the file was saved", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValue(new Error("quota"));
    render(<AttachmentsPanel attachments={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    await user.upload(screen.getByLabelText("Add files") as HTMLInputElement, new File(["x"], "big.bin"));

    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't save");
  });
});
