/**
 * JR東日本運行情報スクレイピングクライアント
 * https://traininfo.jreast.co.jp/train_info/kanto.aspx からデータを取得
 */

export interface JREastTrainInfo {
    lineName: string;
    lineId: string;
    status: "normal" | "delay" | "suspend" | "info";
    statusText: string;
    detail?: string;
}

/**
 * 監視対象のJR東日本路線
 */
const MONITORED_LINES = [
    { name: "高崎線", id: "takasakiline" },
    { name: "宇都宮線", id: "utsunomiyaline" },
    { name: "京浜東北線", id: "keihintohokuline" },
    { name: "埼京線", id: "saikyoline" },
    { name: "湘南新宿ライン", id: "shonanshinjukuline" },
    { name: "上野東京ライン", id: "uenotokyo" },
    { name: "山手線", id: "yamanoteline" },
];

/**
 * ステータスアイコンからステータスを判定
 */
function parseStatus(iconSrc: string): JREastTrainInfo["status"] {
    if (iconSrc.includes("normal")) return "normal";
    if (iconSrc.includes("delay")) return "delay";
    if (iconSrc.includes("suspend") || iconSrc.includes("stop")) return "suspend";
    if (iconSrc.includes("info")) return "info";
    return "normal";
}

/**
 * ステータスを日本語テキストに変換
 */
function getStatusText(status: JREastTrainInfo["status"]): string {
    switch (status) {
        case "normal":
            return "平常運転";
        case "delay":
            return "遅延";
        case "suspend":
            return "運転見合わせ";
        case "info":
            return "お知らせ";
        default:
            return "不明";
    }
}

/**
 * JR東日本関東エリアの運行情報を取得
 */
export async function getJREastTrainInfo(): Promise<JREastTrainInfo[]> {
    const url = "https://traininfo.jreast.co.jp/train_info/kanto.aspx";

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; SyncaBot/1.0; +https://synca.app)",
                Accept: "text/html,application/xhtml+xml",
                "Accept-Language": "ja",
            },
            cache: "no-store", // キャッシュ無効化（リアルタイムデータのため）
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const html = await response.text();
        return parseTrainInfoHtml(html);
    } catch (error) {
        console.error("[JREast] 運行情報の取得エラー:", error);
        throw error;
    }
}

/**
 * HTMLをパースして運行情報を抽出
 */
function parseTrainInfoHtml(html: string): JREastTrainInfo[] {
    const results: JREastTrainInfo[] = [];

    for (const line of MONITORED_LINES) {
        // 路線名の位置を見つける
        const lineNamePattern = new RegExp(
            `<span class="name">${escapeRegex(line.name)}</span>`,
            "g"
        );

        let match;
        let found = false;

        while ((match = lineNamePattern.exec(html)) !== null) {
            // 路線名の位置から後ろ1500文字を取得して解析
            const startPos = match.index;
            const block = html.substring(startPos, startPos + 1500);

            // ステータスアイコンを抽出
            const statusIconMatch = block.match(/ico_info_(\w+)\.svg/);
            if (!statusIconMatch) continue;

            const statusType = statusIconMatch[1];
            const status = parseStatus(statusType);

            // ステータスラベルを抽出（「遅延」「平常運転」など）
            const statusLabelMatch = block.match(/<p>([^<]{1,20})<\/p>\s*<\/div>\s*(?:<p class="status_Text">)?/);
            const statusLabel = statusLabelMatch ? statusLabelMatch[1].trim() : getStatusText(status);

            // 詳細テキストを抽出
            const detailMatch = block.match(/<p class="status_Text">([^<]+)<\/p>/);
            const detail = detailMatch ? detailMatch[1].trim() : undefined;

            results.push({
                lineName: line.name,
                lineId: line.id,
                status,
                statusText: statusLabel,
                detail,
            });

            found = true;
            break; // 最初に見つかったものを使用
        }

        if (!found) {
            // 路線が見つからない場合はデフォルトで平常運転とする
            results.push({
                lineName: line.name,
                lineId: line.id,
                status: "normal",
                statusText: "平常運転",
            });
        }
    }

    return results;
}

/**
 * 正規表現用にエスケープ
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
