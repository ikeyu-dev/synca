"use client";

import { useState, useEffect, useCallback } from "react";
import { Loading } from "@/shared/ui";

/**
 * 登録されたFormの型定義
 */
interface RegisteredForm {
    id: string;
    url: string;
    title?: string;
    source?: string;
    registeredAt: string;
    completed: boolean;
    completedAt?: string;
}

/**
 * 日時を相対表示
 */
function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    return date.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
    });
}

/**
 * URLからFormsの種類を判定
 */
function getFormsType(url: string): "microsoft" | "google" | "unknown" {
    const lowerUrl = url.toLowerCase();
    if (
        lowerUrl.includes("forms.office.com") ||
        lowerUrl.includes("forms.microsoft.com") ||
        lowerUrl.includes("forms.cloud.microsoft")
    ) {
        return "microsoft";
    }
    if (
        lowerUrl.includes("docs.google.com/forms") ||
        lowerUrl.includes("forms.gle")
    ) {
        return "google";
    }
    return "unknown";
}

/**
 * Microsoftロゴ
 */
function MicrosoftLogo({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 23 23"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="11" height="11" fill="#F25022" />
            <rect x="12" width="11" height="11" fill="#7FBA00" />
            <rect y="12" width="11" height="11" fill="#00A4EF" />
            <rect x="12" y="12" width="11" height="11" fill="#FFB900" />
        </svg>
    );
}

/**
 * Googleロゴ
 */
function GoogleLogo({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

/**
 * Formsページのコンテンツ
 */
export function FormsPageContent() {
    const [registeredForms, setRegisteredForms] = useState<RegisteredForm[]>(
        []
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 登録済みFormsを取得
     */
    const loadRegisteredForms = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/forms");
            const result = await response.json();

            if (result.success && result.data) {
                setRegisteredForms(result.data);
            } else {
                setError(result.error || "Formsの取得に失敗しました");
            }
        } catch {
            setError("Formsの取得に失敗しました");
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadRegisteredForms();
    }, [loadRegisteredForms]);

    /**
     * Formsの完了状態を切り替え
     */
    const toggleFormCompleted = async (form: RegisteredForm) => {
        try {
            const response = await fetch("/api/forms", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: form.id,
                    completed: !form.completed,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setRegisteredForms((prev) =>
                    prev.map((f) =>
                        f.id === form.id ? { ...f, ...result.data } : f
                    )
                );
            }
        } catch {
            console.error("Formsの更新に失敗しました");
        }
    };

    /**
     * Formsを削除
     */
    const deleteForm = async (formId: string) => {
        try {
            const response = await fetch(`/api/forms?id=${formId}`, {
                method: "DELETE",
            });

            const result = await response.json();

            if (result.success) {
                setRegisteredForms((prev) =>
                    prev.filter((f) => f.id !== formId)
                );
            }
        } catch {
            console.error("Formsの削除に失敗しました");
        }
    };

    const incompleteForms = registeredForms.filter((f) => !f.completed);
    const completedForms = registeredForms.filter((f) => f.completed);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Forms</h1>
                    <p className="text-sm text-base-content/60 mt-1">
                        Microsoft Forms / Google Forms
                    </p>
                </div>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={loadRegisteredForms}
                    disabled={isLoading}
                >
                    <svg
                        className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    <svg
                        className="stroke-current shrink-0 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {isLoading ? (
                <Loading text="読み込み中..." />
            ) : (
                <>
                    {/* 未回答のForms */}
                    <div className="card bg-base-100 shadow-sm">
                        <div className="card-body">
                            <h2 className="card-title text-primary">
                                <svg
                                    className="w-5 h-5"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M17 3H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7V5h10v14zM8 7h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" />
                                </svg>
                                未回答 ({incompleteForms.length})
                            </h2>
                            {incompleteForms.length === 0 ? (
                                <div className="text-center py-8">
                                    <svg
                                        className="w-12 h-12 mx-auto text-base-content/30 mb-3"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                    </svg>
                                    <p className="text-sm text-base-content/60">
                                        未回答のFormsはありません
                                    </p>
                                    <p className="text-xs text-base-content/40 mt-2">
                                        Chrome拡張機能でFormsを登録してください
                                    </p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {incompleteForms.map((form) => {
                                        const formsType = getFormsType(form.url);
                                        return (
                                            <li
                                                key={form.id}
                                                className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-primary checkbox-sm"
                                                        checked={form.completed}
                                                        onChange={() =>
                                                            toggleFormCompleted(form)
                                                        }
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {form.source || form.title || "Forms"}
                                                        </p>
                                                        <p className="text-xs text-base-content/40">
                                                            {formatRelativeTime(form.registeredAt)}
                                                            に登録
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {formsType === "microsoft" ? (
                                                        <MicrosoftLogo className="w-5 h-5 shrink-0" />
                                                    ) : formsType === "google" ? (
                                                        <GoogleLogo className="w-5 h-5 shrink-0" />
                                                    ) : null}
                                                    <a
                                                        href={form.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-primary btn-sm"
                                                    >
                                                        回答する
                                                    </a>
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-square"
                                                        onClick={() => deleteForm(form.id)}
                                                        title="削除"
                                                    >
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* 回答済みのForms */}
                    {completedForms.length > 0 && (
                        <div className="card bg-base-100 shadow-sm">
                            <div className="card-body">
                                <h2 className="card-title text-base-content/60">
                                    <svg
                                        className="w-5 h-5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                    </svg>
                                    回答済み ({completedForms.length})
                                </h2>
                                <ul className="space-y-2">
                                    {completedForms.map((form) => (
                                        <li
                                            key={form.id}
                                            className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg opacity-60"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-sm"
                                                    checked={form.completed}
                                                    onChange={() =>
                                                        toggleFormCompleted(form)
                                                    }
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate line-through">
                                                        {form.source || form.title || "Forms"}
                                                    </p>
                                                    <p className="text-xs text-base-content/40">
                                                        {form.completedAt &&
                                                            `${formatRelativeTime(
                                                                form.completedAt
                                                            )}に完了`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getFormsType(form.url) === "microsoft" ? (
                                                    <MicrosoftLogo className="w-5 h-5 shrink-0" />
                                                ) : getFormsType(form.url) === "google" ? (
                                                    <GoogleLogo className="w-5 h-5 shrink-0" />
                                                ) : null}
                                                <button
                                                className="btn btn-ghost btn-sm btn-square"
                                                onClick={() => deleteForm(form.id)}
                                                title="削除"
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* 使い方のヒント */}
                    <div className="card bg-base-200/50">
                        <div className="card-body py-4">
                            <h3 className="font-medium text-sm">
                                Formsの登録方法
                            </h3>
                            <ol className="text-xs text-base-content/60 space-y-1 list-decimal list-inside">
                                <li>
                                    Chrome拡張機能「Synca Forms登録」をインストール
                                </li>
                                <li>
                                    ツールバーの拡張機能アイコンをクリック
                                </li>
                                <li>FormsのURLを貼り付けて登録</li>
                            </ol>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
