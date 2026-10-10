import type { Note } from "../types/note";

// Turning a raw dump into something scannable.
//
// Everything here is derived from what the note already holds - nothing in
// this module is stored. A kind computed on read cannot drift out of step
// with the note's own content the way a saved `kind` column would, and it
// needs no migration for the notes already in localStorage.

export type NoteKind = "text" | "link" | "video" | "image" | "file";

// Hosts whose links are something to watch rather than something to read.
// A short, honest list: it only ever upgrades the label from "link" to
// "video", so an unknown host is simply a link rather than a wrong guess.
const VIDEO_HOSTS: ReadonlyArray<string> = ["youtube.com", "youtu.be", "vimeo.com", "twitch.tv", "ted.com", "rutube.ru", "kinopoisk.ru"];

// Deliberately permissive: this runs over whatever was pasted into a
// capture box, so it matches a bare "example.com/x" as well as a full URL.
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+\/[^\s<>"')]*/gi;

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_PATTERN);

  if (!match || match.length === 0) {
    return null;
  }

  const raw = match[0].replace(/[.,;:!?]+$/, "");
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function getUrlHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isVideoUrl(url: string): boolean {
  const host = getUrlHost(url);
  return host !== null && VIDEO_HOSTS.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

// What this note mostly is, for the icon and the filter. Attachments win
// over a link because a picture you dropped in is the thing you will
// recognise the note by.
export function getNoteKind(note: Note): NoteKind {
  const attachments = note.attachments ?? [];

  if (attachments.some((attachment) => attachment.fileType.startsWith("image/"))) {
    return "image";
  }

  if (attachments.length > 0) {
    return "file";
  }

  const url = note.url ?? extractFirstUrl(note.content);

  if (url) {
    return isVideoUrl(url) ? "video" : "link";
  }

  return "text";
}

// A title for something typed without one: the first line, trimmed to
// something that fits a card. Never invents words - it is always a prefix
// of what was actually written, or the host of the link that was pasted.
export function deriveNoteTitle(content: string, url?: string | null, maxLength = 60): string {
  const rawFirstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  // "watch later https://youtu.be/..." reads as "watch later": the address
  // is already shown as a link on the card, so repeating it in the title
  // only crowds it out. Still never adds a word that was not typed.
  const firstLine = rawFirstLine?.replace(URL_PATTERN, "").replace(/\s+/g, " ").trim();

  if (firstLine) {
    return firstLine.length <= maxLength ? firstLine : `${firstLine.slice(0, maxLength - 1).trimEnd()}…`;
  }

  const host = url ? getUrlHost(url) : null;

  if (host) {
    return host;
  }

  return "Untitled note";
}

export type InboxCounts = Readonly<Record<NoteKind, number>>;

export function countByKind(notes: ReadonlyArray<Note>): InboxCounts {
  const counts: Record<NoteKind, number> = { text: 0, link: 0, video: 0, image: 0, file: 0 };

  for (const note of notes) {
    counts[getNoteKind(note)] += 1;
  }

  return counts;
}

// Newest first: an inbox is read from the top, and the thing just dumped
// is the thing most likely still being thought about.
export function sortForInbox(notes: ReadonlyArray<Note>): Note[] {
  return [...notes].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}
