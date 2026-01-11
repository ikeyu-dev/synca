import { NextResponse } from "next/server";
import { fetchPortalNotices } from "@/shared/lib/nit-portal";

/**
 * ポータルサイトのお知らせ取得APIエンドポイント
 */
export async function GET() {
    try {
        const result = await fetchPortalNotices();

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.data,
            count: result.data?.length || 0,
        });
    } catch (error) {
        console.error("[Portal API] エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "お知らせの取得に失敗しました",
            },
            { status: 500 }
        );
    }
}
