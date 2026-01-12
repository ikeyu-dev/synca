/**
 * GitHub Gistでプッシュ購読情報を管理
 */

const GIST_ID = process.env.PUSH_SUBSCRIPTIONS_GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_FILENAME = "push-subscriptions.json";

/**
 * プッシュ購読情報の型定義
 */
export interface PushSubscription {
    id: string;
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    createdAt: string;
    userAgent?: string;
}

/**
 * Gistから購読情報を取得
 */
export async function readSubscriptionsFromGist(): Promise<{
    success: boolean;
    data?: PushSubscription[];
    error?: string;
}> {
    if (!GIST_ID) {
        return {
            success: false,
            error: "PUSH_SUBSCRIPTIONS_GIST_IDが設定されていません",
        };
    }

    try {
        const response = await fetch(
            `https://api.github.com/gists/${GIST_ID}`,
            {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                    ...(GITHUB_TOKEN && {
                        Authorization: `token ${GITHUB_TOKEN}`,
                    }),
                },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const gist = await response.json();
        const file = gist.files?.[GIST_FILENAME];

        if (!file) {
            return {
                success: true,
                data: [],
            };
        }

        const subscriptions: PushSubscription[] = JSON.parse(file.content);
        return {
            success: true,
            data: subscriptions,
        };
    } catch (error) {
        console.error("[Push Subscriptions Gist] 取得エラー:", error);
        return {
            success: false,
            error: "購読情報の取得に失敗しました",
        };
    }
}

/**
 * Gistに購読情報を書き込み
 */
export async function writeSubscriptionsToGist(
    subscriptions: PushSubscription[]
): Promise<{ success: boolean; error?: string }> {
    if (!GIST_ID) {
        return {
            success: false,
            error: "PUSH_SUBSCRIPTIONS_GIST_IDが設定されていません",
        };
    }

    if (!GITHUB_TOKEN) {
        return {
            success: false,
            error: "GITHUB_TOKENが設定されていません",
        };
    }

    try {
        const response = await fetch(
            `https://api.github.com/gists/${GIST_ID}`,
            {
                method: "PATCH",
                headers: {
                    Accept: "application/vnd.github.v3+json",
                    Authorization: `token ${GITHUB_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    files: {
                        [GIST_FILENAME]: {
                            content: JSON.stringify(subscriptions, null, 2),
                        },
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Push Subscriptions Gist] 書き込みエラー:", errorText);
            throw new Error(`HTTP error: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("[Push Subscriptions Gist] 書き込みエラー:", error);
        return {
            success: false,
            error: "購読情報の保存に失敗しました",
        };
    }
}

/**
 * 購読を追加
 */
export async function addSubscription(
    subscription: Omit<PushSubscription, "id" | "createdAt">
): Promise<{ success: boolean; error?: string }> {
    const result = await readSubscriptionsFromGist();
    if (!result.success || !result.data) {
        return { success: false, error: result.error };
    }

    const subscriptions = result.data;

    // 既存の購読をチェック（同じendpointがあれば更新）
    const existingIndex = subscriptions.findIndex(
        (s) => s.endpoint === subscription.endpoint
    );

    const newSubscription: PushSubscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        createdAt: new Date().toISOString(),
        userAgent: subscription.userAgent,
    };

    if (existingIndex >= 0) {
        subscriptions[existingIndex] = newSubscription;
    } else {
        subscriptions.push(newSubscription);
    }

    return await writeSubscriptionsToGist(subscriptions);
}

/**
 * 購読を削除
 */
export async function removeSubscription(
    endpoint: string
): Promise<{ success: boolean; error?: string }> {
    const result = await readSubscriptionsFromGist();
    if (!result.success || !result.data) {
        return { success: false, error: result.error };
    }

    const subscriptions = result.data.filter((s) => s.endpoint !== endpoint);
    return await writeSubscriptionsToGist(subscriptions);
}
