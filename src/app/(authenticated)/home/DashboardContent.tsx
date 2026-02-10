"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    fetchTodayEvents,
    type CalendarEvent,
} from "@/features/calendar";
import { fetchTasks, completeTask } from "@/features/tasks";
import {
    fetchTrainStatus,
    fetchTransitRoutes,
    TrainStatusBadge,
    useFavoriteRoutes,
    buildYahooTransitUrl,
} from "@/features/transit";
import type { Task } from "@/entities/task";
import { convertTodoistTask } from "@/entities/task";
import type { TrainOperation, TransitRoute } from "@/entities/transit";
import type { FavoriteRoute } from "@/entities/station";
import { fetchPortalNotices, type PortalNotice } from "@/features/portal";

interface DashboardContentProps {
    accessToken?: string;
}

/**
 * 時刻をフォーマット
 */
function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * 今日の予定ウィジェット
 */
function TodayEventsWidget({
    events,
    isLoading,
    error,
}: {
    events: CalendarEvent[];
    isLoading: boolean;
    error: string | null;
}) {
    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        今日の予定
                    </h3>
                    <Link
                        href="/calendar"
                        className="text-xs text-primary hover:underline"
                    >
                        すべて見る
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-sm" />
                    </div>
                ) : error ? (
                    <p className="text-sm text-error">{error}</p>
                ) : events.length === 0 ? (
                    <p className="text-sm text-base-content/60 py-2">
                        今日の予定はありません
                    </p>
                ) : (
                    <div className="space-y-2">
                        {events.slice(0, 5).map((event) => (
                            <div
                                key={event.id}
                                className="flex items-start gap-2 py-1 border-b border-base-200 last:border-0"
                            >
                                <div
                                    className="w-1 h-full min-h-[2rem] rounded-full flex-shrink-0"
                                    style={{
                                        backgroundColor:
                                            event.backgroundColor || "#039be5",
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {event.summary}
                                    </p>
                                    <p className="text-xs text-base-content/60">
                                        {event.start.dateTime
                                            ? `${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime || "")}`
                                            : "終日"}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {events.length > 5 && (
                            <p className="text-xs text-base-content/60 text-center pt-1">
                                他 {events.length - 5} 件
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * 期限の表示をフォーマット
 */
function formatDueDate(dueDate?: string): string {
    if (!dueDate) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due.getTime() < today.getTime()) {
        return "期限切れ";
    }
    if (due.getTime() === today.getTime()) {
        return "今日";
    }
    if (due.getTime() === tomorrow.getTime()) {
        return "明日";
    }

    return due.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
    });
}

/**
 * 期限が過ぎているか判定
 */
function isOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
}

/**
 * タスクウィジェット
 */
function TasksWidget({
    tasks,
    isLoading,
    error,
    onComplete,
}: {
    tasks: Task[];
    isLoading: boolean;
    error: string | null;
    onComplete: (taskId: string) => void;
}) {
    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-orange-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                            />
                        </svg>
                        直近のタスク
                    </h3>
                    <Link
                        href="/tasks"
                        className="text-xs text-primary hover:underline"
                    >
                        すべて見る
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-sm" />
                    </div>
                ) : error ? (
                    <p className="text-sm text-error">{error}</p>
                ) : tasks.length === 0 ? (
                    <p className="text-sm text-base-content/60 py-2">
                        タスクはありません
                    </p>
                ) : (
                    <div className="space-y-2">
                        {tasks.slice(0, 5).map((task) => (
                            <div
                                key={task.id}
                                className="flex items-center gap-2 py-1 border-b border-base-200 last:border-0"
                            >
                                <button
                                    type="button"
                                    className="w-4 h-4 rounded-full border-2 border-base-content/30 hover:border-primary flex-shrink-0"
                                    onClick={() => onComplete(task.id)}
                                    aria-label="タスクを完了にする"
                                />
                                <p className="text-sm flex-1 truncate">
                                    {task.content}
                                </p>
                                {task.dueDate && (
                                    <span
                                        className={`text-xs flex-shrink-0 ${
                                            isOverdue(task.dueDate)
                                                ? "text-error"
                                                : "text-base-content/60"
                                        }`}
                                    >
                                        {formatDueDate(task.dueDate)}
                                    </span>
                                )}
                            </div>
                        ))}
                        {tasks.length > 5 && (
                            <p className="text-xs text-base-content/60 text-center pt-1">
                                他 {tasks.length - 5} 件
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * ダッシュボードに表示する路線
 */
const DASHBOARD_LINES = [
    "高崎線",
    "宇都宮線",
    "京浜東北線",
    "埼京線",
    "湘南新宿ライン",
    "上野東京ライン",
    "山手線",
    "銀座線",
    "丸ノ内線",
    "日比谷線",
];

/**
 * 運行情報ウィジェット
 */
function TrainStatusWidget({
    operations,
    isLoading,
    error,
}: {
    operations: TrainOperation[];
    isLoading: boolean;
    error: string | null;
}) {
    // 指定路線のみフィルタリング
    const filteredOperations = operations.filter((op) =>
        DASHBOARD_LINES.some((line) => op.lineName.includes(line))
    );
    const hasIssues = filteredOperations.some((op) => op.status !== "normal");

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        運行情報
                    </h3>
                    <Link
                        href="/transit"
                        className="text-xs text-primary hover:underline"
                    >
                        詳細を見る
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-sm" />
                    </div>
                ) : error ? (
                    <p className="text-sm text-error">{error}</p>
                ) : filteredOperations.length === 0 ? (
                    <p className="text-sm text-base-content/60 py-2">
                        運行情報を取得できませんでした
                    </p>
                ) : (
                    <>
                        <div className="mb-2">
                            {hasIssues ? (
                                <span className="badge badge-warning badge-sm">
                                    一部遅延あり
                                </span>
                            ) : (
                                <span className="badge badge-success badge-sm">
                                    平常運転
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            {filteredOperations.map((op) => (
                                <div
                                    key={op.lineId}
                                    className="flex items-center justify-between py-1 border-b border-base-200 last:border-0"
                                >
                                    <span className="text-sm">{op.lineName}</span>
                                    <TrainStatusBadge status={op.status} />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * 路線アイテム（発着時刻付き）
 */
function FavoriteRouteItem({ route }: { route: FavoriteRoute }) {
    const [transitRoute, setTransitRoute] = useState<TransitRoute | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadRoute() {
            const result = await fetchTransitRoutes(
                route.fromStation.name,
                route.toStation.name
            );
            if (result.success && result.data && result.data.length > 0) {
                setTransitRoute(result.data[0]);
            }
            setIsLoading(false);
        }
        loadRoute();
    }, [route.fromStation.name, route.toStation.name]);

    const departureTime = transitRoute?.segments[0]?.departureTime;
    const arrivalTime =
        transitRoute?.segments[transitRoute.segments.length - 1]?.arrivalTime;

    return (
        <a
            href={buildYahooTransitUrl(route.fromStation, route.toStation)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-2 px-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
        >
            <div className="flex flex-col items-center">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="w-0.5 h-4 bg-base-content/20" />
                <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium truncate">
                        {route.fromStation.name}
                    </span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 text-base-content/40 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                    <span className="font-medium truncate">
                        {route.toStation.name}
                    </span>
                </div>
                {isLoading ? (
                    <span className="text-xs text-base-content/40">
                        読み込み中...
                    </span>
                ) : transitRoute ? (
                    <div className="flex items-center gap-2 text-xs text-base-content/60">
                        <span className="font-medium text-primary">
                            {departureTime} 発
                        </span>
                        <span>→</span>
                        <span>{arrivalTime} 着</span>
                        <span className="text-base-content/40">
                            ({transitRoute.totalDuration}分)
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-base-content/40">
                        時刻を取得できませんでした
                    </span>
                )}
            </div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-base-content/40 flex-shrink-0"
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
    );
}

/**
 * よく使う路線ウィジェット
 */
function FavoriteRoutesWidget({
    routes,
    isLoading,
}: {
    routes: FavoriteRoute[];
    isLoading: boolean;
}) {
    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                        よく使う路線
                    </h3>
                    <Link
                        href="/transit"
                        className="text-xs text-primary hover:underline"
                    >
                        編集
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-sm" />
                    </div>
                ) : routes.length === 0 ? (
                    <p className="text-sm text-base-content/60 py-2">
                        路線が登録されていません
                    </p>
                ) : (
                    <div className="space-y-2">
                        {routes.slice(0, 4).map((route) => (
                            <FavoriteRouteItem key={route.id} route={route} />
                        ))}
                        {routes.length > 4 && (
                            <p className="text-xs text-base-content/60 text-center pt-1">
                                他 {routes.length - 4} 件
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * クイック乗り換え検索ウィジェット
 */
function QuickTransitSearchWidget() {
    const [fromStation, setFromStation] = useState("");
    const [toStation, setToStation] = useState("");
    const [routes, setRoutes] = useState<TransitRoute[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!fromStation.trim() || !toStation.trim()) {
            setError("出発駅と到着駅を入力してください");
            return;
        }

        setIsLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const result = await fetchTransitRoutes(
                fromStation.trim(),
                toStation.trim()
            );
            if (result.success && result.data) {
                setRoutes(result.data.slice(0, 3));
            } else {
                setError(result.error || "経路検索に失敗しました");
                setRoutes([]);
            }
        } catch (err) {
            setError("経路検索に失敗しました");
            setRoutes([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const yahooUrl =
        fromStation && toStation
            ? `https://transit.yahoo.co.jp/search/result?from=${encodeURIComponent(fromStation)}&to=${encodeURIComponent(toStation)}`
            : null;

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <h3 className="font-bold flex items-center gap-2 mb-3">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-purple-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    乗り換え検索
                </h3>

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="w-0.5 h-4 bg-base-content/20" />
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <input
                                type="text"
                                placeholder="出発駅"
                                className="input input-bordered input-sm w-full"
                                value={fromStation}
                                onChange={(e) => setFromStation(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <input
                                type="text"
                                placeholder="到着駅"
                                className="input input-bordered input-sm w-full"
                                value={toStation}
                                onChange={(e) => setToStation(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleSearch}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                "検索"
                            )}
                        </button>
                    </div>

                    {error && (
                        <p className="text-sm text-error">{error}</p>
                    )}

                    {hasSearched && !isLoading && !error && routes.length === 0 && (
                        <p className="text-sm text-base-content/60">
                            経路が見つかりませんでした
                        </p>
                    )}

                    {routes.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-base-200">
                            {routes.map((route, index) => {
                                const departure = route.segments[0];
                                const arrival = route.segments[route.segments.length - 1];
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between py-1 text-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-primary">
                                                {departure?.departureTime}
                                            </span>
                                            <span className="text-base-content/40">→</span>
                                            <span>{arrival?.arrivalTime}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-base-content/60">
                                            <span>{route.totalDuration}分</span>
                                            {route.transferCount > 0 && (
                                                <span className="badge badge-xs">
                                                    乗換{route.transferCount}回
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {yahooUrl && (
                                <a
                                    href={yahooUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    Yahoo!乗換案内で詳細を見る
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-3 w-3"
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
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * ポータルお知らせウィジェット
 */
function PortalNoticesWidget({
    notices,
    isLoading,
    error,
}: {
    notices: PortalNotice[];
    isLoading: boolean;
    error: string | null;
}) {
    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-indigo-500"
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
                        ポータルお知らせ
                    </h3>
                    <a
                        href="https://portal.nit.ac.jp/uprx/up/bs/bsc005/Bsc00501.xhtml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                        ポータルを開く
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3"
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

                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-sm" />
                    </div>
                ) : error ? (
                    <p className="text-sm text-error">{error}</p>
                ) : notices.length === 0 ? (
                    <p className="text-sm text-base-content/60 py-2">
                        お知らせはありません
                    </p>
                ) : (
                    <div className="space-y-2">
                        {notices.slice(0, 5).map((notice) => (
                            <div
                                key={notice.id}
                                className={`flex items-start gap-2 py-1 border-b border-base-200 last:border-0 ${
                                    !notice.isRead ? "font-medium" : ""
                                }`}
                            >
                                {notice.isImportant && (
                                    <span className="badge badge-error badge-xs mt-1">
                                        重要
                                    </span>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">
                                        {notice.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-base-content/60">
                                        {notice.category && (
                                            <span>{notice.category}</span>
                                        )}
                                        <span>{notice.date}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {notices.length > 5 && (
                            <p className="text-xs text-base-content/60 text-center pt-1">
                                他 {notices.length - 5} 件
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * 日付表示ヘッダー
 */
function DateHeader() {
    const today = new Date();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const weekday = weekdays[today.getDay()];

    return (
        <div className="text-center py-4">
            <p className="text-base-content/60 text-sm">
                {today.getFullYear()}年{month}月{date}日（{weekday}）
            </p>
            <h1 className="text-2xl font-bold text-primary mt-1">Dashboard</h1>
        </div>
    );
}

/**
 * ダッシュボードコンテンツ
 */
export function DashboardContent({ accessToken }: DashboardContentProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [operations, setOperations] = useState<TrainOperation[]>([]);
    const [notices, setNotices] = useState<PortalNotice[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingOperations, setIsLoadingOperations] = useState(true);
    const [isLoadingNotices, setIsLoadingNotices] = useState(true);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [tasksError, setTasksError] = useState<string | null>(null);
    const [operationsError, setOperationsError] = useState<string | null>(null);
    const [noticesError, setNoticesError] = useState<string | null>(null);

    // お気に入り路線を取得
    const { favoriteRoutes, isLoaded: isRoutesLoaded } = useFavoriteRoutes();

    // 今日の予定を取得
    useEffect(() => {
        async function loadEvents() {
            if (!accessToken) {
                setIsLoadingEvents(false);
                return;
            }

            try {
                const result = await fetchTodayEvents(accessToken);
                if (result.success && result.data) {
                    setEvents(result.data);
                } else {
                    setEventsError(result.error || "予定の取得に失敗しました");
                }
            } catch (err) {
                setEventsError("予定の取得に失敗しました");
            } finally {
                setIsLoadingEvents(false);
            }
        }

        loadEvents();
    }, [accessToken]);

    // タスクを取得（期限順にソート）
    useEffect(() => {
        async function loadTasks() {
            try {
                const result = await fetchTasks();
                if (result.success && result.data) {
                    const convertedTasks = result.data.map(convertTodoistTask);
                    // 期限順にソート（期限なしは最後）
                    const sortedTasks = convertedTasks.sort((a, b) => {
                        if (!a.dueDate && !b.dueDate) return 0;
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return a.dueDate.localeCompare(b.dueDate);
                    });
                    setTasks(sortedTasks);
                } else {
                    setTasksError(result.error || "タスクの取得に失敗しました");
                }
            } catch (err) {
                setTasksError("タスクの取得に失敗しました");
            } finally {
                setIsLoadingTasks(false);
            }
        }

        loadTasks();
    }, []);

    // 運行情報を取得
    useEffect(() => {
        async function loadOperations() {
            try {
                const result = await fetchTrainStatus();
                if (result.success && result.data) {
                    setOperations(result.data);
                } else {
                    setOperationsError(result.error || "運行情報の取得に失敗しました");
                }
            } catch (err) {
                setOperationsError("運行情報の取得に失敗しました");
            } finally {
                setIsLoadingOperations(false);
            }
        }

        loadOperations();
    }, []);

    // ポータルお知らせを取得
    useEffect(() => {
        async function loadNotices() {
            try {
                const result = await fetchPortalNotices();
                if (result.success && result.data) {
                    setNotices(result.data);
                } else {
                    setNoticesError(result.error || "お知らせの取得に失敗しました");
                }
            } catch (err) {
                setNoticesError("お知らせの取得に失敗しました");
            } finally {
                setIsLoadingNotices(false);
            }
        }

        loadNotices();
    }, []);

    // タスク完了処理
    const handleCompleteTask = async (taskId: string) => {
        try {
            await completeTask(taskId);
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
        } catch (err) {
            console.error("タスク完了に失敗しました", err);
        }
    };

    return (
        <div className="space-y-4 pb-4">
            <DateHeader />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TodayEventsWidget
                    events={events}
                    isLoading={isLoadingEvents}
                    error={eventsError}
                />
                <TasksWidget
                    tasks={tasks}
                    isLoading={isLoadingTasks}
                    error={tasksError}
                    onComplete={handleCompleteTask}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TrainStatusWidget
                    operations={operations}
                    isLoading={isLoadingOperations}
                    error={operationsError}
                />
                <div className="space-y-4">
                    <FavoriteRoutesWidget
                        routes={favoriteRoutes}
                        isLoading={!isRoutesLoaded}
                    />
                    <QuickTransitSearchWidget />
                </div>
            </div>

            <PortalNoticesWidget
                notices={notices}
                isLoading={isLoadingNotices}
                error={noticesError}
            />
        </div>
    );
}
