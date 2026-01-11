/**
 * お知らせ通知機能
 * 新しいお知らせがあった場合にローカル通知を送信
 */

import type { PortalNotice } from "@/shared/lib/nit-portal";
import { showNotification } from "./client";

const SEEN_NOTICES_KEY = "synca_seen_notices";

/**
 * 既読のお知らせIDを取得
 */
function getSeenNoticeIds(): Set<string> {
    if (typeof window === "undefined") {
        return new Set();
    }

    try {
        const stored = localStorage.getItem(SEEN_NOTICES_KEY);
        if (stored) {
            const ids = JSON.parse(stored);
            return new Set(ids);
        }
    } catch (e) {
        console.error("[NoticeNotifier] Failed to load seen notices:", e);
    }

    return new Set();
}

/**
 * 既読のお知らせIDを保存
 */
function saveSeenNoticeIds(ids: Set<string>): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        const idsArray = Array.from(ids);
        // 最新500件のみ保持
        const trimmedIds = idsArray.slice(-500);
        localStorage.setItem(SEEN_NOTICES_KEY, JSON.stringify(trimmedIds));
    } catch (e) {
        console.error("[NoticeNotifier] Failed to save seen notices:", e);
    }
}

/**
 * 新しいお知らせをチェックして通知を送信
 * @returns 新しいお知らせの数
 */
export async function checkAndNotifyNewNotices(
    notices: PortalNotice[]
): Promise<number> {
    if (notices.length === 0) {
        return 0;
    }

    const seenIds = getSeenNoticeIds();
    const newNotices = notices.filter((notice) => !seenIds.has(notice.id));

    // 初回読み込み時（何も既読がない場合）は通知しない
    if (seenIds.size === 0) {
        const allIds = new Set(notices.map((n) => n.id));
        saveSeenNoticeIds(allIds);
        return 0;
    }

    if (newNotices.length === 0) {
        return 0;
    }

    // 新しいお知らせIDを既読に追加
    const updatedIds = new Set([...seenIds, ...newNotices.map((n) => n.id)]);
    saveSeenNoticeIds(updatedIds);

    // 重要なお知らせがあるかチェック
    const importantNotices = newNotices.filter((n) => n.isImportant);

    if (importantNotices.length > 0) {
        // 重要なお知らせがある場合は個別に通知
        await showNotification("重要なお知らせ", {
            body: importantNotices[0].title,
            tag: "synca-important-notice",
            url: "/notices",
        });
    } else if (newNotices.length === 1) {
        // 1件の場合はタイトルを表示
        await showNotification("新しいお知らせ", {
            body: newNotices[0].title,
            tag: "synca-notice",
            url: "/notices",
        });
    } else {
        // 複数件の場合は件数を表示
        await showNotification("新しいお知らせ", {
            body: `${newNotices.length}件の新しいお知らせがあります`,
            tag: "synca-notices",
            url: "/notices",
        });
    }

    return newNotices.length;
}
