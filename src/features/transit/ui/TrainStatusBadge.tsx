import type { TrainStatus } from "@/entities/transit";

interface TrainStatusBadgeProps {
    status: TrainStatus;
    statusText?: string;
}

/**
 * 運行状況を表示するバッジ
 */
export function TrainStatusBadge({ status, statusText }: TrainStatusBadgeProps) {
    const badgeClass = {
        normal: "badge-success",
        delay: "badge-warning",
        suspend: "badge-error",
        cancel: "badge-error",
        direct: "badge-warning",
        restore: "badge-info",
    }[status];

    const defaultText = {
        normal: "平常運転",
        delay: "遅延",
        suspend: "運転見合わせ",
        cancel: "運休",
        direct: "直通運転中止",
        restore: "運転再開",
    }[status];

    return (
        <span className={`badge ${badgeClass}`}>
            {statusText || defaultText}
        </span>
    );
}
