import { NextRequest, NextResponse } from "next/server";
import { removeSubscription } from "@/shared/lib/gist/push-subscriptions-gist-client";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * OPTIONS: CORSプリフライトリクエスト対応
 */
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST: プッシュ通知の購読を解除
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: "endpointが必要です",
                },
                { status: 400, headers: corsHeaders }
            );
        }

        const result = await removeSubscription(endpoint);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                },
                { status: 500, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "購読を解除しました",
            },
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("購読解除エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error: "購読の解除に失敗しました",
            },
            { status: 500, headers: corsHeaders }
        );
    }
}
