import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScheduledReminder } from "../engines/reminder-engine";

// Subscribing this device, and keeping the server's copy of the schedule
// in step with the user's quests.
//
// Everything here is best-effort and must never throw into the UI: push is
// an enhancement, and a browser that refuses it (permission denied, no
// service worker, private window, an iOS version without it) has to leave
// Atlas working exactly as before.

export const PUSH_SUBSCRIPTIONS_TABLE = "push_subscriptions";
export const SCHEDULED_NOTIFICATIONS_TABLE = "scheduled_notifications";

export type PushSupport = "supported" | "unsupported" | "insecure-context";

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") {
    return "unsupported";
  }

  // Push requires a secure context. localhost counts; plain http on a LAN
  // address does not, which is a confusing failure worth naming.
  if (!window.isSecureContext) {
    return "insecure-context";
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }

  return "supported";
}

// The applicationServerKey has to be raw bytes, not the base64url string
// the key is distributed as.
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

function encodeKey(subscription: PushSubscription, name: "p256dh" | "auth"): string | null {
  const key = subscription.getKey(name);

  if (!key) {
    return null;
  }

  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

export type SubscribeResult = Readonly<{ ok: true } | { ok: false; reason: string }>;

export async function subscribeToPush(supabase: SupabaseClient, userId: string, vapidPublicKey: string): Promise<SubscribeResult> {
  if (getPushSupport() !== "supported") {
    return { ok: false, reason: "This browser cannot deliver background notifications." };
  }

  if (!vapidPublicKey) {
    return { ok: false, reason: "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured." };
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return { ok: false, reason: permission === "denied" ? "Notifications are blocked for this site." : "Notification permission was dismissed." };
  }

  const registration = await navigator.serviceWorker.ready;

  // Reuse an existing subscription rather than churning endpoints: each
  // new one would leave a dead row behind on the server.
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "Could not subscribe to push." };
    }
  }

  const p256dh = encodeKey(subscription, "p256dh");
  const auth = encodeKey(subscription, "auth");

  if (!p256dh || !auth) {
    return { ok: false, reason: "The browser returned an incomplete push subscription." };
  }

  const { error } = await supabase.from(PUSH_SUBSCRIPTIONS_TABLE).upsert(
    {
      endpoint: subscription.endpoint,
      user_id: userId,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 300),
      expired_at: null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}

export async function unsubscribeFromPush(supabase: SupabaseClient): Promise<void> {
  if (getPushSupport() !== "supported") {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  // Remove the server's copy FIRST. If the order were reversed and the
  // delete failed, the server would keep pushing to an endpoint the
  // browser has already thrown away.
  await supabase.from(PUSH_SUBSCRIPTIONS_TABLE).delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (getPushSupport() !== "supported" || Notification.permission !== "granted") {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription()) !== null;
}

// Replaces this user's pending schedule with the one just computed.
//
// Pending rows only: a notification already sent is history, and deleting
// it would let the same reminder fire twice if the schedule were uploaded
// again before the row aged out.
export async function syncScheduledReminders(supabase: SupabaseClient, userId: string, reminders: ReadonlyArray<ScheduledReminder>): Promise<void> {
  const keep = new Set(reminders.map((reminder) => reminder.dedupeKey));

  const { data: existing } = await supabase
    .from(SCHEDULED_NOTIFICATIONS_TABLE)
    .select("id, dedupe_key")
    .eq("user_id", userId)
    .is("sent_at", null);

  const stale = (existing ?? []).filter((row: { dedupe_key: string }) => !keep.has(row.dedupe_key)).map((row: { id: string }) => row.id);

  if (stale.length > 0) {
    await supabase.from(SCHEDULED_NOTIFICATIONS_TABLE).delete().in("id", stale);
  }

  if (reminders.length === 0) {
    return;
  }

  await supabase.from(SCHEDULED_NOTIFICATIONS_TABLE).upsert(
    reminders.map((reminder) => ({
      user_id: userId,
      dedupe_key: reminder.dedupeKey,
      quest_id: reminder.questId,
      title: reminder.title,
      body: reminder.body,
      url: reminder.url,
      send_at: reminder.sendAt,
      sent_at: null,
    })),
    { onConflict: "user_id,dedupe_key" },
  );
}
