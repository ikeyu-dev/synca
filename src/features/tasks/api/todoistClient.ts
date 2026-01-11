"use server";

import type { TodoistTask, CreateTaskParams } from "@/entities/task";

const TODOIST_API_BASE = "https://api.todoist.com/rest/v2";

/**
 * 環境変数からAPIトークンを取得
 */
function getApiToken(): string | null {
    return process.env.TODOIST_API_TOKEN || null;
}

/**
 * Todoist APIレスポンスをアプリ内の型に変換するためのマッピング
 */
interface TodoistApiTask {
    id: string;
    content: string;
    description: string;
    project_id: string;
    section_id?: string;
    parent_id?: string;
    order: number;
    priority: 1 | 2 | 3 | 4;
    due?: {
        date: string;
        datetime?: string;
        timezone?: string;
        is_recurring: boolean;
        string?: string;
    };
    labels: string[];
    is_completed: boolean;
    creator_id: string;
    created_at: string;
    url: string;
}

/**
 * APIレスポンスをTodoistTask型に変換
 */
function mapApiTaskToTodoistTask(apiTask: TodoistApiTask): TodoistTask {
    return {
        id: apiTask.id,
        content: apiTask.content,
        description: apiTask.description,
        projectId: apiTask.project_id,
        sectionId: apiTask.section_id,
        parentId: apiTask.parent_id,
        order: apiTask.order,
        priority: apiTask.priority,
        due: apiTask.due
            ? {
                  date: apiTask.due.date,
                  datetime: apiTask.due.datetime,
                  timezone: apiTask.due.timezone,
                  isRecurring: apiTask.due.is_recurring,
                  string: apiTask.due.string,
              }
            : undefined,
        labels: apiTask.labels,
        isCompleted: apiTask.is_completed,
        creatorId: apiTask.creator_id,
        createdAt: apiTask.created_at,
        url: apiTask.url,
    };
}

/**
 * トークンが設定されているか確認
 */
export async function checkTodoistConnection(): Promise<{
    connected: boolean;
    error?: string;
}> {
    const token = getApiToken();
    if (!token) {
        return { connected: false, error: "APIトークンが設定されていません" };
    }
    return { connected: true };
}

/**
 * 全タスクを取得
 */
export async function fetchTasks(): Promise<{
    success: boolean;
    data?: TodoistTask[];
    error?: string;
}> {
    const token = getApiToken();
    if (!token) {
        return { success: false, error: "APIトークンが設定されていません" };
    }

    try {
        const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: "認証に失敗しました" };
            }
            return { success: false, error: `APIエラー: ${response.status}` };
        }

        const apiTasks: TodoistApiTask[] = await response.json();
        const tasks = apiTasks.map(mapApiTaskToTodoistTask);

        return { success: true, data: tasks };
    } catch (error) {
        console.error("Todoist API error:", error);
        return { success: false, error: "タスクの取得に失敗しました" };
    }
}

/**
 * 今日のタスクを取得
 */
export async function fetchTodayTasks(): Promise<{
    success: boolean;
    data?: TodoistTask[];
    error?: string;
}> {
    const token = getApiToken();
    if (!token) {
        return { success: false, error: "APIトークンが設定されていません" };
    }

    try {
        // フィルターなしで全タスクを取得し、クライアント側で今日・期限切れをフィルタリング
        const url = `${TODOIST_API_BASE}/tasks`;
        console.log("Fetching tasks from:", url);

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        console.log("Fetch tasks response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Fetch tasks error:", errorText);
            if (response.status === 401) {
                return { success: false, error: "認証に失敗しました" };
            }
            return { success: false, error: `APIエラー: ${response.status}` };
        }

        const apiTasks: TodoistApiTask[] = await response.json();
        if (apiTasks.length > 0) {
            console.log("Sample task URL from API:", apiTasks[0].url);
        }
        const tasks = apiTasks.map(mapApiTaskToTodoistTask);

        return { success: true, data: tasks };
    } catch (error) {
        console.error("Todoist API error:", error);
        return { success: false, error: "今日のタスクの取得に失敗しました" };
    }
}

/**
 * タスクを作成
 */
export async function createTask(
    params: CreateTaskParams
): Promise<{ success: boolean; data?: TodoistTask; error?: string }> {
    const token = getApiToken();
    if (!token) {
        return { success: false, error: "APIトークンが設定されていません" };
    }

    try {
        const body: Record<string, unknown> = {
            content: params.content,
        };

        if (params.description) body.description = params.description;
        if (params.priority) body.priority = params.priority;
        if (params.dueString) body.due_string = params.dueString;
        if (params.dueDate) body.due_date = params.dueDate;
        if (params.dueDatetime) body.due_datetime = params.dueDatetime;
        if (params.projectId) body.project_id = params.projectId;
        if (params.labels) body.labels = params.labels;

        console.log("Creating task with body:", JSON.stringify(body));

        const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        console.log("Create task response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Create task error:", errorText);
            if (response.status === 401) {
                return { success: false, error: "認証に失敗しました" };
            }
            return { success: false, error: `APIエラー: ${response.status}` };
        }

        const apiTask: TodoistApiTask = await response.json();
        const task = mapApiTaskToTodoistTask(apiTask);

        return { success: true, data: task };
    } catch (error) {
        console.error("Todoist API error:", error);
        return { success: false, error: "タスクの作成に失敗しました" };
    }
}

/**
 * タスク更新用パラメータ
 */
interface UpdateTaskParams {
    content?: string;
    description?: string;
    priority?: 1 | 2 | 3 | 4;
    dueDate?: string;
}

/**
 * タスクを更新
 */
export async function updateTask(
    taskId: string,
    params: UpdateTaskParams
): Promise<{ success: boolean; data?: TodoistTask; error?: string }> {
    const token = getApiToken();
    if (!token) {
        return { success: false, error: "APIトークンが設定されていません" };
    }

    try {
        const body: Record<string, unknown> = {};

        if (params.content !== undefined) body.content = params.content;
        if (params.description !== undefined)
            body.description = params.description;
        if (params.priority !== undefined) body.priority = params.priority;
        if (params.dueDate !== undefined) body.due_date = params.dueDate;

        const response = await fetch(`${TODOIST_API_BASE}/tasks/${taskId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: "認証に失敗しました" };
            }
            return { success: false, error: `APIエラー: ${response.status}` };
        }

        const apiTask: TodoistApiTask = await response.json();
        const task = mapApiTaskToTodoistTask(apiTask);

        return { success: true, data: task };
    } catch (error) {
        console.error("Todoist API error:", error);
        return { success: false, error: "タスクの更新に失敗しました" };
    }
}

/**
 * タスクを完了
 */
export async function completeTask(
    taskId: string
): Promise<{ success: boolean; error?: string }> {
    const token = getApiToken();
    if (!token) {
        return { success: false, error: "APIトークンが設定されていません" };
    }

    try {
        const response = await fetch(
            `${TODOIST_API_BASE}/tasks/${taskId}/close`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: "認証に失敗しました" };
            }
            return { success: false, error: `APIエラー: ${response.status}` };
        }

        return { success: true };
    } catch (error) {
        console.error("Todoist API error:", error);
        return { success: false, error: "タスクの完了に失敗しました" };
    }
}

/**
 * タスクを削除
 */
export async function deleteTask(
    taskId: string
): Promise<{ success: boolean; error?: string }> {
    const token = getApiToken();
    if (!token) {
        return { success: false, error: "APIトークンが設定されていません" };
    }

    try {
        const response = await fetch(`${TODOIST_API_BASE}/tasks/${taskId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: "認証に失敗しました" };
            }
            return { success: false, error: `APIエラー: ${response.status}` };
        }

        return { success: true };
    } catch (error) {
        console.error("Todoist API error:", error);
        return { success: false, error: "タスクの削除に失敗しました" };
    }
}

/**
 * タスクを再開（完了を取り消し）
 */
export async function reopenTask(
    taskId: string
): Promise<{ success: boolean; error?: string }> {
    const token = getApiToken();
    if (!token) {
        return { success: false, error: "APIトークンが設定されていません" };
    }

    try {
        const response = await fetch(
            `${TODOIST_API_BASE}/tasks/${taskId}/reopen`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: "認証に失敗しました" };
            }
            return { success: false, error: `APIエラー: ${response.status}` };
        }

        return { success: true };
    } catch (error) {
        console.error("Todoist API error:", error);
        return { success: false, error: "タスクの再開に失敗しました" };
    }
}
