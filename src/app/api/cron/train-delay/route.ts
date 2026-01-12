import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getDelayedLines } from "@/shared/lib/train/delay-client";
import {
    readSubscriptionsFromGist,
    writeSubscriptionsToGist,
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

/**
 * 最後に通知した遅延状態を保持（Gistで管理）
 * TODO: より永続的な状態管理が必要な場合はGistに保存
 */
const lastNotifiedDelays = new Map<string, string>();

/**
 * GET: 電車遅延をチェックして通知を送信
 * Vercel Cronから定期的に呼び出される
 */
export async function GET(request: NextRequest) {
    try {
        // Vercel Cron認証
        const authHeader = request.headers.get("Authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { success: false, error: "認証に失敗しました" },
                { status: 401 }
            );
        }

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            return NextResponse.json(
                { success: false, error: "VAPID鍵が設定されていません" },
                { status: 500 }
            );
        }

        // 遅延情報を取得
        const delayedLines = await getDelayedLines();

        if (delayedLines.length === 0) {
            // 遅延が解消された場合、通知履歴をクリア
            lastNotifiedDelays.clear();
            return NextResponse.json({
                success: true,
                message: "遅延なし",
                delayedLines: [],
                notificationsSent: 0,
            });
        }

        // 新しい遅延のみを抽出（既に通知済みのものは除く）
        const newDelays = delayedLines.filter((line) => {
            const lastNotified = lastNotifiedDelays.get(line.name);
            return lastNotified !== line.lastUpdate;
        });

        if (newDelays.length === 0) {
            return NextResponse.json({
                success: true,
                message: "新しい遅延なし（既に通知済み）",
                delayedLines: delayedLines.map((l) => l.name),
                notificationsSent: 0,
            });
        }

        // 購読情報を取得
        const result = await readSubscriptionsFromGist();
        if (!result.success || !result.data || result.data.length === 0) {
            return NextResponse.json({
                success: true,
                message: "購読者がいません",
                delayedLines: newDelays.map((l) => l.name),
                notificationsSent: 0,
            });
        }

        const subscriptions = result.data;

        // 通知ペイロードを作成
        const lineNames = newDelays.map((l) => l.name).join("・");
        const payload = JSON.stringify({
            title: "電車遅延情報",
            body: `${lineNames}に遅延が発生しています`,
            icon: "/icon.svg",
            badge: "/icon.svg",
            tag: "train-delay",
            data: {
                url: "/home",
                type: "train-delay",
                lines: newDelays.map((l) => l.name),
            },
        });

        // 全購読者に通知を送信
        const results = await Promise.allSettled(
            subscriptions.map((sub) =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys,
                    },
                    payload
                )
            )
        );

        // 失敗した購読を削除
        const failedEndpoints: string[] = [];
        results.forEach((res, index) => {
            if (res.status === "rejected") {
                const error = res.reason;
                if (error?.statusCode === 410 || error?.statusCode === 404) {
                    failedEndpoints.push(subscriptions[index].endpoint);
                }
            }
        });

        if (failedEndpoints.length > 0) {
            const validSubscriptions = subscriptions.filter(
                (sub) => !failedEndpoints.includes(sub.endpoint)
            );
            await writeSubscriptionsToGist(validSubscriptions);
        }

        // 通知済みの遅延を記録
        newDelays.forEach((line) => {
            lastNotifiedDelays.set(line.name, line.lastUpdate);
        });

        const sent = results.filter((r) => r.status === "fulfilled").length;

        return NextResponse.json({
            success: true,
            message: `${lineNames}の遅延を通知しました`,
            delayedLines: newDelays.map((l) => l.name),
            notificationsSent: sent,
            failedSubscriptions: failedEndpoints.length,
        });
    } catch (error) {
        console.error("[Train Delay Cron] エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error: "電車遅延チェックに失敗しました",
            },
            { status: 500 }
        );
    }
}
