export type BodyweightUnit = "kg" | "lbs";

export type BodyweightEntry = Readonly<{
  id: string;
  date: string;
  weight: number;
  unit: BodyweightUnit;
  bodyFatPercent?: number;
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  thighsCm?: number;
  notes?: string;
  createdAt: string;
}>;
