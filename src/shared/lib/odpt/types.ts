/**
 * ODPT API 型定義
 * 公共交通オープンデータセンターAPI v4
 */

/**
 * 運行情報ステータス
 */
export type OdptTrainInformationStatus =
    | "odpt:Normal"
    | "odpt:Delay"
    | "odpt:Suspend"
    | "odpt:Operation"
    | "odpt:ServiceSuspended"
    | "odpt:DirectOperation"
    | "odpt:Resume";

/**
 * 路線運行情報
 */
export interface OdptTrainInformation {
    "@context": string;
    "@id": string;
    "@type": "odpt:TrainInformation";
    "dc:date": string;
    "dct:valid"?: string;
    "odpt:operator": string;
    "odpt:railway"?: string;
    "odpt:trainInformationStatus"?: OdptTrainInformationStatus;
    "odpt:trainInformationText"?: {
        ja?: string;
        en?: string;
    };
    "odpt:trainInformationCause"?: {
        ja?: string;
        en?: string;
    };
    "odpt:trainInformationArea"?: {
        ja?: string;
        en?: string;
    };
    "odpt:trainInformationKind"?: {
        ja?: string;
        en?: string;
    };
    "odpt:trainInformationRange"?: {
        ja?: string;
        en?: string;
    };
    "odpt:stationFrom"?: string;
    "odpt:stationTo"?: string;
    "odpt:railDirection"?: string;
    "odpt:resumeEstimate"?: string;
}

/**
 * 路線情報
 */
export interface OdptRailway {
    "@context": string;
    "@id": string;
    "@type": "odpt:Railway";
    "dc:date": string;
    "dc:title"?: string;
    "owl:sameAs": string;
    "odpt:operator": string;
    "odpt:lineCode"?: string;
    "odpt:color"?: string;
    "odpt:railwayTitle": {
        ja?: string;
        en?: string;
    };
    "odpt:stationOrder": Array<{
        "odpt:station": string;
        "odpt:index": number;
        "odpt:stationTitle"?: {
            ja?: string;
            en?: string;
        };
    }>;
    "odpt:ascendingRailDirection"?: string;
    "odpt:descendingRailDirection"?: string;
}

/**
 * 駅情報
 */
export interface OdptStation {
    "@context": string;
    "@id": string;
    "@type": "odpt:Station";
    "dc:date": string;
    "dc:title"?: string;
    "owl:sameAs": string;
    "odpt:operator": string;
    "odpt:railway": string;
    "odpt:stationCode"?: string;
    "odpt:stationTitle": {
        ja?: string;
        en?: string;
    };
    "geo:lat"?: number;
    "geo:long"?: number;
    "odpt:exit"?: string[];
    "odpt:connectingRailway"?: string[];
    "odpt:passengerSurvey"?: string[];
}

/**
 * 駅時刻表
 */
export interface OdptStationTimetable {
    "@context": string;
    "@id": string;
    "@type": "odpt:StationTimetable";
    "dc:date": string;
    "owl:sameAs": string;
    "odpt:operator": string;
    "odpt:railway": string;
    "odpt:station": string;
    "odpt:railDirection": string;
    "odpt:calendar": string;
    "odpt:stationTimetableObject": OdptStationTimetableObject[];
}

/**
 * 駅時刻表オブジェクト
 */
export interface OdptStationTimetableObject {
    "odpt:departureTime": string;
    "odpt:destinationStation"?: string[];
    "odpt:trainType"?: string;
    "odpt:trainNumber"?: string;
    "odpt:train"?: string;
    "odpt:isLast"?: boolean;
    "odpt:isOrigin"?: boolean;
    "odpt:note"?: {
        ja?: string;
        en?: string;
    };
}

/**
 * 列車情報（リアルタイム）
 */
export interface OdptTrain {
    "@context": string;
    "@id": string;
    "@type": "odpt:Train";
    "dc:date": string;
    "dct:valid"?: string;
    "owl:sameAs": string;
    "odpt:operator": string;
    "odpt:railway": string;
    "odpt:trainNumber": string;
    "odpt:trainType"?: string;
    "odpt:trainName"?: Array<{ ja?: string; en?: string }>;
    "odpt:trainOwner"?: string;
    "odpt:originStation"?: string[];
    "odpt:destinationStation"?: string[];
    "odpt:fromStation"?: string;
    "odpt:toStation"?: string;
    "odpt:railDirection"?: string;
    "odpt:delay"?: number;
    "odpt:carComposition"?: number;
    "odpt:index"?: number;
}

/**
 * 事業者情報
 */
export interface OdptOperator {
    "@context": string;
    "@id": string;
    "@type": "odpt:Operator";
    "dc:date": string;
    "dc:title"?: string;
    "owl:sameAs": string;
    "odpt:operatorTitle": {
        ja?: string;
        en?: string;
    };
}

/**
 * 列車種別
 */
export interface OdptTrainType {
    "@context": string;
    "@id": string;
    "@type": "odpt:TrainType";
    "dc:date": string;
    "owl:sameAs": string;
    "odpt:operator": string;
    "odpt:trainTypeTitle": {
        ja?: string;
        en?: string;
    };
}

/**
 * カレンダー（運行日）
 */
export interface OdptCalendar {
    "@context": string;
    "@id": string;
    "@type": "odpt:Calendar";
    "dc:date": string;
    "dc:title"?: string;
    "owl:sameAs": string;
    "odpt:calendarTitle": {
        ja?: string;
        en?: string;
    };
    "odpt:day"?: string[];
    "odpt:duration"?: string;
}

/**
 * 運賃情報
 */
export interface OdptRailwayFare {
    "@context": string;
    "@id": string;
    "@type": "odpt:RailwayFare";
    "dc:date": string;
    "owl:sameAs": string;
    "odpt:operator": string;
    "odpt:fromStation": string;
    "odpt:toStation": string;
    "odpt:icCardFare"?: number;
    "odpt:ticketFare"?: number;
    "odpt:childIcCardFare"?: number;
    "odpt:childTicketFare"?: number;
}

/**
 * ODPT APIのレスポンス型
 */
export type OdptApiResponse<T> = T[];
