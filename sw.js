/* Book Swap service worker: keeps the app shell available and shows a friendly page when offline.
   Change VERSION whenever you upload a new index.html so phones pick up the update. */
const VERSION = "bookswap-v4";
const SHELL = ["./", "index.html", "offline.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never touch Firebase, fonts or book lookups
  if (req.mode === "navigate") {
    // Network first so updates show straight away; offline page if there's no connection.
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return res;
    }).catch(() => caches.match("offline.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

/* Tapping a phone notification: focus the open app and send it where to go,
   or open the app straight on the right screen if it was closed. */
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const data = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ("focus" in c) { c.postMessage({ type: "notif-click", data }); return c.focus(); }
    }
    const hash = data.kind === "chat" && data.chatId ? "#n-chat-" + encodeURIComponent(data.chatId) : "#n-mine";
    return self.clients.openWindow("./" + hash);
  }));
});
