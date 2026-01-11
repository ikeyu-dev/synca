"use client";

import { useState } from "react";
import { useNotification } from "./NotificationProvider";
import { showNotification } from "@/shared/lib/notifications";

/**
 * 通知テストボタン
 */
export function NotificationTestButton() {
    const { isSupported, permission, requestPermission } = useNotification();
    const [isSending, setIsSending] = useState(false);

    const handleTest = async () => {
        if (permission === "default") {
            await requestPermission();
            return;
        }

        if (permission !== "granted") {
            alert("通知が許可されていません。ブラウザの設定から許可してください。");
            return;
        }

        setIsSending(true);
        try {
            await showNotification("Synca テスト通知", {
                body: "通知が正常に動作しています",
                tag: "synca-test",
                url: "/home",
            });
        } catch (error) {
            console.error("通知送信エラー:", error);
            alert("通知の送信に失敗しました");
        }
        setIsSending(false);
    };

    if (!isSupported) {
        return null;
    }

    return (
        <button
            className="btn btn-outline btn-sm"
            onClick={handleTest}
            disabled={isSending}
        >
            {isSending ? (
                <span className="loading loading-spinner loading-xs" />
            ) : (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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
            )}
            通知テスト
        </button>
    );
}
