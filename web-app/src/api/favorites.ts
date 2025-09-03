// web-app/src/api/favorites.ts
// Tiny API client for favorites.
// - Uses a configurable backend base URL (from env) with a localhost fallback.
// - Exposes CRUD-style helpers the UI can call.

const API_BASE =
  (process.env.REACT_APP_BACKEND_URL || "http://localhost:5000") + "/api";

// Shape returned by the backend for a single favorite row
export type Favorite = {
  id: number;
  re_key: string;
  address?: string;
  label?: string;
  created_at: string; // ISO timestamp from server
};

/**
 * GET /api/favorites
 * Fetch all favorites from the backend (most-recent first).
 */
export async function fetchFavorites(): Promise<Favorite[]> {
  const res = await fetch(`${API_BASE}/favorites`);
  if (!res.ok) throw new Error(`Failed to fetch favorites (${res.status})`);
  return res.json();
}

/**
 * POST /api/favorites
 * Add a new favorite. Backend de-duplicates by re_key and may return 200 if it already exists.
 * Returns the created/existing favorite.
 */
export async function addFavorite(
  re_key: string,
  address?: string,
  label?: string
): Promise<Favorite> {
  const res = await fetch(`${API_BASE}/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ re_key, address, label }),
  });
  // Accept both 201 (created) and 200 (already existed, echoed back)
  if (!res.ok && res.status !== 200) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to add favorite (${res.status}) ${txt}`);
  }
  return res.json();
}

/**
 * DELETE /api/favorites/:re_key
 * Remove a single favorite identified by its re_key.
 */
export async function removeFavorite(re_key: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/favorites/${encodeURIComponent(re_key)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to remove favorite (${res.status}) ${txt}`);
  }
}

/**
 * DELETE /api/favorites
 * Remove all favorites (used by the optional "clear on session start" behavior).
 */
export async function clearFavorites(): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites`, { method: "DELETE" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to clear favorites (${res.status}) ${txt}`);
  }
}
