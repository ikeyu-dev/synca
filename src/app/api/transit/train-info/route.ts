import { NextResponse } from "next/server";
import { getTrainInformation } from "@/shared/lib/odpt";
import { getJREastTrainInfo } from "@/shared/lib/jreast";

/**
 * ODPTで運行情報が提供されている路線
 */
const ODPT_AVAILABLE_RAILWAYS = [
    // 東京メトロ
    { id: "odpt.Railway:TokyoMetro.Ginza", name: "銀座線", operator: "東京メトロ" },
    { id: "odpt.Railway:TokyoMetro.Marunouchi", name: "丸ノ内線", operator: "東京メトロ" },
    { id: "odpt.Railway:TokyoMetro.Hibiya", name: "日比谷線", operator: "東京メトロ" },
    { id: "odpt.Railway:TokyoMetro.Tozai", name: "東西線", operator: "東京メトロ" },
    { id: "odpt.Railway:TokyoMetro.Chiyoda", name: "千代田線", operator: "東京メトロ" },
    { id: "odpt.Railway:TokyoMetro.Yurakucho", name: "有楽町線", operator: "東京メトロ" },
    { id: "odpt.Railway:TokyoMetro.Hanzomon", name: "半蔵門線", operator: "東京メトロ" },
    { id: "odpt.Railway:TokyoMetro.Namboku", name: "南北線", operator: "東京メトロ" },
    { id: "odpt.Railway:TokyoMetro.Fukutoshin", name: "副都心線", operator: "東京メトロ" },
    // 都営地下鉄
    { id: "odpt.Railway:Toei.Asakusa", name: "浅草線", operator: "都営" },
    { id: "odpt.Railway:Toei.Mita", name: "三田線", operator: "都営" },
    { id: "odpt.Railway:Toei.Shinjuku", name: "新宿線", operator: "都営" },
    { id: "odpt.Railway:Toei.Oedo", name: "大江戸線", operator: "都営" },
    // その他
    { id: "odpt.Railway:TWR.Rinkai", name: "りんかい線", operator: "TWR" },
    { id: "odpt.Railway:MIR.TsukubaExpress", name: "つくばエクスプレス", operator: "つくばエクスプレス" },
];

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
 * ステータステキストを正規化
 * 平常時は「平常運転」、異常時は詳細テキスト
 */
function normalizeStatusText(status: string, infoText?: string): string {
    // 平常運転の場合は統一フォーマット
    if (status === "normal") {
        return "平常運転";
    }

    // 異常時は詳細テキストを返す（なければデフォルトテキスト）
    if (infoText) {
        return infoText;
    }

    switch (status) {
        case "delay":
            return "遅延が発生しています";
        case "suspend":
            return "運転を見合わせています";
        case "direct":
            return "直通運転を中止しています";
        case "restore":
            return "運転を再開しました";
        default:
            return "運行情報を確認中です";
    }
}

/**
 * 運行情報取得APIエンドポイント
 */
export async function GET() {
    try {
        // JR東日本とODPTの運行情報を並列で取得
        const [jrEastInfo, odptInfo] = await Promise.all([
            getJREastTrainInfo().catch((error) => {
                console.error("[JREast] 運行情報の取得エラー:", error);
                return [];
            }),
            getTrainInformation({}).catch((error) => {
                console.error("[ODPT] 運行情報の取得エラー:", error);
                return [];
            }),
        ]);

        // JR東日本の運行情報を変換
        const jrEastResult = jrEastInfo.map((info) => ({
            railwayId: `jreast.${info.lineId}`,
            railwayName: info.lineName,
            operator: "JR東日本",
            status: info.status,
            statusText: normalizeStatusText(info.status, info.detail),
            cause: undefined,
        }));

        // ODPTの運行情報をマッピング
        const infoByRailway = new Map<
            string,
            { status: string; statusText: string; cause?: string }
        >();

        for (const info of odptInfo) {
            const railwayId = info["odpt:railway"];
            if (railwayId) {
                const status = convertStatus(info["odpt:trainInformationStatus"]);
                infoByRailway.set(railwayId, {
                    status,
                    statusText: normalizeStatusText(
                        status,
                        info["odpt:trainInformationText"]?.ja
                    ),
                    cause: info["odpt:trainInformationCause"]?.ja,
                });
            }
        }

        // ODPTで提供されている路線の情報を変換
        const odptResult = ODPT_AVAILABLE_RAILWAYS.map((railway) => {
            const info = infoByRailway.get(railway.id);
            if (info) {
                return {
                    railwayId: railway.id,
                    railwayName: railway.name,
                    operator: railway.operator,
                    status: info.status,
                    statusText: info.statusText,
                    cause: info.cause,
                };
            }
            return {
                railwayId: railway.id,
                railwayName: railway.name,
                operator: railway.operator,
                status: "normal",
                statusText: "平常運転",
            };
        });

        // JR東日本を先頭に、その後ODPTの路線を並べる
        const result = [...jrEastResult, ...odptResult];

        return NextResponse.json({
            success: true,
            data: result,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[TrainInfo] 運行情報の取得エラー:", error);
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
