import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import {
    readSubscriptionsFromGist,
    writeSubscriptionsToGist,
    type PushSubscription,
} from "@/shared/lib/gist/push-subscriptions-gist-client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        "mailto:synca@example.com",
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * OPTIONS: CORSプリフライトリクエスト対応
 */
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * 通知ペイロードの型
 */
interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: {
        url?: string;
        [key: string]: unknown;
    };
}

/**
 * POST: 全デバイスにプッシュ通知を送信
 */
export async function POST(request: NextRequest) {
    try {
        // API認証（簡易的な実装）
        const authHeader = request.headers.get("Authorization");
        const expectedToken = process.env.PUSH_API_SECRET;

        if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
            return NextResponse.json(
                {
                    success: false,
                    error: "認証に失敗しました",
                },
                { status: 401, headers: corsHeaders }
            );
        }

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: "VAPID鍵が設定されていません",
                },
                { status: 500, headers: corsHeaders }
            );
        }

        const body = await request.json();
        const { title, message, tag, url } = body;

        if (!title || !message) {
            return NextResponse.json(
                {
                    success: false,
                    error: "titleとmessageは必須です",
                },
                { status: 400, headers: corsHeaders }
            );
        }

        // 購読情報を取得
        const result = await readSubscriptionsFromGist();
        if (!result.success || !result.data) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error || "購読情報の取得に失敗しました",
                },
                { status: 500, headers: corsHeaders }
            );
        }

        const subscriptions = result.data;

        if (subscriptions.length === 0) {
            return NextResponse.json(
                {
                    success: true,
                    message: "購読者がいません",
                    sent: 0,
                    failed: 0,
                },
                { headers: corsHeaders }
            );
        }

        const payload: NotificationPayload = {
            title,
            body: message,
            icon: "/icon.svg",
            badge: "/icon.svg",
            tag: tag || undefined,
            data: {
                url: url || "/home",
            },
        };

        // 各購読者に通知を送信
        const results = await Promise.allSettled(
            subscriptions.map((sub) =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys,
                    },
                    JSON.stringify(payload)
                )
            )
        );

        // 失敗した購読を特定して削除
        const failedEndpoints: string[] = [];
        results.forEach((result, index) => {
            if (result.status === "rejected") {
                const error = result.reason;
                // 410 Gone または 404 Not Found は購読が無効
                if (error?.statusCode === 410 || error?.statusCode === 404) {
                    failedEndpoints.push(subscriptions[index].endpoint);
                }
                console.error(
                    `[Push] 送信失敗 (${subscriptions[index].endpoint}):`,
                    error?.message || error
                );
            }
        });

        // 無効な購読を削除
        if (failedEndpoints.length > 0) {
            const validSubscriptions = subscriptions.filter(
                (sub) => !failedEndpoints.includes(sub.endpoint)
            );
            await writeSubscriptionsToGist(validSubscriptions);
            console.log(`[Push] ${failedEndpoints.length}件の無効な購読を削除`);
        }

        const sent = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        return NextResponse.json(
            {
                success: true,
                message: `${sent}件送信完了`,
                sent,
                failed,
                removedInvalidSubscriptions: failedEndpoints.length,
            },
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("プッシュ送信エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error: "プッシュ通知の送信に失敗しました",
            },
            { status: 500, headers: corsHeaders }
        );
    }
}
