// A file attached to an Atlas entity.
//
// Metadata ONLY - the actual bytes live in IndexedDB (see
// document-store.ts), keyed by this same id, so an entity in localStorage
// never carries real file weight and the cloud snapshot never tries to
// sync megabytes of binary through a JSON blob.
//
// Structurally identical to the existing CvDocument (types/cv.ts) and
// JournalPhoto (types/journal.ts), which were written before there was a
// shared type. Those two are deliberately left alone here - migrating them
// is a separate change with its own risk, and duplicating their shape once
// more would have been worse than naming it properly for new callers.
export type EntityAttachment = Readonly<{
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}>;

export function createAttachmentId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
