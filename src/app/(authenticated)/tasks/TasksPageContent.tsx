"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Task, CreateTaskParams, TaskPriority } from "@/entities/task";
import { convertTodoistTask } from "@/entities/task";
import {
    TaskList,
    AddTaskModal,
    fetchTodayTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    checkTodoistConnection,
} from "@/features/tasks";
import { Loading } from "@/shared/ui";

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
function getTodayString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

/**
 * 日付をフォーマット
 */
function formatDateLabel(dateStr: string): string {
    const today = new Date();
    const todayStr = getTodayString();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    if (dateStr < todayStr) {
        return "期限切れ";
    }
    if (dateStr === todayStr) {
        return "今日";
    }
    if (dateStr === tomorrowStr) {
        return "明日";
    }

    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];

    return `${month}月${day}日（${weekday}）`;
}

/**
 * タスクを日付ごとにグループ化
 */
interface TaskGroup {
    date: string;
    label: string;
    tasks: Task[];
    isOverdue: boolean;
    isToday: boolean;
}

function groupTasksByDate(tasks: Task[]): TaskGroup[] {
    const todayStr = getTodayString();
    const groups: Map<string, Task[]> = new Map();

    // 期限なしタスク用
    const noDateTasks: Task[] = [];

    tasks.forEach((task) => {
        if (!task.dueDate) {
            noDateTasks.push(task);
            return;
        }
        const existing = groups.get(task.dueDate) || [];
        existing.push(task);
        groups.set(task.dueDate, existing);
    });

    // 日付でソート
    const sortedDates = Array.from(groups.keys()).sort();

    const result: TaskGroup[] = sortedDates.map((date) => ({
        date,
        label: formatDateLabel(date),
        tasks: groups.get(date) || [],
        isOverdue: date < todayStr,
        isToday: date === todayStr,
    }));

    // 期限なしタスクを最後に追加
    if (noDateTasks.length > 0) {
        result.push({
            date: "no-date",
            label: "期限なし",
            tasks: noDateTasks,
            isOverdue: false,
            isToday: false,
        });
    }

    return result;
}

/**
 * タスクページのコンテンツ
 */
export function TasksPageContent() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddingTask, setIsAddingTask] = useState(false);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const result = await fetchTodayTasks();

        if (result.success && result.data) {
            const convertedTasks = result.data.map(convertTodoistTask);
            // 期限順、優先度順でソート
            convertedTasks.sort((a, b) => {
                // まず期限でソート
                if (a.dueDate && b.dueDate) {
                    const dateCompare =
                        new Date(a.dueDate).getTime() -
                        new Date(b.dueDate).getTime();
                    if (dateCompare !== 0) return dateCompare;
                }
                if (a.dueDate && !b.dueDate) return -1;
                if (!a.dueDate && b.dueDate) return 1;

                // 同じ日付なら優先度でソート
                return b.priority - a.priority;
            });
            setTasks(convertedTasks);
        } else {
            setError(result.error || "タスクの取得に失敗しました");
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        const init = async () => {
            const connectionResult = await checkTodoistConnection();
            setIsConnected(connectionResult.connected);

            if (connectionResult.connected) {
                await loadTasks();
            } else {
                setIsLoading(false);
                setError(connectionResult.error || null);
            }
        };

        init();
    }, [loadTasks]);

    const handleAddTask = async (params: CreateTaskParams) => {
        setIsAddingTask(true);
        const result = await createTask(params);

        if (result.success) {
            setIsModalOpen(false);
            await loadTasks();
        } else {
            setError(result.error || "タスクの追加に失敗しました");
        }

        setIsAddingTask(false);
    };

    const handleCompleteTask = async (taskId: string) => {
        // 楽観的更新
        setTasks((prev) =>
            prev.map((t) =>
                t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
            )
        );

        const result = await completeTask(taskId);

        if (!result.success) {
            // 失敗時はロールバック
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
                )
            );
            setError(result.error || "タスクの完了に失敗しました");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        const taskToDelete = tasks.find((t) => t.id === taskId);

        // 楽観的更新
        setTasks((prev) => prev.filter((t) => t.id !== taskId));

        const result = await deleteTask(taskId);

        if (!result.success) {
            // 失敗時はロールバック
            if (taskToDelete) {
                setTasks((prev) => [...prev, taskToDelete]);
            }
            setError(result.error || "タスクの削除に失敗しました");
        }
    };

    const handleUpdateTask = async (
        taskId: string,
        updates: {
            content?: string;
            description?: string;
            priority?: TaskPriority;
            dueDate?: string;
        }
    ) => {
        const originalTask = tasks.find((t) => t.id === taskId);
        if (!originalTask) return;

        // 楽観的更新
        setTasks((prev) =>
            prev.map((t) =>
                t.id === taskId
                    ? {
                          ...t,
                          content: updates.content ?? t.content,
                          description: updates.description ?? t.description,
                          priority: updates.priority ?? t.priority,
                          dueDate: updates.dueDate ?? t.dueDate,
                      }
                    : t
            )
        );

        const result = await updateTask(taskId, updates);

        if (!result.success) {
            // 失敗時はロールバック
            setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? originalTask : t))
            );
            setError(result.error || "タスクの更新に失敗しました");
        }
    };

    // タスクを日付ごとにグループ化
    const activeTasks = useMemo(
        () => tasks.filter((t) => !t.isCompleted),
        [tasks]
    );
    const completedTasks = useMemo(
        () => tasks.filter((t) => t.isCompleted),
        [tasks]
    );
    const taskGroups = useMemo(
        () => groupTasksByDate(activeTasks),
        [activeTasks]
    );

    if (isLoading) {
        return <Loading text="読み込み中..." />;
    }

    if (!isConnected) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">タスク管理</h1>
                    <p className="text-sm text-base-content/60 mt-1">
                        Todoistと連携してタスクを管理します
                    </p>
                </div>
                <div className="card bg-base-100 shadow-sm">
                    <div className="card-body">
                        <h2 className="card-title text-warning">
                            Todoistに接続されていません
                        </h2>
                        <p className="text-sm text-base-content/60">
                            環境変数 <code>TODOIST_API_TOKEN</code>{" "}
                            を設定してください。
                        </p>
                        <div className="collapse collapse-arrow bg-base-200 mt-2">
                            <input type="checkbox" />
                            <div className="collapse-title font-medium">
                                APIトークンの取得方法
                            </div>
                            <div className="collapse-content text-sm">
                                <ol className="list-decimal list-inside space-y-2 text-base-content/70">
                                    <li>
                                        <a
                                            href="https://todoist.com/app/settings/integrations/developer"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="link link-primary"
                                        >
                                            Todoist開発者設定
                                        </a>
                                        を開きます
                                    </li>
                                    <li>
                                        「APIトークン」セクションの「コピー」をクリックします
                                    </li>
                                    <li>
                                        <code>.env.local</code>{" "}
                                        ファイルに以下を追加します:
                                        <pre className="bg-base-300 p-2 mt-1 rounded">
                                            TODOIST_API_TOKEN=your_token_here
                                        </pre>
                                    </li>
                                    <li>アプリを再起動します</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">タスク管理</h1>
                    <p className="text-sm text-base-content/60 mt-1">
                        全{activeTasks.length}件のタスク
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={loadTasks}
                        disabled={isLoading}
                    >
                        <svg
                            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <svg
                            className="h-4 w-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        タスクを追加
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <svg
                        className="stroke-current shrink-0 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>{error}</span>
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setError(null)}
                    >
                        閉じる
                    </button>
                </div>
            )}

            {taskGroups.length === 0 ? (
                <div className="card bg-base-100 shadow-sm">
                    <div className="card-body text-center text-base-content/60">
                        <p>タスクがありません</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {taskGroups.map((group) => (
                        <div
                            key={group.date}
                            className="space-y-3"
                        >
                            <h2
                                className={`text-lg font-bold flex items-center gap-2 ${
                                    group.isOverdue
                                        ? "text-error"
                                        : group.isToday
                                          ? "text-primary"
                                          : ""
                                }`}
                            >
                                {group.label}
                                <span className="badge badge-sm">
                                    {group.tasks.length}
                                </span>
                            </h2>
                            <TaskList
                                tasks={group.tasks}
                                onComplete={handleCompleteTask}
                                onDelete={handleDeleteTask}
                                onUpdate={handleUpdateTask}
                            />
                        </div>
                    ))}
                </div>
            )}

            {completedTasks.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-base-content/60">
                        完了済み ({completedTasks.length})
                    </h2>
                    <TaskList
                        tasks={completedTasks}
                        onComplete={handleCompleteTask}
                        onDelete={handleDeleteTask}
                        onUpdate={handleUpdateTask}
                    />
                </div>
            )}

            <AddTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddTask}
                isLoading={isAddingTask}
            />
        </div>
    );
}
