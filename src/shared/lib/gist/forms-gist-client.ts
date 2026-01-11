/**
 * GitHub GistでFormsデータを管理
 * 読み書き両方に対応
 */

import type { RegisteredForm } from "@/app/api/forms/route";

const GIST_ID = process.env.FORMS_GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_FILENAME = "forms.json";

/**
 * GistからFormsデータを取得
 */
export async function readFormsFromGist(): Promise<{
    success: boolean;
    data?: RegisteredForm[];
    error?: string;
}> {
    if (!GIST_ID) {
        return {
            success: false,
            error: "FORMS_GIST_IDが設定されていません",
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

        const forms: RegisteredForm[] = JSON.parse(file.content);
        return {
            success: true,
            data: forms,
        };
    } catch (error) {
        console.error("[Forms Gist] 取得エラー:", error);
        return {
            success: false,
            error: "Formsの取得に失敗しました",
        };
    }
}

/**
 * GistにFormsデータを書き込み
 */
export async function writeFormsToGist(
    forms: RegisteredForm[]
): Promise<{ success: boolean; error?: string }> {
    if (!GIST_ID) {
        return {
            success: false,
            error: "FORMS_GIST_IDが設定されていません",
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
                            content: JSON.stringify(forms, null, 2),
                        },
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Forms Gist] 書き込みエラー:", errorText);
            throw new Error(`HTTP error: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("[Forms Gist] 書き込みエラー:", error);
        return {
            success: false,
            error: "Formsの保存に失敗しました",
        };
    }
}
