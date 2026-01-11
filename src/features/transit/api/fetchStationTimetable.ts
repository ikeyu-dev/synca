import type { Station } from "@/entities/station";
import { getStationTimetable, type OdptStationTimetable } from "@/shared/lib/odpt";

/**
 * 時刻表の列車情報
 */
export interface TimetableEntry {
    departureTime: string;
    destination: string;
    trainType: string;
    isLast?: boolean;
}

/**
 * 時刻表のレスポンス
 */
export interface StationTimetableResponse {
    success: boolean;
    data?: {
        station: string;
        direction: string;
        entries: TimetableEntry[];
    };
    error?: string;
}

/**
 * 今日のカレンダーIDを取得
 */
function getTodayCalendar(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // 土日祝の判定（簡易版）
    if (dayOfWeek === 0) {
        return "odpt.Calendar:SundayHoliday";
    } else if (dayOfWeek === 6) {
        return "odpt.Calendar:Saturday";
    }
    return "odpt.Calendar:Weekday";
}

/**
 * 列車種別IDから日本語名を取得
 */
function getTrainTypeName(trainType?: string): string {
    if (!trainType) return "普通";

    // 列車種別IDから名前を推測
    if (trainType.includes("Local")) return "普通";
    if (trainType.includes("Rapid")) return "快速";
    if (trainType.includes("Express")) return "急行";
    if (trainType.includes("LimitedExpress")) return "特急";
    if (trainType.includes("SemiExpress")) return "準急";
    if (trainType.includes("CommuterRapid")) return "通勤快速";
    if (trainType.includes("RapidExpress")) return "快速急行";

    return "普通";
}

/**
 * 駅IDから駅名を抽出
 */
function extractStationName(stationId?: string): string {
    if (!stationId) return "不明";

    // "odpt.Station:JR-East.Takasaki.Omiya" -> "Omiya" -> "大宮"的な処理
    const parts = stationId.split(".");
    const lastPart = parts[parts.length - 1];

    // 駅名の日本語マッピング（よく使う駅）
    const stationNameMap: Record<string, string> = {
        "Omiya": "大宮",
        "Ueno": "上野",
        "Tokyo": "東京",
        "Shinjuku": "新宿",
        "Ikebukuro": "池袋",
        "Akabane": "赤羽",
        "Urawa": "浦和",
        "Kumagaya": "熊谷",
        "Takasaki": "高崎",
        "Miyahara": "宮原",
        "ShinShiraoka": "新白岡",
        "TobuDobutsuKoen": "東武動物公園",
        "Kasukabe": "春日部",
        "Koshigaya": "越谷",
        "ShinKoshigaya": "新越谷",
        "Kita-Koshigaya": "北越谷",
        "Kuki": "久喜",
        "Hasuda": "蓮田",
        "Asakusa": "浅草",
        "Tobu-Nerima": "東武練馬",
        "Minami-Kurihashi": "南栗橋",
        "Kita-Kasukabe": "北春日部",
    };

    return stationNameMap[lastPart] || lastPart;
}

/**
 * 駅の時刻表を取得
 */
export async function fetchStationTimetable(
    station: Station,
    direction: "up" | "down" = "down"
): Promise<StationTimetableResponse> {
    if (!station.odptStationId || !station.odptRailwayId) {
        return {
            success: false,
            error: "駅のODPT情報が設定されていません",
        };
    }

    try {
        // 方向の決定
        const railDirection =
            direction === "down"
                ? "odpt.RailDirection:Outbound"
                : "odpt.RailDirection:Inbound";

        const timetables = await getStationTimetable({
            station: station.odptStationId,
            railway: station.odptRailwayId,
            calendar: getTodayCalendar(),
            railDirection,
        });

        if (timetables.length === 0) {
            return {
                success: true,
                data: {
                    station: station.name,
                    direction: direction === "down" ? "下り" : "上り",
                    entries: [],
                },
            };
        }

        // 現在時刻以降の時刻表を抽出
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        const entries: TimetableEntry[] = [];
        const timetable = timetables[0];

        for (const obj of timetable["odpt:stationTimetableObject"]) {
            const departureTime = obj["odpt:departureTime"];
            if (departureTime >= currentTime) {
                entries.push({
                    departureTime,
                    destination: obj["odpt:destinationStation"]
                        ? extractStationName(obj["odpt:destinationStation"][0])
                        : "不明",
                    trainType: getTrainTypeName(obj["odpt:trainType"]),
                    isLast: obj["odpt:isLast"],
                });
            }

            // 次の10本まで取得
            if (entries.length >= 10) break;
        }

        return {
            success: true,
            data: {
                station: station.name,
                direction: direction === "down" ? "下り" : "上り",
                entries,
            },
        };
    } catch (error) {
        console.error("[ODPT] 時刻表の取得エラー:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "時刻表の取得に失敗しました",
        };
    }
}
