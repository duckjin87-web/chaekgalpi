// 책갈피 서비스워커 — 설치형(PWA) 지원 + 앱셸 오프라인 캐시(네트워크 우선)
const CACHE = "chaekgalpi-v11";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // API 요청은 항상 네트워크(캐시 금지)
  if (url.pathname.startsWith("/api/")) return;

  // 페이지 이동: 네트워크 우선, 실패 시 캐시(오프라인)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put("/index.html", res.clone())).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || Response.error()))
    );
    return;
  }

  // 정적 자산: 캐시 우선, 없으면 네트워크 후 캐시에 저장
  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
    )
  );
});
