import type { TransitRoute } from "@/entities/transit";

interface TransitRoutesResponse {
    success: boolean;
    data?: TransitRoute[];
    error?: string;
}

/**
 * 乗換経路を検索
 */
export async function fetchTransitRoutes(
    from: string,
    to: string,
    options?: {
        datetime?: Date;
        type?: "departure" | "arrival";
    }
): Promise<TransitRoutesResponse> {
    try {
        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

        const params = new URLSearchParams({
            from,
            to,
        });

        if (options?.datetime) {
            params.set("datetime", options.datetime.toISOString());
        }

        if (options?.type) {
            params.set("type", options.type);
        }

        const response = await fetch(
            `${baseUrl}/api/transit/route-search?${params.toString()}`,
            {
                cache: "no-store",
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || "経路検索に失敗しました");
        }

        return {
            success: true,
            data: result.data,
        };
    } catch (error) {
        console.error("[TransitRoutes] 経路検索エラー:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "経路検索に失敗しました",
        };
    }
}
