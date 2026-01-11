/**
 * GitHub Gistからポータルお知らせを取得
 * Vercel環境ではこちらを使用
 */

import type { PortalNotice } from "./client";

const GIST_ID = process.env.PORTAL_GIST_ID;
const GIST_RAW_URL = GIST_ID
    ? `https://gist.githubusercontent.com/raw/${GIST_ID}/portal-notices.json`
    : null;

interface CacheData {
    notices: PortalNotice[];
    timestamp: number;
}

/**
 * Gistからお知らせを取得
 */
export async function fetchPortalNoticesFromGist(): Promise<{
    success: boolean;
    data?: PortalNotice[];
    error?: string;
}> {
    if (!GIST_RAW_URL) {
        return {
            success: false,
            error: "Gist IDが設定されていません",
        };
    }

    try {
        const response = await fetch(GIST_RAW_URL, {
            next: { revalidate: 60 }, // 1分キャッシュ
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data: CacheData = await response.json();

        return {
            success: true,
            data: data.notices,
        };
    } catch (error) {
        console.error("[Portal Gist] 取得エラー:", error);
        return {
            success: false,
            error: "お知らせの取得に失敗しました",
        };
    }
}
