/**
 * Overpass API クライアント
 * OpenStreetMapのデータベースから駅情報を取得
 */

// 日本のOverpass APIインスタンス（OSM公式Wikiに掲載）
// https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
const OVERPASS_API_URL = "https://overpass.osm.jp/api/interpreter";

/**
 * 除外するネットワーク（テーマパーク内の独自鉄道など）
 */
const EXCLUDED_NETWORKS = [
    "ディズニーリゾートライン",
    "Disney Resort Line",
    "舞浜リゾートライン",
];

/**
 * 除外する駅名（完全一致）
 * 日本国内のテーマパーク・遊園地内の駅
 */
const EXCLUDED_STATION_NAMES = [
    // ディズニーリゾートライン
    "リゾートゲートウェイ・ステーション",
    "東京ディズニーランド・ステーション",
    "ベイサイド・ステーション",
    "東京ディズニーシー・ステーション",
    // 東京ディズニーランド ウエスタンリバー鉄道
    "アドベンチャーランド・デポ",
    // 東京ディズニーシー エレクトリックレールウェイ
    "アメリカンウォーターフロント・ステーション",
    "ポートディスカバリー・ステーション",
    // 東武動物公園 太陽の恵み鉄道パークライン
    "東ゲート",
    "東ゲート駅",
    "リバティーランド",
    "リバティーランド駅",
    "ハートフルランド",
    "ハートフルランド駅",
    "ハートフルタウン",
    // 修善寺虹の郷 ロムニー鉄道
    "ロムニー駅",
    "ネルソン駅",
    // 姫路セントラルパーク
    "ふれあいの国駅",
    "野生の国駅",
    // 日本モンキーパーク おとぎ列車（廃止済み）
    "領事館駅",
    "犬山成田山駅",
    "動物園駅",
    // その他テーマパーク・遊園地
    "ウエスタン村駅",
    "おとぎの国駅",
];

/**
 * 除外する駅名パターン（部分一致）
 */
const EXCLUDED_STATION_PATTERNS = [
    "ステーション", // 「〜ステーション」形式はテーマパーク系が多い
];

/**
 * Overpass APIから取得した駅情報
 */
export interface OverpassStation {
    id: number;
    name: string;
    lat: number;
    lng: number;
    operator?: string;
    railway?: string;
    network?: string;
}

/**
 * Overpass APIのレスポンス型
 */
interface OverpassResponse {
    elements: Array<{
        type: "node" | "way" | "relation";
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: {
            name?: string;
            "name:ja"?: string;
            operator?: string;
            railway?: string;
            station?: string;
            network?: string;
        };
    }>;
}

/**
 * 指定した座標から指定範囲内の駅を取得
 * @param lat - 緯度
 * @param lng - 経度
 * @param radiusMeters - 検索範囲（メートル）
 */
export async function getNearbyStations(
    lat: number,
    lng: number,
    radiusMeters: number = 3000
): Promise<OverpassStation[]> {
    // Overpass QLクエリ
    // railway=station または railway=halt（小規模駅）を検索
    const query = `
        [out:json][timeout:10];
        (
            node["railway"="station"](around:${radiusMeters},${lat},${lng});
            node["railway"="halt"](around:${radiusMeters},${lat},${lng});
            way["railway"="station"](around:${radiusMeters},${lat},${lng});
        );
        out center body;
    `;

    let response: Response;
    try {
        response = await fetch(OVERPASS_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Synca/1.0",
            },
            body: `data=${encodeURIComponent(query)}`,
        });
    } catch (error) {
        console.error("[Overpass] Fetch error:", error);
        throw new Error(
            `Overpass API fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[Overpass] API error:", response.status, errorText);
        throw new Error(`Overpass API error: ${response.status}`);
    }

    const data: OverpassResponse = await response.json();

    const stations: OverpassStation[] = [];

    for (const element of data.elements) {
        // 緯度経度を取得（nodeの場合は直接、wayの場合はcenterから）
        const elementLat = element.lat ?? element.center?.lat;
        const elementLng = element.lon ?? element.center?.lon;

        if (!elementLat || !elementLng) continue;

        // 駅名を取得（日本語名を優先）
        const name = element.tags?.["name:ja"] || element.tags?.name;
        if (!name) continue;

        const network = element.tags?.network || "";

        // 除外ネットワークに含まれる場合はスキップ
        if (network) {
            const isExcludedNetwork = EXCLUDED_NETWORKS.some((excluded) =>
                network.includes(excluded)
            );
            if (isExcludedNetwork) {
                console.log(`[Overpass] 除外: ${name} (network: ${network})`);
                continue;
            }
        }

        // 除外駅名リストに完全一致する場合はスキップ
        if (EXCLUDED_STATION_NAMES.includes(name)) {
            console.log(`[Overpass] 除外: ${name} (除外駅名リスト)`);
            continue;
        }

        // 除外駅名パターンに部分一致する場合はスキップ
        const isExcludedPattern = EXCLUDED_STATION_PATTERNS.some((pattern) =>
            name.includes(pattern)
        );
        if (isExcludedPattern) {
            console.log(`[Overpass] 除外: ${name} (駅名パターン)`);
            continue;
        }

        stations.push({
            id: element.id,
            name,
            lat: elementLat,
            lng: elementLng,
            operator: element.tags?.operator,
            railway: element.tags?.railway,
            network: element.tags?.network,
        });
    }

    return stations;
}
