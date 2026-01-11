"use client";

import { useState } from "react";
import { useNotification } from "./NotificationProvider";

/**
 * 通知許可を求めるバナー
 */
export function NotificationPermissionBanner() {
    const { isSupported, permission, requestPermission } = useNotification();
    const [isDismissed, setIsDismissed] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    // 表示しない条件
    if (!isSupported || permission !== "default" || isDismissed) {
        return null;
    }

    const handleRequest = async () => {
        setIsRequesting(true);
        await requestPermission();
        setIsRequesting(false);
    };

    return (
        <div className="alert alert-info shadow-lg mb-4">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
            </svg>
            <div className="flex-1">
                <h3 className="font-bold">通知を有効にしますか?</h3>
                <p className="text-sm">新しいお知らせがあったときに通知を受け取れます</p>
            </div>
            <div className="flex gap-2">
                <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setIsDismissed(true)}
                >
                    後で
                </button>
                <button
                    className="btn btn-sm btn-primary"
                    onClick={handleRequest}
                    disabled={isRequesting}
                >
                    {isRequesting ? (
                        <span className="loading loading-spinner loading-xs" />
                    ) : (
                        "有効にする"
                    )}
                </button>
            </div>
        </div>
    );
}
