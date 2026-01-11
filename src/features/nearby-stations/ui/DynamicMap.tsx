"use client";

import dynamic from "next/dynamic";
import type { Coordinates, StationWithStatus } from "../types";

interface DynamicMapProps {
    currentLocation: Coordinates;
    stations: StationWithStatus[];
    onStationClick?: (stationId: string) => void;
    selectedStationId?: string | null;
}

/**
 * SSR対応のための動的インポートラッパー
 */
const NearbyStationsMapDynamic = dynamic(
    () =>
        import("./NearbyStationsMap").then((mod) => mod.NearbyStationsMap),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-64 md:h-80 rounded-lg bg-base-200 flex items-center justify-center">
                <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
        ),
    }
);

export function DynamicMap(props: DynamicMapProps) {
    return <NearbyStationsMapDynamic {...props} />;
}
