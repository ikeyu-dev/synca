import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { fetchPortalNoticesFromGist } from "@/shared/lib/nit-portal";
import {
    readSubscriptionsFromGist,
    writeSubscriptionsToGist,
} from "@/shared/lib/gist/push-subscriptions-gist-client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

/**
 * 通知済みお知らせIDを保持するGist設定
 */
const NOTIFIED_GIST_ID = process.env.PORTAL_NOTIFIED_GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NOTIFIED_FILENAME = "notified-notices.json";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        "mailto:synca@example.com",
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

/**
 * 通知済みお知らせIDを取得
 */
async function getNotifiedIds(): Promise<string[]> {
    if (!NOTIFIED_GIST_ID || !GITHUB_TOKEN) {
        return [];
    }

    try {
        const response = await fetch(
            `https://api.github.com/gists/${NOTIFIED_GIST_ID}`,
            {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                    Authorization: `token ${GITHUB_TOKEN}`,
                },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            return [];
        }

        const gist = await response.json();
        const file = gist.files?.[NOTIFIED_FILENAME];

        if (!file) {
            return [];
        }

        return JSON.parse(file.content);
    } catch {
        return [];
    }
}

/**
 * 通知済みお知らせIDを保存
 */
async function saveNotifiedIds(ids: string[]): Promise<void> {
    if (!NOTIFIED_GIST_ID || !GITHUB_TOKEN) {
        return;
    }

    try {
        await fetch(`https://api.github.com/gists/${NOTIFIED_GIST_ID}`, {
            method: "PATCH",
            headers: {
                Accept: "application/vnd.github.v3+json",
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                files: {
                    [NOTIFIED_FILENAME]: {
                        content: JSON.stringify(ids, null, 2),
                    },
                },
            }),
        });
    } catch (error) {
        console.error("[Portal Cron] 通知済みID保存エラー:", error);
    }
}

/**
 * GET: ポータルの新着お知らせをチェックして通知を送信
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

        // ポータルのお知らせを取得
        const result = await fetchPortalNoticesFromGist();
        if (!result.success || !result.data) {
            return NextResponse.json({
                success: false,
                error: result.error || "お知らせの取得に失敗しました",
            });
        }

        const notices = result.data;

        // 通知済みIDを取得
        const notifiedIds = await getNotifiedIds();

        // 新しいお知らせを抽出
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

        // 購読情報を取得
        const subsResult = await readSubscriptionsFromGist();
        if (!subsResult.success || !subsResult.data || subsResult.data.length === 0) {
            // 購読者がいなくても通知済みIDは更新
            const updatedIds = [
                ...notifiedIds,
                ...newNotices.map((n) => n.id),
            ].slice(-100); // 最新100件のみ保持
            await saveNotifiedIds(updatedIds);

            return NextResponse.json({
                success: true,
                message: "購読者がいません",
                newNotices: newNotices.length,
            });
        }

        const subscriptions = subsResult.data;

        // 通知ペイロードを作成
        const noticeCount = newNotices.length;
        const firstNotice = newNotices[0];
        const payload = JSON.stringify({
            title: "ポータル: 新しいお知らせ",
            body:
                noticeCount === 1
                    ? firstNotice.title
                    : `${noticeCount}件の新しいお知らせがあります`,
            icon: "/icon.svg",
            badge: "/icon.svg",
            tag: "portal-notice",
            data: {
                url: "/notices",
                type: "portal",
                count: noticeCount,
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

        // 通知済みIDを更新
        const updatedIds = [
            ...notifiedIds,
            ...newNotices.map((n) => n.id),
        ].slice(-100);
        await saveNotifiedIds(updatedIds);

        const sent = results.filter((r) => r.status === "fulfilled").length;

        return NextResponse.json({
            success: true,
            message: `${newNotices.length}件の新しいお知らせを通知しました`,
            newNotices: newNotices.length,
            notificationsSent: sent,
            failedSubscriptions: failedEndpoints.length,
        });
    } catch (error) {
        console.error("[Portal Cron] エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error: "ポータルチェックに失敗しました",
            },
            { status: 500 }
        );
    }
}
