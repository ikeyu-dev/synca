/**
 * Synca Service Worker
 * ローカルプッシュ通知とキャッシュ管理
 */

const CACHE_NAME = "synca-v1";
const STATIC_ASSETS = [
    "/",
    "/home",
    "/icon.svg",
    "/manifest.json",
];

// インストール時にキャッシュ
self.addEventListener("install", (event) => {
    console.log("[SW] Installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[SW] Caching static assets");
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener("activate", (event) => {
    console.log("[SW] Activating...");
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// フェッチイベント（ネットワークファースト）
self.addEventListener("fetch", (event) => {
    // API呼び出しはキャッシュしない
    if (event.request.url.includes("/api/")) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 成功した場合はキャッシュを更新
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // オフライン時はキャッシュから返す
                return caches.match(event.request);
            })
    );
});

// プッシュ通知受信
self.addEventListener("push", (event) => {
    console.log("[SW] Push received");

    let data = {
        title: "Synca",
        body: "新しいお知らせがあります",
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: "synca-notification",
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            vibrate: [200, 100, 200],
            requireInteraction: false,
            data: data.data || {},
        })
    );
});

// 通知クリック
self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Notification clicked");
    event.notification.close();

    const urlToOpen = event.notification.data?.url || "/home";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            // 既存のウィンドウがあればフォーカス
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // なければ新しいウィンドウを開く
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// メッセージ受信（アプリからの通知リクエスト）
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SHOW_NOTIFICATION") {
        const { title, options } = event.data;
        self.registration.showNotification(title, {
            body: options.body || "",
            icon: options.icon || "/icon.svg",
            badge: "/icon.svg",
            tag: options.tag || "synca-notification",
            vibrate: [200, 100, 200],
            requireInteraction: false,
            data: options.data || {},
        });
    }
});
