"use client";

import { useEffect, useRef } from "react";
import { useCloudSync } from "../../_lib/hooks/useCloudSync";
import { useProgression } from "../../_lib/hooks/useProgression";
import { getSupabaseBrowserClient } from "../../_lib/supabase/client";
import { computeUpcomingReminders } from "../../_lib/engines/reminder-engine";
import { hasActivePushSubscription, syncScheduledReminders } from "../../_lib/notifications/push-client";

// Keeps the server's copy of "what to notify, and when" in step with the
// user's quests.
//
// Renders nothing. Exists because the schedule has to reach the server
// while Atlas is OPEN, so that it can fire while Atlas is closed - the
// moment the app is gone there is nothing left to compute anything.
//
// Does nothing at all unless this device has actually subscribed to push,
// so a user who never turned notifications on never writes a row.

// Quest edits arrive in bursts (drag a quest, retime it, rename it). One
// upload after the burst, not one per keystroke.
const SYNC_DEBOUNCE_MS = 4000;

export default function QuestReminderSyncEffect() {
  const { user, isCloudSyncAvailable } = useCloudSync();
  const { questDefinitions, questCompletions, isReady } = useProgression();
  const timerRef = useRef<number | null>(null);
  // What was last uploaded, so an unchanged schedule does not re-upload on
  // every unrelated progression change.
  const lastPayloadRef = useRef<string>("");

  useEffect(() => {
    if (!isCloudSyncAvailable || !user || !isReady) {
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          if (!(await hasActivePushSubscription())) {
            return;
          }

          const reminders = computeUpcomingReminders(questDefinitions, questCompletions);
          const fingerprint = JSON.stringify(reminders.map((reminder) => [reminder.dedupeKey, reminder.sendAt, reminder.title]));

          if (fingerprint === lastPayloadRef.current) {
            return;
          }

          await syncScheduledReminders(getSupabaseBrowserClient(), user.id, reminders);
          lastPayloadRef.current = fingerprint;
        } catch {
          // Offline, RLS, a table that has not been created yet - none of
          // it is worth interrupting the user over. The next quest change,
          // or the next time Atlas opens, tries again.
        }
      })();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [isCloudSyncAvailable, isReady, questCompletions, questDefinitions, user]);

  return null;
}
