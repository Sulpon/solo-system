// One place for every piece of external material the thesis leans on -
// papers, references, links, PDFs, meeting notes - so research material
// never has to be hunted down across separate lists.

export type ResourceType = "Paper" | "Reference" | "Link" | "PDF" | "Meeting Note";

export const RESOURCE_TYPES: ReadonlyArray<ResourceType> = ["Paper", "Reference", "Link", "PDF", "Meeting Note"];

export type ResourceEntry = Readonly<{
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  notes: string;
}>;

export function createResourceId() {
  return `resource-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createResourceEntry(): ResourceEntry {
  return { id: createResourceId(), title: "", type: "Paper", url: "", notes: "" };
}
