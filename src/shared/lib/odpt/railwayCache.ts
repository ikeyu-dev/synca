/**
 * 路線データキャッシュ
 * ODPTから取得した路線の駅リストをキャッシュし、駅名から路線を逆引きする
 */

import { getRailway } from "./client";
import type { OdptRailway } from "./types";

/**
 * 駅名から路線への逆引きマップ
 */
interface StationToRailwaysMap {
    [stationName: string]: Array<{
        railwayId: string;
        railwayName: string;
        operator: string;
    }>;
}

/**
 * キャッシュデータ
 */
interface RailwayCacheData {
    stationToRailways: StationToRailwaysMap;
    updatedAt: Date;
}

let cache: RailwayCacheData | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

/**
 * キャッシュが有効かどうかを確認
 */
function isCacheValid(): boolean {
    if (!cache) return false;
    const now = new Date();
    return now.getTime() - cache.updatedAt.getTime() < CACHE_TTL;
}

/**
 * 全路線データを取得してキャッシュを構築
 */
async function buildCache(): Promise<void> {
    console.log("[RailwayCache] キャッシュを構築中...");

    const stationToRailways: StationToRailwaysMap = {};

    try {
        // 全路線データを取得
        const railways: OdptRailway[] = await getRailway({});
        console.log(`[RailwayCache] ${railways.length}路線を取得`);

        for (const railway of railways) {
            const railwayId = railway["owl:sameAs"];
            const railwayName = railway["odpt:railwayTitle"]?.ja || railway["dc:title"] || railwayId;
            const operator = railway["odpt:operator"];

            // 各駅を逆引きマップに追加
            for (const stationEntry of railway["odpt:stationOrder"] || []) {
                // 駅名を取得（stationTitleがある場合はそれを使用、なければstationIdから抽出）
                let stationName = stationEntry["odpt:stationTitle"]?.ja;
                if (!stationName) {
                    // odpt.Station:JR-East.Yamanote.Tokyo から "Tokyo" を抽出
                    const stationId = stationEntry["odpt:station"];
                    const parts = stationId.split(".");
                    stationName = parts[parts.length - 1];
                }

                if (!stationName) continue;

                if (!stationToRailways[stationName]) {
                    stationToRailways[stationName] = [];
                }

                // 重複チェック
                const exists = stationToRailways[stationName].some(
                    (r) => r.railwayId === railwayId
                );
                if (!exists) {
                    stationToRailways[stationName].push({
                        railwayId,
                        railwayName,
                        operator,
                    });
                }
            }
        }

        cache = {
            stationToRailways,
            updatedAt: new Date(),
        };

        console.log(
            `[RailwayCache] キャッシュ構築完了: ${Object.keys(stationToRailways).length}駅`
        );
    } catch (error) {
        console.error("[RailwayCache] キャッシュ構築エラー:", error);
        throw error;
    }
}

/**
 * 駅名から路線リストを取得
 * @param stationName - 駅名
 */
export async function getRailwaysByStationName(
    stationName: string
): Promise<Array<{ railwayId: string; railwayName: string; operator: string }>> {
    if (!isCacheValid()) {
        await buildCache();
    }

    if (!cache) {
        return [];
    }

    // 完全一致で検索
    if (cache.stationToRailways[stationName]) {
        return cache.stationToRailways[stationName];
    }

    // 部分一致で検索（駅名の末尾に「駅」がついている場合など）
    const normalizedName = stationName.replace(/駅$/, "");
    if (cache.stationToRailways[normalizedName]) {
        return cache.stationToRailways[normalizedName];
    }

    // 前方一致で検索
    for (const key of Object.keys(cache.stationToRailways)) {
        if (key.startsWith(normalizedName) || normalizedName.startsWith(key)) {
            return cache.stationToRailways[key];
        }
    }

    return [];
}

/**
 * 複数の駅名から路線リストを一括取得
 * @param stationNames - 駅名の配列
 */
export async function getRailwaysByStationNames(
    stationNames: string[]
): Promise<Map<string, Array<{ railwayId: string; railwayName: string; operator: string }>>> {
    if (!isCacheValid()) {
        await buildCache();
    }

    const result = new Map<
        string,
        Array<{ railwayId: string; railwayName: string; operator: string }>
    >();

    for (const stationName of stationNames) {
        const railways = await getRailwaysByStationName(stationName);
        result.set(stationName, railways);
    }

    return result;
}

/**
 * キャッシュを強制的に再構築
 */
export async function refreshCache(): Promise<void> {
    cache = null;
    await buildCache();
}
