/**
 * 鉄道会社
 */
export type RailwayOperator = "JR" | "Tobu" | "Seibu" | "Metro" | "Other";

/**
 * 駅情報
 */
export interface Station {
    id: string;
    name: string;
    nameKana?: string;
    operator: RailwayOperator;
    line: string;
    prefecture?: string;
    /** ODPT駅ID (例: "odpt.Station:JR-East.Takasaki.Miyahara") */
    odptStationId?: string;
    /** ODPT路線ID (例: "odpt.Railway:JR-East.Takasaki") */
    odptRailwayId?: string;
}

/**
 * お気に入り路線（出発駅から目的駅へのルート）
 */
export interface FavoriteRoute {
    id: string;
    fromStation: Station;
    toStation: Station;
    label?: string;
    createdAt: string;
}

/**
 * 乗り換え設定
 */
export interface TransitSettings {
    homeStation: Station;
    favoriteRoutes: FavoriteRoute[];
}

/**
 * デフォルトの出発駅（宮原駅）
 */
export const DEFAULT_HOME_STATION: Station = {
    id: "miyahara",
    name: "宮原",
    nameKana: "みやはら",
    operator: "JR",
    line: "高崎線",
    prefecture: "埼玉県",
    odptStationId: "odpt.Station:JR-East.Takasaki.Miyahara",
    odptRailwayId: "odpt.Railway:JR-East.Takasaki",
};

/**
 * プリセットのよく使う駅
 */
export const PRESET_STATIONS: Station[] = [
    {
        id: "shin-shiraoka",
        name: "新白岡",
        nameKana: "しんしらおか",
        operator: "JR",
        line: "宇都宮線",
        prefecture: "埼玉県",
        odptStationId: "odpt.Station:JR-East.Utsunomiya.ShinShiraoka",
        odptRailwayId: "odpt.Railway:JR-East.Utsunomiya",
    },
    {
        id: "tobu-dobutsu-koen",
        name: "東武動物公園",
        nameKana: "とうぶどうぶつこうえん",
        operator: "Tobu",
        line: "東武スカイツリーライン",
        prefecture: "埼玉県",
        odptStationId: "odpt.Station:Tobu.TobuSkytree.TobuDobutsuKoen",
        odptRailwayId: "odpt.Railway:Tobu.TobuSkytree",
    },
    {
        id: "omiya",
        name: "大宮",
        nameKana: "おおみや",
        operator: "JR",
        line: "高崎線",
        prefecture: "埼玉県",
        odptStationId: "odpt.Station:JR-East.Takasaki.Omiya",
        odptRailwayId: "odpt.Railway:JR-East.Takasaki",
    },
];
