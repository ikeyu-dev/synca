/**
 * 路線情報
 */
export interface RailwayLine {
    id: string;
    name: string;
    operator: string;
    color?: string;
}

/**
 * 運行情報のステータス
 */
export type TrainStatus =
    | "normal"
    | "delay"
    | "suspend"
    | "cancel"
    | "direct"
    | "restore";

/**
 * 運行情報
 */
export interface TrainOperation {
    lineId: string;
    lineName: string;
    operator: string;
    status: TrainStatus;
    statusText: string;
    cause?: string;
    updatedAt: Date;
}

/**
 * 乗り換え経路のセグメント
 */
export interface RouteSegment {
    lineName: string;
    departureStation: string;
    arrivalStation: string;
    departureTime: string;
    arrivalTime: string;
    duration: number;
}

/**
 * 乗り換え経路
 */
export interface TransitRoute {
    totalDuration: number;
    totalFare: number;
    transferCount: number;
    segments: RouteSegment[];
}
