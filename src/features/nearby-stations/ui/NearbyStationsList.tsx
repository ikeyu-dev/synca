"use client";

import type { StationWithStatus } from "../types";
import { formatDistance } from "../lib/distance";

interface NearbyStationsListProps {
    stations: StationWithStatus[];
    selectedStationId: string | null;
    onStationSelect: (stationId: string) => void;
}

/**
 * ステータスに応じたバッジのスタイル
 */
function getStatusBadgeClass(status: string): string {
    switch (status) {
        case "normal":
            return "badge-success";
        case "delay":
            return "badge-warning";
        case "suspend":
            return "badge-error";
        case "direct":
            return "badge-warning";
        case "restore":
            return "badge-info";
        default:
            return "badge-ghost";
    }
}

/**
 * 周辺駅リストコンポーネント
 */
export function NearbyStationsList({
    stations,
    selectedStationId,
    onStationSelect,
}: NearbyStationsListProps) {
    if (stations.length === 0) {
        return (
            <div className="card bg-base-100 shadow-sm">
                <div className="card-body text-center text-base-content/60">
                    <p>3km以内に駅が見つかりませんでした</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {stations.map(({ station, railwayStatuses }, index) => {
                const hasIssue = railwayStatuses.some(
                    (r) => r.status !== "normal"
                );
                const isSelected = selectedStationId === station.id;

                return (
                    <div
                        key={station.id}
                        className={`card bg-base-100 shadow-sm cursor-pointer transition-all ${
                            isSelected
                                ? "ring-2 ring-primary"
                                : "hover:shadow-md"
                        }`}
                        onClick={() => onStationSelect(station.id)}
                    >
                        <div className="card-body p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                            hasIssue
                                                ? "bg-error"
                                                : "bg-success"
                                        }`}
                                    >
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">
                                            {station.name}駅
                                        </h3>
                                        <p className="text-sm text-base-content/60">
                                            {formatDistance(station.distance)}
                                        </p>
                                    </div>
                                </div>
                                {hasIssue && (
                                    <span className="badge badge-error badge-sm">
                                        遅延あり
                                    </span>
                                )}
                            </div>

                            <div className="mt-3 space-y-2">
                                {railwayStatuses.map((status) => (
                                    <div
                                        key={status.railwayId}
                                        className="flex items-center justify-between py-1.5 border-t border-base-200 first:border-0 first:pt-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-base-content/60">
                                                {status.operator}
                                            </span>
                                            <span className="text-sm font-medium">
                                                {status.railwayName}
                                            </span>
                                        </div>
                                        <span
                                            className={`badge badge-sm ${getStatusBadgeClass(status.status)}`}
                                        >
                                            {status.statusText}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* 遅延原因がある場合は表示 */}
                            {railwayStatuses.some((s) => s.cause) && (
                                <div className="mt-2 text-xs text-base-content/60 bg-base-200 rounded p-2">
                                    {railwayStatuses
                                        .filter((s) => s.cause)
                                        .map((s) => (
                                            <p key={s.railwayId}>
                                                {s.railwayName}: {s.cause}
                                            </p>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
