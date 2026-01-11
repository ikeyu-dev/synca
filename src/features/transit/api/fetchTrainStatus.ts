import type { TrainStatus, TrainOperation } from "@/entities/transit";

interface TrainStatusResponse {
    success: boolean;
    data?: TrainOperation[];
    error?: string;
}

interface ApiTrainInfo {
    railwayId: string;
    railwayName: string;
    operator: string;
    status: string;
    statusText: string;
    cause?: string;
}

/**
 * ステータス文字列をTrainStatus型に変換
 */
function convertStatus(status: string): TrainStatus {
    switch (status) {
        case "normal":
            return "normal";
        case "delay":
            return "delay";
        case "suspend":
            return "suspend";
        case "direct":
            return "direct";
        case "restore":
            return "restore";
        case "info":
            return "normal";
        default:
            return "normal";
    }
}

/**
 * 内部APIから運行情報を取得
 */
export async function fetchTrainStatus(): Promise<TrainStatusResponse> {
    try {
        // サーバーサイドで内部APIを呼び出す
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
        const response = await fetch(`${baseUrl}/api/transit/train-info`, {
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || "運行情報の取得に失敗しました");
        }

        const operations: TrainOperation[] = (result.data || []).map(
            (info: ApiTrainInfo) => ({
                lineId: info.railwayId,
                lineName: info.railwayName,
                operator: info.operator,
                status: convertStatus(info.status),
                statusText: info.statusText,
                cause: info.cause,
                updatedAt: new Date(),
            })
        );

        return {
            success: true,
            data: operations,
        };
    } catch (error) {
        console.error("[TrainStatus] 運行情報の取得エラー:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "運行情報の取得に失敗しました",
        };
    }
}
