"use client";

import { useState } from "react";
import type { CreateTaskParams, TaskPriority } from "@/entities/task";

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (params: CreateTaskParams) => void;
    isLoading?: boolean;
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
function getTodayString(): string {
    const today = new Date();
    return today.toISOString().split("T")[0];
}

/**
 * タスク追加モーダル
 */
export function AddTaskModal({
    isOpen,
    onClose,
    onAdd,
    isLoading,
}: AddTaskModalProps) {
    const [content, setContent] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<TaskPriority>(1);
    const [dueDate, setDueDate] = useState(getTodayString());
    const [dueTime, setDueTime] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) return;

        const params: CreateTaskParams = {
            content: content.trim(),
        };

        // 時間が指定されている場合はdueDatetime、そうでなければdueDateを使用
        if (dueTime) {
            params.dueDatetime = `${dueDate || getTodayString()}T${dueTime}:00`;
        } else {
            params.dueDate = dueDate || getTodayString();
        }

        if (description.trim()) params.description = description.trim();
        if (priority > 1) params.priority = priority;

        onAdd(params);

        setContent("");
        setDescription("");
        setPriority(1);
        setDueDate(getTodayString());
        setDueTime("");
    };

    const handleClose = () => {
        setContent("");
        setDescription("");
        setPriority(1);
        setDueDate(getTodayString());
        setDueTime("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <dialog
            className="modal modal-open"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">タスクを追加</h3>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">タスク名</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            placeholder="例: レポートを提出する"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">説明（任意）</span>
                        </label>
                        <textarea
                            className="textarea textarea-bordered"
                            placeholder="タスクの詳細..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">期限</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                className="input input-bordered flex-1"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                disabled={isLoading}
                            />
                            <input
                                type="time"
                                className="input input-bordered w-28"
                                value={dueTime}
                                onChange={(e) => setDueTime(e.target.value)}
                                disabled={isLoading}
                                placeholder="時間"
                            />
                        </div>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">優先度</span>
                        </label>
                        <div className="flex gap-2">
                            {[
                                { value: 4, color: "#dc2626" },
                                { value: 3, color: "#eab308" },
                                { value: 2, color: "#3b82f6" },
                                { value: 1, color: "#9ca3af" },
                            ].map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    className={`btn btn-sm btn-square ${
                                        priority === p.value
                                            ? "btn-active"
                                            : "btn-ghost"
                                    }`}
                                    onClick={() =>
                                        setPriority(p.value as TaskPriority)
                                    }
                                    disabled={isLoading}
                                    aria-label={`優先度${5 - p.value}`}
                                >
                                    <svg
                                        className="w-5 h-5"
                                        viewBox="0 0 24 24"
                                        fill={p.color}
                                        stroke={p.color}
                                        strokeWidth="1"
                                    >
                                        <path d="M4 21V4h16l-4 6 4 6H4" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!content.trim() || isLoading}
                        >
                            {isLoading ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                "追加"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
}
