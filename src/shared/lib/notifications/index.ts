export {
    registerServiceWorker,
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    showNotification,
    notifyNewNotices,
} from "./client";

export { checkAndNotifyNewNotices } from "./noticeNotifier";

export type {
    NotificationOptions,
    NotificationPermissionState,
    NotificationState,
} from "./types";
