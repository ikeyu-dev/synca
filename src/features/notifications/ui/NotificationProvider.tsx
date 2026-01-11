"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import {
    registerServiceWorker,
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    type NotificationPermissionState,
} from "@/shared/lib/notifications";

interface NotificationContextValue {
    isSupported: boolean;
    permission: NotificationPermissionState;
    isReady: boolean;
    requestPermission: () => Promise<NotificationPermissionState>;
}

const NotificationContext = createContext<NotificationContextValue>({
    isSupported: false,
    permission: "default",
    isReady: false,
    requestPermission: async () => "denied",
});

/**
 * 通知機能を提供するプロバイダー
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermissionState>("default");
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            const supported = isNotificationSupported();
            setIsSupported(supported);

            if (supported) {
                setPermission(getNotificationPermission());
                await registerServiceWorker();
                setIsReady(true);
            }
        };

        init();
    }, []);

    const requestPermission = useCallback(async () => {
        const result = await requestNotificationPermission();
        setPermission(result);
        return result;
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                isSupported,
                permission,
                isReady,
                requestPermission,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

/**
 * 通知コンテキストを使用するフック
 */
export function useNotification() {
    return useContext(NotificationContext);
}
