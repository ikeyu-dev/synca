import { NextRequest, NextResponse } from "next/server";
import { getTrainInformation } from "@/shared/lib/odpt";

/**
 * 周辺駅の運行情報取得APIエンドポイント
 * 指定された路線IDリストの運行情報を取得
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const railwayIds = searchParams.get("railways");

    if (!railwayIds) {
        return NextResponse.json(
            { success: false, error: "railwaysパラメータは必須です" },
            { status: 400 }
        );
    }

    try {
        const railways = railwayIds.split(",");

        // 全運行情報を取得
        const allInfo = await getTrainInformation({});

        // 指定された路線の情報のみ抽出
        const statuses: Record<
            string,
            {
                status: string;
                statusText: string;
                cause?: string;
            }
        > = {};

        for (const info of allInfo) {
            const railwayId = info["odpt:railway"];
            if (railwayId && railways.includes(railwayId)) {
                const status = convertStatus(info["odpt:trainInformationStatus"]);
                statuses[railwayId] = {
                    status,
                    statusText: getStatusText(status, info["odpt:trainInformationText"]?.ja),
                    cause: info["odpt:trainInformationCause"]?.ja,
                };
            }
        }

        // 情報がない路線は平常運転として扱う
        for (const railwayId of railways) {
            if (!statuses[railwayId]) {
                statuses[railwayId] = {
                    status: "normal",
                    statusText: "平常運転",
                };
            }
        }

        return NextResponse.json({
            success: true,
            data: statuses,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[ODPT] 運行情報の取得エラー:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "運行情報の取得に失敗しました",
            },
            { status: 500 }
        );
    }
}

/**
 * ODPTのステータスを内部ステータスに変換
 */
function convertStatus(odptStatus?: string): string {
    if (!odptStatus) return "normal";

    switch (odptStatus) {
        case "odpt:Normal":
            return "normal";
        case "odpt:Delay":
            return "delay";
        case "odpt:Suspend":
        case "odpt:ServiceSuspended":
            return "suspend";
        case "odpt:DirectOperation":
            return "direct";
        case "odpt:Resume":
            return "restore";
        default:
            return "normal";
    }
}

/**
 * ステータステキストを取得
 */
function getStatusText(status: string, infoText?: string): string {
    if (infoText) {
        if (infoText.length > 30) {
            return infoText.substring(0, 30) + "...";
        }
        return infoText;
    }

    switch (status) {
        case "normal":
            return "平常運転";
        case "delay":
            return "遅延";
        case "suspend":
            return "運転見合わせ";
        case "direct":
            return "直通運転中止";
        case "restore":
            return "運転再開";
        default:
            return "情報なし";
    }
}
