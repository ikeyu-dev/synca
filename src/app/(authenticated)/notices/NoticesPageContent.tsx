"use client";

import { useState, useEffect } from "react";
import { fetchPortalNotices, type PortalNotice } from "@/features/portal";

/**
 * お知らせ一覧ページコンテンツ
 */
export function NoticesPageContent() {
    const [notices, setNotices] = useState<PortalNotice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // お知らせを取得
    const loadNotices = async (forceRefresh = false) => {
        if (forceRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const result = await fetchPortalNotices(forceRefresh);
            if (result.success && result.data) {
                setNotices(result.data);
            } else {
                setError(result.error || "お知らせの取得に失敗しました");
            }
        } catch (err) {
            setError("お知らせの取得に失敗しました");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadNotices();
    }, []);

    // カテゴリでグループ化
    const groupedNotices = notices.reduce(
        (acc, notice) => {
            const category = notice.category || "その他";
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(notice);
            return acc;
        },
        {} as Record<string, PortalNotice[]>
    );

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">ポータルお知らせ</h1>
                    <p className="text-sm text-base-content/60 mt-1">
                        大学ポータルサイトからのお知らせ
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => loadNotices(true)}
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? (
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
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                        )}
                        更新
                    </button>
                    <a
                        href="https://portal.nit.ac.jp/uprx/up/bs/bsc005/Bsc00501.xhtml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                    >
                        ポータルを開く
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
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                        </svg>
                    </a>
                </div>
            </div>

            {/* ローディング */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <span className="loading loading-spinner loading-lg text-primary" />
                    <p className="mt-4 text-base-content/60">
                        お知らせを取得中...
                    </p>
                </div>
            ) : error ? (
                <div className="alert alert-error">
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
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>{error}</span>
                </div>
            ) : notices.length === 0 ? (
                <div className="card bg-base-100 shadow-sm">
                    <div className="card-body text-center text-base-content/60">
                        <p>お知らせはありません</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedNotices).map(
                        ([category, categoryNotices]) => (
                            <div key={category} className="space-y-3">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <span className="badge badge-primary">
                                        {category}
                                    </span>
                                    <span className="text-sm text-base-content/60">
                                        {categoryNotices.length}件
                                    </span>
                                </h2>
                                <div className="card bg-base-100 shadow-sm">
                                    <div className="card-body p-0">
                                        {categoryNotices.map((notice, index) => (
                                            <div
                                                key={notice.id}
                                                className={`p-4 ${
                                                    index !== categoryNotices.length - 1
                                                        ? "border-b border-base-200"
                                                        : ""
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {notice.isImportant && (
                                                        <span className="badge badge-error badge-sm mt-0.5">
                                                            重要
                                                        </span>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium">
                                                            {notice.title}
                                                        </p>
                                                        <p className="text-sm text-base-content/60 mt-1">
                                                            {notice.date}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* 注意書き */}
            <div className="text-xs text-base-content/50 text-center">
                <p>データはキャッシュされます（30分間有効）</p>
                <p>最新の情報はポータルサイトで確認してください</p>
            </div>
        </div>
    );
}
