/**
 * 共通のAPI レスポンス型
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * ページネーション用の型
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
}

/**
 * 時刻を表す型
 */
export interface TimeSlot {
    hour: number;
    minute: number;
}

/**
 * 日付範囲を表す型
 */
export interface DateRange {
    start: Date;
    end: Date;
}
