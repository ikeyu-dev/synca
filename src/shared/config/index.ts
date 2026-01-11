/**
 * アプリケーション設定
 */
export const APP_CONFIG = {
    name: "Synca",
    description: "日々のサポートアプリ",
    themeColor: "#274a78",
} as const;

/**
 * 外部サービスのエンドポイント
 */
export const API_ENDPOINTS = {
    ekispert: {
        base: "https://api.ekispert.jp/v1/json",
    },
    odpt: {
        base: "https://api.odpt.org/api/v4",
    },
} as const;
