import { NextRequest, NextResponse } from "next/server";
import { searchTransitRoutes } from "@/shared/lib/yahoo-transit";

/**
 * 乗換経路検索APIエンドポイント
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const type = searchParams.get("type") as "departure" | "arrival" | null;
        const datetime = searchParams.get("datetime");

        if (!from || !to) {
            return NextResponse.json(
                {
                    success: false,
                    error: "出発駅と到着駅を指定してください",
                },
                { status: 400 }
            );
        }

        const options = {
            from,
            to,
            type: type || "departure",
            datetime: datetime ? new Date(datetime) : undefined,
        };

        const routes = await searchTransitRoutes(options);

        return NextResponse.json({
            success: true,
            data: routes,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[RouteSearch] 経路検索エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "経路検索に失敗しました",
            },
            { status: 500 }
        );
    }
}
