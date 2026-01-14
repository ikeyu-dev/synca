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
import {
    useNearbyStations,
    DynamicMap,
    NearbyStationsList,
} from "@/features/nearby-stations";
import { Loading } from "@/shared/ui";

interface TransitPageContentProps {
    initialOperations: TrainOperation[];
}

/**
 * 乗り換え検索セクション
 */
function TransitSearchSection() {
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
        } catch {
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
        <div className="space-y-3">
            {/* 検索入力 */}
            <div className="flex items-center gap-2">
                <div className="flex flex-col items-center shrink-0">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="w-0.5 h-5 bg-base-content/20" />
                    <span className="w-2 h-2 rounded-full bg-info" />
                </div>
                <div className="flex-1 space-y-1.5">
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
                    className="btn btn-ghost btn-sm btn-square shrink-0"
                    onClick={handleSwap}
                    aria-label="入れ替え"
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
                            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                    </svg>
                </button>
                <button
                    type="button"
                    className="btn btn-primary btn-sm shrink-0"
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

            {error && <p className="text-xs text-error">{error}</p>}

            {hasSearched && !isLoading && !error && routes.length === 0 && (
                <p className="text-xs text-base-content/60 text-center">
                    経路が見つかりませんでした
                </p>
            )}

            {/* 検索結果 */}
            {routes.length > 0 && (
                <div className="space-y-2">
                    {routes.map((route, index) => {
                        const departure = route.segments[0];
                        const arrival =
                            route.segments[route.segments.length - 1];
                        return (
                            <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-base-200 rounded-lg text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary">
                                        {departure?.departureTime}
                                    </span>
                                    <span className="text-base-content/40">
                                        -
                                    </span>
                                    <span className="font-bold">
                                        {arrival?.arrivalTime}
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
                                <div className="text-xs text-base-content/60">
                                    {route.totalDuration}分
                                    {route.totalFare > 0 &&
                                        ` / ¥${route.totalFare.toLocaleString()}`}
                                </div>
                            </div>
                        );
                    })}
                    {yahooUrl && (
                        <a
                            href={yahooUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs w-full"
                        >
                            Yahoo!乗換案内で詳細を見る
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * セクションヘッダー
 */
function SectionHeader({
    icon,
    title,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-base-content/80">
                {icon}
                {title}
            </h2>
            {action}
        </div>
    );
}

export function TransitPageContent({
    initialOperations,
}: TransitPageContentProps) {
    const { homeStation, favoriteRoutes, addRoute, removeRoute, isLoaded } =
        useFavoriteRoutes();

    const {
        currentLocation,
        nearbyStations,
        isLoadingLocation,
        isLoadingStations,
        isLoadingStatus,
        locationError,
        stationError,
        lastUpdated,
        refreshLocation,
        refreshStatus,
    } = useNearbyStations();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStationId, setSelectedStationId] = useState<string | null>(
        null
    );
    const [showMap, setShowMap] = useState(false);

    const isNearbyLoading = isLoadingLocation || isLoadingStations;

    if (!isLoaded) {
        return <Loading text="読み込み中..." />;
    }

    return (
        <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">電車</h1>
                    <p className="text-xs text-base-content/60">
                        {homeStation.name}駅発
                        {lastUpdated && (
                            <span className="ml-2">
                                更新{" "}
                                {lastUpdated.toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                                {isLoadingStatus && (
                                    <span className="loading loading-spinner loading-xs ml-1" />
                                )}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsModalOpen(true)}
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
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    追加
                </button>
            </div>

            {/* 乗り換え検索 */}
            <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-3">
                    <SectionHeader
                        icon={
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-primary"
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
                        }
                        title="乗り換え検索"
                    />
                    <TransitSearchSection />
                </div>
            </div>

            {/* 周辺の駅 */}
            <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-3">
                    <SectionHeader
                        icon={
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-primary"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                        }
                        title="周辺の駅"
                        action={
                            <div className="flex gap-1">
                                <button
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => setShowMap(!showMap)}
                                    disabled={isNearbyLoading}
                                >
                                    {showMap ? "リスト" : "地図"}
                                </button>
                                <button
                                    className="btn btn-ghost btn-xs"
                                    onClick={refreshLocation}
                                    disabled={isNearbyLoading}
                                >
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
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                </button>
                            </div>
                        }
                    />

                    {locationError && (
                        <div className="alert alert-error alert-sm py-2">
                            <span className="text-xs">{locationError}</span>
                            <button
                                className="btn btn-xs"
                                onClick={refreshLocation}
                            >
                                再試行
                            </button>
                        </div>
                    )}

                    {stationError && (
                        <div className="alert alert-warning alert-sm py-2">
                            <span className="text-xs">{stationError}</span>
                        </div>
                    )}

                    {isNearbyLoading && (
                        <div className="flex items-center justify-center py-4">
                            <span className="loading loading-spinner loading-sm text-primary" />
                            <span className="ml-2 text-xs text-base-content/60">
                                {isLoadingLocation
                                    ? "位置情報を取得中..."
                                    : "駅データを読み込み中..."}
                            </span>
                        </div>
                    )}

                    {!isNearbyLoading && currentLocation && (
                        <>
                            {showMap ? (
                                <div className="rounded-lg overflow-hidden -mx-1">
                                    <DynamicMap
                                        currentLocation={currentLocation}
                                        stations={nearbyStations}
                                        onStationClick={setSelectedStationId}
                                        selectedStationId={selectedStationId}
                                    />
                                </div>
                            ) : (
                                <CompactStationsList
                                    stations={nearbyStations}
                                    selectedStationId={selectedStationId}
                                    onStationSelect={setSelectedStationId}
                                    onRefresh={refreshStatus}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* よく使う路線 */}
            {favoriteRoutes.length > 0 && (
                <div className="space-y-2">
                    <SectionHeader
                        icon={
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-primary"
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
                        }
                        title="よく使う路線"
                    />
                    <div className="grid grid-cols-1 gap-3">
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
                </div>
            )}

            {favoriteRoutes.length === 0 && (
                <div className="text-center text-xs text-base-content/50 py-4">
                    「追加」から目的地を登録できます
                </div>
            )}

            {/* 運行情報 */}
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

/**
 * コンパクトな駅リスト
 */
function CompactStationsList({
    stations,
    selectedStationId,
    onStationSelect,
    onRefresh,
}: {
    stations: Array<{
        station: {
            id: string;
            name: string;
            distance: number;
        };
        railwayStatuses: Array<{
            railwayId: string;
            railwayName: string;
            operator: string;
            status: string;
            statusText: string;
            cause?: string;
        }>;
    }>;
    selectedStationId: string | null;
    onStationSelect: (id: string) => void;
    onRefresh: () => void;
}) {
    if (stations.length === 0) {
        return (
            <p className="text-xs text-base-content/60 text-center py-2">
                3km以内に駅が見つかりませんでした
            </p>
        );
    }

    const formatDistance = (meters: number): string => {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        }
        return `${(meters / 1000).toFixed(1)}km`;
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "normal":
                return "text-success";
            case "delay":
                return "text-warning";
            case "suspend":
                return "text-error";
            default:
                return "text-base-content/60";
        }
    };

    return (
        <div className="space-y-1">
            {stations.slice(0, 5).map(({ station, railwayStatuses }) => {
                const hasIssue = railwayStatuses.some(
                    (r) => r.status !== "normal"
                );
                const isSelected = selectedStationId === station.id;

                return (
                    <div
                        key={station.id}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                                ? "bg-primary/10"
                                : "hover:bg-base-200"
                        }`}
                        onClick={() => onStationSelect(station.id)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        hasIssue ? "bg-error" : "bg-success"
                                    }`}
                                />
                                <span className="font-medium text-sm">
                                    {station.name}
                                </span>
                                <span className="text-xs text-base-content/50">
                                    {formatDistance(station.distance)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 ml-3.5">
                            {railwayStatuses.map((status) => (
                                <span
                                    key={status.railwayId}
                                    className={`text-xs ${getStatusStyle(status.status)}`}
                                >
                                    {status.railwayName}
                                    {status.status !== "normal" && (
                                        <span className="ml-0.5">
                                            ({status.statusText})
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
            {stations.length > 5 && (
                <p className="text-xs text-base-content/50 text-center">
                    他 {stations.length - 5} 駅
                </p>
            )}
        </div>
    );
}
