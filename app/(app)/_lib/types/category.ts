export type CategoryId = string;

export type AttributeId = CategoryId;

export type Category = Readonly<{
  id: CategoryId;
  name: string;
  icon: string;
  accent: string;
  description?: string;
}>;
