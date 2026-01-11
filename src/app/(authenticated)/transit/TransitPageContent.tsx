"use client";

import { useState } from "react";
import type { TrainOperation, TransitRoute } from "@/entities/transit";
import {
    TrainStatusCard,
    RouteCard,
    AddStationModal,
    useFavoriteRoutes,
    fetchTransitRoutes,
} from "@/features/transit";
import { Loading } from "@/shared/ui";

interface TransitPageContentProps {
    initialOperations: TrainOperation[];
}

/**
 * 乗り換え検索カード
 */
function TransitSearchCard() {
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
                setRoutes(result.data);
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

    const handleSwap = () => {
        setFromStation(toStation);
        setToStation(fromStation);
        setRoutes([]);
        setHasSearched(false);
    };

    const yahooUrl =
        fromStation && toStation
            ? `https://transit.yahoo.co.jp/search/result?from=${encodeURIComponent(fromStation)}&to=${encodeURIComponent(toStation)}`
            : null;

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary"
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
                </h2>

                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                            <span className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="w-0.5 h-8 bg-base-content/20" />
                            <span className="w-3 h-3 rounded-full bg-blue-500" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <input
                                type="text"
                                placeholder="出発駅"
                                className="input input-bordered w-full"
                                value={fromStation}
                                onChange={(e) => setFromStation(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <input
                                type="text"
                                placeholder="到着駅"
                                className="input input-bordered w-full"
                                value={toStation}
                                onChange={(e) => setToStation(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-square"
                                onClick={handleSwap}
                                aria-label="出発駅と到着駅を入れ替え"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-primary w-full"
                        onClick={handleSearch}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : (
                            <>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
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
                                検索
                            </>
                        )}
                    </button>

                    {error && <p className="text-sm text-error">{error}</p>}

                    {hasSearched &&
                        !isLoading &&
                        !error &&
                        routes.length === 0 && (
                            <p className="text-sm text-base-content/60 text-center py-2">
                                経路が見つかりませんでした
                            </p>
                        )}

                    {routes.length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-base-200">
                            <p className="text-sm text-base-content/60">
                                検索結果: {routes.length}件
                            </p>
                            {routes.map((route, index) => {
                                const departure = route.segments[0];
                                const arrival =
                                    route.segments[route.segments.length - 1];
                                return (
                                    <div
                                        key={index}
                                        className="p-3 bg-base-200 rounded-lg"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-primary">
                                                    {departure?.departureTime}
                                                </span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4 text-base-content/40"
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
                                                <span className="text-lg font-bold">
                                                    {arrival?.arrivalTime}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-medium">
                                                    {route.totalDuration}分
                                                </span>
                                                {route.totalFare > 0 && (
                                                    <span className="text-xs text-base-content/60 ml-2">
                                                        ¥{route.totalFare.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-base-content/60">
                                            {route.transferCount > 0 ? (
                                                <span className="badge badge-sm">
                                                    乗換{route.transferCount}回
                                                </span>
                                            ) : (
                                                <span className="badge badge-sm badge-success">
                                                    直通
                                                </span>
                                            )}
                                            <span>
                                                {route.segments
                                                    .map((s) => s.lineName)
                                                    .join(" → ")}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {yahooUrl && (
                                <a
                                    href={yahooUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline btn-sm w-full gap-2"
                                >
                                    Yahoo!乗換案内で詳細を見る
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
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function TransitPageContent({
    initialOperations,
}: TransitPageContentProps) {
    const {
        homeStation,
        favoriteRoutes,
        addRoute,
        removeRoute,
        isLoaded,
    } = useFavoriteRoutes();

    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!isLoaded) {
        return <Loading text="読み込み中..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">電車乗り換え</h1>
                    <p className="text-sm text-base-content/60 mt-1">
                        出発: {homeStation.name}駅（{homeStation.line}）
                    </p>
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsModalOpen(true)}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    駅を追加
                </button>
            </div>

            <TransitSearchCard />

            <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                    </svg>
                    よく使う路線
                </h2>
                {favoriteRoutes.length === 0 ? (
                    <div className="card bg-base-100 shadow-sm">
                        <div className="card-body text-center text-base-content/60">
                            <p>登録されている駅がありません</p>
                            <p className="text-sm">
                                「駅を追加」ボタンから目的地を追加してください
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {favoriteRoutes.map((route) => (
                            <RouteCard
                                key={route.id}
                                fromStation={route.fromStation}
                                toStation={route.toStation}
                                label={route.label}
                                onRemove={() => removeRoute(route.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {initialOperations.length > 0 && (
                <TrainStatusCard operations={initialOperations} />
            )}

            <AddStationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={addRoute}
            />
        </div>
    );
}
