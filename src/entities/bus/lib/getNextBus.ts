import type { BusTime, NextBus } from "../model/types";

/**
 * 次のバスを計算する
 * @param times - バス時刻表
 * @param now - 現在時刻
 * @returns 次のバス情報（なければnull）
 */
export function getNextBus(times: BusTime[], now: Date): NextBus | null {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const allBuses: { hour: number; minute: number }[] = [];
    for (const time of times) {
        for (const minute of time.minutes) {
            allBuses.push({ hour: time.hour, minute });
        }
    }

    allBuses.sort((a, b) => {
        if (a.hour !== b.hour) return a.hour - b.hour;
        return a.minute - b.minute;
    });

    for (const bus of allBuses) {
        if (bus.hour < currentHour) continue;
        if (bus.hour === currentHour && bus.minute <= currentMinute) continue;

        const remainingMinutes =
            (bus.hour - currentHour) * 60 + (bus.minute - currentMinute);

        return {
            hour: bus.hour,
            minute: bus.minute,
            remainingMinutes,
        };
    }

    return null;
}
