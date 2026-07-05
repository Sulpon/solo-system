export type AccentColor = "purple" | "blue" | "green" | "orange";
export type CornerRadius = "compact" | "comfortable" | "rounded";
export type Density = "compact" | "normal" | "spacious";
export type MenaceTheme = "dark" | "oled";

export type AppearanceSettings = Readonly<{
  accentColor: AccentColor;
  cornerRadius: CornerRadius;
  density: Density;
  theme: MenaceTheme;
}>;

export type SettingsSection = "general" | "dashboard" | "quests" | "appearance" | "data";
