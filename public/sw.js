// WebflowX service worker. It handles push notifications, makes the app installable, and shows a plain
// "you're offline" page when a page can't be reached. The offline page is the only thing it stores: no app code
// or data is cached, so a deploy is never stuck behind a stale copy.
const OFFLINE_CACHE = "wfx-offline-v1"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((c) => c.add(new Request(OFFLINE_URL, { cache: "reload" }))).catch(() => {}).then(() => self.skipWaiting())
  )
})
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("wfx-offline-") && k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .catch(() => {})
      .then(() => self.clients.claim())
  )
)

// Only page navigations are touched, and only when the network fails.
self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.mode !== "navigate" || req.method !== "GET") return
  event.respondWith(
    fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } })))
  )
})

self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { /* ignore a malformed payload */ }
  const title = typeof data.title === "string" && data.title ? data.title : "WebflowX"
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      tag: typeof data.tag === "string" ? data.tag : undefined,
      renotify: !!data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: typeof data.url === "string" ? data.url : "/dashboard" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  let url = (event.notification.data && event.notification.data.url) || "/dashboard"
  // same-site paths only
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) url = "/dashboard"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.navigate(url).catch(() => {})
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
