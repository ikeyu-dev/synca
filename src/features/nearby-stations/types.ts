/**
 * 周辺駅機能の型定義
 */

/**
 * 座標
 */
export interface Coordinates {
    lat: number;
    lng: number;
}

/**
 * 周辺駅（距離付き）
 */
export interface NearbyStation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    railways: string[];
    distance: number;
}

/**
 * 路線の運行情報
 */
export interface RailwayStatus {
    railwayId: string;
    railwayName: string;
    operator: string;
    status: "normal" | "delay" | "suspend" | "direct" | "restore";
    statusText: string;
    cause?: string;
}

/**
 * 駅ごとの運行情報
 */
export interface StationWithStatus {
    station: NearbyStation;
    railwayStatuses: RailwayStatus[];
}
