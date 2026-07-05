export type CategoryId =
  | "discipline"
  | "career"
  | "trading"
  | "physical-health"
  | "self-development";

export type AttributeId = CategoryId;

export type Category = Readonly<{
  id: CategoryId;
  name: string;
  icon: string;
  accent: string;
  description: string;
}>;
