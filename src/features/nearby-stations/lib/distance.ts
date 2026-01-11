/**
 * 距離計算ユーティリティ
 */

import type { Coordinates } from "../types";

/**
 * 2点間の距離を計算（ハーバサイン公式）
 * @returns 距離（メートル）
 */
export function calculateDistance(
    point1: Coordinates,
    point2: Coordinates
): number {
    const R = 6371000; // 地球の半径（メートル）
    const dLat = toRad(point2.lat - point1.lat);
    const dLng = toRad(point2.lng - point1.lng);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(point1.lat)) *
            Math.cos(toRad(point2.lat)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * 度をラジアンに変換
 */
function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * 距離を読みやすい形式にフォーマット
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}
