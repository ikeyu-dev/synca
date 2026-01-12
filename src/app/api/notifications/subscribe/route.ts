import { NextRequest, NextResponse } from "next/server";
import { addSubscription } from "@/shared/lib/gist/push-subscriptions-gist-client";

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
 * POST: プッシュ通知を購読
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { subscription, userAgent } = body;

        if (!subscription?.endpoint || !subscription?.keys) {
            return NextResponse.json(
                {
                    success: false,
                    error: "購読情報が不正です",
                },
                { status: 400, headers: corsHeaders }
            );
        }

        const result = await addSubscription({
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
            userAgent,
        });

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
                message: "購読を登録しました",
            },
            { status: 201, headers: corsHeaders }
        );
    } catch (error) {
        console.error("購読登録エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error: "購読の登録に失敗しました",
            },
            { status: 500, headers: corsHeaders }
        );
    }
}
