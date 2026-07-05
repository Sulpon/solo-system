import type { CategoryId } from "./category";

export type ActivityEventType =
  | "quest_completed"
  | "quest_xp_awarded"
  | "attribute_xp_awarded"
  | "progress_goal_updated"
  | "progress_goal_completed"
  | "milestone_completed"
  | "goal_completed"
  | "dream_completed"
  | "goal_xp_awarded"
  | "daily_snapshot_saved";

export type ActivityEventSourceType = "quest" | "attribute" | "progress_goal" | "milestone" | "goal" | "dream" | "daily_snapshot";

export type ActivityEventMetadataValue = string | number | boolean | null | ActivityEventMetadata | ActivityEventMetadataValue[];

export type ActivityEventMetadata = Readonly<{
  [key: string]: ActivityEventMetadataValue;
}>;

export type ActivityEvent = Readonly<{
  id: string;
  type: ActivityEventType;
  createdAt: string;
  title: string;
  description?: string;
  sourceType: ActivityEventSourceType;
  sourceId: string;
  metadata: ActivityEventMetadata;
}>;

export type AttributeActivityEvent = ActivityEvent &
  Readonly<{
    metadata: ActivityEventMetadata & {
      attributeId?: CategoryId;
      attributeName?: string;
      xp?: number;
    };
  }>;
