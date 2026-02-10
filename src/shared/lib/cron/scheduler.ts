/**
 * Cronスケジューラ
 * サーバー起動時にポータルスクレイピングを定期実行
 */

import cron from "node-cron";
import { fetchPortalNotices, type PortalNotice } from "@/shared/lib/nit-portal";
import { notifyPortalNotices } from "@/shared/lib/discord/client";
import * as fs from "fs";
import * as path from "path";

const NOTIFIED_FILE = path.join(
    process.cwd(),
    ".cache",
    "notified-notices.json"
);

/**
 * 通知済みお知らせIDを取得
 */
function getNotifiedIds(): string[] {
    try {
        if (!fs.existsSync(NOTIFIED_FILE)) return [];
        return JSON.parse(fs.readFileSync(NOTIFIED_FILE, "utf-8"));
    } catch {
        return [];
    }
}

/**
 * 通知済みお知らせIDを保存
 */
function saveNotifiedIds(ids: string[]): void {
    try {
        const dir = path.dirname(NOTIFIED_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(NOTIFIED_FILE, JSON.stringify(ids, null, 2));
    } catch (error) {
        console.error("[Cron] 通知済みID保存エラー:", error);
    }
}

/**
 * ポータルお知らせをチェックしてDiscordに通知
 */
async function checkPortalNotices(): Promise<void> {
    console.log("[Cron] ポータルお知らせチェック開始");

    try {
        const result = await fetchPortalNotices(true);
        if (!result.success || !result.data) {
            console.error("[Cron] お知らせ取得失敗:", result.error);
            return;
        }

        const notices = result.data;
        const notifiedIds = getNotifiedIds();

        const newNotices = notices.filter(
            (notice: PortalNotice) => !notifiedIds.includes(notice.id)
        );

        if (newNotices.length === 0) {
            console.log("[Cron] 新しいお知らせなし");
            return;
        }

        console.log(`[Cron] ${newNotices.length}件の新しいお知らせを検出`);
        await notifyPortalNotices(newNotices);

        const updatedIds = [
            ...notifiedIds,
            ...newNotices.map((n: PortalNotice) => n.id),
        ].slice(-100);
        saveNotifiedIds(updatedIds);
    } catch (error) {
        console.error("[Cron] ポータルチェックエラー:", error);
    }
}

/**
 * Cronジョブを開始
 */
export function startCronJobs(): void {
    // JST深夜2:00-4:59を除外して1時間ごとに実行
    // node-cronはサーバーのタイムゾーンで動作
    cron.schedule(
        "0 0-1,5-23 * * *",
        () => {
            checkPortalNotices();
        },
        { timezone: "Asia/Tokyo" }
    );

    console.log("[Cron] スケジューラ起動完了（1時間ごと、JST 2:00-4:59除外）");
}
