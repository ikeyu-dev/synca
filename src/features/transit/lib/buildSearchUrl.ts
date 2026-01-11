import type { Station } from "@/entities/station";

/**
 * 駅すぱあとの検索URLを生成する
 * @param from - 出発駅
 * @param to - 到着駅
 * @param datetime - 日時（省略時は現在時刻）
 */
export function buildEkispertUrl(
    from: Station,
    to: Station,
    datetime?: Date
): string {
    const now = datetime || new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");

    const params = new URLSearchParams({
        from: from.name,
        to: to.name,
        y: String(year),
        m: month,
        d: day,
        hh: hour,
        m1: minute[0],
        m2: minute[1],
        type: "1",
        ticket: "ic",
        expkind: "1",
        userpass: "0",
        ws: "2",
        s: "0",
        al: "1",
        shin: "1",
        ex: "1",
        hb: "1",
        lb: "1",
        sr: "1",
    });

    return `https://roote.ekispert.net/result?${params.toString()}`;
}

/**
 * Yahoo!乗換案内の検索URLを生成する
 * @param from - 出発駅
 * @param to - 到着駅
 */
export function buildYahooTransitUrl(from: Station, to: Station): string {
    const params = new URLSearchParams({
        from: from.name,
        to: to.name,
        type: "1",
        ticket: "ic",
    });

    return `https://transit.yahoo.co.jp/search/result?${params.toString()}`;
}

/**
 * Google Mapsの経路検索URLを生成する
 * @param from - 出発駅
 * @param to - 到着駅
 */
export function buildGoogleMapsUrl(from: Station, to: Station): string {
    const origin = encodeURIComponent(`${from.name}駅`);
    const destination = encodeURIComponent(`${to.name}駅`);

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`;
}
