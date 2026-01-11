/**
 * 通知関連の型定義
 */

export type NotificationPermissionState = "default" | "granted" | "denied";

export interface NotificationOptions {
    body?: string;
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
    url?: string;
}

export interface NotificationState {
    isSupported: boolean;
    permission: NotificationPermissionState;
    isServiceWorkerReady: boolean;
}
