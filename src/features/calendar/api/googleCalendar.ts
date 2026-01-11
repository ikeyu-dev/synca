"use server";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

/**
 * カレンダーイベントの型定義
 */
export interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    htmlLink?: string;
    colorId?: string;
    backgroundColor?: string;
}

/**
 * APIレスポンスの型
 */
interface CalendarResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Google Calendar APIのカラー定義
 */
interface ColorDefinition {
    background: string;
    foreground: string;
}

interface ColorsResponse {
    event: Record<string, ColorDefinition>;
    calendar: Record<string, ColorDefinition>;
}

/**
 * 色情報を取得
 */
async function fetchColors(
    accessToken: string
): Promise<ColorsResponse | null> {
    try {
        const response = await fetch(`${CALENDAR_API_BASE}/colors`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

/**
 * 今日のイベントを取得
 */
export async function fetchTodayEvents(
    accessToken: string
): Promise<CalendarResponse<CalendarEvent[]>> {
    const now = new Date();
    const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
    const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
    );

    return fetchEvents(accessToken, startOfDay, endOfDay);
}

/**
 * 今週のイベントを取得
 */
export async function fetchWeekEvents(
    accessToken: string
): Promise<CalendarResponse<CalendarEvent[]>> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return fetchEvents(accessToken, startOfWeek, endOfWeek);
}

/**
 * 指定期間のイベントを取得
 */
export async function fetchEvents(
    accessToken: string,
    timeMin: Date,
    timeMax: Date
): Promise<CalendarResponse<CalendarEvent[]>> {
    try {
        const params = new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "50",
        });

        const response = await fetch(
            `${CALENDAR_API_BASE}/calendars/primary/events?${params}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            return {
                success: false,
                error:
                    errorData?.error?.message || `APIエラー: ${response.status}`,
            };
        }

        const data = await response.json();
        return {
            success: true,
            data: data.items || [],
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "不明なエラー",
        };
    }
}

/**
 * 複数カレンダーのイベントを取得
 */
export async function fetchAllCalendarEvents(
    accessToken: string,
    timeMin: Date,
    timeMax: Date
): Promise<CalendarResponse<CalendarEvent[]>> {
    try {
        // 色情報とカレンダーリストを並列で取得
        const [colors, listResponse] = await Promise.all([
            fetchColors(accessToken),
            fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }),
        ]);

        if (!listResponse.ok) {
            return fetchEvents(accessToken, timeMin, timeMax);
        }

        const listData = await listResponse.json();
        const calendars = listData.items || [];

        // 各カレンダーからイベントを取得
        const allEvents: CalendarEvent[] = [];
        const params = new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "50",
        });

        for (const calendar of calendars) {
            if (calendar.selected === false) continue;

            try {
                const eventsResponse = await fetch(
                    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendar.id)}/events?${params}`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                if (eventsResponse.ok) {
                    const eventsData = await eventsResponse.json();
                    const events = (eventsData.items || []).map(
                        (event: CalendarEvent) => {
                            // イベント個別の色を優先、なければカレンダーの色を使用
                            let backgroundColor: string | undefined;

                            if (event.colorId && colors?.event[event.colorId]) {
                                // イベント個別の色
                                backgroundColor =
                                    colors.event[event.colorId].background;
                            } else if (
                                calendar.colorId &&
                                colors?.calendar[calendar.colorId]
                            ) {
                                // カレンダーの色
                                backgroundColor =
                                    colors.calendar[calendar.colorId].background;
                            } else if (calendar.backgroundColor) {
                                // カレンダーの背景色（直接指定されている場合）
                                backgroundColor = calendar.backgroundColor;
                            }

                            return {
                                ...event,
                                backgroundColor,
                            };
                        }
                    );
                    allEvents.push(...events);
                }
            } catch {
                // 個別のカレンダーのエラーは無視
            }
        }

        // 開始時刻でソート
        allEvents.sort((a, b) => {
            const aTime = a.start.dateTime || a.start.date || "";
            const bTime = b.start.dateTime || b.start.date || "";
            return aTime.localeCompare(bTime);
        });

        return {
            success: true,
            data: allEvents,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "不明なエラー",
        };
    }
}
