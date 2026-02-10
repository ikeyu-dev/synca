import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { notifyTodoistEvent } from "@/shared/lib/discord/client";

const TODOIST_CLIENT_SECRET = process.env.TODOIST_CLIENT_SECRET;

/**
 * Todoistウェブフックのペイロード
 */
interface TodoistWebhookPayload {
    event_name: string;
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
 * Todoistからのウェブフックを受信してDiscordに通知
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get("X-Todoist-Hmac-SHA256");

        if (TODOIST_CLIENT_SECRET) {
            if (!verifySignature(rawBody, signature, TODOIST_CLIENT_SECRET)) {
                console.error("[Todoist Webhook] シグネチャ検証失敗");
                return NextResponse.json(
                    { success: false, error: "Invalid signature" },
                    { status: 401 }
                );
            }
        }

        const payload: TodoistWebhookPayload = JSON.parse(rawBody);
        console.log("[Todoist Webhook] 受信:", payload.event_name);

        const taskContent = payload.event_data.content || "タスク";
        const sent = await notifyTodoistEvent(
            payload.event_name,
            taskContent
        );

        return NextResponse.json({
            success: true,
            message: sent
                ? "Discordに通知しました"
                : "Discord通知に失敗しました",
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
