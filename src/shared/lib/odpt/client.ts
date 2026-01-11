/**
 * ODPT API クライアント
 * 公共交通オープンデータセンターAPI v4
 */

import type {
    OdptTrainInformation,
    OdptRailway,
    OdptStation,
    OdptStationTimetable,
    OdptTrain,
    OdptOperator,
    OdptApiResponse,
} from "./types";

const ODPT_API_BASE_URL = "https://api.odpt.org/api/v4";

/**
 * ODPT APIキーを取得
 */
function getApiKey(): string {
    const apiKey = process.env.ODPT_API_KEY;
    if (!apiKey) {
        throw new Error("ODPT_API_KEY環境変数が設定されていません");
    }
    return apiKey;
}

/**
 * ODPT APIへのリクエストを実行
 */
async function fetchOdptApi<T>(
    endpoint: string,
    params: Record<string, string> = {}
): Promise<OdptApiResponse<T>> {
    const url = new URL(`${ODPT_API_BASE_URL}/${endpoint}`);
    url.searchParams.set("acl:consumerKey", getApiKey());

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
        headers: {
            Accept: "application/json",
        },
        next: { revalidate: 60 },
    });

    if (!response.ok) {
        throw new Error(
            `ODPT API エラー: ${response.status} ${response.statusText}`
        );
    }

    return response.json();
}

/**
 * 運行情報を取得
 * @param operator - 事業者ID (例: "odpt.Operator:JR-East")
 * @param railway - 路線ID (例: "odpt.Railway:JR-East.Takasaki")
 */
export async function getTrainInformation(params?: {
    operator?: string;
    railway?: string;
}): Promise<OdptTrainInformation[]> {
    const queryParams: Record<string, string> = {};
    if (params?.operator) {
        queryParams["odpt:operator"] = params.operator;
    }
    if (params?.railway) {
        queryParams["odpt:railway"] = params.railway;
    }
    return fetchOdptApi<OdptTrainInformation>("odpt:TrainInformation", queryParams);
}

/**
 * 路線情報を取得
 * @param operator - 事業者ID
 * @param railwayId - 路線ID（owl:sameAs）
 */
export async function getRailway(params?: {
    operator?: string;
    railwayId?: string;
}): Promise<OdptRailway[]> {
    const queryParams: Record<string, string> = {};
    if (params?.operator) {
        queryParams["odpt:operator"] = params.operator;
    }
    if (params?.railwayId) {
        queryParams["owl:sameAs"] = params.railwayId;
    }
    return fetchOdptApi<OdptRailway>("odpt:Railway", queryParams);
}

/**
 * 駅情報を取得
 * @param operator - 事業者ID
 * @param railway - 路線ID
 * @param stationId - 駅ID（owl:sameAs）
 */
export async function getStation(params?: {
    operator?: string;
    railway?: string;
    stationId?: string;
}): Promise<OdptStation[]> {
    const queryParams: Record<string, string> = {};
    if (params?.operator) {
        queryParams["odpt:operator"] = params.operator;
    }
    if (params?.railway) {
        queryParams["odpt:railway"] = params.railway;
    }
    if (params?.stationId) {
        queryParams["owl:sameAs"] = params.stationId;
    }
    return fetchOdptApi<OdptStation>("odpt:Station", queryParams);
}

/**
 * 駅時刻表を取得
 * @param station - 駅ID
 * @param railway - 路線ID
 * @param calendar - カレンダーID (例: "odpt.Calendar:Weekday")
 * @param railDirection - 方向 (例: "odpt.RailDirection:Outbound")
 */
export async function getStationTimetable(params: {
    station?: string;
    railway?: string;
    calendar?: string;
    railDirection?: string;
}): Promise<OdptStationTimetable[]> {
    const queryParams: Record<string, string> = {};
    if (params.station) {
        queryParams["odpt:station"] = params.station;
    }
    if (params.railway) {
        queryParams["odpt:railway"] = params.railway;
    }
    if (params.calendar) {
        queryParams["odpt:calendar"] = params.calendar;
    }
    if (params.railDirection) {
        queryParams["odpt:railDirection"] = params.railDirection;
    }
    return fetchOdptApi<OdptStationTimetable>("odpt:StationTimetable", queryParams);
}

/**
 * 列車のリアルタイム位置情報を取得
 * @param operator - 事業者ID
 * @param railway - 路線ID
 */
export async function getTrain(params?: {
    operator?: string;
    railway?: string;
}): Promise<OdptTrain[]> {
    const queryParams: Record<string, string> = {};
    if (params?.operator) {
        queryParams["odpt:operator"] = params.operator;
    }
    if (params?.railway) {
        queryParams["odpt:railway"] = params.railway;
    }
    return fetchOdptApi<OdptTrain>("odpt:Train", queryParams);
}

/**
 * 事業者情報を取得
 * @param operatorId - 事業者ID（owl:sameAs）
 */
export async function getOperator(params?: {
    operatorId?: string;
}): Promise<OdptOperator[]> {
    const queryParams: Record<string, string> = {};
    if (params?.operatorId) {
        queryParams["owl:sameAs"] = params.operatorId;
    }
    return fetchOdptApi<OdptOperator>("odpt:Operator", queryParams);
}

/**
 * 地物情報検索APIで周辺の駅を取得
 * @param lat - 緯度
 * @param lon - 経度
 * @param radius - 半径（メートル、0-4000）
 */
export async function getStationsByLocation(params: {
    lat: number;
    lon: number;
    radius: number;
}): Promise<OdptStation[]> {
    const url = new URL(`${ODPT_API_BASE_URL}/places/odpt:Station`);
    url.searchParams.set("acl:consumerKey", getApiKey());
    url.searchParams.set("lat", String(params.lat));
    url.searchParams.set("lon", String(params.lon));
    url.searchParams.set("radius", String(Math.min(params.radius, 4000)));

    const response = await fetch(url.toString(), {
        headers: {
            Accept: "application/json",
        },
        next: { revalidate: 3600 },
    });

    if (!response.ok) {
        throw new Error(
            `ODPT API エラー: ${response.status} ${response.statusText}`
        );
    }

    return response.json();
}

/**
 * 駅名で駅情報を検索
 * @param stationName - 駅名（複数指定可、カンマ区切り）
 */
export async function getStationsByName(
    stationName: string
): Promise<OdptStation[]> {
    const queryParams: Record<string, string> = {
        "dc:title": stationName,
    };
    return fetchOdptApi<OdptStation>("odpt:Station", queryParams);
}
