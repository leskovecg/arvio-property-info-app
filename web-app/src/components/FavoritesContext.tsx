// src/components/FavoritesContext.tsx
// Centralized favorites state for the whole app.
// - Persists favorites via the backend API (SQLite behind Flask).
// - Exposes helpers to read, add/remove (toggle), and refresh favorites.
// - Wrap your app with <FavoritesProvider> to make the context available.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  type Favorite as FavDto,   // DTO shape returned by the backend
  fetchFavorites,            // GET /api/favorites
  addFavorite,               // POST /api/favorites
  removeFavorite,            // DELETE /api/favorites/:re_key
} from "../api/favorites";

// Friendly client-side shape used by the UI (can include extra fields if needed)
export type FavoriteItem = {
  reKey: string;
  label?: string;
  address?: string;
  size?: number;
  gps?: { lat: number; lng: number } | null;
};

// Internal map keyed by reKey for O(1) lookups
type FavoritesMap = Record<string, FavoriteItem>;

// Public context contract used by consumers
type FavoritesCtx = {
  favorites: FavoritesMap;                          // current favorites keyed by reKey
  isFavorite: (reKey: string) => boolean;           // quick existence check
  toggleFavorite: (reKey: string, item?: FavoriteItem) => Promise<void>; // add/remove
  refresh: () => Promise<void>;                     // reload from backend
};

// Create the context (initialized as null until wrapped by provider)
const FavoritesContext = createContext<FavoritesCtx | null>(null);

// Provider component that manages favorites state and talks to the backend
export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<FavoritesMap>({});

  // Convert array returned by API into a map keyed by re_key
  const toMap = (arr: FavDto[]): FavoritesMap => {
    const m: FavoritesMap = {};
    for (const f of arr) {
      m[f.re_key] = {
        reKey: f.re_key,
        address: f.address ?? undefined,
        label: f.label ?? undefined,
      };
    }
    return m;
  };

  // Pull latest favorites from the backend
  const refresh = useCallback(async () => {
    try {
      const list = await fetchFavorites();
      setFavorites(toMap(list));
    } catch (e) {
      console.error("Failed to load favorites", e);
    }
  }, []);

  // Load once on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // O(1) check using the map
  const isFavorite = useCallback(
    (reKey: string) => !!favorites[reKey],
    [favorites]
  );

  // Add/remove a favorite on the server and sync local state
  const toggleFavorite = useCallback(
    async (reKey: string, item?: FavoriteItem) => {
      try {
        if (favorites[reKey]) {
          // Remove on server, then drop from local map
          await removeFavorite(reKey);
          setFavorites((prev) => {
            const { [reKey]: _omit, ...rest } = prev;
            return rest;
          });
        } else {
          // Add on server, then merge into local map
          const created = await addFavorite(
            reKey,
            item?.address,
            item?.label
          );
          setFavorites((prev) => ({
            ...prev,
            [created.re_key]: {
              reKey: created.re_key,
              address: created.address ?? undefined,
              label: created.label ?? undefined,
            },
          }));
        }
      } catch (e) {
        console.error("Failed to toggle favorite", e);
      }
    },
    [favorites]
  );

  // Stable object reference for context consumers
  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, refresh }),
    [favorites, isFavorite, toggleFavorite, refresh]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

// Convenience hook for consumers; ensures usage inside provider
export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside FavoritesProvider");
  return ctx;
};
