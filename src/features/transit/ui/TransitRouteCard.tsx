"use client";

import type { TransitRoute } from "@/entities/transit";

interface TransitRouteCardProps {
    route: TransitRoute;
    index: number;
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
 * 運賃を表示用文字列に変換
 */
function formatFare(fare: number): string {
    return `${fare.toLocaleString()}円`;
}

/**
 * 乗換経路カード
 */
export function TransitRouteCard({ route, index }: TransitRouteCardProps) {
    const { totalDuration, totalFare, transferCount, segments } = route;

    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                {/* ヘッダー情報 */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="badge badge-primary badge-sm">
                            経路{index + 1}
                        </span>
                        {firstSegment && lastSegment && (
                            <span className="text-sm font-bold">
                                {firstSegment.departureTime} →{" "}
                                {lastSegment.arrivalTime}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-primary">
                            {formatDuration(totalDuration)}
                        </span>
                        <span className="text-base-content/60">|</span>
                        <span>{formatFare(totalFare)}</span>
                        <span className="text-base-content/60">|</span>
                        <span>乗換 {transferCount}回</span>
                    </div>
                </div>

                {/* 経路詳細 */}
                <div className="space-y-2">
                    {segments.map((segment, segmentIndex) => (
                        <div
                            key={segmentIndex}
                            className="flex items-start gap-3"
                        >
                            {/* タイムライン */}
                            <div className="flex flex-col items-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                                <span className="w-0.5 flex-1 min-h-8 bg-primary/30" />
                                {segmentIndex === segments.length - 1 && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                                )}
                            </div>

                            {/* 区間情報 */}
                            <div className="flex-1 pb-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium">
                                        {segment.departureStation}
                                    </span>
                                    <span className="text-xs text-base-content/60">
                                        {segment.departureTime}発
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="badge badge-outline badge-sm">
                                        {segment.lineName}
                                    </span>
                                    <span className="text-xs text-base-content/60">
                                        {formatDuration(segment.duration)}
                                    </span>
                                </div>
                                {segmentIndex === segments.length - 1 && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm font-medium">
                                            {segment.arrivalStation}
                                        </span>
                                        <span className="text-xs text-base-content/60">
                                            {segment.arrivalTime}着
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
