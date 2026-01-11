/**
 * タスクの優先度（Todoistでは4が最高、1が最低）
 */
export type TaskPriority = 1 | 2 | 3 | 4;

/**
 * Todoist APIからの期限情報
 */
export interface TodoistDue {
    date: string;
    datetime?: string;
    timezone?: string;
    isRecurring: boolean;
    string?: string;
}

/**
 * Todoist APIからのタスクレスポンス
 */
export interface TodoistTask {
    id: string;
    content: string;
    description: string;
    projectId: string;
    sectionId?: string;
    parentId?: string;
    order: number;
    priority: TaskPriority;
    due?: TodoistDue;
    labels: string[];
    isCompleted: boolean;
    creatorId: string;
    createdAt: string;
    url: string;
}

/**
 * アプリ内で使用するタスク型
 */
export interface Task {
    id: string;
    content: string;
    description?: string;
    priority: TaskPriority;
    dueDate?: string;
    dueTime?: string;
    isRecurring?: boolean;
    projectId?: string;
    projectName?: string;
    labels: string[];
    isCompleted: boolean;
    createdAt: string;
    url?: string;
}

/**
 * タスクの作成パラメータ
 */
export interface CreateTaskParams {
    content: string;
    description?: string;
    priority?: TaskPriority;
    dueString?: string;
    dueDate?: string;
    dueDatetime?: string;
    projectId?: string;
    labels?: string[];
}

/**
 * Todoist APIレスポンスをアプリ内Task型に変換
 */
export function convertTodoistTask(todoistTask: TodoistTask): Task {
    return {
        id: todoistTask.id,
        content: todoistTask.content,
        description: todoistTask.description || undefined,
        priority: todoistTask.priority,
        dueDate: todoistTask.due?.date,
        dueTime: todoistTask.due?.datetime
            ? new Date(todoistTask.due.datetime).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : undefined,
        isRecurring: todoistTask.due?.isRecurring,
        projectId: todoistTask.projectId,
        labels: todoistTask.labels,
        isCompleted: todoistTask.isCompleted,
        createdAt: todoistTask.createdAt,
        url: todoistTask.url,
    };
}
