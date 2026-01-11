import type { TrainOperation } from "@/entities/transit";
import { TrainStatusBadge } from "./TrainStatusBadge";

interface TrainStatusCardProps {
    operations: TrainOperation[];
}

/**
 * 運行情報一覧カード
 */
export function TrainStatusCard({ operations }: TrainStatusCardProps) {
    const hasIssues = operations.some((op) => op.status !== "normal");

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        運行情報
                    </h3>
                    {hasIssues ? (
                        <span className="badge badge-warning">一部遅延あり</span>
                    ) : (
                        <span className="badge badge-success">平常運転</span>
                    )}
                </div>

                <div className="space-y-2">
                    {operations.map((op) => (
                        <div
                            key={op.lineId}
                            className="py-2 border-b border-base-200 last:border-0"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-base-content/60">
                                        {op.operator}
                                    </span>
                                    <span className="font-medium">
                                        {op.lineName}
                                    </span>
                                </div>
                                <TrainStatusBadge
                                    status={op.status}
                                    statusText={
                                        op.status === "normal"
                                            ? op.statusText
                                            : undefined
                                    }
                                />
                            </div>
                            {op.status !== "normal" && op.statusText && (
                                <p className="text-sm text-base-content/70 mt-1 pl-0">
                                    {op.statusText}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
