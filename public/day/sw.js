/* JWC Rundown service worker：收推播＋斷網時用上次的版本 */
const CACHE = "jwc-rundown-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// 頁面和 rundown 資料：先拿網路最新版，失敗才用快取（場地訊號差也打得開）
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if(e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if(res.ok){ const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: url.pathname.endsWith("/day/") }))
  );
});

self.addEventListener("push", (e) => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(err){ d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "JWC Rundown", {
    body: d.body || "",
    tag: d.tag || undefined,
    icon: "icon-192.png",
    badge: "icon-192.png",
    data: { url: d.url || "./" }
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for(const c of list){ if(c.url.includes("/day/")){ c.navigate(target).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
