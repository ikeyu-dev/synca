"use client";

import { useState, useEffect } from "react";
import { fetchPortalNotices, type PortalNotice } from "@/features/portal";

/**
 * お知らせアイテムコンポーネント
 */
function NoticeItem({
    notice,
    isLast,
}: {
    notice: PortalNotice;
    isLast: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasContent = notice.content && notice.content.length > 0;

    return (
        <div
            className={`${!isLast ? "border-b border-base-200" : ""}`}
        >
            <div
                className={`p-3 ${hasContent ? "cursor-pointer hover:bg-base-50" : ""}`}
                onClick={() => hasContent && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start gap-2">
                    {notice.isImportant && (
                        <span className="badge badge-error badge-xs mt-1 shrink-0">
                            重要
                        </span>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">{notice.title}</p>
                            {hasContent && (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-4 w-4 shrink-0 text-base-content/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-base-content/60">
                            <span>{notice.date}</span>
                            {notice.sender && (
                                <>
                                    <span>|</span>
                                    <span>{notice.sender}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 詳細内容（展開時） */}
            {isExpanded && hasContent && (
                <div className="px-3 pb-3">
                    <div className="p-3 bg-base-200 rounded-lg text-sm text-base-content/80 whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {notice.content}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * お知らせ一覧ページコンテンツ
 */
export function NoticesPageContent() {
    const [notices, setNotices] = useState<PortalNotice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
        } catch {
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

    // 詳細がある件数
    const noticesWithContent = notices.filter((n) => n.content).length;

    return (
        <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">ポータルお知らせ</h1>
                    <p className="text-xs text-base-content/60 mt-0.5">
                        {notices.length > 0 && (
                            <>
                                {notices.length}件
                                {noticesWithContent > 0 &&
                                    `（詳細: ${noticesWithContent}件）`}
                            </>
                        )}
                    </p>
                </div>
                <div className="flex gap-1">
                    <button
                        className="btn btn-ghost btn-sm"
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
                    </button>
                    <a
                        href="https://portal.nit.ac.jp/uprx/up/bs/bsc005/Bsc00501.xhtml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                    >
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
                <div className="flex flex-col items-center justify-center py-8">
                    <span className="loading loading-spinner loading-md text-primary" />
                    <p className="mt-2 text-sm text-base-content/60">
                        お知らせを取得中...
                    </p>
                </div>
            ) : error ? (
                <div className="alert alert-error py-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="stroke-current shrink-0 h-5 w-5"
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
                    <span className="text-sm">{error}</span>
                </div>
            ) : notices.length === 0 ? (
                <div className="card bg-base-100 shadow-sm">
                    <div className="card-body p-4 text-center text-base-content/60">
                        <p className="text-sm">お知らせはありません</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedNotices).map(
                        ([category, categoryNotices]) => (
                            <div key={category} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="badge badge-primary badge-sm">
                                        {category}
                                    </span>
                                    <span className="text-xs text-base-content/60">
                                        {categoryNotices.length}件
                                    </span>
                                </div>
                                <div className="card bg-base-100 shadow-sm">
                                    <div className="card-body p-0">
                                        {categoryNotices.map((notice, index) => (
                                            <NoticeItem
                                                key={notice.id}
                                                notice={notice}
                                                isLast={
                                                    index ===
                                                    categoryNotices.length - 1
                                                }
                                            />
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
                <p>タップで詳細を表示（詳細がある場合）</p>
                <p>データはキャッシュされます（30分間有効）</p>
            </div>
        </div>
    );
}
