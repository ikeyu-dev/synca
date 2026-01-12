export {
    registerServiceWorker,
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    showNotification,
    notifyNewNotices,
    getPushSubscription,
    subscribeToPush,
    unsubscribeFromPush,
    isPushSubscribed,
} from "./client";

export { checkAndNotifyNewNotices } from "./noticeNotifier";

export type {
    NotificationOptions,
    NotificationPermissionState,
    NotificationState,
} from "./types";
