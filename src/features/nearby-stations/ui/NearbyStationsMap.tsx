"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import type { Coordinates, StationWithStatus } from "../types";
import { formatDistance } from "../lib/distance";
import "leaflet/dist/leaflet.css";

// デフォルトマーカーアイコンの修正（Leafletのバグ対策）
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// 現在地用のカスタムアイコン
const currentLocationIcon = new L.DivIcon({
    className: "current-location-marker",
    html: `<div style="
        width: 20px;
        height: 20px;
        background-color: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// 駅用のカスタムアイコン（ステータスに応じて色を変更）
function createStationIcon(hasIssue: boolean): L.DivIcon {
    const color = hasIssue ? "#ef4444" : "#22c55e";
    return new L.DivIcon({
        className: "station-marker",
        html: `<div style="
            width: 32px;
            height: 32px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2l2-2h4l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm2 0V6h5v5h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
}

interface MapCenterUpdaterProps {
    center: Coordinates;
    zoom: number;
}

/**
 * マップの中心を更新するコンポーネント
 */
function MapCenterUpdater({ center, zoom }: MapCenterUpdaterProps) {
    const map = useMap();

    useEffect(() => {
        map.setView([center.lat, center.lng], zoom);
    }, [map, center, zoom]);

    return null;
}

interface NearbyStationsMapProps {
    currentLocation: Coordinates;
    stations: StationWithStatus[];
    onStationClick?: (stationId: string) => void;
    selectedStationId?: string | null;
}

/**
 * 周辺駅を表示するマップ
 */
export function NearbyStationsMap({
    currentLocation,
    stations,
    onStationClick,
    selectedStationId,
}: NearbyStationsMapProps) {
    const mapRef = useRef<L.Map | null>(null);

    // 選択された駅にフォーカス
    useEffect(() => {
        if (selectedStationId && mapRef.current) {
            const station = stations.find((s) => s.station.id === selectedStationId);
            if (station) {
                mapRef.current.setView(
                    [station.station.lat, station.station.lng],
                    16
                );
            }
        }
    }, [selectedStationId, stations]);

    return (
        <div className="relative w-full h-96 md:h-[500px] lg:h-[600px] rounded-lg overflow-hidden">
            <MapContainer
                center={[currentLocation.lat, currentLocation.lng]}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
                ref={mapRef}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapCenterUpdater center={currentLocation} zoom={14} />

                {/* 現在地マーカー */}
                <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentLocationIcon}>
                    <Popup>現在地</Popup>
                </Marker>

                {/* 3km範囲の円 */}
                <Circle
                    center={[currentLocation.lat, currentLocation.lng]}
                    radius={3000}
                    pathOptions={{
                        color: "#3b82f6",
                        fillColor: "#3b82f6",
                        fillOpacity: 0.05,
                        weight: 1,
                    }}
                />

                {/* 駅マーカー */}
                {stations.map(({ station, railwayStatuses }) => {
                    const hasIssue = railwayStatuses.some(
                        (r) => r.status !== "normal"
                    );

                    return (
                        <Marker
                            key={station.id}
                            position={[station.lat, station.lng]}
                            icon={createStationIcon(hasIssue)}
                            eventHandlers={{
                                click: () => onStationClick?.(station.id),
                            }}
                        >
                            <Popup>
                                <div className="min-w-[150px]">
                                    <div className="font-bold text-base mb-1">
                                        {station.name}駅
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">
                                        {formatDistance(station.distance)}
                                    </div>
                                    {railwayStatuses.map((status) => (
                                        <div
                                            key={status.railwayId}
                                            className="flex items-center justify-between text-sm py-1 border-t border-gray-100"
                                        >
                                            <span className="text-gray-600">
                                                {status.railwayName}
                                            </span>
                                            <span
                                                className={`text-xs px-1.5 py-0.5 rounded ${
                                                    status.status === "normal"
                                                        ? "bg-green-100 text-green-700"
                                                        : status.status === "delay"
                                                          ? "bg-yellow-100 text-yellow-700"
                                                          : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {status.statusText}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
