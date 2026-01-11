"use client";

import { useState, useEffect, useCallback } from "react";
import {
    fetchAllCalendarEvents,
    type CalendarEvent,
} from "@/features/calendar";
import { Loading } from "@/shared/ui";

interface CalendarPageContentProps {
    accessToken?: string;
}

// デフォルトの色
const DEFAULT_EVENT_COLOR = "#039be5";

/**
 * イベントの背景色を取得
 */
const getEventColor = (event: CalendarEvent): string => {
    return event.backgroundColor || DEFAULT_EVENT_COLOR;
};

// 複数日イベントの位置情報
type EventPosition = "single" | "start" | "middle" | "end";

interface EventWithPosition {
    event: CalendarEvent;
    position: EventPosition;
    isWeekStart: boolean;
    isWeekEnd: boolean;
}

interface DayInfo {
    date: Date;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: EventWithPosition[];
}

interface SelectedDateInfo {
    date: Date;
    dateStr: string;
    events: EventWithPosition[];
}

const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 日付をローカルタイムゾーンでYYYY-MM-DD形式に変換
 */
function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * イベントが終日かどうか
 */
function isAllDayEvent(event: CalendarEvent): boolean {
    return !event.start.dateTime && !!event.start.date;
}

/**
 * 時刻をフォーマット
 */
function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * カレンダーページのコンテンツ
 */
export function CalendarPageContent({ accessToken }: CalendarPageContentProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<SelectedDateInfo | null>(
        null
    );

    // イベントを取得（現在の月の前後1ヶ月を含む）
    const loadEvents = useCallback(async () => {
        if (!accessToken) {
            setError("アクセストークンがありません。再ログインしてください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        // 前月の1日から翌月の末日まで取得
        const startDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
        );
        const endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 2,
            0
        );

        const result = await fetchAllCalendarEvents(
            accessToken,
            startDate,
            endDate
        );

        if (result.success && result.data) {
            setEvents(result.data);
        } else {
            setError(result.error || "予定の取得に失敗しました");
        }

        setIsLoading(false);
    }, [accessToken, currentDate]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    // イベントを日付ごとにマップ（複数日イベント対応）
    const eventsByDate = new Map<string, EventWithPosition[]>();

    events.forEach((event) => {
        // dateTimeの場合はローカル時間に変換して日付を取得
        let startDateStr: string;
        let endDateStr: string;

        if (event.start.dateTime) {
            const startDateTime = new Date(event.start.dateTime);
            startDateStr = formatDateLocal(startDateTime);
        } else {
            startDateStr = event.start.date || "";
        }

        if (event.end.dateTime) {
            const endDateTime = new Date(event.end.dateTime);
            endDateStr = formatDateLocal(endDateTime);
        } else {
            endDateStr = event.end.date || "";
        }

        if (!startDateStr) return;

        const startDate = new Date(startDateStr + "T00:00:00");
        // 終日イベントの場合、終了日は排他的なので1日前にする
        let endDate = new Date(endDateStr + "T00:00:00");
        if (isAllDayEvent(event) && endDateStr) {
            endDate.setDate(endDate.getDate() - 1);
        }

        const isMultiDay = startDate.getTime() !== endDate.getTime();

        const current = new Date(startDate);
        while (current <= endDate) {
            const dateStr = formatDateLocal(current);

            let position: EventPosition = "single";
            if (isMultiDay) {
                const isStart = current.getTime() === startDate.getTime();
                const isEnd = current.getTime() === endDate.getTime();
                if (isStart) {
                    position = "start";
                } else if (isEnd) {
                    position = "end";
                } else {
                    position = "middle";
                }
            }

            const dayOfWeek = current.getDay();
            const isWeekStart =
                dayOfWeek === 0 || current.getTime() === startDate.getTime();
            const isWeekEnd =
                dayOfWeek === 6 || current.getTime() === endDate.getTime();

            const existing = eventsByDate.get(dateStr) || [];
            eventsByDate.set(dateStr, [
                ...existing,
                { event, position, isWeekStart, isWeekEnd },
            ]);

            current.setDate(current.getDate() + 1);
        }
    });

    // カレンダーの日付を生成（6週間分）
    const generateCalendarDays = (): DayInfo[] => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDay = firstDayOfMonth.getDay();

        const today = new Date();
        const todayStr = formatDateLocal(today);

        const days: DayInfo[] = [];

        // 前月の日付
        for (let i = startDay - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            const dateStr = formatDateLocal(date);
            days.push({
                date,
                dateStr,
                isCurrentMonth: false,
                isToday: dateStr === todayStr,
                events: eventsByDate.get(dateStr) || [],
            });
        }

        // 今月の日付
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const date = new Date(year, month, i);
            const dateStr = formatDateLocal(date);
            days.push({
                date,
                dateStr,
                isCurrentMonth: true,
                isToday: dateStr === todayStr,
                events: eventsByDate.get(dateStr) || [],
            });
        }

        // 翌月の日付（42日になるまで）
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            const dateStr = formatDateLocal(date);
            days.push({
                date,
                dateStr,
                isCurrentMonth: false,
                isToday: dateStr === todayStr,
                events: eventsByDate.get(dateStr) || [],
            });
        }

        return days;
    };

    const days = generateCalendarDays();

    // 月を変更
    const changeMonth = (delta: number) => {
        setCurrentDate(
            new Date(currentDate.getFullYear(), currentDate.getMonth() + delta)
        );
    };

    // 今日に戻る
    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // 日付クリック
    const handleDateClick = (date: Date, dateStr: string) => {
        const dayEvents = eventsByDate.get(dateStr) || [];
        setSelectedDate({ date, dateStr, events: dayEvents });
    };

    // モーダルを閉じる
    const closeModal = () => {
        setSelectedDate(null);
    };

    if (isLoading && events.length === 0) {
        return <Loading text="読み込み中..." />;
    }

    return (
        <div className="max-lg:p-0 lg:p-6 w-full lg:h-full flex flex-col lg:items-stretch items-center bg-base-100 lg:overflow-hidden">
            {error && (
                <div className="alert alert-error mb-4 w-full max-w-4xl lg:hidden">
                    <span>{error}</span>
                </div>
            )}

            {/* モバイル版 */}
            <div
                className="lg:hidden w-full flex flex-col overflow-hidden"
                style={{ height: "calc(100dvh - 200px)" }}
            >
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-base-300 shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
                            onClick={() => changeMonth(-1)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                        <span className="font-medium text-lg min-w-[120px] text-center">
                            {currentDate.getFullYear()}年
                            {currentDate.getMonth() + 1}月
                        </span>
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
                            onClick={() => changeMonth(1)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </div>
                    <button
                        className="btn btn-ghost btn-sm text-primary font-medium"
                        onClick={goToToday}
                    >
                        今日
                    </button>
                </div>

                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 border-b border-base-300 shrink-0">
                    {weekDays.map((day, index) => (
                        <div
                            key={day}
                            className={`text-center text-xs py-2 font-medium ${
                                index === 0
                                    ? "text-error"
                                    : index === 6
                                      ? "text-info"
                                      : "text-base-content/60"
                            }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* カレンダー本体 */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="grid grid-cols-7 grid-rows-6 h-full">
                        {days.map((day, index) => {
                            const dayOfWeek = day.date.getDay();
                            const rowIndex = Math.floor(index / 7);
                            const isLastRow = rowIndex === 5;
                            const colIndex = index % 7;

                            return (
                                <div
                                    key={index}
                                    onClick={() =>
                                        handleDateClick(day.date, day.dateStr)
                                    }
                                    className={`
                                        relative flex flex-col border-r border-b border-base-300 cursor-pointer active:bg-base-200/50 overflow-visible
                                        ${isLastRow ? "border-b-0" : ""}
                                        ${colIndex === 6 ? "border-r-0" : ""}
                                        ${
                                            !day.isCurrentMonth
                                                ? "bg-base-200"
                                                : "bg-base-100"
                                        }
                                    `}
                                    style={{ zIndex: 1 }}
                                >
                                    {/* 日付 */}
                                    <div className="p-1">
                                        <span
                                            className={`
                                                inline-flex items-center justify-center w-6 h-6 text-xs
                                                ${
                                                    day.isToday
                                                        ? "bg-primary text-primary-content rounded-full font-bold"
                                                        : ""
                                                }
                                                ${
                                                    !day.isToday &&
                                                    day.isCurrentMonth &&
                                                    dayOfWeek === 0
                                                        ? "text-error"
                                                        : ""
                                                }
                                                ${
                                                    !day.isToday &&
                                                    day.isCurrentMonth &&
                                                    dayOfWeek === 6
                                                        ? "text-info"
                                                        : ""
                                                }
                                                ${
                                                    !day.isCurrentMonth
                                                        ? "text-base-content/30"
                                                        : ""
                                                }
                                            `}
                                        >
                                            {day.date.getDate()}
                                        </span>
                                    </div>

                                    {/* イベントチップ */}
                                    <div className="relative flex-1">
                                        {day.events
                                            .slice(0, 3)
                                            .map((eventWithPos, eventIndex) => {
                                                const { event, position, isWeekStart, isWeekEnd } =
                                                    eventWithPos;
                                                const isMultiDay = position !== "single";
                                                const eventColor = getEventColor(event);

                                                const leftStyle =
                                                    isMultiDay && !isWeekStart ? "-1px" : "2px";
                                                const rightStyle =
                                                    isMultiDay && !isWeekEnd ? "-1px" : "2px";
                                                const topOffset = eventIndex * 16;

                                                return (
                                                    <div
                                                        key={`${event.id}-${eventIndex}`}
                                                        className={`absolute text-[9px] leading-tight text-white py-0.5 truncate ${
                                                            isMultiDay
                                                                ? `${isWeekStart ? "rounded-l" : ""} ${isWeekEnd ? "rounded-r" : ""}`
                                                                : "rounded"
                                                        }`}
                                                        style={{
                                                            top: `${topOffset}px`,
                                                            left: leftStyle,
                                                            right: rightStyle,
                                                            zIndex: 10,
                                                            paddingLeft: isWeekStart ? "4px" : "1px",
                                                            paddingRight: isWeekEnd ? "4px" : "1px",
                                                            backgroundColor: eventColor,
                                                        }}
                                                    >
                                                        {isWeekStart
                                                            ? event.summary || "(タイトルなし)"
                                                            : "\u00A0"}
                                                    </div>
                                                );
                                            })}
                                        {day.events.length > 3 && (
                                            <div
                                                className="absolute text-[9px] text-base-content/60 px-0.5"
                                                style={{ top: "48px", left: "2px" }}
                                            >
                                                +{day.events.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* PC版 */}
            <div className="hidden lg:flex items-center justify-start mb-4 px-2 w-full">
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={goToToday}
                    >
                        今日
                    </button>
                    <div className="flex items-center">
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
                            onClick={() => changeMonth(-1)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
                            onClick={() => changeMonth(1)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </div>
                    <h2
                        className="font-normal text-base-content"
                        style={{ fontSize: "clamp(1.125rem, 3vw, 1.5rem)" }}
                    >
                        {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
                    </h2>
                    <button
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={loadEvents}
                        disabled={isLoading}
                    >
                        <svg
                            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* カレンダーグリッド（PC版） */}
            <div className="hidden lg:flex flex-col flex-1 border border-base-300 rounded-lg overflow-hidden w-full">
                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 border-b border-base-300">
                    {weekDays.map((day, index) => (
                        <div
                            key={day}
                            className={`text-center py-2 text-xs sm:text-sm font-medium border-r border-base-300 last:border-r-0 ${
                                index === 0
                                    ? "text-error"
                                    : index === 6
                                      ? "text-info"
                                      : "text-base-content/70"
                            }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* カレンダー本体 */}
                <div className="grid grid-cols-7 grid-rows-6 flex-1">
                    {days.map((day, index) => {
                        const dayOfWeek = day.date.getDay();
                        const rowIndex = Math.floor(index / 7);
                        const isLastRow = rowIndex === 5;
                        const colIndex = index % 7;

                        return (
                            <div
                                key={index}
                                onClick={() => handleDateClick(day.date, day.dateStr)}
                                className={`
                                    relative flex flex-col border-r border-b border-base-300 last:border-r-0 cursor-pointer hover:bg-base-200/50 overflow-visible
                                    ${isLastRow ? "border-b-0" : ""}
                                    ${colIndex === 6 ? "border-r-0" : ""}
                                    ${!day.isCurrentMonth ? "bg-base-200" : "bg-base-100"}
                                `}
                                style={{ zIndex: 1 }}
                            >
                                {/* 日付 */}
                                <div className="p-2">
                                    <span
                                        className={`
                                            inline-flex items-center justify-center w-7 h-7 text-sm
                                            ${day.isToday ? "bg-primary text-primary-content rounded-full font-bold" : ""}
                                            ${!day.isToday && day.isCurrentMonth && dayOfWeek === 0 ? "text-error" : ""}
                                            ${!day.isToday && day.isCurrentMonth && dayOfWeek === 6 ? "text-info" : ""}
                                            ${!day.isCurrentMonth ? "text-base-content/40" : ""}
                                        `}
                                    >
                                        {day.date.getDate()}
                                    </span>
                                </div>

                                {/* イベントチップ */}
                                <div className="relative flex-1">
                                    {day.events.slice(0, 2).map((eventWithPos, eventIndex) => {
                                        const { event, position, isWeekStart, isWeekEnd } =
                                            eventWithPos;
                                        const isMultiDay = position !== "single";
                                        const eventColor = getEventColor(event);
                                        const time =
                                            !isAllDayEvent(event) && event.start.dateTime
                                                ? formatTime(event.start.dateTime)
                                                : null;

                                        const leftStyle =
                                            isMultiDay && !isWeekStart ? "-1px" : "4px";
                                        const rightStyle =
                                            isMultiDay && !isWeekEnd ? "-1px" : "4px";
                                        const topOffset = eventIndex * 22;

                                        return (
                                            <div
                                                key={`${event.id}-${eventIndex}`}
                                                className={`absolute text-xs text-white py-0.5 truncate leading-tight ${
                                                    isMultiDay
                                                        ? `${isWeekStart ? "rounded-l" : ""} ${isWeekEnd ? "rounded-r" : ""}`
                                                        : "rounded"
                                                }`}
                                                style={{
                                                    top: `${topOffset}px`,
                                                    left: leftStyle,
                                                    right: rightStyle,
                                                    zIndex: 10,
                                                    paddingLeft: isWeekStart ? "6px" : "2px",
                                                    paddingRight: isWeekEnd ? "6px" : "2px",
                                                    backgroundColor: eventColor,
                                                }}
                                            >
                                                {isWeekStart && time && (
                                                    <span className="font-medium mr-1">{time}</span>
                                                )}
                                                {isWeekStart
                                                    ? event.summary || "(タイトルなし)"
                                                    : "\u00A0"}
                                            </div>
                                        );
                                    })}
                                    {day.events.length > 2 && (
                                        <div
                                            className="absolute text-xs text-base-content/60 px-1"
                                            style={{ top: "44px", left: "4px" }}
                                        >
                                            +{day.events.length - 2}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* イベント一覧モーダル */}
            {selectedDate && (
                <dialog className="modal modal-open modal-middle">
                    <div className="modal-box max-w-2xl max-h-[calc(100vh-5rem)] flex flex-col">
                        <button
                            onClick={closeModal}
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        >
                            ✕
                        </button>
                        <h3 className="font-bold text-xl mb-4">
                            {selectedDate.date.getFullYear()}年
                            {selectedDate.date.getMonth() + 1}月
                            {selectedDate.date.getDate()}日の予定
                            <span className="badge badge-primary ml-2">
                                {selectedDate.events.length}件
                            </span>
                        </h3>
                        <div className="flex-1 overflow-y-auto">
                            {selectedDate.events.length === 0 ? (
                                <div className="text-center py-8 text-base-content/60">
                                    この日の予定はありません
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDate.events.map((eventWithPos, index) => {
                                        const { event, position } = eventWithPos;
                                        const isMultiDay = position !== "single";
                                        const eventColor = getEventColor(event);
                                        const isAllDay = isAllDayEvent(event);
                                        const timeLabel =
                                            !isAllDay && event.start.dateTime
                                                ? formatTime(event.start.dateTime)
                                                : null;

                                        return (
                                            <div
                                                key={`${event.id}-${index}`}
                                                className="p-4 bg-base-100 rounded-xl border-l-4 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:bg-base-200/50"
                                                style={{ borderLeftColor: eventColor }}
                                                onClick={() => {
                                                    if (event.htmlLink) {
                                                        window.open(event.htmlLink, "_blank");
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-3 h-3 rounded-full shrink-0"
                                                        style={{ backgroundColor: eventColor }}
                                                    ></div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-lg flex items-center gap-2">
                                                            {event.summary || "(タイトルなし)"}
                                                            {timeLabel && (
                                                                <span className="text-sm font-normal text-base-content/70">
                                                                    {timeLabel}
                                                                </span>
                                                            )}
                                                            {isAllDay && (
                                                                <span className="badge badge-sm badge-ghost">
                                                                    終日
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isMultiDay && (
                                                            <div className="text-sm text-base-content/60 mt-1">
                                                                複数日にまたがる予定
                                                            </div>
                                                        )}
                                                        {event.location && (
                                                            <div className="text-sm text-base-content/60 mt-1 flex items-center gap-1">
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                                    />
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                                    />
                                                                </svg>
                                                                {event.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {event.htmlLink && (
                                                        <svg
                                                            className="w-5 h-5 text-base-content/40"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                            />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={closeModal}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
