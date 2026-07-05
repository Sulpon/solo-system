export type WidgetSize = "sm" | "md" | "lg" | "xl";

export type OrderedListItem = Readonly<{
  order: number;
}>;

export type VisibleListItem = Readonly<{
  id: string;
  visible: boolean;
}>;

export type DuplicableListItem = Readonly<{
  id: string;
  title: string;
  visible: boolean;
}>;

export function orderByPosition<T extends OrderedListItem>(items: readonly T[]): T[] {
  return [...items].sort((first, second) => first.order - second.order);
}

export function normalizeOrder<T extends OrderedListItem>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ ...item, order: (index + 1) * 10 }));
}

export function toggleItemVisibility<T extends VisibleListItem>(items: readonly T[], id: string): T[] {
  return items.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item));
}

export function removeItemById<T extends { id: string }>(items: readonly T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

export function duplicateItemAfter<T extends DuplicableListItem>(
  items: readonly T[],
  id: string,
  makeCloneId: (source: T) => string,
): T[] {
  const index = items.findIndex((item) => item.id === id);

  if (index < 0) {
    return [...items];
  }

  const source = items[index];
  const clone = { ...source, id: makeCloneId(source), title: source.title + " Copy", visible: true } as T;
  const next = [...items];
  next.splice(index + 1, 0, clone);
  return next;
}
