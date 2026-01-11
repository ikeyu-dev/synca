import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createTask } from "@/features/tasks/api/todoistClient";

/**
 * 登録されたFormの型定義
 */
export interface RegisteredForm {
    id: string;
    url: string;
    title?: string;
    source?: string;
    registeredAt: string;
    completed: boolean;
    completedAt?: string;
    todoistTaskId?: string;
}

/**
 * データファイルのパス
 */
const DATA_DIR = path.join(process.cwd(), "data");
const FORMS_FILE = path.join(DATA_DIR, "forms.json");

/**
 * データディレクトリとファイルの初期化
 */
async function ensureDataFile(): Promise<void> {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }

    try {
        await fs.access(FORMS_FILE);
    } catch {
        await fs.writeFile(FORMS_FILE, JSON.stringify([], null, 2));
    }
}

/**
 * Formsデータの読み込み
 */
async function readForms(): Promise<RegisteredForm[]> {
    await ensureDataFile();
    const data = await fs.readFile(FORMS_FILE, "utf-8");
    return JSON.parse(data);
}

/**
 * Formsデータの書き込み
 */
async function writeForms(forms: RegisteredForm[]): Promise<void> {
    await ensureDataFile();
    await fs.writeFile(FORMS_FILE, JSON.stringify(forms, null, 2));
}

/**
 * ユニークIDの生成
 */
function generateId(): string {
    return `form_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 翌日9:00のISO日時文字列を生成
 */
function getTomorrowNineAM(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
}

/**
 * GET: 登録済みFormsの一覧を取得
 */
export async function GET() {
    try {
        const forms = await readForms();
        return NextResponse.json({
            success: true,
            data: forms,
        });
    } catch (error) {
        console.error("Forms取得エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Formsの取得に失敗しました",
            },
            { status: 500 }
        );
    }
}

/**
 * POST: 新しいFormを登録
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, title, source } = body;

        if (!url) {
            return NextResponse.json(
                {
                    success: false,
                    error: "URLは必須です",
                },
                { status: 400 }
            );
        }

        // FormsのURLかどうかを検証
        const formsUrlPrefixes = [
            // Microsoft Forms
            "https://forms.office.com/",
            "https://forms.microsoft.com/",
            "https://forms.cloud.microsoft.com/",
            "https://forms.cloud.microsoft/",
            "https://forms.osi.office.net/",
            // Google Forms
            "https://docs.google.com/forms/",
            "https://forms.gle/",
        ];
        const lowerUrl = url.toLowerCase();
        const isFormsUrl = formsUrlPrefixes.some((prefix) =>
            lowerUrl.startsWith(prefix)
        );
        if (!isFormsUrl) {
            return NextResponse.json(
                {
                    success: false,
                    error: "有効なFormsのURLではありません",
                },
                { status: 400 }
            );
        }

        const forms = await readForms();

        // 重複チェック
        const existingForm = forms.find((f) => f.url === url);
        if (existingForm) {
            return NextResponse.json(
                {
                    success: false,
                    error: "このFormsは既に登録されています",
                    data: existingForm,
                },
                { status: 409 }
            );
        }

        const formName = source || title || "Forms";
        const newForm: RegisteredForm = {
            id: generateId(),
            url,
            title: title || undefined,
            source: source || undefined,
            registeredAt: new Date().toISOString(),
            completed: false,
        };

        // Todoistにタスクを作成
        const todoistResult = await createTask({
            content: `[form]${formName} 入力`,
            priority: 4,
            dueDatetime: getTomorrowNineAM(),
        });

        if (todoistResult.success && todoistResult.data) {
            newForm.todoistTaskId = todoistResult.data.id;
        } else {
            console.warn("Todoistタスク作成に失敗:", todoistResult.error);
        }

        forms.push(newForm);
        await writeForms(forms);

        return NextResponse.json(
            {
                success: true,
                data: newForm,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Forms登録エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Formsの登録に失敗しました",
            },
            { status: 500 }
        );
    }
}

/**
 * PATCH: Formの更新（完了状態の変更など）
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, completed, title } = body;

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "IDは必須です",
                },
                { status: 400 }
            );
        }

        const forms = await readForms();
        const formIndex = forms.findIndex((f) => f.id === id);

        if (formIndex === -1) {
            return NextResponse.json(
                {
                    success: false,
                    error: "指定されたFormsが見つかりません",
                },
                { status: 404 }
            );
        }

        if (typeof completed === "boolean") {
            forms[formIndex].completed = completed;
            forms[formIndex].completedAt = completed
                ? new Date().toISOString()
                : undefined;
        }

        if (title !== undefined) {
            forms[formIndex].title = title;
        }

        await writeForms(forms);

        return NextResponse.json({
            success: true,
            data: forms[formIndex],
        });
    } catch (error) {
        console.error("Forms更新エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Formsの更新に失敗しました",
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE: Formの削除
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "IDは必須です",
                },
                { status: 400 }
            );
        }

        const forms = await readForms();
        const formIndex = forms.findIndex((f) => f.id === id);

        if (formIndex === -1) {
            return NextResponse.json(
                {
                    success: false,
                    error: "指定されたFormsが見つかりません",
                },
                { status: 404 }
            );
        }

        const deletedForm = forms.splice(formIndex, 1)[0];
        await writeForms(forms);

        return NextResponse.json({
            success: true,
            data: deletedForm,
        });
    } catch (error) {
        console.error("Forms削除エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Formsの削除に失敗しました",
            },
            { status: 500 }
        );
    }
}
