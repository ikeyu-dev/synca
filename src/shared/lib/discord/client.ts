/**
 * Discord Webhook クライアント
 * Discord チャンネルに通知を送信する
 */

const WEBHOOK_URL_PORTAL = process.env.DISCORD_WEBHOOK_URL_PORTAL;
const WEBHOOK_URL_TODOIST = process.env.DISCORD_WEBHOOK_URL_TODOIST;

interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: { text: string };
    timestamp?: string;
}

interface DiscordWebhookPayload {
    content?: string;
    username?: string;
    embeds?: DiscordEmbed[];
}

/**
 * 指定したWebhook URLにメッセージを送信する
 */
async function sendToWebhook(
    webhookUrl: string,
    payload: DiscordWebhookPayload
): Promise<boolean> {
    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "Synca",
                ...payload,
            }),
        });

        if (!response.ok) {
            console.error(
                `[Discord] 送信エラー: ${response.status} ${response.statusText}`
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error("[Discord] 送信エラー:", error);
        return false;
    }
}

/** Embed色定数 */
const COLOR = {
    INFO: 0x3b82f6,
    SUCCESS: 0x22c55e,
    WARNING: 0xf59e0b,
    ERROR: 0xef4444,
    PORTAL: 0x6366f1,
    TODOIST: 0xf97316,
} as const;

/**
 * ポータルお知らせの新着をDiscordに通知
 */
export async function notifyPortalNotices(
    notices: { title: string; date: string; isImportant: boolean }[]
): Promise<boolean> {
    if (notices.length === 0) return true;

    const embeds: DiscordEmbed[] = notices.slice(0, 10).map((notice) => ({
        title: notice.isImportant ? `[重要] ${notice.title}` : notice.title,
        color: notice.isImportant ? COLOR.ERROR : COLOR.PORTAL,
        footer: { text: notice.date },
    }));

    if (!WEBHOOK_URL_PORTAL) {
        console.error("[Discord] DISCORD_WEBHOOK_URL_PORTAL が設定されていません");
        return false;
    }

    return sendToWebhook(WEBHOOK_URL_PORTAL, {
        content: `**ポータル: ${notices.length}件の新しいお知らせ**`,
        embeds,
    });
}

/**
 * Todoistイベントの通知をDiscordに送信
 */
export async function notifyTodoistEvent(
    eventName: string,
    taskContent: string
): Promise<boolean> {
    const eventLabels: Record<string, string> = {
        "item:added": "タスク追加",
        "item:updated": "タスク更新",
        "item:completed": "タスク完了",
        "item:uncompleted": "タスク未完了に戻す",
        "item:deleted": "タスク削除",
    };

    const label = eventLabels[eventName] || eventName;

    if (!WEBHOOK_URL_TODOIST) {
        console.error("[Discord] DISCORD_WEBHOOK_URL_TODOIST が設定されていません");
        return false;
    }

    return sendToWebhook(WEBHOOK_URL_TODOIST, {
        embeds: [
            {
                title: `Todoist: ${label}`,
                description: taskContent,
                color: COLOR.TODOIST,
                timestamp: new Date().toISOString(),
            },
        ],
    });
}
