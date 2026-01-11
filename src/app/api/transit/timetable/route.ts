import { NextRequest, NextResponse } from "next/server";
import { getStationTimetable } from "@/shared/lib/odpt";

/**
 * 今日のカレンダーIDを取得
 */
function getTodayCalendar(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();

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

    const parts = stationId.split(".");
    const lastPart = parts[parts.length - 1];

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
        "KitaKoshigaya": "北越谷",
        "Kuki": "久喜",
        "Hasuda": "蓮田",
        "Asakusa": "浅草",
        "TobuNerima": "東武練馬",
        "MinamiKurihashi": "南栗橋",
        "KitaKasukabe": "北春日部",
        "Kagohara": "籠原",
        "Ageo": "上尾",
        "Okegawa": "桶川",
        "KitaAgeo": "北上尾",
        "Konosu": "鴻巣",
        "KitaHongo": "北本",
        "Fukiage": "吹上",
        "Gyoda": "行田",
        "Shinmachi": "新町",
        "Kuragano": "倉賀野",
    };

    return stationNameMap[lastPart] || lastPart;
}

/**
 * 時刻表取得APIエンドポイント
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const stationId = searchParams.get("stationId");
    const railwayId = searchParams.get("railwayId");
    const direction = searchParams.get("direction") || "down";

    if (!stationId || !railwayId) {
        return NextResponse.json(
            { success: false, error: "stationIdとrailwayIdは必須です" },
            { status: 400 }
        );
    }

    try {
        const railDirection =
            direction === "up"
                ? "odpt.RailDirection:Inbound"
                : "odpt.RailDirection:Outbound";

        const timetables = await getStationTimetable({
            station: stationId,
            railway: railwayId,
            calendar: getTodayCalendar(),
            railDirection,
        });

        if (timetables.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    station: stationId,
                    direction: direction === "down" ? "下り" : "上り",
                    entries: [],
                },
            });
        }

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        const entries: Array<{
            departureTime: string;
            destination: string;
            trainType: string;
            isLast?: boolean;
        }> = [];

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

            if (entries.length >= 10) break;
        }

        return NextResponse.json({
            success: true,
            data: {
                station: stationId,
                direction: direction === "down" ? "下り" : "上り",
                entries,
            },
        });
    } catch (error) {
        console.error("[ODPT] 時刻表の取得エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "時刻表の取得に失敗しました",
            },
            { status: 500 }
        );
    }
}
