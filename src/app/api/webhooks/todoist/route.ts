import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import webpush from "web-push";
import {
    readSubscriptionsFromGist,
    writeSubscriptionsToGist,
} from "@/shared/lib/gist/push-subscriptions-gist-client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const TODOIST_CLIENT_SECRET = process.env.TODOIST_CLIENT_SECRET;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        "mailto:synca@example.com",
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

/**
 * Todoistウェブフックのイベントタイプ
 */
type TodoistEventType =
    | "item:added"
    | "item:updated"
    | "item:deleted"
    | "item:completed"
    | "item:uncompleted";

/**
 * Todoistウェブフックのペイロード
 */
interface TodoistWebhookPayload {
    event_name: TodoistEventType;
    user_id: string;
    event_data: {
        id: string;
        content: string;
        description?: string;
        project_id?: string;
        due?: {
            date: string;
            string: string;
            is_recurring: boolean;
        };
        priority?: number;
        labels?: string[];
    };
}

/**
 * イベントタイプに応じたメッセージを生成
 */
function getNotificationMessage(payload: TodoistWebhookPayload): {
    title: string;
    body: string;
} {
    const taskName = payload.event_data.content || "タスク";

    switch (payload.event_name) {
        case "item:added":
            return {
                title: "Todoist: 新しいタスク",
                body: `「${taskName}」が追加されました`,
            };
        case "item:updated":
            return {
                title: "Todoist: タスク更新",
                body: `「${taskName}」が更新されました`,
            };
        case "item:deleted":
            return {
                title: "Todoist: タスク削除",
                body: `「${taskName}」が削除されました`,
            };
        case "item:completed":
            return {
                title: "Todoist: タスク完了",
                body: `「${taskName}」が完了しました`,
            };
        case "item:uncompleted":
            return {
                title: "Todoist: タスク未完了に変更",
                body: `「${taskName}」が未完了に戻されました`,
            };
        default:
            return {
                title: "Todoist",
                body: "タスクに変更がありました",
            };
    }
}

/**
 * HMACシグネチャを検証
 */
function verifySignature(
    payload: string,
    signature: string | null,
    secret: string
): boolean {
    if (!signature) return false;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("base64");

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * POST: Todoistからのウェブフックを受信
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get("X-Todoist-Hmac-SHA256");

        // シグネチャ検証（設定されている場合のみ）
        if (TODOIST_CLIENT_SECRET) {
            if (!verifySignature(rawBody, signature, TODOIST_CLIENT_SECRET)) {
                console.error("[Todoist Webhook] シグネチャ検証失敗");
                return NextResponse.json(
                    { success: false, error: "Invalid signature" },
                    { status: 401 }
                );
            }
        }

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            console.error("[Todoist Webhook] VAPID鍵が設定されていません");
            return NextResponse.json(
                { success: false, error: "VAPID keys not configured" },
                { status: 500 }
            );
        }

        const payload: TodoistWebhookPayload = JSON.parse(rawBody);
        console.log("[Todoist Webhook] 受信:", payload.event_name);

        // 購読情報を取得
        const result = await readSubscriptionsFromGist();
        if (!result.success || !result.data || result.data.length === 0) {
            return NextResponse.json({
                success: true,
                message: "購読者がいません",
            });
        }

        const subscriptions = result.data;
        const { title, body } = getNotificationMessage(payload);

        const notificationPayload = JSON.stringify({
            title,
            body,
            icon: "/icon.svg",
            badge: "/icon.svg",
            tag: "todoist-task",
            data: {
                url: "/home",
                type: "todoist",
                eventName: payload.event_name,
                taskId: payload.event_data.id,
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
                    notificationPayload
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

        const sent = results.filter((r) => r.status === "fulfilled").length;

        return NextResponse.json({
            success: true,
            message: `通知を${sent}件送信しました`,
            event: payload.event_name,
        });
    } catch (error) {
        console.error("[Todoist Webhook] エラー:", error);
        return NextResponse.json(
            { success: false, error: "Webhook処理に失敗しました" },
            { status: 500 }
        );
    }
}
