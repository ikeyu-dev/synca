"use client";

import type { Task, TaskPriority } from "@/entities/task";
import { TaskCard } from "./TaskCard";

interface TaskListProps {
    tasks: Task[];
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
    emptyMessage?: string;
}

/**
 * タスク一覧コンポーネント
 */
export function TaskList({
    tasks,
    onComplete,
    onDelete,
    onUpdate,
    emptyMessage = "タスクがありません",
}: TaskListProps) {
    if (tasks.length === 0) {
        return (
            <div className="card bg-base-100 shadow-sm">
                <div className="card-body text-center text-base-content/60">
                    <p>{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {tasks.map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={onComplete}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                />
            ))}
        </div>
    );
}
