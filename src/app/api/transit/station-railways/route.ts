import { NextRequest, NextResponse } from "next/server";
import { getRailwaysByStationNames } from "@/shared/lib/odpt";

/**
 * 駅の路線情報取得APIエンドポイント
 * 駅名から路線情報を取得（ODPTのRailwayデータから逆引き）
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const stationNames = searchParams.get("names");

    if (!stationNames) {
        return NextResponse.json(
            { success: false, error: "namesパラメータは必須です" },
            { status: 400 }
        );
    }

    try {
        // カンマ区切りの駅名を配列に変換
        const names = stationNames.split(",").map((n) => n.trim());
        console.log(`[StationRailways] 駅名検索: ${names.join(", ")}`);

        // 路線キャッシュから逆引き
        const railwaysMap = await getRailwaysByStationNames(names);

        // 結果を整形
        const result = names.map((name) => ({
            stationName: name,
            railways: railwaysMap.get(name) || [],
        }));

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("[StationRailways] エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "駅路線情報の取得に失敗しました",
            },
            { status: 500 }
        );
    }
}
