import { NextRequest, NextResponse } from "next/server";
import { fetchPortalNotices } from "@/shared/lib/nit-portal";
import { notifyPortalNotices } from "@/shared/lib/discord/client";
import * as fs from "fs";
import * as path from "path";

const NOTIFIED_FILE = path.join(
    process.cwd(),
    ".cache",
    "notified-notices.json"
);

/**
 * 通知済みお知らせIDをローカルファイルから取得
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
 * 通知済みお知らせIDをローカルファイルに保存
 */
function saveNotifiedIds(ids: string[]): void {
    try {
        const dir = path.dirname(NOTIFIED_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(NOTIFIED_FILE, JSON.stringify(ids, null, 2));
    } catch (error) {
        console.error("[Portal Cron] 通知済みID保存エラー:", error);
    }
}

/**
 * ポータルの新着お知らせをチェックしてDiscordに通知
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { success: false, error: "認証に失敗しました" },
                { status: 401 }
            );
        }

        const result = await fetchPortalNotices(true);
        if (!result.success || !result.data) {
            return NextResponse.json({
                success: false,
                error: result.error || "お知らせの取得に失敗しました",
            });
        }

        const notices = result.data;
        const notifiedIds = getNotifiedIds();

        const newNotices = notices.filter(
            (notice) => !notifiedIds.includes(notice.id)
        );

        if (newNotices.length === 0) {
            return NextResponse.json({
                success: true,
                message: "新しいお知らせはありません",
                totalNotices: notices.length,
                newNotices: 0,
            });
        }

        const sent = await notifyPortalNotices(newNotices);

        const updatedIds = [
            ...notifiedIds,
            ...newNotices.map((n) => n.id),
        ].slice(-100);
        saveNotifiedIds(updatedIds);

        return NextResponse.json({
            success: true,
            message: `${newNotices.length}件の新しいお知らせをDiscordに通知しました`,
            newNotices: newNotices.length,
            discordSent: sent,
        });
    } catch (error) {
        console.error("[Portal Cron] エラー:", error);
        return NextResponse.json(
            { success: false, error: "ポータルチェックに失敗しました" },
            { status: 500 }
        );
    }
}
