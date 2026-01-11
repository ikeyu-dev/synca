"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
    Coordinates,
    NearbyStation,
    StationWithStatus,
    RailwayStatus,
} from "../types";
import { calculateDistance } from "../lib/distance";

const MAX_DISTANCE = 3000; // 3km
const MAX_STATIONS = 3;
const STATUS_UPDATE_INTERVAL = 3 * 60 * 1000; // 3分

interface UseNearbyStationsResult {
    currentLocation: Coordinates | null;
    nearbyStations: StationWithStatus[];
    isLoadingLocation: boolean;
    isLoadingStations: boolean;
    isLoadingStatus: boolean;
    locationError: string | null;
    stationError: string | null;
    lastUpdated: Date | null;
    refreshLocation: () => void;
    refreshStatus: () => void;
}

/**
 * Overpass APIから取得した駅データ
 */
interface OverpassStationData {
    id: number;
    name: string;
    lat: number;
    lng: number;
    operator?: string;
    network?: string;
}

/**
 * ODPTから取得した駅路線情報
 */
interface StationRailwayInfo {
    stationName: string;
    railways: Array<{
        railwayId: string;
        railwayName: string;
    }>;
}

/**
 * 駅の路線IDを保持するためのMap
 */
const stationRailwayIdsMap = new Map<string, string[]>();

/**
 * 周辺駅と運行情報を取得するカスタムフック
 */
export function useNearbyStations(): UseNearbyStationsResult {
    const [currentLocation, setCurrentLocation] =
        useState<Coordinates | null>(null);
    const [nearbyStations, setNearbyStations] = useState<StationWithStatus[]>(
        []
    );
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isLoadingStations, setIsLoadingStations] = useState(false);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [stationError, setStationError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 位置情報を取得
    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError("お使いのブラウザは位置情報に対応していません");
            return;
        }

        setIsLoadingLocation(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCurrentLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setIsLoadingLocation(false);
            },
            (error) => {
                let errorMessage = "位置情報の取得に失敗しました";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "位置情報の使用が許可されていません";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "位置情報を取得できません";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "位置情報の取得がタイムアウトしました";
                        break;
                }
                setLocationError(errorMessage);
                setIsLoadingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
            }
        );
    }, []);

    // 周辺駅を取得（Overpass API経由）
    const fetchNearbyStations = useCallback(async (location: Coordinates) => {
        setIsLoadingStations(true);
        setStationError(null);

        try {
            // Overpass APIで周辺の駅を取得
            const overpassResponse = await fetch(
                `/api/transit/nearby-stations?lat=${location.lat}&lng=${location.lng}&radius=${MAX_DISTANCE}`
            );
            const overpassResult = await overpassResponse.json();

            if (!overpassResult.success || !overpassResult.data) {
                setStationError(
                    overpassResult.error || "駅データの取得に失敗しました"
                );
                return;
            }

            const stations: OverpassStationData[] = overpassResult.data;
            console.log(`[Nearby] Overpassから${stations.length}駅を取得`);

            if (stations.length === 0) {
                setNearbyStations([]);
                setLastUpdated(new Date());
                setIsLoadingStations(false);
                return;
            }

            // 距離を計算して近い順にソート
            const withDistance: NearbyStation[] = stations
                .map((station) => ({
                    id: String(station.id),
                    name: station.name,
                    lat: station.lat,
                    lng: station.lng,
                    railways: [],
                    distance: calculateDistance(location, {
                        lat: station.lat,
                        lng: station.lng,
                    }),
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, MAX_STATIONS);

            console.log(
                `[Nearby] 上位${withDistance.length}駅:`,
                withDistance.map((s) => `${s.name}(${Math.round(s.distance)}m)`)
            );

            // 全駅の路線情報をODPTから一括取得
            const stationNames = withDistance.map((s) => s.name).join(",");
            try {
                const railwayResponse = await fetch(
                    `/api/transit/station-railways?names=${encodeURIComponent(stationNames)}`
                );
                const railwayResult = await railwayResponse.json();

                if (railwayResult.success && railwayResult.data) {
                    for (const station of withDistance) {
                        // 駅名でマッチングして路線情報を取得
                        const matchingStation = railwayResult.data.find(
                            (s: StationRailwayInfo) =>
                                s.stationName === station.name ||
                                station.name.includes(s.stationName) ||
                                s.stationName.includes(station.name)
                        );

                        if (matchingStation) {
                            const railwayIds = matchingStation.railways.map(
                                (r: { railwayId: string }) => r.railwayId
                            );
                            stationRailwayIdsMap.set(station.id, railwayIds);
                            console.log(
                                `[Nearby] ${station.name}の路線:`,
                                matchingStation.railways.map(
                                    (r: { railwayName: string }) =>
                                        r.railwayName
                                )
                            );
                        }
                    }
                }
            } catch (error) {
                console.warn("[Nearby] 路線情報の取得に失敗:", error);
            }

            // 運行情報を取得
            await fetchStatusForStations(withDistance);
        } catch (error) {
            console.error("[Nearby] Fetch error:", error);
            setStationError("駅データの取得に失敗しました");
        } finally {
            setIsLoadingStations(false);
        }
    }, []);

    // 運行情報を取得（ODPT API経由）
    const fetchStatusForStations = useCallback(
        async (stations: NearbyStation[]) => {
            if (stations.length === 0) {
                setNearbyStations([]);
                setLastUpdated(new Date());
                return;
            }

            setIsLoadingStatus(true);

            try {
                // ODPT APIから全運行情報を取得
                const response = await fetch("/api/transit/train-info");
                const result = await response.json();

                const stationsWithStatus: StationWithStatus[] = stations.map(
                    (station) => {
                        const railwayStatuses: RailwayStatus[] = [];

                        if (result.success && result.data) {
                            // 駅の路線ID情報を取得
                            const stationRailwayIds =
                                stationRailwayIdsMap.get(station.id) || [];

                            // 路線IDでマッチング
                            for (const info of result.data) {
                                const isMatch = stationRailwayIds.some(
                                    (railwayId) =>
                                        railwayId === info.railwayId ||
                                        info.railwayId.includes(
                                            railwayId.split(".").pop() || ""
                                        ) ||
                                        railwayId.includes(
                                            info.railwayId.split(".").pop() ||
                                                ""
                                        )
                                );

                                if (isMatch) {
                                    railwayStatuses.push({
                                        railwayId: info.railwayId,
                                        railwayName: info.railwayName,
                                        operator: info.operator,
                                        status: info.status,
                                        statusText: info.statusText,
                                        cause: info.cause,
                                    });
                                }
                            }
                        }

                        return {
                            station,
                            railwayStatuses,
                        };
                    }
                );

                setNearbyStations(stationsWithStatus);
                setLastUpdated(new Date());
            } catch {
                // エラー時も駅情報は表示する
                setNearbyStations(
                    stations.map((station) => ({
                        station,
                        railwayStatuses: [],
                    }))
                );
                setLastUpdated(new Date());
            } finally {
                setIsLoadingStatus(false);
            }
        },
        []
    );

    // 初回ロード
    useEffect(() => {
        getLocation();
    }, [getLocation]);

    // 位置情報が取得できたら周辺駅を検索
    useEffect(() => {
        if (currentLocation) {
            fetchNearbyStations(currentLocation);
        }
    }, [currentLocation, fetchNearbyStations]);

    // 運行情報の定期更新
    useEffect(() => {
        if (nearbyStations.length === 0) return;

        statusIntervalRef.current = setInterval(() => {
            const stations = nearbyStations.map((s) => s.station);
            fetchStatusForStations(stations);
        }, STATUS_UPDATE_INTERVAL);

        return () => {
            if (statusIntervalRef.current) {
                clearInterval(statusIntervalRef.current);
            }
        };
    }, [nearbyStations, fetchStatusForStations]);

    // 手動更新用関数
    const refreshLocation = useCallback(() => {
        getLocation();
    }, [getLocation]);

    const refreshStatus = useCallback(() => {
        if (nearbyStations.length > 0) {
            const stations = nearbyStations.map((s) => s.station);
            fetchStatusForStations(stations);
        }
    }, [nearbyStations, fetchStatusForStations]);

    return {
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
    };
}
