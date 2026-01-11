import type { BusScheduleData, BusTime, BusSchedule } from "@/entities/bus";

interface BusScheduleResponse {
    success: boolean;
    data?: BusScheduleData;
    error?: string;
}

/**
 * テーブルをパース
 */
function parseTable(tableHtml: string): BusTime[] {
    const times: BusTime[] = [];

    const headerRowMatch = tableHtml.match(
        /<tr[^>]*>[\s\S]*?<th[^>]*>時<\/th>([\s\S]*?)<\/tr>/i
    );
    if (!headerRowMatch) return times;

    const hourMatches = headerRowMatch[1].match(/<th>(\d+)<\/th>/g);
    const hours =
        hourMatches?.map((h) => {
            const match = h.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }) || [];

    const dataRowMatch = tableHtml.match(
        /<tr[^>]*>\s*<td[^>]*class="tbl_title"[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/tr>/i
    );
    if (!dataRowMatch) return times;

    const tdMatches = dataRowMatch[1].match(/<td>[\s\S]*?<\/td>/gi) || [];

    hours.forEach((hour, index) => {
        const td = tdMatches[index] || "";
        const minuteMatches = td.match(/<li>(\d+)<\/li>/g);
        const minutes =
            minuteMatches?.map((m) => {
                const match = m.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            }) || [];

        times.push({ hour, minutes });
    });

    return times;
}

/**
 * HTMLからバス時刻表をパース
 */
function parseScheduleSection(html: string, sectionClass: string): BusSchedule {
    const sectionRegex = new RegExp(
        `<div\\s+class="${sectionClass}"[^>]*>([\\s\\S]*?)(?=<div\\s+class="(?:tobu|jr)"[^>]*>|$)`,
        "i"
    );
    let sectionMatch = html.match(sectionRegex);

    if (!sectionMatch) {
        const altRegex = new RegExp(
            `<div class="${sectionClass}">([\\s\\S]*?)(?:<div class="(?:tobu|jr)">|<footer|$)`,
            "i"
        );
        sectionMatch = html.match(altRegex);
    }

    const defaultName = sectionClass === "tobu" ? "東武動物公園駅" : "新白岡駅";

    if (!sectionMatch) {
        return {
            stationName: defaultName,
            fromStation: [],
            fromUniversity: [],
            notices: [],
        };
    }

    const content = sectionMatch[1];

    const captionMatch = content.match(/<caption>([^<]+)<\/caption>/);
    const stationName = captionMatch?.[1] || defaultName;

    const tableMatches =
        content.match(
            /<table[^>]*class="[^"]*_tbl"[^>]*>[\s\S]*?<\/table>/gi
        ) || [];

    const tables =
        tableMatches.length > 0
            ? tableMatches
            : content.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];

    const noticeMatches =
        content.match(/<div\s+class="[^"]*_att"[^>]*>([\s\S]*?)<\/div>/gi) || [];
    const notices = noticeMatches
        .map((notice) => {
            return notice
                .replace(/<div[^>]*>/gi, "")
                .replace(/<\/div>/gi, "")
                .replace(/<br\s*\/?>/gi, " ")
                .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1")
                .trim();
        })
        .filter((notice) => notice.length > 0);

    return {
        stationName,
        fromStation: tables[0] ? parseTable(tables[0]) : [],
        fromUniversity: tables[1] ? parseTable(tables[1]) : [],
        notices,
    };
}

/**
 * バス時刻表を取得する
 * @param date - 日付（YYYY-MM-DD形式、省略時は今日）
 */
export async function fetchBusSchedule(
    date?: string
): Promise<BusScheduleResponse> {
    try {
        const targetDate = date || new Date().toISOString().split("T")[0];
        const url = `https://www.nit.ac.jp/campus/access/bus-schedule?date=${targetDate}`;

        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Accept: "text/html",
            },
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            return {
                success: false,
                error: `取得に失敗しました: ${response.status}`,
            };
        }

        const html = await response.text();

        const scheduleTypeMatch = html.match(
            /<div\s+class="bus_subtitle"[^>]*>([^<]+)<\/div>/i
        );
        const scheduleType = scheduleTypeMatch?.[1]?.trim() || "";

        const tobu = parseScheduleSection(html, "tobu");
        const jr = parseScheduleSection(html, "jr");

        return {
            success: true,
            data: {
                date: targetDate,
                scheduleType,
                tobu,
                jr,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "不明なエラー",
        };
    }
}
