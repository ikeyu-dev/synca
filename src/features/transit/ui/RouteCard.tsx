"use client";

import { useState, useEffect } from "react";
import type { Station } from "@/entities/station";
import type { TransitRoute } from "@/entities/transit";
import { buildYahooTransitUrl } from "../lib/buildSearchUrl";
import { fetchTransitRoutes } from "../api/fetchTransitRoutes";

interface RouteCardProps {
    fromStation: Station;
    toStation: Station;
    label?: string;
    onRemove?: () => void;
}

/**
 * 所要時間を表示用文字列に変換
 */
function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}時間${mins}分`;
    }
    return `${mins}分`;
}

/**
 * 乗り換えルートカード（コンパクト版）
 */
export function RouteCard({
    fromStation,
    toStation,
    label,
    onRemove,
}: RouteCardProps) {
    const [routes, setRoutes] = useState<TransitRoute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const yahooUrl = buildYahooTransitUrl(fromStation, toStation);

    useEffect(() => {
        async function loadRoutes() {
            setIsLoading(true);
            setError(null);

            const result = await fetchTransitRoutes(
                fromStation.name,
                toStation.name
            );

            if (result.success && result.data) {
                setRoutes(result.data.slice(0, 3));
            } else {
                setError(result.error || "経路検索に失敗しました");
            }

            setIsLoading(false);
        }

        loadRoutes();
    }, [fromStation.name, toStation.name]);

    const nextRoute = routes[0];

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-3">
                {/* ヘッダー: 出発駅 → 到着駅 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        {label && (
                            <span className="badge badge-sm badge-ghost shrink-0">
                                {label}
                            </span>
                        )}
                        <span className="font-medium text-sm truncate">
                            {fromStation.name}
                        </span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 text-base-content/40 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                        </svg>
                        <span className="font-medium text-sm truncate">
                            {toStation.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <a
                            href={yahooUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs btn-square"
                            aria-label="Yahoo!で開く"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5"
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
                        {onRemove && (
                            <button
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={onRemove}
                                aria-label="削除"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* 次の電車情報 */}
                <div
                    className="mt-2 p-2 bg-base-200 rounded-lg cursor-pointer"
                    onClick={() => routes.length > 0 && setIsExpanded(!isExpanded)}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <span className="loading loading-spinner loading-xs" />
                            <span className="text-xs text-base-content/60">
                                経路を検索中...
                            </span>
                        </div>
                    ) : error ? (
                        <p className="text-xs text-error">{error}</p>
                    ) : nextRoute ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-primary">
                                    {nextRoute.segments[0]?.departureTime}
                                </span>
                                <span className="text-base-content/40">-</span>
                                <span className="font-bold">
                                    {
                                        nextRoute.segments[
                                            nextRoute.segments.length - 1
                                        ]?.arrivalTime
                                    }
                                </span>
                                {nextRoute.transferCount > 0 ? (
                                    <span className="badge badge-xs">
                                        乗換{nextRoute.transferCount}
                                    </span>
                                ) : (
                                    <span className="badge badge-xs badge-success">
                                        直通
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-medium text-primary">
                                    {formatDuration(nextRoute.totalDuration)}
                                </span>
                                <span className="text-base-content/60">
                                    ¥{nextRoute.totalFare.toLocaleString()}
                                </span>
                                {routes.length > 1 && (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                        </div>
                    ) : (
                        <p className="text-xs text-base-content/60">
                            経路が見つかりませんでした
                        </p>
                    )}
                </div>

                {/* 詳細経路（展開時） */}
                {isExpanded && routes.length > 1 && (
                    <div className="mt-2 space-y-1.5">
                        {routes.slice(1).map((route, routeIdx) => (
                            <div
                                key={routeIdx}
                                className="flex items-center justify-between p-2 bg-base-200/50 rounded text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-primary">
                                        {route.segments[0]?.departureTime}
                                    </span>
                                    <span className="text-base-content/40">
                                        -
                                    </span>
                                    <span className="font-medium">
                                        {
                                            route.segments[
                                                route.segments.length - 1
                                            ]?.arrivalTime
                                        }
                                    </span>
                                    {route.transferCount > 0 ? (
                                        <span className="badge badge-xs">
                                            乗換{route.transferCount}
                                        </span>
                                    ) : (
                                        <span className="badge badge-xs badge-success">
                                            直通
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-base-content/60">
                                    {formatDuration(route.totalDuration)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
