import { flattenGoalTree, getInheritedAttributes } from "./goal-tree-storage";
import { getAttributePortfolio } from "./attribute-portfolio";
import { getCountry } from "./world-map/countries";
import { getCity } from "./world-map/cities";
import type { GoalTree, GoalNode } from "./types/goal-tree";
import type { Quest } from "./types/quest";
import type { Note } from "./types/note";
import type { MediaItem } from "./types/media-item";
import type { ActivityEvent } from "./types/activity-event";
import type { FocusHistoryEntry } from "./types/focus";
import type { Category } from "./types/category";

// Phase 4's "cross-app relationship primitives" - pure query functions over
// data every page already loads through its own real hooks. Nothing here
// is a new entity model or a new persisted field (the one exception,
// Note.links, already existed as a type - see note.ts - this module is
// simply the first real reader/writer of it). Every function below finds
// relationships using the SAME fields the existing UI already relies on:
// Quest.linkedProgressGoalId, Quest.categoryId, MediaItem.linkedGoalIds/
// linkedSkillIds/linkedNoteIds, Note.links, GoalNode.attributes/children,
// FocusHistoryEntry.linkedQuestId, ActivityEvent.sourceId, and
// getAttributePortfolio (the Attributes page's own existing goal-tree walk,
// reused rather than reimplemented). If a page needs a relationship not
// listed here, it should be resolvable the same way - never by inventing a
// new stored link.

export type RelatedEntity = Readonly<{
  id: string;
  title: string;
  href: string | null;
  meta?: string;
}>;

export type RelatedEntityGroup = Readonly<{
  label: string;
  entities: ReadonlyArray<RelatedEntity>;
}>;

// Drops empty groups so the UI never renders a "Notes (0)" placeholder -
// an absent relationship simply isn't shown, matching "do not generate
// fake relationships just to make the UI look complete."
function nonEmptyGroups(groups: ReadonlyArray<RelatedEntityGroup>): RelatedEntityGroup[] {
  return groups.filter((group) => group.entities.length > 0);
}

function collectDescendantIds(node: GoalNode): Set<string> {
  const ids = new Set<string>([node.id]);
  const walk = (children: ReadonlyArray<GoalNode>) => {
    for (const child of children) {
      ids.add(child.id);
      walk(child.children);
    }
  };
  walk(node.children);
  return ids;
}

function goalNodeToEntity(node: Pick<GoalNode, "id" | "title" | "progress">): RelatedEntity {
  return { id: node.id, title: node.title, href: "/goals", meta: `${node.progress}%` };
}

function questToEntity(quest: Quest): RelatedEntity {
  return { id: quest.id, title: quest.title, href: "/quests", meta: quest.kind === "habit" ? "Habit" : "Task" };
}

function noteToEntity(note: Note): RelatedEntity {
  return { id: note.id, title: note.title || "Untitled note", href: "/notes" };
}

function libraryItemToEntity(item: MediaItem): RelatedEntity {
  return { id: item.id, title: item.title, href: "/library", meta: item.type };
}

function attributeToEntity(attribute: Category): RelatedEntity {
  return { id: attribute.id, title: attribute.name, href: `/attributes/${attribute.id}` };
}

function activityEventToEntity(event: ActivityEvent): RelatedEntity {
  return { id: event.id, title: event.title, href: "/chronicle", meta: new Date(event.createdAt).toLocaleDateString() };
}

// ---- Goal relationships --------------------------------------------------

export function getGoalRelationships(
  goalId: string,
  goalTree: GoalTree,
  quests: ReadonlyArray<Quest>,
  notes: ReadonlyArray<Note>,
  libraryItems: ReadonlyArray<MediaItem>,
  attributes: ReadonlyArray<Category>,
  activityEvents: ReadonlyArray<ActivityEvent>,
): RelatedEntityGroup[] {
  const flat = flattenGoalTree(goalTree);
  const node = flat.find((item) => item.id === goalId);

  if (!node) {
    return [];
  }

  const descendantIds = collectDescendantIds(node);
  const linkedQuests = quests.filter((quest) => quest.linkedProgressGoalId && descendantIds.has(quest.linkedProgressGoalId));
  const inheritedAttributeIds = new Set([...(node.attributes ?? []), ...getInheritedAttributes(goalTree, goalId)]);
  const linkedSkills = attributes.filter((attribute) => inheritedAttributeIds.has(attribute.id));
  const linkedNotes = notes.filter((note) => (note.links ?? []).some((link) => link.entityType === "goal" && descendantIds.has(link.entityId)));
  const linkedLibrary = libraryItems.filter((item) => (item.linkedGoalIds ?? []).some((id) => descendantIds.has(id)));
  const linkedChronicle = activityEvents.filter((event) => descendantIds.has(event.sourceId));
  // Reverse direction of World Map's own Goal-linking UI (CountryDetailPanel
  // already lets a Country/City list its linked Goals) - this is the Goal
  // side of the exact same stored fields, node.worldMapLocationId/
  // worldMapCityId, not a new relationship.
  const country = node.worldMapLocationId ? getCountry(node.worldMapLocationId) : null;
  const city = node.worldMapCityId ? getCity(node.worldMapCityId) : null;
  const linkedWorld = [
    ...(country ? [{ id: country.id, title: country.name, href: "/world-map", meta: "Country" }] : []),
    ...(city ? [{ id: city.id, title: city.name, href: "/world-map", meta: "City" }] : []),
  ];

  return nonEmptyGroups([
    { label: "Quests", entities: linkedQuests.map(questToEntity) },
    { label: "Skills", entities: linkedSkills.map(attributeToEntity) },
    { label: "Notes", entities: linkedNotes.map(noteToEntity) },
    { label: "Library", entities: linkedLibrary.map(libraryItemToEntity) },
    { label: "World", entities: linkedWorld },
    { label: "Chronicle", entities: linkedChronicle.slice(0, 8).map(activityEventToEntity) },
  ]);
}

// ---- Quest relationships --------------------------------------------------

export function getQuestRelationships(
  quest: Quest,
  goalTree: GoalTree,
  notes: ReadonlyArray<Note>,
  libraryItems: ReadonlyArray<MediaItem>,
  attributes: ReadonlyArray<Category>,
  focusHistory: ReadonlyArray<FocusHistoryEntry>,
): RelatedEntityGroup[] {
  const flat = flattenGoalTree(goalTree);
  const linkedGoal = quest.linkedProgressGoalId ? flat.find((node) => node.id === quest.linkedProgressGoalId) : null;
  const linkedSkill = attributes.find((attribute) => attribute.id === quest.categoryId) ?? null;
  const linkedNotes = notes.filter((note) => (note.links ?? []).some((link) => link.entityType === "quest" && link.entityId === quest.id));
  const linkedLibrary = quest.linkedProgressGoalId
    ? libraryItems.filter((item) => (item.linkedGoalIds ?? []).includes(quest.linkedProgressGoalId as string))
    : [];
  const relatedFocusSessions = focusHistory.filter((entry) => entry.linkedQuestId === quest.id).slice(0, 5);

  return nonEmptyGroups([
    { label: "Goal", entities: linkedGoal ? [goalNodeToEntity(linkedGoal)] : [] },
    { label: "Skill", entities: linkedSkill ? [attributeToEntity(linkedSkill)] : [] },
    { label: "Notes", entities: linkedNotes.map(noteToEntity) },
    { label: "Library", entities: linkedLibrary.map(libraryItemToEntity) },
    {
      label: "Focus History",
      entities: relatedFocusSessions.map((entry) => ({
        id: entry.id,
        title: `${Math.round(entry.duration / 60)} min session`,
        href: null,
        meta: new Date(entry.start).toLocaleDateString(),
      })),
    },
  ]);
}

// ---- Skill (attribute) relationships --------------------------------------

export function getSkillRelationships(
  attributeId: string,
  goalTree: GoalTree,
  quests: ReadonlyArray<Quest>,
  notes: ReadonlyArray<Note>,
  libraryItems: ReadonlyArray<MediaItem>,
): RelatedEntityGroup[] {
  // Reuses the Attributes page's own existing goal-tree walk (see
  // AttributePage.tsx) instead of re-deriving it - the exact same
  // dreams/goals/milestones/progressGoals/quests portfolio, just regrouped
  // for the relationship panel's shape.
  const portfolio = getAttributePortfolio(goalTree, quests, attributeId);
  const relatedGoals = [...portfolio.dreams, ...portfolio.goals, ...portfolio.milestones, ...portfolio.progressGoals].slice(0, 10).map(goalNodeToEntity);

  const linkedNotes = notes.filter((note) => (note.links ?? []).some((link) => link.entityType === "attribute" && link.entityId === attributeId));
  const linkedLibrary = libraryItems.filter((item) => (item.linkedSkillIds ?? []).includes(attributeId));

  return nonEmptyGroups([
    { label: "Goals", entities: relatedGoals },
    { label: "Quests", entities: portfolio.quests.map(questToEntity) },
    { label: "Notes", entities: linkedNotes.map(noteToEntity) },
    { label: "Library", entities: linkedLibrary.map(libraryItemToEntity) },
  ]);
}

// ---- Note relationships (both directions) ---------------------------------

export function getNoteRelationships(
  note: Note,
  goalTree: GoalTree,
  quests: ReadonlyArray<Quest>,
  attributes: ReadonlyArray<Category>,
  allNotes: ReadonlyArray<Note>,
  libraryItems: ReadonlyArray<MediaItem>,
): RelatedEntityGroup[] {
  const flat = flattenGoalTree(goalTree);
  const links = note.links ?? [];

  const linkedGoals = links
    .filter((link) => link.entityType === "goal")
    .map((link) => flat.find((node) => node.id === link.entityId))
    .filter((node): node is GoalNode => Boolean(node));
  const linkedQuests = links
    .filter((link) => link.entityType === "quest")
    .map((link) => quests.find((quest) => quest.id === link.entityId))
    .filter((quest): quest is Quest => Boolean(quest));
  const linkedSkills = links
    .filter((link) => link.entityType === "attribute")
    .map((link) => attributes.find((attribute) => attribute.id === link.entityId))
    .filter((attribute): attribute is Category => Boolean(attribute));
  const linkedNotes = links
    .filter((link) => link.entityType === "note" && link.entityId !== note.id)
    .map((link) => allNotes.find((candidate) => candidate.id === link.entityId))
    .filter((candidate): candidate is Note => Boolean(candidate));
  // Reverse direction: Library items point AT Notes via linkedNoteIds - see
  // LibraryLinkedNotes.tsx's own comment on why this stays a one-way stored
  // field with a reverse query here, rather than a second stored pointer.
  const backlinkedLibrary = libraryItems.filter((item) => (item.linkedNoteIds ?? []).includes(note.id));

  return nonEmptyGroups([
    { label: "Goals", entities: linkedGoals.map(goalNodeToEntity) },
    { label: "Quests", entities: linkedQuests.map(questToEntity) },
    { label: "Skills", entities: linkedSkills.map(attributeToEntity) },
    { label: "Related Notes", entities: linkedNotes.map(noteToEntity) },
    { label: "Used In (Library)", entities: backlinkedLibrary.map(libraryItemToEntity) },
  ]);
}
