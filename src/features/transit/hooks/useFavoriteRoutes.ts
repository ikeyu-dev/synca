"use client";

import { useState, useEffect, useCallback } from "react";
import type { Station, FavoriteRoute } from "@/entities/station";
import { DEFAULT_HOME_STATION, PRESET_STATIONS } from "@/entities/station";

const STORAGE_KEY = "synca-favorite-routes";
const HOME_STATION_KEY = "synca-home-station";

/**
 * お気に入りルートを管理するカスタムフック
 */
export function useFavoriteRoutes() {
    const [homeStation, setHomeStationState] = useState<Station>(DEFAULT_HOME_STATION);
    const [favoriteRoutes, setFavoriteRoutes] = useState<FavoriteRoute[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const savedHomeStation = localStorage.getItem(HOME_STATION_KEY);
        if (savedHomeStation) {
            try {
                setHomeStationState(JSON.parse(savedHomeStation));
            } catch {
                setHomeStationState(DEFAULT_HOME_STATION);
            }
        }

        const savedRoutes = localStorage.getItem(STORAGE_KEY);
        if (savedRoutes) {
            try {
                setFavoriteRoutes(JSON.parse(savedRoutes));
            } catch {
                initializeDefaultRoutes();
            }
        } else {
            initializeDefaultRoutes();
        }

        setIsLoaded(true);
    }, []);

    const initializeDefaultRoutes = useCallback(() => {
        const defaultRoutes: FavoriteRoute[] = PRESET_STATIONS.map((station) => ({
            id: `${DEFAULT_HOME_STATION.id}-${station.id}`,
            fromStation: DEFAULT_HOME_STATION,
            toStation: station,
            createdAt: new Date().toISOString(),
        }));
        setFavoriteRoutes(defaultRoutes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRoutes));
    }, []);

    const setHomeStation = useCallback((station: Station) => {
        setHomeStationState(station);
        localStorage.setItem(HOME_STATION_KEY, JSON.stringify(station));
    }, []);

    const addRoute = useCallback(
        (toStation: Station, label?: string) => {
            const newRoute: FavoriteRoute = {
                id: `${homeStation.id}-${toStation.id}-${Date.now()}`,
                fromStation: homeStation,
                toStation,
                label,
                createdAt: new Date().toISOString(),
            };

            setFavoriteRoutes((prev) => {
                const updated = [...prev, newRoute];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return updated;
            });
        },
        [homeStation]
    );

    const removeRoute = useCallback((routeId: string) => {
        setFavoriteRoutes((prev) => {
            const updated = prev.filter((route) => route.id !== routeId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const updateRoute = useCallback(
        (routeId: string, updates: Partial<FavoriteRoute>) => {
            setFavoriteRoutes((prev) => {
                const updated = prev.map((route) =>
                    route.id === routeId ? { ...route, ...updates } : route
                );
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return updated;
            });
        },
        []
    );

    return {
        homeStation,
        setHomeStation,
        favoriteRoutes,
        addRoute,
        removeRoute,
        updateRoute,
        isLoaded,
    };
}
