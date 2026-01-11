/**
 * ローカル通知クライアント
 */

import type { NotificationOptions, NotificationPermissionState } from "./types";

let swRegistration: ServiceWorkerRegistration | null = null;

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
