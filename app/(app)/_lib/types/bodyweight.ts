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
  heightCm?: number;
  shoulderWidthCm?: number;
  hipsCm?: number;
  forearmCm?: number;
  calfCm?: number;
  neckCm?: number;
  notes?: string;
  createdAt: string;
}>;
