/**
 * Yahoo乗換案内スクレイピングクライアント
 * https://transit.yahoo.co.jp/search/result からデータを取得
 */

import type { TransitRoute, RouteSegment } from "@/entities/transit";

/**
 * Yahoo乗換案内APIのレスポンス型
 */
interface YahooTransitResponse {
    props: {
        pageProps: {
            naviSearchParam: {
                featureInfoList: YahooFeatureInfo[];
            };
        };
    };
}

/**
 * 経路情報
 */
interface YahooFeatureInfo {
    featureIndex: number;
    summaryInfo: {
        departureTime: string;
        arrivalTime: string;
        totalTime: string;
        totalPrice: string;
        transferCount: string;
    };
    edgeInfoList: YahooEdgeInfo[];
}

/**
 * 経路の区間情報
 */
interface YahooEdgeInfo {
    edgeIndex: number;
    railName: string;
    stationName: string;
    timeInfo?: {
        time: string;
        type: number;
    }[];
    stopStationList?: {
        name: string;
        departureTime: string;
    }[];
}

/**
 * 乗換検索のオプション
 */
export interface TransitSearchOptions {
    from: string;
    to: string;
    datetime?: Date;
    type?: "departure" | "arrival";
}

/**
 * 時間文字列を分に変換
 */
function parseDuration(timeStr: string): number {
    const hourMatch = timeStr.match(/(\d+)時間/);
    const minMatch = timeStr.match(/(\d+)分/);
    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
    return hours * 60 + minutes;
}

/**
 * 運賃文字列を数値に変換
 */
function parsePrice(priceStr: string): number {
    return parseInt(priceStr.replace(/[,円]/g, ""), 10) || 0;
}

/**
 * edgeInfoからtimeを抽出
 */
function getTimeFromEdge(edge: YahooEdgeInfo): string {
    if (edge.timeInfo && edge.timeInfo.length > 0) {
        return edge.timeInfo[0].time;
    }
    return "";
}

/**
 * edgeInfoListからRouteSegment配列を生成
 */
function buildSegments(edgeInfoList: YahooEdgeInfo[]): RouteSegment[] {
    const segments: RouteSegment[] = [];

    for (let i = 0; i < edgeInfoList.length - 1; i++) {
        const current = edgeInfoList[i];
        const next = edgeInfoList[i + 1];

        if (!current.railName || current.railName === "徒歩") {
            continue;
        }

        const departureTime = getTimeFromEdge(current);
        const arrivalTime = getTimeFromEdge(next);

        const duration = calculateDurationMinutes(departureTime, arrivalTime);

        segments.push({
            lineName: current.railName,
            departureStation: current.stationName,
            arrivalStation: next.stationName,
            departureTime,
            arrivalTime,
            duration,
        });
    }

    return segments;
}

/**
 * 時刻文字列から所要時間（分）を計算
 */
function calculateDurationMinutes(
    departure: string,
    arrival: string
): number {
    const depMatch = departure.match(/(\d+):(\d+)/);
    const arrMatch = arrival.match(/(\d+):(\d+)/);

    if (!depMatch || !arrMatch) {
        return 0;
    }

    const depMinutes =
        parseInt(depMatch[1], 10) * 60 + parseInt(depMatch[2], 10);
    let arrMinutes =
        parseInt(arrMatch[1], 10) * 60 + parseInt(arrMatch[2], 10);

    if (arrMinutes < depMinutes) {
        arrMinutes += 24 * 60;
    }

    return arrMinutes - depMinutes;
}

/**
 * YahooFeatureInfoをTransitRouteに変換
 */
function convertToTransitRoute(feature: YahooFeatureInfo): TransitRoute {
    const { summaryInfo, edgeInfoList } = feature;

    return {
        totalDuration: parseDuration(summaryInfo.totalTime),
        totalFare: parsePrice(summaryInfo.totalPrice),
        transferCount: parseInt(summaryInfo.transferCount, 10) || 0,
        segments: buildSegments(edgeInfoList),
    };
}

/**
 * HTMLからJSON dataを抽出
 */
function extractJsonFromHtml(html: string): YahooTransitResponse | null {
    const startTag = '<script id="__NEXT_DATA__" type="application/json">';
    const endTag = "</script>";

    const startIndex = html.indexOf(startTag);
    if (startIndex === -1) {
        return null;
    }

    const jsonStart = startIndex + startTag.length;
    const endIndex = html.indexOf(endTag, jsonStart);
    if (endIndex === -1) {
        return null;
    }

    const jsonStr = html.substring(jsonStart, endIndex);

    try {
        return JSON.parse(jsonStr) as YahooTransitResponse;
    } catch {
        return null;
    }
}

/**
 * Yahoo乗換案内から経路を検索
 */
export async function searchTransitRoutes(
    options: TransitSearchOptions
): Promise<TransitRoute[]> {
    const { from, to, datetime, type = "departure" } = options;
    const now = datetime || new Date();

    const params = new URLSearchParams({
        from,
        to,
        y: String(now.getFullYear()),
        m: String(now.getMonth() + 1),
        d: String(now.getDate()),
        hh: String(now.getHours()),
        m1: String(Math.floor(now.getMinutes() / 10)),
        m2: String(now.getMinutes() % 10),
        type: type === "departure" ? "1" : "4",
        ticket: "ic",
        expkind: "1",
        s: "0",
    });

    const url = `https://transit.yahoo.co.jp/search/result?${params.toString()}`;

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; SyncaBot/1.0; +https://synca.app)",
                Accept: "text/html,application/xhtml+xml",
                "Accept-Language": "ja",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const html = await response.text();
        const jsonData = extractJsonFromHtml(html);

        if (!jsonData) {
            throw new Error("経路データの抽出に失敗しました");
        }

        const featureInfoList =
            jsonData.props.pageProps.naviSearchParam?.featureInfoList;

        if (!featureInfoList || featureInfoList.length === 0) {
            return [];
        }

        return featureInfoList.map(convertToTransitRoute);
    } catch (error) {
        console.error("[YahooTransit] 経路検索エラー:", error);
        throw error;
    }
}
