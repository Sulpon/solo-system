import { describe, expect, it } from "vitest";
import { countByKind, deriveNoteTitle, extractFirstUrl, getNoteKind, getUrlHost, isVideoUrl, sortForInbox } from "../note-inbox-engine";
import { isInboxNote, type Note } from "../../types/note";
import type { EntityAttachment } from "../../types/attachment";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "",
    content: "",
    pinned: false,
    archived: false,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    ...overrides,
  };
}

function attachment(overrides: Partial<EntityAttachment> = {}): EntityAttachment {
  return { id: "a1", fileName: "file.pdf", fileType: "application/pdf", fileSize: 10, uploadedAt: "2026-10-01T10:00:00.000Z", ...overrides };
}

describe("extractFirstUrl", () => {
  it("finds a full URL in a dumped thought", () => {
    expect(extractFirstUrl("read this later https://example.com/a/b?x=1 looks good")).toBe("https://example.com/a/b?x=1");
  });

  it("upgrades a bare www address to https", () => {
    expect(extractFirstUrl("www.example.com/path")).toBe("https://www.example.com/path");
  });

  it("drops trailing sentence punctuation", () => {
    expect(extractFirstUrl("see https://example.com/thing.")).toBe("https://example.com/thing");
  });

  it("returns null for prose with no address", () => {
    expect(extractFirstUrl("just a thought about e.g. nothing in particular")).toBeNull();
  });

  it("does not treat a plain sentence with a dot as a URL", () => {
    expect(extractFirstUrl("I should rest. Tomorrow is busy.")).toBeNull();
  });
});

describe("getUrlHost / isVideoUrl", () => {
  it("strips www from the host", () => {
    expect(getUrlHost("https://www.example.com/a")).toBe("example.com");
  });

  it("returns null rather than throwing on nonsense", () => {
    expect(getUrlHost("not a url")).toBeNull();
  });

  it("recognises a video host and its subdomains", () => {
    expect(isVideoUrl("https://youtu.be/abc")).toBe(true);
    expect(isVideoUrl("https://m.youtube.com/watch?v=abc")).toBe(true);
  });

  it("leaves an unknown host as a plain link rather than guessing", () => {
    expect(isVideoUrl("https://example.com/video")).toBe(false);
  });
});

describe("getNoteKind", () => {
  it("is text for a plain thought", () => {
    expect(getNoteKind(note({ content: "an idea" }))).toBe("text");
  });

  it("is link when a URL was pasted into the body", () => {
    expect(getNoteKind(note({ content: "https://example.com/article" }))).toBe("link");
  });

  it("is video for a video host", () => {
    expect(getNoteKind(note({ url: "https://youtube.com/watch?v=x" }))).toBe("video");
  });

  it("is image when a picture is attached", () => {
    expect(getNoteKind(note({ attachments: [attachment({ fileType: "image/png" })] }))).toBe("image");
  });

  it("is file for a non-image attachment", () => {
    expect(getNoteKind(note({ attachments: [attachment()] }))).toBe("file");
  });

  it("prefers an attached picture over a pasted link", () => {
    expect(getNoteKind(note({ content: "https://example.com", attachments: [attachment({ fileType: "image/jpeg" })] }))).toBe("image");
  });
});

describe("deriveNoteTitle", () => {
  it("uses the first non-empty line", () => {
    expect(deriveNoteTitle("\n\nBuy a desk lamp\nand a chair")).toBe("Buy a desk lamp");
  });

  it("truncates a long line instead of inventing a summary", () => {
    const title = deriveNoteTitle("x".repeat(200));

    expect(title).toHaveLength(60);
    expect(title.endsWith("…")).toBe(true);
    expect("x".repeat(200).startsWith(title.slice(0, -1))).toBe(true);
  });

  it("drops the raw address from the title, keeping the words around it", () => {
    expect(deriveNoteTitle("watch later https://www.youtube.com/watch?v=abc123", "https://www.youtube.com/watch?v=abc123")).toBe("watch later");
  });

  it("falls back to the host when the body is only the link", () => {
    expect(deriveNoteTitle("https://example.com/a", "https://example.com/a")).toBe("example.com");
  });

  it("says so plainly when there is nothing to name it after", () => {
    expect(deriveNoteTitle("   ")).toBe("Untitled note");
  });
});

describe("isInboxNote", () => {
  it("counts a note with no category", () => {
    expect(isInboxNote(note())).toBe(true);
  });

  it("excludes a filed note", () => {
    expect(isInboxNote(note({ category: "idea" }))).toBe(false);
  });

  it("excludes an archived note even with no category", () => {
    expect(isInboxNote(note({ archived: true }))).toBe(false);
  });
});

describe("countByKind / sortForInbox", () => {
  it("counts every kind present", () => {
    const counts = countByKind([note({ content: "plain" }), note({ url: "https://youtu.be/a" }), note({ attachments: [attachment({ fileType: "image/png" })] })]);

    expect(counts).toEqual({ text: 1, link: 0, video: 1, image: 1, file: 0 });
  });

  it("puts the newest dump first", () => {
    const sorted = sortForInbox([
      note({ id: "old", createdAt: "2026-10-01T10:00:00.000Z" }),
      note({ id: "new", createdAt: "2026-10-09T10:00:00.000Z" }),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(["new", "old"]);
  });

  it("does not mutate the array it was given", () => {
    const input = [note({ id: "a", createdAt: "2026-10-01T10:00:00.000Z" }), note({ id: "b", createdAt: "2026-10-09T10:00:00.000Z" })];
    sortForInbox(input);

    expect(input.map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});
