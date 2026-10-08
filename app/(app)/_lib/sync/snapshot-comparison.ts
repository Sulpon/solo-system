import { countEntities } from "../backup/atlas-backup";
import type { AtlasSnapshot } from "../atlas-snapshot";

// A read-only, non-destructive comparison of the local snapshot against a
// cloud snapshot.
//
// Exists so initialization can SHOW the user what differs before anything
// is written in either direction. It resolves nothing and decides nothing -
// the merge engine remains the only thing that reconciles, and it is not
// touched here.

export type EntityComparison = Readonly<{
  label: string;
  key: string;
  local: number | null;
  cloud: number | null;
}>;

export type SnapshotComparison = Readonly<{
  localKeyCount: number;
  cloudKeyCount: number;
  localOnlyKeys: ReadonlyArray<string>;
  cloudOnlyKeys: ReadonlyArray<string>;
  // Keys both sides have, with different raw contents. "Different" is a
  // byte comparison, not a semantic one: two snapshots that differ only in
  // key order inside a JSON object count as differing. That is deliberate -
  // overstating a difference is safe here, understating one is not.
  differingKeys: ReadonlyArray<string>;
  identicalKeys: ReadonlyArray<string>;
  // True when the cloud side has nothing at all, which is the expected
  // state for a brand-new project and the only state where an automatic
  // LOCAL -> CLOUD initial sync is safe.
  isCloudEmpty: boolean;
  entities: ReadonlyArray<EntityComparison>;
}>;

export function compareSnapshots(local: AtlasSnapshot, cloud: AtlasSnapshot): SnapshotComparison {
  const localKeys = Object.keys(local);
  const cloudKeys = Object.keys(cloud);
  const cloudKeySet = new Set(cloudKeys);
  const localKeySet = new Set(localKeys);

  const shared = localKeys.filter((key) => cloudKeySet.has(key));

  const localCounts = countEntities(local);
  const cloudCounts = countEntities(cloud);

  const entities: EntityComparison[] = localCounts
    .map((entry, index) => ({ label: entry.label, key: entry.key, local: entry.present ? entry.count : null, cloud: cloudCounts[index].present ? cloudCounts[index].count : null }))
    // Only levels where at least one side actually has the collection -
    // listing 40 absent entities as "0 vs 0" is noise that hides the real
    // differences.
    .filter((entry) => localKeySet.has(entry.key) || cloudKeySet.has(entry.key));

  return {
    localKeyCount: localKeys.length,
    cloudKeyCount: cloudKeys.length,
    localOnlyKeys: localKeys.filter((key) => !cloudKeySet.has(key)).sort(),
    cloudOnlyKeys: cloudKeys.filter((key) => !localKeySet.has(key)).sort(),
    differingKeys: shared.filter((key) => local[key] !== cloud[key]).sort(),
    identicalKeys: shared.filter((key) => local[key] === cloud[key]).sort(),
    isCloudEmpty: cloudKeys.length === 0,
    entities,
  };
}

// The one question initialization needs answered: may Atlas push local to
// a brand-new project without asking? Only when the cloud genuinely holds
// nothing. Anything else - even a single key - means a human decides.
export function isSafeForAutomaticInitialSync(comparison: SnapshotComparison): boolean {
  return comparison.isCloudEmpty;
}
