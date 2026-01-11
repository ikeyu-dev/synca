"use client";

import { useState, useEffect } from "react";
import type { Station } from "@/entities/station";
import type { TimetableEntry } from "../api/fetchStationTimetable";

interface StationTimetableCardProps {
    station: Station;
    direction?: "up" | "down";
}

/**
 * 駅の時刻表を表示するカード
 */
export function StationTimetableCard({
    station,
    direction = "down",
}: StationTimetableCardProps) {
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDirection, setCurrentDirection] = useState(direction);

    useEffect(() => {
        async function fetchTimetable() {
            if (!station.odptStationId) {
                setError("時刻表情報がありません");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/transit/timetable?stationId=${encodeURIComponent(station.odptStationId)}&railwayId=${encodeURIComponent(station.odptRailwayId || "")}&direction=${currentDirection}`
                );

                const result = await response.json();

                if (result.success) {
                    setEntries(result.data?.entries || []);
                } else {
                    setError(result.error || "時刻表の取得に失敗しました");
                }
            } catch {
                setError("時刻表の取得に失敗しました");
            } finally {
                setIsLoading(false);
            }
        }

        fetchTimetable();
    }, [station, currentDirection]);

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        {station.name}駅 時刻表
                    </h3>
                    <div className="flex gap-1">
                        <button
                            className={`btn btn-xs ${currentDirection === "up" ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => setCurrentDirection("up")}
                        >
                            上り
                        </button>
                        <button
                            className={`btn btn-xs ${currentDirection === "down" ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => setCurrentDirection("down")}
                        >
                            下り
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-md text-primary"></span>
                    </div>
                ) : error ? (
                    <div className="text-center py-4 text-base-content/60">
                        {error}
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-4 text-base-content/60">
                        <p>時刻表データは現在利用できません</p>
                        <p className="text-xs mt-1">
                            (JR東日本・東武などはODPTで時刻表を提供していません)
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>発車時刻</th>
                                    <th>種別</th>
                                    <th>行先</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry, index) => (
                                    <tr
                                        key={`${entry.departureTime}-${index}`}
                                        className={
                                            index === 0 ? "bg-primary/10" : ""
                                        }
                                    >
                                        <td className="font-mono font-bold">
                                            {entry.departureTime}
                                            {entry.isLast && (
                                                <span className="badge badge-error badge-xs ml-2">
                                                    終
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`badge badge-sm ${
                                                    entry.trainType === "普通"
                                                        ? "badge-ghost"
                                                        : entry.trainType ===
                                                            "快速"
                                                          ? "badge-info"
                                                          : entry.trainType ===
                                                              "特急"
                                                            ? "badge-warning"
                                                            : "badge-ghost"
                                                }`}
                                            >
                                                {entry.trainType}
                                            </span>
                                        </td>
                                        <td>{entry.destination}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
