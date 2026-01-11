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
 * 乗り換えルートカード
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

    const operatorColor = {
        JR: "bg-green-500",
        Tobu: "bg-orange-500",
        Seibu: "bg-yellow-500",
        Metro: "bg-blue-500",
        Other: "bg-gray-500",
    };

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
            <div className="card-body p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        {label && (
                            <span className="text-xs text-base-content/60 mb-1 block">
                                {label}
                            </span>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                                <span
                                    className={`w-3 h-3 rounded-full ${operatorColor[fromStation.operator]}`}
                                />
                                <span className="w-0.5 h-6 bg-base-300" />
                                <span
                                    className={`w-3 h-3 rounded-full ${operatorColor[toStation.operator]}`}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <div>
                                    <span className="font-bold">
                                        {fromStation.name}
                                    </span>
                                    <span className="text-xs text-base-content/60 ml-2">
                                        {fromStation.line}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-bold">
                                        {toStation.name}
                                    </span>
                                    <span className="text-xs text-base-content/60 ml-2">
                                        {toStation.line}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {onRemove && (
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
                            onClick={onRemove}
                            aria-label="削除"
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
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    )}
                </div>

                {/* 次の電車情報 */}
                <div className="mt-3 p-3 bg-base-200 rounded-lg">
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <span className="loading loading-spinner loading-xs" />
                            <span className="text-sm text-base-content/60">
                                経路を検索中...
                            </span>
                        </div>
                    ) : error ? (
                        <p className="text-sm text-error">{error}</p>
                    ) : nextRoute ? (
                        <div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold">
                                        {nextRoute.segments[0]?.departureTime}発
                                    </span>
                                    <span className="text-base-content/60">
                                        →
                                    </span>
                                    <span className="text-lg font-bold">
                                        {nextRoute.segments[
                                            nextRoute.segments.length - 1
                                        ]?.arrivalTime}
                                        着
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-bold text-primary">
                                        {formatDuration(nextRoute.totalDuration)}
                                    </span>
                                    <span className="text-base-content/60">
                                        |
                                    </span>
                                    <span>
                                        {nextRoute.totalFare.toLocaleString()}円
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {nextRoute.segments.map((segment, idx) => (
                                    <span
                                        key={idx}
                                        className="badge badge-outline badge-sm"
                                    >
                                        {segment.lineName.length > 15
                                            ? segment.lineName.substring(0, 15) + "..."
                                            : segment.lineName}
                                    </span>
                                ))}
                            </div>
                            {nextRoute.transferCount > 0 && (
                                <p className="text-xs text-base-content/60 mt-1">
                                    乗換 {nextRoute.transferCount}回
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-base-content/60">
                            経路が見つかりませんでした
                        </p>
                    )}
                </div>

                {/* 詳細経路（展開時） */}
                {isExpanded && routes.length > 0 && (
                    <div className="mt-3 space-y-3">
                        {routes.map((route, routeIdx) => (
                            <div
                                key={routeIdx}
                                className="p-3 border border-base-300 rounded-lg"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="badge badge-primary badge-sm">
                                        経路{routeIdx + 1}
                                    </span>
                                    <div className="text-xs text-base-content/60">
                                        {formatDuration(route.totalDuration)} |{" "}
                                        {route.totalFare.toLocaleString()}円 | 乗換{" "}
                                        {route.transferCount}回
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {route.segments.map((segment, segIdx) => (
                                        <div
                                            key={segIdx}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <span className="font-medium">
                                                {segment.departureTime}
                                            </span>
                                            <span className="text-base-content/60">
                                                {segment.departureStation}
                                            </span>
                                            <span className="badge badge-outline badge-xs">
                                                {segment.lineName.length > 20
                                                    ? segment.lineName.substring(0, 20) + "..."
                                                    : segment.lineName}
                                            </span>
                                            <span className="text-base-content/60">
                                                →
                                            </span>
                                            <span className="font-medium">
                                                {segment.arrivalTime}
                                            </span>
                                            <span className="text-base-content/60">
                                                {segment.arrivalStation}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* アクションボタン */}
                <div className="flex gap-2 mt-4">
                    {routes.length > 0 && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? "閉じる" : "詳細を見る"}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                        </button>
                    )}
                    <div className="flex-1" />
                    <a
                        href={yahooUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                    >
                        Yahoo!で見る
                    </a>
                </div>
            </div>
        </div>
    );
}
