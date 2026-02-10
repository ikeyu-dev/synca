/**
 * ローカルファイルでFormsデータを管理
 */

import type { RegisteredForm } from "@/app/api/forms/route";
import * as fs from "fs";
import * as path from "path";

const FORMS_FILE = path.join(process.cwd(), ".cache", "forms.json");

/**
 * ローカルファイルからFormsデータを取得
 */
export async function readFormsFromGist(): Promise<{
    success: boolean;
    data?: RegisteredForm[];
    error?: string;
}> {
    try {
        if (!fs.existsSync(FORMS_FILE)) {
            return { success: true, data: [] };
        }

        const content = fs.readFileSync(FORMS_FILE, "utf-8");
        const forms: RegisteredForm[] = JSON.parse(content);
        return { success: true, data: forms };
    } catch (error) {
        console.error("[Forms] 取得エラー:", error);
        return {
            success: false,
            error: "Formsの取得に失敗しました",
        };
    }
}

/**
 * ローカルファイルにFormsデータを書き込み
 */
export async function writeFormsToGist(
    forms: RegisteredForm[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const dir = path.dirname(FORMS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(FORMS_FILE, JSON.stringify(forms, null, 2));
        return { success: true };
    } catch (error) {
        console.error("[Forms] 書き込みエラー:", error);
        return {
            success: false,
            error: "Formsの保存に失敗しました",
        };
    }
}
