"use client";

import { useState, useEffect } from "react";
import type { TransitRoute } from "@/entities/transit";
import { TransitRouteCard } from "./TransitRouteCard";
import { fetchTransitRoutes } from "../api/fetchTransitRoutes";

interface TransitRouteListProps {
    from: string;
    to: string;
}

/**
 * 乗換経路一覧
 */
export function TransitRouteList({ from, to }: TransitRouteListProps) {
    const [routes, setRoutes] = useState<TransitRoute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadRoutes() {
            setIsLoading(true);
            setError(null);

            const result = await fetchTransitRoutes(from, to);

            if (result.success && result.data) {
                setRoutes(result.data);
            } else {
                setError(result.error || "経路検索に失敗しました");
            }

            setIsLoading(false);
        }

        loadRoutes();
    }, [from, to]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <span className="loading loading-spinner loading-md" />
                <span className="ml-2 text-base-content/60">経路を検索中...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-error">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <span>{error}</span>
            </div>
        );
    }

    if (routes.length === 0) {
        return (
            <div className="text-center py-8 text-base-content/60">
                経路が見つかりませんでした
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {routes.map((route, index) => (
                <TransitRouteCard
                    key={index}
                    route={route}
                    index={index}
                />
            ))}
        </div>
    );
}
