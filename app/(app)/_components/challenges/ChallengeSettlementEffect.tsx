"use client";

import { useChallengeSettlement } from "../../_lib/hooks/useChallengeSettlement";

// Renders nothing - mounted once at the app root so Challenges settle past
// days against real activity no matter which page last touched the data
// (see useChallengeSettlement.ts).
export default function ChallengeSettlementEffect() {
  useChallengeSettlement();
  return null;
}
