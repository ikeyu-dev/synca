"use server";

import {
    fetchPortalNotices as fetchFromPortal,
    type PortalNotice,
} from "@/shared/lib/nit-portal";

/**
 * ポータルサイトのお知らせを取得
 * @param forceRefresh - trueの場合、キャッシュを無視して再取得
 */
export async function fetchPortalNotices(forceRefresh = false): Promise<{
    success: boolean;
    data?: PortalNotice[];
    error?: string;
}> {
    try {
        return await fetchFromPortal(forceRefresh);
    } catch (error) {
        console.error("[Portal] Fetch error:", error);
        return {
            success: false,
            error: "お知らせの取得に失敗しました",
        };
    }
}
