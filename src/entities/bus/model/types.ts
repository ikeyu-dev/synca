/**
 * バスの時刻情報
 */
export interface BusTime {
    hour: number;
    minutes: number[];
}

/**
 * バス時刻表
 */
export interface BusSchedule {
    stationName: string;
    fromStation: BusTime[];
    fromUniversity: BusTime[];
    notices?: string[];
}

/**
 * バス時刻表データ全体
 */
export interface BusScheduleData {
    date: string;
    scheduleType?: string;
    tobu: BusSchedule;
    jr: BusSchedule;
}

/**
 * 次のバス情報
 */
export interface NextBus {
    hour: number;
    minute: number;
    remainingMinutes: number;
}
