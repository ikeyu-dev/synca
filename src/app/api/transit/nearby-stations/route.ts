import { NextRequest, NextResponse } from "next/server";
import { getNearbyStations } from "@/shared/lib/overpass";

/**
 * 周辺駅取得APIエンドポイント
 * Overpass APIを使用してOpenStreetMapから駅を検索
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius") || "3000";

    if (!lat || !lng) {
        return NextResponse.json(
            { success: false, error: "latとlngパラメータは必須です" },
            { status: 400 }
        );
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseInt(radius, 10);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
        return NextResponse.json(
            { success: false, error: "無効なパラメータです" },
            { status: 400 }
        );
    }

    try {
        const stations = await getNearbyStations(latNum, lngNum, radiusNum);

        console.log(`[Overpass] ${latNum},${lngNum}から${radiusNum}m以内に${stations.length}駅を発見`);

        return NextResponse.json({
            success: true,
            data: stations,
            count: stations.length,
        });
    } catch (error) {
        console.error("[Overpass] 駅データの取得エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "駅データの取得に失敗しました",
            },
            { status: 500 }
        );
    }
}
