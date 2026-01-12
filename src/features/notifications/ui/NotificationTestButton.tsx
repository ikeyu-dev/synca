"use client";

import { useState, useEffect } from "react";
import { useNotification } from "./NotificationProvider";
import {
    subscribeToPush,
    unsubscribeFromPush,
    isPushSubscribed,
} from "@/shared/lib/notifications";

/**
 * プッシュ通知トグルスイッチ
 */
export function NotificationToggle() {
    const { isSupported, permission, requestPermission } = useNotification();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const checkSubscription = async () => {
            if (!isSupported) {
                setIsLoading(false);
                return;
            }
            const subscribed = await isPushSubscribed();
            setIsSubscribed(subscribed);
            setIsLoading(false);
        };
        checkSubscription();
    }, [isSupported]);

    const handleToggle = async () => {
        if (isProcessing) return;

        setIsProcessing(true);

        try {
            if (isSubscribed) {
                const success = await unsubscribeFromPush();
                if (success) {
                    setIsSubscribed(false);
                }
            } else {
                if (permission === "default") {
                    const result = await requestPermission();
                    if (result !== "granted") {
                        setIsProcessing(false);
                        return;
                    }
                } else if (permission === "denied") {
                    alert(
                        "通知が拒否されています。ブラウザの設定から許可してください。"
                    );
                    setIsProcessing(false);
                    return;
                }

                const success = await subscribeToPush();
                if (success) {
                    setIsSubscribed(true);
                }
            }
        } catch (error) {
            console.error("通知設定エラー:", error);
        }

        setIsProcessing(false);
    };

    if (!isSupported) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <span className="loading loading-spinner loading-xs" />
                <span className="text-sm text-base-content/60">読込中...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-base-content/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
            </svg>
            <span className="text-sm">プッシュ通知</span>
            <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={isSubscribed}
                onChange={handleToggle}
                disabled={isProcessing}
            />
            {isProcessing && (
                <span className="loading loading-spinner loading-xs" />
            )}
        </div>
    );
}

/**
 * 後方互換性のためのエイリアス（非推奨）
 * @deprecated NotificationToggleを使用してください
 */
export const NotificationTestButton = NotificationToggle;
