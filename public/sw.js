// Atlas offline worker.
//
// Two rules, both learned the hard way:
//
// 1. A cache must never show someone an old version of their own app.
//    Pages are network-first - the cache is a fallback, never the source
//    of truth. Build assets are cache-first only because their URLs are
//    content-hashed and cannot go stale. Auth and API are never cached.
//
// 2. CACHING IS AN OPTIMISATION AND MUST NEVER COST THE USER A RESPONSE.
//    CacheStorage can fail outright - private windows, storage pressure,
//    enterprise policy, some headless builds all throw "Unexpected
//    internal error" from caches.open(). An early version of this file
//    did the caching inside the same try as the fetch, so one failing
//    cache call threw away a perfectly good network response and served
//    the offline page instead. Every cache call below is isolated: if
//    the cache is broken, Atlas behaves exactly as if there were no
//    service worker at all.
//
// Atlas's real data lives in localStorage and IndexedDB and is never
// touched here. All this caches is the shell needed to boot offline.

// Bump to retire every previous cache on the next activation.
const CACHE_VERSION = "atlas-v1";
const SHELL_URL = "/";

// Never cached at any stage: a stale auth response is worse than none,
// and cross-origin calls (Supabase) are not ours to cache.
const NEVER_CACHE = [/^\/api\//, /^\/auth\//];

function isNeverCached(pathname) {
  return NEVER_CACHE.some((pattern) => pattern.test(pathname));
}

// Content-hashed build output and static art: the URL changes when the
// file does, so serving these from cache can never be wrong.
function isImmutableAsset(pathname) {
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/icons/") || pathname.startsWith("/images/");
}

// Every cache touch goes through these two, and neither can throw.
async function readCache(request) {
  try {
    return (await caches.match(request)) ?? null;
  } catch {
    return null;
  }
}

async function writeCache(request, response) {
  try {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response);
  } catch {
    // No cache available. The user already has their response.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_VERSION);
        await cache.add(SHELL_URL);
      } catch {
        // Nothing warmed up; the worker still works, it just has no
        // offline shell until the first successful visit.
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)));
      } catch {
        // Old caches outliving a version bump is survivable; failing to
        // take control is not, so this must not stop clients.claim().
      }

      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request) {
  let response;

  try {
    response = await fetch(request);
  } catch {
    const cached = await readCache(request);

    if (cached) {
      return cached;
    }

    // Offline, and this page was never visited on this device. The shell
    // still boots, and Atlas reads its data locally from there.
    const shell = await readCache(SHELL_URL);

    if (shell) {
      return shell;
    }

    return new Response("Atlas is offline and this page has not been opened on this device yet.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Deliberately not awaited: the response goes back now, the cache
  // catches up afterwards, and a cache failure cannot reach the caller.
  if (response && response.ok) {
    writeCache(request, response.clone());
  }

  return response;
}

async function cacheFirst(request) {
  const cached = await readCache(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response && response.ok) {
    writeCache(request, response.clone());
  }

  return response;
}

// ---------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------
//
// This is the part that works with Atlas closed. The page is gone, but the
// service worker is woken by the push service to show the notification.
//
// The browser REQUIRES a visible notification for every push delivered
// under userVisibleOnly - a push handled silently costs the origin its
// push permission. So this always shows something, even when the payload
// is missing or unreadable.
self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A payload that is not JSON is still a real push that must be shown.
  }

  const title = typeof payload.title === "string" && payload.title ? payload.title : "Atlas";
  const body = typeof payload.body === "string" ? payload.body : "";
  const url = typeof payload.url === "string" && payload.url ? payload.url : "/";

  // A tag makes the browser REPLACE any showing notification that carries
  // the same one. That is right for a genuine repeat of a single reminder
  // and wrong for everything else: tagging by url meant every quest shared
  // the tag "/planning", so two quests due at the same time collapsed into
  // one and the first silently disappeared. Only the sender may set a tag,
  // and it must identify the reminder, not the page it links to.
  const options = {
    body,
    icon: "/icons/atlas-192.png",
    badge: "/icons/atlas-192.png",
    data: { url },
  };

  if (typeof payload.tag === "string" && payload.tag) {
    options.tag = payload.tag;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = (event.notification.data && event.notification.data.url) || "/";

  // Focus an Atlas window if one is already open rather than piling up new
  // ones; only open a window when none exists.
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of clientList) {
        if ("focus" in client) {
          try {
            if ("navigate" in client) {
              await client.navigate(target);
            }
            await client.focus();
            return;
          } catch {
            // A client that refuses to navigate is still worth focusing.
          }
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Someone else's server is not ours to cache or to fail for.
  if (url.origin !== self.location.origin || isNeverCached(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
