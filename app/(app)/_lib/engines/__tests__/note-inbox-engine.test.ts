import { describe, expect, it } from "vitest";
import { countByKind, deriveNoteTitle, extractFirstUrl, filterByKind, getNoteKind, getUrlHost, hasTag, isVideoUrl, READ_LATER_TAG, sortForInbox, sortNotes, summariseInbox, toggleTag, WATCH_LATER_TAG } from "../note-inbox-engine";
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

describe("summariseInbox", () => {
  const now = new Date(2026, 9, 10, 14, 0, 0);
  const todayIso = new Date(2026, 9, 10, 9, 30, 0).toISOString();
  const yesterdayIso = new Date(2026, 9, 9, 23, 30, 0).toISOString();

  it("counts live notes, unfiled ones, and what arrived today", () => {
    const summary = summariseInbox(
      [
        note({ id: "a", createdAt: todayIso }),
        note({ id: "b", createdAt: todayIso, category: "idea" }),
        note({ id: "c", createdAt: yesterdayIso }),
        note({ id: "d", createdAt: todayIso, archived: true }),
      ],
      now,
    );

    expect(summary).toEqual({ total: 3, uncategorized: 2, capturedToday: 2 });
  });

  it("counts today by local day, not by UTC", () => {
    // 23:30 local on the 10th is already the 11th in UTC for a +1 zone;
    // it must still count as today.
    const lateTonight = new Date(2026, 9, 10, 23, 30, 0).toISOString();

    expect(summariseInbox([note({ createdAt: lateTonight })], now).capturedToday).toBe(1);
  });

  it("is all zeroes for an empty inbox", () => {
    expect(summariseInbox([], now)).toEqual({ total: 0, uncategorized: 0, capturedToday: 0 });
  });
});

describe("filterByKind", () => {
  const items = [note({ id: "t", content: "plain" }), note({ id: "v", url: "https://youtu.be/a" }), note({ id: "l", url: "https://example.com/a" })];

  it("passes everything through for 'all'", () => {
    expect(filterByKind(items, "all")).toHaveLength(3);
  });

  it("narrows to one kind", () => {
    expect(filterByKind(items, "video").map((entry) => entry.id)).toEqual(["v"]);
    expect(filterByKind(items, "text").map((entry) => entry.id)).toEqual(["t"]);
  });
});

describe("sortNotes", () => {
  const older = note({ id: "older", createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-20T10:00:00.000Z" });
  const newer = note({ id: "newer", createdAt: "2026-10-09T10:00:00.000Z", updatedAt: "2026-10-09T10:00:00.000Z" });

  it("defaults to newest captured first", () => {
    expect(sortNotes([older, newer], "newest").map((entry) => entry.id)).toEqual(["newer", "older"]);
  });

  it("reverses for oldest", () => {
    expect(sortNotes([older, newer], "oldest").map((entry) => entry.id)).toEqual(["older", "newer"]);
  });

  it("uses updatedAt, not createdAt, for recently updated", () => {
    expect(sortNotes([newer, older], "updated").map((entry) => entry.id)).toEqual(["older", "newer"]);
  });

  it("does not mutate its input", () => {
    const input = [older, newer];
    sortNotes(input, "oldest");

    expect(input.map((entry) => entry.id)).toEqual(["older", "newer"]);
  });
});

describe("read-later / watch-later tags", () => {
  it("adds the tag when absent and removes it when present", () => {
    expect(toggleTag(undefined, READ_LATER_TAG)).toEqual([READ_LATER_TAG]);
    expect(toggleTag(["x", READ_LATER_TAG], READ_LATER_TAG)).toEqual(["x"]);
  });

  it("matches an existing tag regardless of case rather than adding a duplicate", () => {
    expect(toggleTag(["Read-Later"], READ_LATER_TAG)).toEqual([]);
    expect(hasTag(note({ tags: ["WATCH-LATER"] }), WATCH_LATER_TAG)).toBe(true);
  });

  it("leaves other tags alone", () => {
    expect(toggleTag(["a", "b"], WATCH_LATER_TAG)).toEqual(["a", "b", WATCH_LATER_TAG]);
  });
});
