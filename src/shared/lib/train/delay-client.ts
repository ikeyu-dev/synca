/**
 * 電車遅延情報クライアント
 * 高崎線・宇都宮線の遅延情報を取得
 */

/**
 * 遅延情報の型定義
 */
export interface TrainDelayInfo {
    name: string;
    company: string;
    lastUpdate: string;
    status: "normal" | "delayed" | "suspended";
    delayInfo?: string;
}

/**
 * 監視対象の路線
 */
export const MONITORED_LINES = ["高崎線", "宇都宮線"];

/**
 * JR東日本の運行情報APIから遅延情報を取得
 * 公開APIを使用: https://rti-giken.jp/fhc/api/train_tetsudo/
 */
export async function getTrainDelayStatus(): Promise<TrainDelayInfo[]> {
    try {
        const response = await fetch(
            "https://tetsudo.rti-giken.jp/free/delay.json",
            {
                cache: "no-store",
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data: { name: string; company: string; lastupdate_gmt: number }[] =
            await response.json();

        // 高崎線・宇都宮線の遅延をチェック
        const results: TrainDelayInfo[] = MONITORED_LINES.map((lineName) => {
            const delayedLine = data.find(
                (item) => item.name === lineName || item.name.includes(lineName)
            );

            if (delayedLine) {
                return {
                    name: lineName,
                    company: delayedLine.company,
                    lastUpdate: new Date(
                        delayedLine.lastupdate_gmt * 1000
                    ).toISOString(),
                    status: "delayed" as const,
                    delayInfo: `${lineName}に遅延が発生しています`,
                };
            }

            return {
                name: lineName,
                company: "JR東日本",
                lastUpdate: new Date().toISOString(),
                status: "normal" as const,
            };
        });

        return results;
    } catch (error) {
        console.error("[Train] 遅延情報の取得に失敗:", error);
        throw error;
    }
}

/**
 * 遅延している路線のみを取得
 */
export async function getDelayedLines(): Promise<TrainDelayInfo[]> {
    const allLines = await getTrainDelayStatus();
    return allLines.filter((line) => line.status === "delayed");
}

/**
 * 遅延があるかどうかを確認
 */
export async function hasAnyDelay(): Promise<boolean> {
    const delayedLines = await getDelayedLines();
    return delayedLines.length > 0;
}
