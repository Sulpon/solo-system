"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "../Card";
import { useCloudSync } from "../../_lib/hooks/useCloudSync";
import { useProgression } from "../../_lib/hooks/useProgression";
import { getSupabaseBrowserClient } from "../../_lib/supabase/client";
import { computeUpcomingReminders, DEFAULT_LEAD_MINUTES, REMINDER_HORIZON_DAYS } from "../../_lib/engines/reminder-engine";
import { getPushSupport, hasActivePushSubscription, subscribeToPush, syncScheduledReminders, unsubscribeFromPush } from "../../_lib/notifications/push-client";

// Turning background reminders on, and being honest about what they need.
//
// Background delivery is the whole point: a browser timer dies with the
// tab, so a reminder that only works while Atlas is open is not a
// reminder. That requires a push subscription tied to an account, which is
// why this panel refuses to pretend when the user is signed out or the
// keys are not configured - a toggle that silently does nothing is worse
// than no toggle.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export default function NotificationsPanel() {
  const { user, isCloudSyncAvailable } = useCloudSync();
  const { questDefinitions, questCompletions } = useProgression();

  const [support, setSupport] = useState<"checking" | "supported" | "unsupported" | "insecure-context">("checking");
  const [isEnabled, setIsEnabled] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const detected = getPushSupport();

      if (cancelled) {
        return;
      }

      setSupport(detected);

      if (detected === "supported") {
        const active = await hasActivePushSubscription();

        if (!cancelled) {
          setIsEnabled(active);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const pushSchedule = useCallback(async () => {
    if (!user) {
      return 0;
    }

    const reminders = computeUpcomingReminders(questDefinitions, questCompletions);
    await syncScheduledReminders(getSupabaseBrowserClient(), user.id, reminders);
    return reminders.length;
  }, [questCompletions, questDefinitions, user]);

  async function enable() {
    if (!user) {
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const result = await subscribeToPush(getSupabaseBrowserClient(), user.id, VAPID_PUBLIC_KEY);

      if (!result.ok) {
        setMessage(result.reason);
        return;
      }

      const count = await pushSchedule();
      setIsEnabled(true);
      setScheduledCount(count);
      setMessage(count === 0 ? "Enabled. No quests have a scheduled time yet, so there is nothing to remind you about." : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setIsBusy(false);
    }
  }

  async function disable() {
    setIsBusy(true);
    setMessage(null);

    try {
      await unsubscribeFromPush(getSupabaseBrowserClient());
      setIsEnabled(false);
      setScheduledCount(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not turn notifications off.");
    } finally {
      setIsBusy(false);
    }
  }

  async function refresh() {
    setIsBusy(true);
    setMessage(null);

    try {
      const count = await pushSchedule();
      setScheduledCount(count);
      setMessage(count === 0 ? "No upcoming scheduled quests to remind you about." : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not refresh the schedule.");
    } finally {
      setIsBusy(false);
    }
  }

  const blocker = !isCloudSyncAvailable
    ? "Cloud sync is not configured, so there is no account to deliver notifications to."
    : !user
      ? "Sign in to receive reminders. A notification that arrives while Atlas is closed is sent by the server, which needs to know who you are."
      : !VAPID_PUBLIC_KEY
        ? "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set, so this build cannot subscribe to push."
        : support === "insecure-context"
          ? "Background notifications need HTTPS. Open Atlas over https:// (or localhost) to enable them."
          : support === "unsupported"
            ? "This browser does not support background push notifications."
            : null;

  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Notifications</p>
      <h2 className="mt-2 text-xl font-black text-white">Quest Reminders</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Reminds you {DEFAULT_LEAD_MINUTES} minutes before a quest with a scheduled time is due. Sent from the server, so they arrive even when Atlas is closed. Only quests that have a time are included — all-day quests never interrupt you.
      </p>

      {blocker ? (
        <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">{blocker}</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void (isEnabled ? disable() : enable())}
              disabled={isBusy || support === "checking"}
              className={
                "rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 " +
                (isEnabled
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-100 hover:border-rose-300"
                  : "border-cyan-400/40 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20")
              }
            >
              {isBusy ? "Working…" : isEnabled ? "Turn off reminders" : "Turn on reminders"}
            </button>

            {isEnabled ? (
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={isBusy}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/60 hover:text-white disabled:opacity-50"
              >
                Refresh schedule
              </button>
            ) : null}
          </div>

          {isEnabled ? (
            <p className="mt-3 text-sm text-slate-400">
              On for this device.
              {scheduledCount !== null ? ` ${scheduledCount} reminder${scheduledCount === 1 ? "" : "s"} queued for the next ${REMINDER_HORIZON_DAYS} days.` : ""}
            </p>
          ) : null}

          {message ? <p className="mt-3 text-sm text-amber-200">{message}</p> : null}

          <p className="mt-4 text-xs text-slate-500">
            Each device is subscribed separately — turning this on here does not turn it on on your phone. Reminders are scheduled {REMINDER_HORIZON_DAYS} days ahead and refresh whenever you change a quest.
          </p>
        </>
      )}
    </Card>
  );
}
