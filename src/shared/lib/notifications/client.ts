/**
 * 通知クライアント（ローカル通知 + Web Push購読）
 */

import type { NotificationOptions, NotificationPermissionState } from "./types";

let swRegistration: ServiceWorkerRegistration | null = null;

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Base64 URL文字列をUint8Arrayに変換
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Service Workerを登録
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        console.log("[Notification] Service Worker not supported");
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
        });
        swRegistration = registration;
        console.log("[Notification] Service Worker registered");
        return registration;
    } catch (error) {
        console.error("[Notification] Service Worker registration failed:", error);
        return null;
    }
}

/**
 * 通知がサポートされているか確認
 */
export function isNotificationSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator
    );
}

/**
 * 現在の通知許可状態を取得
 */
export function getNotificationPermission(): NotificationPermissionState {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "default";
    }
    return Notification.permission as NotificationPermissionState;
}

/**
 * 通知の許可を要求
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
    if (!isNotificationSupported()) {
        return "denied";
    }

    try {
        const permission = await Notification.requestPermission();
        return permission as NotificationPermissionState;
    } catch (error) {
        console.error("[Notification] Permission request failed:", error);
        return "denied";
    }
}

/**
 * ローカル通知を表示
 */
export async function showNotification(
    title: string,
    options: NotificationOptions = {}
): Promise<boolean> {
    if (!isNotificationSupported()) {
        console.log("[Notification] Not supported");
        return false;
    }

    if (Notification.permission !== "granted") {
        console.log("[Notification] Permission not granted");
        return false;
    }

    try {
        // Service Workerが登録されていない場合は登録
        if (!swRegistration) {
            swRegistration = await navigator.serviceWorker.ready;
        }

        // Service Worker経由で通知を表示
        if (swRegistration) {
            swRegistration.active?.postMessage({
                type: "SHOW_NOTIFICATION",
                title,
                options: {
                    body: options.body,
                    icon: options.icon || "/icon.svg",
                    tag: options.tag || `synca-${Date.now()}`,
                    data: {
                        ...options.data,
                        url: options.url || "/home",
                    },
                },
            });
            return true;
        }

        // フォールバック: 直接Notification APIを使用
        new Notification(title, {
            body: options.body,
            icon: options.icon || "/icon.svg",
            tag: options.tag,
        });
        return true;
    } catch (error) {
        console.error("[Notification] Failed to show:", error);
        return false;
    }
}

/**
 * 新しいお知らせの通知を表示
 */
export async function notifyNewNotices(count: number): Promise<boolean> {
    return showNotification("Synca", {
        body: `新しいお知らせが${count}件あります`,
        tag: "synca-notices",
        url: "/notices",
    });
}

/**
 * Web Pushの購読状態を取得
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
    if (!isNotificationSupported()) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        return await registration.pushManager.getSubscription();
    } catch (error) {
        console.error("[Notification] 購読状態の取得に失敗:", error);
        return null;
    }
}

/**
 * Web Pushを購読
 */
export async function subscribeToPush(): Promise<boolean> {
    if (!isNotificationSupported()) {
        console.log("[Notification] Push not supported");
        return false;
    }

    if (!VAPID_PUBLIC_KEY) {
        console.error("[Notification] VAPID公開鍵が設定されていません");
        return false;
    }

    try {
        // 通知許可を確認
        if (Notification.permission !== "granted") {
            const permission = await requestNotificationPermission();
            if (permission !== "granted") {
                console.log("[Notification] Permission denied");
                return false;
            }
        }

        const registration = await navigator.serviceWorker.ready;

        // 既存の購読があれば解除
        const existingSubscription =
            await registration.pushManager.getSubscription();
        if (existingSubscription) {
            await existingSubscription.unsubscribe();
        }

        // 新しい購読を作成
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });

        // サーバーに購読情報を送信
        const response = await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                userAgent: navigator.userAgent,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "購読の登録に失敗しました");
        }

        console.log("[Notification] Push subscription registered");
        return true;
    } catch (error) {
        console.error("[Notification] Push subscription failed:", error);
        return false;
    }
}

/**
 * Web Pushの購読を解除
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    if (!isNotificationSupported()) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            console.log("[Notification] No subscription to unsubscribe");
            return true;
        }

        // サーバーから購読を削除
        const response = await fetch("/api/notifications/unsubscribe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                endpoint: subscription.endpoint,
            }),
        });

        if (!response.ok) {
            console.error("[Notification] Server unsubscribe failed");
        }

        // ブラウザの購読を解除
        await subscription.unsubscribe();

        console.log("[Notification] Push subscription removed");
        return true;
    } catch (error) {
        console.error("[Notification] Unsubscribe failed:", error);
        return false;
    }
}

/**
 * Push購読が有効かどうかを確認
 */
export async function isPushSubscribed(): Promise<boolean> {
    const subscription = await getPushSubscription();
    return subscription !== null;
}
