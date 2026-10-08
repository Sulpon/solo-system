import { STORAGE_KEYS } from "../storage-keys";

// The Atlas backup format, and everything that can be decided about a
// backup without touching a browser API - so all of it is testable.
//
// Design rule: a backup is built from the SAME generic menace-* sweep the
// cloud snapshot already uses (collectAtlasSnapshot), never from a
// hand-maintained key list. A curated list silently goes stale the moment
// a feature adds a key - which is exactly what has happened to
// DataSettingsPanel's own "clear" list, which is missing a third of the
// app's collections. A backup that quietly omits data is worse than no
// backup, because it is trusted.

export const ATLAS_BACKUP_VERSION = 1;

// Bumped only when the SHAPE of this file changes in a way a reader must
// know about. Unrelated to the app version.
export const ATLAS_BACKUP_SCHEMA_VERSION = 1;

export type AttachmentRecord = Readonly<{
  id: string;
  byteSize: number;
  // Present only when the bytes were actually exported alongside.
  contentType?: string;
}>;

export type AtlasBackup = Readonly<{
  backupVersion: number;
  schemaVersion: number;
  createdAt: string;
  appVersion: string;
  source: "browser-local";
  // Atlas runs on several origins (the Vercel deployment, localhost, and
  // the desktop app's 127.0.0.1) and each has its OWN localStorage. A
  // backup is meaningless without knowing which one it came from - the
  // three datasets are genuinely different, not copies.
  origin: string;
  localStorage: Readonly<Record<string, string>>;
  // Every record found in IndexedDB, whether or not its bytes were
  // exported. Listing them unconditionally is what lets verification say
  // honestly "12 attachments exist, 12 exported" or "...0 exported".
  attachments: ReadonlyArray<AttachmentRecord>;
  attachmentsExported: boolean;
  metadata: BackupMetadata;
}>;

export type BackupMetadata = Readonly<{
  keys: ReadonlyArray<string>;
  keyCount: number;
  totalSize: number;
  attachmentCount: number;
  attachmentBytes: number;
  entityCounts: ReadonlyArray<EntityCount>;
}>;

export type EntityCount = Readonly<{
  label: string;
  key: string;
  // A count for an array-shaped collection; null for a singleton or an
  // object-shaped value, where "how many" is not a meaningful question.
  count: number | null;
  present: boolean;
}>;

// Human labels for the collections worth showing in a manifest. This list
// is for DISPLAY ONLY - it never decides what gets backed up, so a key
// missing from here is still fully captured, it just is not called out by
// name. Any menace-* key not listed is still counted in keyCount/keys.
const ENTITY_LABELS: ReadonlyArray<Readonly<{ label: string; key: string }>> = [
  { label: "Quests", key: STORAGE_KEYS.questList },
  { label: "Quest completions", key: STORAGE_KEYS.questCompletions },
  { label: "Quest reflections", key: STORAGE_KEYS.questReflections },
  { label: "Goal tree", key: STORAGE_KEYS.goalTree },
  { label: "Goal XP events", key: STORAGE_KEYS.goalXpEvents },
  { label: "Bonus XP events", key: STORAGE_KEYS.bonusXpEvents },
  { label: "Activity events", key: STORAGE_KEYS.activityEvents },
  { label: "Daily snapshots", key: STORAGE_KEYS.dailySnapshots },
  { label: "Attributes (skills)", key: STORAGE_KEYS.attributes },
  { label: "Focus history", key: STORAGE_KEYS.focusHistory },
  { label: "Workout sessions", key: STORAGE_KEYS.workoutSessions },
  { label: "Workout templates", key: STORAGE_KEYS.workoutTemplates },
  { label: "Exercise library", key: STORAGE_KEYS.exerciseLibrary },
  { label: "Bodyweight entries", key: STORAGE_KEYS.bodyweightEntries },
  { label: "Challenges", key: STORAGE_KEYS.challenges },
  { label: "Notes", key: STORAGE_KEYS.notes },
  { label: "Library items", key: STORAGE_KEYS.libraryItems },
  { label: "Journal entries", key: STORAGE_KEYS.journalEntries },
  { label: "Rewards", key: STORAGE_KEYS.rewardCollection },
  { label: "Real-life rewards", key: STORAGE_KEYS.realLifeRewards },
  { label: "Manual achievements", key: STORAGE_KEYS.manualAchievements },
  { label: "Manual streaks", key: STORAGE_KEYS.manualStreaks },
  { label: "Vacancies", key: STORAGE_KEYS.vacancyEntries },
  { label: "Companies", key: STORAGE_KEYS.companyEntries },
  { label: "CV entries", key: STORAGE_KEYS.cvEntries },
  { label: "Cover letters", key: STORAGE_KEYS.coverLetterEntries },
  { label: "Experience entries", key: STORAGE_KEYS.experienceEntries },
  { label: "Education entries", key: STORAGE_KEYS.educationEntries },
  { label: "Skill entries", key: STORAGE_KEYS.skillEntries },
  { label: "Experiments", key: STORAGE_KEYS.experimentEntries },
  { label: "Research notes", key: STORAGE_KEYS.researchNoteEntries },
  { label: "Manuscript chapters", key: STORAGE_KEYS.manuscriptChapters },
  { label: "Writing log", key: STORAGE_KEYS.writingLogEntries },
  { label: "Capture events", key: STORAGE_KEYS.captureEvents },
  { label: "Wardrobe items", key: STORAGE_KEYS.wardrobeItems },
  { label: "Character photos", key: STORAGE_KEYS.characterReferencePhotos },
  { label: "JARVIS plans", key: STORAGE_KEYS.jarvisPlans },
];

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function countEntities(snapshot: Readonly<Record<string, string>>): EntityCount[] {
  return ENTITY_LABELS.map(({ label, key }) => {
    const raw = snapshot[key];

    if (raw === undefined) {
      return { label, key, count: null, present: false };
    }

    const parsed = safeParse(raw);
    return { label, key, count: Array.isArray(parsed) ? parsed.length : null, present: true };
  });
}

export function measureSnapshotSize(snapshot: Readonly<Record<string, string>>): number {
  return Object.entries(snapshot).reduce((total, [key, value]) => total + key.length + value.length, 0);
}

export function buildBackup(input: {
  snapshot: Readonly<Record<string, string>>;
  attachments: ReadonlyArray<AttachmentRecord>;
  attachmentsExported: boolean;
  origin: string;
  appVersion: string;
  createdAt?: string;
}): AtlasBackup {
  const keys = Object.keys(input.snapshot).sort();

  return {
    backupVersion: ATLAS_BACKUP_VERSION,
    schemaVersion: ATLAS_BACKUP_SCHEMA_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    appVersion: input.appVersion,
    source: "browser-local",
    origin: input.origin,
    localStorage: input.snapshot,
    attachments: input.attachments,
    attachmentsExported: input.attachmentsExported,
    metadata: {
      keys,
      keyCount: keys.length,
      totalSize: measureSnapshotSize(input.snapshot),
      attachmentCount: input.attachments.length,
      attachmentBytes: input.attachments.reduce((total, attachment) => total + attachment.byteSize, 0),
      entityCounts: countEntities(input.snapshot),
    },
  };
}

// ---- Verification ---------------------------------------------------------

export type VerificationIssue = Readonly<{ severity: "error" | "warning"; message: string }>;

export type VerificationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<VerificationIssue>;
}>;

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((entry) => typeof entry === "string");
}

// Structural validation of a parsed backup. Deliberately strict about the
// things a restore depends on, and deliberately a WARNING (not an error)
// about things that are merely worth knowing - an empty Atlas is a valid
// backup of an empty Atlas, and a backup without attachment bytes is still
// a real backup of the localStorage half.
export function verifyBackup(candidate: unknown): VerificationResult {
  const issues: VerificationIssue[] = [];
  const fail = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });

  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    return { ok: false, issues: [{ severity: "error", message: "Backup is not a JSON object." }] };
  }

  const backup = candidate as Partial<AtlasBackup>;

  if (backup.source !== "browser-local") fail(`Unrecognised backup source: ${String(backup.source)}`);
  if (typeof backup.backupVersion !== "number") fail("Missing backupVersion.");
  else if (backup.backupVersion > ATLAS_BACKUP_VERSION) fail(`Backup version ${backup.backupVersion} is newer than this build understands (${ATLAS_BACKUP_VERSION}).`);

  if (typeof backup.createdAt !== "string" || Number.isNaN(new Date(backup.createdAt).getTime())) fail("Missing or unparseable createdAt timestamp.");

  if (!isRecordOfStrings(backup.localStorage)) {
    fail("localStorage payload is missing or is not a flat map of strings.");
    return { ok: false, issues };
  }

  const snapshot = backup.localStorage;
  const actualKeys = Object.keys(snapshot);

  // The whole point of the generic sweep: anything that is not menace-*
  // did not come from the snapshot system and should not be restored by it.
  const foreignKeys = actualKeys.filter((key) => !key.startsWith("menace-"));
  if (foreignKeys.length > 0) fail(`Backup contains ${foreignKeys.length} non-menace key(s), which the restore path would not handle: ${foreignKeys.slice(0, 5).join(", ")}`);

  const metadata = backup.metadata;
  if (!metadata || typeof metadata !== "object") {
    fail("Missing metadata block.");
    return { ok: false, issues };
  }

  // The counts are what make the backup self-checking: if they disagree
  // with the payload, something truncated or rewrote the file.
  if (metadata.keyCount !== actualKeys.length) fail(`Manifest says ${metadata.keyCount} keys but the payload contains ${actualKeys.length}.`);

  const declaredKeys = Array.isArray(metadata.keys) ? metadata.keys : [];
  const missingFromPayload = declaredKeys.filter((key) => !(key in snapshot));
  if (missingFromPayload.length > 0) fail(`${missingFromPayload.length} key(s) listed in the manifest are absent from the payload: ${missingFromPayload.slice(0, 5).join(", ")}`);

  const unlistedKeys = actualKeys.filter((key) => !declaredKeys.includes(key));
  if (unlistedKeys.length > 0) fail(`${unlistedKeys.length} key(s) in the payload are missing from the manifest: ${unlistedKeys.slice(0, 5).join(", ")}`);

  const measured = measureSnapshotSize(snapshot);
  if (metadata.totalSize !== measured) warn(`Manifest size ${metadata.totalSize} does not match the measured ${measured}.`);

  const unparseable = actualKeys.filter((key) => safeParse(snapshot[key]) === undefined);
  if (unparseable.length > 0) warn(`${unparseable.length} value(s) are not valid JSON and will be restored verbatim: ${unparseable.slice(0, 3).join(", ")}`);

  if (actualKeys.length === 0) warn("Backup contains no Atlas keys — this is a backup of an empty Atlas.");

  const attachments = Array.isArray(backup.attachments) ? backup.attachments : [];
  if (attachments.length > 0 && backup.attachmentsExported !== true) {
    warn(`${attachments.length} attachment record(s) exist but their file contents were NOT exported — restoring this backup will not bring the files back.`);
  }

  return { ok: issues.every((issue) => issue.severity !== "error"), issues };
}

export function backupFileName(createdAt: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `atlas-backup-${createdAt.getFullYear()}-${pad(createdAt.getMonth() + 1)}-${pad(createdAt.getDate())}-${pad(createdAt.getHours())}-${pad(createdAt.getMinutes())}.json`;
}

export function attachmentsFileName(createdAt: Date = new Date()): string {
  return backupFileName(createdAt).replace("atlas-backup-", "atlas-attachments-");
}
