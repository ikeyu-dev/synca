"use client";

import { useState } from "react";
import {
    useNearbyStations,
    DynamicMap,
    NearbyStationsList,
} from "@/features/nearby-stations";

/**
 * 周辺駅の運行情報ページコンテンツ
 */
export function NearbyPageContent() {
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

    const [selectedStationId, setSelectedStationId] = useState<string | null>(
        null
    );

    const isLoading = isLoadingLocation || isLoadingStations;

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">周辺の運行情報</h1>
                    {lastUpdated && (
                        <p className="text-sm text-base-content/60 mt-1">
                            最終更新:{" "}
                            {lastUpdated.toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                            {isLoadingStatus && (
                                <span className="loading loading-spinner loading-xs ml-2"></span>
                            )}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={refreshLocation}
                        disabled={isLoading}
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
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        位置更新
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={refreshStatus}
                        disabled={isLoading || nearbyStations.length === 0}
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
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        更新
                    </button>
                </div>
            </div>

            {/* エラー表示 */}
            {locationError && (
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
                    <span>{locationError}</span>
                    <button className="btn btn-sm" onClick={refreshLocation}>
                        再試行
                    </button>
                </div>
            )}

            {stationError && (
                <div className="alert alert-warning">
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
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <span>{stationError}</span>
                </div>
            )}

            {/* ローディング表示 */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="mt-4 text-base-content/60">
                        {isLoadingLocation
                            ? "位置情報を取得中..."
                            : "駅データを読み込み中..."}
                    </p>
                </div>
            )}

            {/* マップと駅リスト */}
            {!isLoading && currentLocation && (
                <>
                    {/* マップ */}
                    <div className="card bg-base-100 shadow-sm overflow-hidden">
                        <DynamicMap
                            currentLocation={currentLocation}
                            stations={nearbyStations}
                            onStationClick={setSelectedStationId}
                            selectedStationId={selectedStationId}
                        />
                    </div>

                    {/* 駅リスト */}
                    <div>
                        <h2 className="text-lg font-bold mb-3">周辺の駅</h2>
                        <NearbyStationsList
                            stations={nearbyStations}
                            selectedStationId={selectedStationId}
                            onStationSelect={setSelectedStationId}
                        />
                    </div>

                    {/* 注意書き */}
                    <div className="text-xs text-base-content/50 text-center">
                        <p>運行情報は3分ごとに自動更新されます</p>
                        <p>データ提供: 公共交通オープンデータセンター / OpenStreetMap</p>
                    </div>
                </>
            )}
        </div>
    );
}
