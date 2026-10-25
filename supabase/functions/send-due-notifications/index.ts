// Atlas push sender.
//
// Runs on a schedule (pg_cron, every minute) and delivers every reminder
// whose time has come. This is the only part of Atlas that runs while the
// app is closed - a browser timer dies with the tab, so the alarm clock has
// to live somewhere the device does not control.
//
// SECURITY
//
// This function holds two secrets that must never reach a browser: the
// service-role key (it writes rows on behalf of users, bypassing RLS) and
// the VAPID private key (it is the identity push services verify). Both
// come from Edge Function secrets, never from the repository.
//
// It is deployed with --no-verify-jwt because pg_cron calls it machine to
// machine, so it guards itself with a shared CRON_SECRET instead: without
// that check the endpoint would be an open "send everyone's notifications
// now" button.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const BATCH_SIZE = 500;

type ScheduledRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  url: string;
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }

  return value;
}

Deno.serve(async (request) => {
  let cronSecret: string;
  let supabaseUrl: string;
  let serviceRoleKey: string;
  let vapidPublic: string;
  let vapidPrivate: string;
  let vapidSubject: string;

  try {
    cronSecret = requireEnv("CRON_SECRET");
    supabaseUrl = requireEnv("SUPABASE_URL");
    serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    vapidPublic = requireEnv("VAPID_PUBLIC_KEY");
    vapidPrivate = requireEnv("VAPID_PRIVATE_KEY");
    vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:atlas@example.com";
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { "content-type": "application/json" } });
  }

  // Constant-ish comparison on a shared secret. Without this the function
  // is an unauthenticated trigger for everyone's notifications.
  const provided = request.headers.get("x-cron-secret");

  if (!provided || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: due, error: dueError } = await supabase
    .from("scheduled_notifications")
    .select("id, user_id, title, body, url")
    .is("sent_at", null)
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (dueError) {
    return new Response(JSON.stringify({ error: dueError.message }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const rows = (due ?? []) as ScheduledRow[];

  if (rows.length === 0) {
    return new Response(JSON.stringify({ sent: 0, pending: 0 }), { headers: { "content-type": "application/json" } });
  }

  // One subscription lookup per user, not per notification: a user with ten
  // due reminders has the same devices for all ten.
  const userIds = [...new Set(rows.map((row) => row.user_id))];

  const { data: subscriptionRows, error: subscriptionError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .in("user_id", userIds)
    .is("expired_at", null);

  if (subscriptionError) {
    return new Response(JSON.stringify({ error: subscriptionError.message }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const byUser = new Map<string, SubscriptionRow[]>();

  for (const row of (subscriptionRows ?? []) as (SubscriptionRow & { user_id: string })[]) {
    const list = byUser.get(row.user_id) ?? [];
    list.push({ endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth });
    byUser.set(row.user_id, list);
  }

  const deliveredIds: string[] = [];
  const failures: { id: string; error: string }[] = [];
  const expiredEndpoints: string[] = [];

  for (const row of rows) {
    const subscriptions = byUser.get(row.user_id) ?? [];

    if (subscriptions.length === 0) {
      // Nobody to tell. Marking it sent is deliberate: leaving it pending
      // would make it fire the moment a device subscribes, days late.
      deliveredIds.push(row.id);
      continue;
    }

    const payload = JSON.stringify({ title: row.title, body: row.body, url: row.url });
    let anyDelivered = false;
    let lastError = "";

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payload,
          { TTL: 60 * 60 },
        );
        anyDelivered = true;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;

        // 404/410 mean the browser threw the subscription away - the user
        // cleared data, uninstalled, or revoked permission. Retrying it
        // forever would be pointless.
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(subscription.endpoint);
        }

        lastError = `${statusCode ?? ""} ${(error as Error).message ?? String(error)}`.trim();
      }
    }

    if (anyDelivered) {
      deliveredIds.push(row.id);
    } else {
      failures.push({ id: row.id, error: lastError || "unknown push failure" });
    }
  }

  if (deliveredIds.length > 0) {
    await supabase.from("scheduled_notifications").update({ sent_at: new Date().toISOString(), last_error: null }).in("id", deliveredIds);
  }

  for (const failure of failures) {
    await supabase.from("scheduled_notifications").update({ last_error: failure.error }).eq("id", failure.id);
  }

  if (expiredEndpoints.length > 0) {
    await supabase.from("push_subscriptions").update({ expired_at: new Date().toISOString() }).in("endpoint", expiredEndpoints);
  }

  return new Response(
    JSON.stringify({ sent: deliveredIds.length, failed: failures.length, expired: expiredEndpoints.length }),
    { headers: { "content-type": "application/json" } },
  );
});
