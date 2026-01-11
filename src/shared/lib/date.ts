/**
 * 日付をフォーマットする
 * @param date - 日付
 * @param format - フォーマット（'date' | 'time' | 'datetime'）
 */
export function formatDate(
    date: Date,
    format: "date" | "time" | "datetime" = "datetime"
): string {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Tokyo",
    };

    if (format === "date" || format === "datetime") {
        options.year = "numeric";
        options.month = "2-digit";
        options.day = "2-digit";
    }

    if (format === "time" || format === "datetime") {
        options.hour = "2-digit";
        options.minute = "2-digit";
    }

    return new Intl.DateTimeFormat("ja-JP", options).format(date);
}

/**
 * 時刻をフォーマットする（HH:MM形式）
 * @param hour - 時
 * @param minute - 分
 */
export function formatTime(hour: number, minute: number): string {
    return `${hour}:${String(minute).padStart(2, "0")}`;
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得する
 */
export function getTodayString(): string {
    return new Date().toISOString().split("T")[0];
}

/**
 * 残り時間を計算する（分単位）
 * @param targetHour - 目標時刻の時
 * @param targetMinute - 目標時刻の分
 * @param now - 現在時刻（省略時は現在）
 */
export function getRemainingMinutes(
    targetHour: number,
    targetMinute: number,
    now: Date = new Date()
): number {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    return (targetHour - currentHour) * 60 + (targetMinute - currentMinute);
}
