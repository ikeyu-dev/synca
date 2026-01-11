"use server";

import {
    fetchPortalNotices as fetchFromPortal,
    fetchPortalNoticesFromGist,
    type PortalNotice,
} from "@/shared/lib/nit-portal";

/**
 * ポータルサイトのお知らせを取得
 * Vercel環境ではGistから、ローカル環境では直接スクレイピング
 * @param forceRefresh - trueの場合、キャッシュを無視して再取得（ローカルのみ有効）
 */
export async function fetchPortalNotices(forceRefresh = false): Promise<{
    success: boolean;
    data?: PortalNotice[];
    error?: string;
}> {
    try {
        // Vercel環境ではGistから取得
        if (process.env.VERCEL) {
            return await fetchPortalNoticesFromGist();
        }

        // ローカル環境では直接スクレイピング
        const result = await fetchFromPortal(forceRefresh);
        return result;
    } catch (error) {
        console.error("[Portal] Fetch error:", error);
        return {
            success: false,
            error: "お知らせの取得に失敗しました",
        };
    }
}
