"use client";

import { useState } from "react";
import type { Task, TaskPriority } from "@/entities/task";

interface TaskCardProps {
    task: Task;
    onComplete?: (taskId: string) => void;
    onDelete?: (taskId: string) => void;
    onUpdate?: (
        taskId: string,
        updates: {
            content?: string;
            description?: string;
            priority?: TaskPriority;
            dueDate?: string;
        }
    ) => void;
}

/**
 * 優先度に応じた旗の色を取得
 */
function getPriorityColor(priority: number): string {
    switch (priority) {
        case 4:
            return "#dc2626"; // 赤
        case 3:
            return "#eab308"; // 黄
        case 2:
            return "#3b82f6"; // 青
        default:
            return "#9ca3af"; // 白（グレー）
    }
}

/**
 * 優先度の旗アイコン
 */
function PriorityFlag({
    priority,
    onClick,
    className = "",
}: {
    priority: number;
    onClick?: () => void;
    className?: string;
}) {
    const color = getPriorityColor(priority);
    return (
        <svg
            className={`w-4 h-4 flex-shrink-0 ${onClick ? "cursor-pointer hover:opacity-70" : ""} ${className}`}
            viewBox="0 0 24 24"
            fill={color}
            stroke={color}
            strokeWidth="1"
            onClick={onClick}
        >
            <path d="M4 21V4h16l-4 6 4 6H4" />
        </svg>
    );
}

/**
 * 期限の表示形式を取得
 */
function formatDueDate(dueDate: string, dueTime?: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    let dateStr: string;
    if (due.getTime() === today.getTime()) {
        dateStr = "今日";
    } else if (due.getTime() === tomorrow.getTime()) {
        dateStr = "明日";
    } else if (due < today) {
        const diffDays = Math.floor(
            (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
        );
        dateStr = `${diffDays}日前`;
    } else {
        dateStr = due.toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
        });
    }

    return dueTime ? `${dateStr} ${dueTime}` : dateStr;
}

/**
 * 期限が過ぎているかどうかを判定
 */
function isOverdue(dueDate: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
}

/**
 * タスクカードコンポーネント
 */
export function TaskCard({
    task,
    onComplete,
    onDelete,
    onUpdate,
}: TaskCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(task.content);
    const [editDescription, setEditDescription] = useState(
        task.description || ""
    );
    const [editPriority, setEditPriority] = useState<TaskPriority>(
        task.priority
    );
    const [editDueDate, setEditDueDate] = useState(task.dueDate || "");

    const overdue = task.dueDate ? isOverdue(task.dueDate) : false;

    const handleStartEdit = () => {
        setEditContent(task.content);
        setEditDescription(task.description || "");
        setEditPriority(task.priority);
        setEditDueDate(task.dueDate || "");
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSaveEdit = () => {
        if (!editContent.trim()) return;

        const updates: {
            content?: string;
            description?: string;
            priority?: TaskPriority;
            dueDate?: string;
        } = {};

        if (editContent.trim() !== task.content) {
            updates.content = editContent.trim();
        }
        if (editDescription.trim() !== (task.description || "")) {
            updates.description = editDescription.trim();
        }
        if (editPriority !== task.priority) {
            updates.priority = editPriority;
        }
        if (editDueDate !== (task.dueDate || "")) {
            updates.dueDate = editDueDate;
        }

        if (Object.keys(updates).length > 0) {
            onUpdate?.(task.id, updates);
        }

        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-4 space-y-3">
                    <input
                        type="text"
                        className="input input-bordered input-sm w-full"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="タスク名"
                        autoFocus
                    />
                    <textarea
                        className="textarea textarea-bordered textarea-sm w-full"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="説明（任意）"
                        rows={2}
                    />
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-base-content/60">
                                優先度:
                            </span>
                            <div className="flex gap-1">
                                {[4, 3, 2, 1].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`p-1 rounded ${
                                            editPriority === p
                                                ? "bg-base-200"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setEditPriority(p as TaskPriority)
                                        }
                                    >
                                        <PriorityFlag priority={p} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-base-content/60">
                                期限:
                            </span>
                            <input
                                type="date"
                                className="input input-bordered input-xs"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleCancelEdit}
                        >
                            キャンセル
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleSaveEdit}
                            disabled={!editContent.trim()}
                        >
                            保存
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <div className="flex items-start gap-3">
                    <button
                        type="button"
                        className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                            task.isCompleted
                                ? "bg-success border-success"
                                : "border-base-content/30 hover:border-primary"
                        }`}
                        onClick={() => onComplete?.(task.id)}
                        aria-label={
                            task.isCompleted
                                ? "タスクを未完了に戻す"
                                : "タスクを完了にする"
                        }
                    >
                        {task.isCompleted && (
                            <svg
                                className="w-full h-full text-success-content p-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        )}
                    </button>

                    <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={handleStartEdit}
                    >
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3
                                className={`font-medium ${
                                    task.isCompleted
                                        ? "line-through text-base-content/50"
                                        : ""
                                }`}
                            >
                                {task.content}
                            </h3>
                            <PriorityFlag priority={task.priority} />
                            {task.isRecurring && (
                                <span className="badge badge-sm badge-outline">
                                    <svg
                                        className="w-3 h-3 mr-1"
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
                                    繰り返し
                                </span>
                            )}
                        </div>

                        {task.description && (
                            <p className="text-sm text-base-content/60 mt-1 line-clamp-2">
                                {task.description}
                            </p>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {task.dueDate && (
                                <span
                                    className={`text-xs flex items-center gap-1 ${
                                        overdue
                                            ? "text-error"
                                            : "text-base-content/60"
                                    }`}
                                >
                                    <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    {formatDueDate(task.dueDate, task.dueTime)}
                                </span>
                            )}

                            {task.labels.length > 0 && (
                                <div className="flex gap-1">
                                    {task.labels.map((label) => (
                                        <span
                                            key={label}
                                            className="badge badge-xs badge-outline"
                                        >
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="dropdown dropdown-end">
                        <button
                            type="button"
                            tabIndex={0}
                            className="btn btn-ghost btn-xs btn-square"
                            aria-label="メニューを開く"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                            </svg>
                        </button>
                        <ul
                            tabIndex={0}
                            className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40"
                        >
                            <li>
                                <button
                                    type="button"
                                    onClick={handleStartEdit}
                                >
                                    編集
                                </button>
                            </li>
                            {task.url && (
                                <li>
                                    <a
                                        href={task.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Todoistで開く
                                    </a>
                                </li>
                            )}
                            <li>
                                <button
                                    type="button"
                                    onClick={() => onDelete?.(task.id)}
                                    className="text-error"
                                >
                                    削除
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
