// A Finding is a conclusion worth keeping around because it may end up in
// the thesis itself - distinct from a raw Research Note, which is closer to
// a working thought that hasn't been confirmed yet.

export type FindingEntry = Readonly<{
  id: string;
  title: string;
  content: string;
}>;

export function createFindingId() {
  return `finding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createFindingEntry(): FindingEntry {
  return { id: createFindingId(), title: "", content: "" };
}
