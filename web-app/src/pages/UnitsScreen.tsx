// src/pages/UnitsScreen.tsx
// This screen is step 2/3. It takes a selected address (via ?q=... or :addressId),
// shows all real-estate units for that address, lets the user preview basic info,
// toggle favorites (♥), see a map, and continue to Details.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

// Favorites + unified stepper (shared across screens)
import { useFavorites } from "../components/FavoritesContext";
import Steps from "../components/Steps";

// ---------------------- Types ----------------------
// Lightweight shapes used only by the UI; backend normalizes Arvio responses into these.

type Num = number | undefined;

interface UnitSummary {
  // Minimal unit representation coming from /api/address_units (list view)
  re_key: string; // Arvio's unique real-estate key (e.g. "2636-2697-37")
}

interface Address {
  // Address payload returned by backend (from /api/address_units* endpoints)
  id?: number;
  full_address?: string;
  gps?: { lat?: number; lng?: number; lon?: number }; // note: some APIs return "lon" instead of "lng"
}

interface UnitDetails {
  // Enriched unit details (from /api/unit_details/<re_key>) used to render the card
  re_key: string;
  address?: string;
  size?: number; // normalized: net_unit_size / revised_size
  re_type?: string; // or unit_type
  unit_type?: string;
  story_no?: number;
  gps?: { lat?: number; lng?: number; lon?: number };
  unit?: any;     // original nested object (kept for fallback lookups)
  [k: string]: any;
}

// ---------------------- UI consts ----------------------
// Use .env (CRA) or fall back to localhost. All requests go to our Flask backend,
// which proxies to Arvio and unifies structure for the frontend.
const API_BASE =
  (process.env.REACT_APP_BACKEND_URL || "http://localhost:5000") + "/api";

const mapContainerStyle = {
  width: "100%",
  height: "220px",
  borderRadius: 12,
  border: "2px solid #ccc",
} as const;

const cardStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "white",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  cursor: "pointer",
};

const tagStyle: React.CSSProperties = {
  // Visual chips for RE-key parts (purely presentational)
  backgroundColor: "#ffcdd2",
  borderRadius: 8,
  padding: "2px 8px",
  fontSize: 12,
};

// ---------------------- Helpers ----------------------
// Split "2636-2697-37" -> ["2636","2697","37"]
function splitReKey(reKey: string): string[] {
  return reKey?.split("-") ?? [];
}

// Prefer a human label if available; fallback is a generic one
function labelFromDetails(d?: UnitDetails): string {
  return d?.unit_type || d?.re_type || "Poslovni del stavbe";
}

// Normalize where size might be stored across different payloads
function sizeFromDetails(d?: UnitDetails): number | undefined {
  return d?.size ?? d?.unit?.net_unit_size ?? d?.revised_size ?? d?.net_unit_size;
}

// Same for floor/story number
function floorFromDetails(d?: UnitDetails): number | string | undefined {
  return d?.story_no ?? d?.unit?.story_no;
}

// Simple concurrency limiter to fetch many /unit_details calls without spamming the API.
// Runs up to `limit` parallel tasks over `items`, preserving result order.
async function concurrentMap<T, R>(
  items: T[],
  limit: number,
  mapper: (x: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await mapper(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------- Component ----------------------
const UnitsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { addressId } = useParams();              // optional route param: /units/:addressId
  const [searchParams] = useSearchParams();       // used when coming from StartScreen: /units?q=<full address>
  const q = searchParams.get("q") || "";

  // Favorites context provides helpers to check/toggle ♥ persisted in the Flask DB
  const { isFavorite, toggleFavorite } = useFavorites();

  // Basic UX flags
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data for the page
  const [address, setAddress] = useState<Address | null>(null);
  const [units, setUnits] = useState<UnitSummary[]>([]);

  // Enriched unit details keyed by re_key
  const [detailsMap, setDetailsMap] = useState<Record<string, UnitDetails>>({});
  const [selectedReKey, setSelectedReKey] = useState<string | null>(null);

  // Load Google Maps once (for the map preview below the list)
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY ?? "",
  });

  // Utility to coerce "42" -> 42 (keeps numbers as-is)
  const asNum = (v: any) => (typeof v === "string" ? Number(v) : v);

  // Compute map center:
  // 1) Prefer GPS from the selected address (if present)
  // 2) Otherwise, first available GPS from any unit details
  // Handles both `lng` and legacy `lon`.
  const center = useMemo(() => {
    const latA = asNum(address?.gps?.lat);
    const lngA = asNum(address?.gps?.lng ?? address?.gps?.lon);
    if (
      typeof latA === "number" &&
      !Number.isNaN(latA) &&
      typeof lngA === "number" &&
      !Number.isNaN(lngA)
    ) {
      return { lat: latA, lng: lngA };
    }
    for (const d of Object.values(detailsMap)) {
      const latD = asNum(d?.gps?.lat);
      const lngD = asNum((d as any)?.gps?.lng ?? (d as any)?.gps?.lon);
      if (
        typeof latD === "number" &&
        !Number.isNaN(latD) &&
        typeof lngD === "number" &&
        !Number.isNaN(lngD)
      ) {
        return { lat: latD, lng: lngD };
      }
    }
    return null;
  }, [address, detailsMap]);

  const canShowMap = isLoaded && !!center;

  // ------- 1) Fetch address + units whenever :addressId or ?q changes -------
  useEffect(() => {
    // Load by numeric address ID (direct route)
    const fetchByAddressId = async (id: number | string) => {
      const url = `${API_BASE}/address_units/${id}`;
      const res = await axios.get(url); // backend: GET /api/address_units/<id>
      const addr: Address =
        res.data?.address ?? res.data?.data?.address ?? res.data?.address_details ?? {};
      const list: UnitSummary[] = Array.isArray(res.data?.units)
        ? res.data.units
        : Array.isArray(res.data?.data?.units)
        ? res.data.data.units
        : [];
      setAddress(addr);
      setUnits(list);
      if (list.length > 0) setSelectedReKey(list[0].re_key); // preselect first card
    };

    // Load by full address string (coming from StartScreen)
    const fetchByQuery = async (query: string) => {
      const url = `${API_BASE}/address_units?query=${encodeURIComponent(query)}`;
      const res = await axios.get(url); // backend: GET /api/address_units?query=...
      const addr: Address =
        res.data?.address ?? res.data?.data?.address ?? res.data?.address_details ?? {};
      const list: UnitSummary[] = Array.isArray(res.data?.units)
        ? res.data.units
        : Array.isArray(res.data?.data?.units)
        ? res.data.data.units
        : [];
      setAddress(addr);
      setUnits(list);
      if (list.length > 0) setSelectedReKey(list[0].re_key);
    };

    // Reset state and fetch
    const load = async () => {
      setLoading(true);
      setError(null);
      setAddress(null);
      setUnits([]);
      setDetailsMap({});
      setSelectedReKey(null);
      try {
        if (addressId) await fetchByAddressId(addressId);
        else if (q) await fetchByQuery(q);
        else setError("Manjka 'q' ali ':addressId'."); // guard if neither is provided
      } catch (e: any) {
        // Show backend-provided error body (if available), else generic message
        setError(
          axios.isAxiosError(e) && e.response?.data
            ? typeof e.response.data === "string"
              ? e.response.data
              : JSON.stringify(e.response.data)
            : e?.message || "Napaka pri pridobivanju enot."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [q, addressId]);

  // ------- 2) Fetch details for each unit (to enrich cards: size/floor/type/GPS) -------
  useEffect(() => {
    const loadDetails = async () => {
      if (!units || units.length === 0) return;
      const toFetch = units.map((u) => u.re_key);

      try {
        // Limit concurrency to be nice to the backend/API (8 at a time).
        const results = await concurrentMap(toFetch, 8, async (rk) => {
          try {
            const url = `${API_BASE}/unit_details/${encodeURIComponent(rk)}`;
            const res = await axios.get(url); // backend: GET /api/unit_details/<re_key>
            const raw = res.data || {};
            // Normalize fields so the UI can render regardless of payload variant
            const details: UnitDetails = {
              re_key: raw.re_key || rk,
              address: raw.address || raw?.unit?.address?.full_address,
              size:
                raw.net_unit_size ??
                raw.revised_size ??
                raw.size ??
                raw.unit?.net_unit_size,
              re_type: raw.re_type || raw.unit_type || raw.unit?.unit_type,
              unit_type: raw.unit_type,
              story_no: raw.story_no ?? raw.unit?.story_no,
              gps: raw.gps || raw.unit?.gps || raw.building?.gps,
              unit: raw.unit,
            };
            return details;
          } catch {
            // If one detail call fails, keep the rest; render with minimal info
            return { re_key: rk } as UnitDetails;
          }
        });

        // Build a map for easy lookup when rendering each card
        const map: Record<string, UnitDetails> = {};
        results.forEach((d) => (map[d.re_key] = d));
        setDetailsMap(map);
      } catch (e) {
        console.warn("[Units] loadDetails failed:", e);
      }
    };

    loadDetails();
  }, [units]);

  // Prefer resolved full address (from backend) else the raw query else "ID: <addressId>"
  const fullAddress = address?.full_address || q || (addressId ? `ID: ${addressId}` : "");

  // ---------------------- Render ----------------------
  return (
    <div style={{ padding: "2rem", maxWidth: 950, margin: "0 auto" }}>
      {/* Logo */}
      <img
        src={`${process.env.PUBLIC_URL}/arvio-logo.png`}
        alt="Arvio"
        style={{ height: 42, display: "block", margin: "0 auto 1rem auto" }}
      />

      {/* Unified steps (active=1) to keep consistent spacing/layout across screens */}
      <Steps active={1} />

      {/* Address header */}
      <h3 style={{ margin: 0 }}>{fullAddress || "Naslov"}</h3>

      {/* Busy / error states */}
      {loading && <p>🔄 Nalagam ...</p>}
      {error && (
        <p style={{ color: "crimson" }}>
          ⚠️ {typeof error === "string" ? error : JSON.stringify(error)}
        </p>
      )}

      {/* Unit list (scrollable when many) */}
      {!loading && !error && units.length > 0 && (
        <div
          style={{
            marginTop: 14,
            marginBottom: 18,
            maxHeight: 5 * 102, // approx height for 5 cards
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {units.map((u) => {
            const d = detailsMap[u.re_key];
            const label = labelFromDetails(d);
            const size = sizeFromDetails(d);
            const floor = floorFromDetails(d);
            const parts = splitReKey(u.re_key);
            const selected = selectedReKey === u.re_key;

            // Check if this unit is in Favorites
            const fav = isFavorite(u.re_key);

            return (
              <div
                key={u.re_key}
                style={{
                  ...cardStyle,
                  border: selected ? "2px solid #f65e5a" : "1px solid #ddd",
                  background: selected ? "#fbe9e7" : "white",
                  marginBottom: 10,
                }}
                onClick={() => setSelectedReKey(u.re_key)}
                role="button"
                aria-label={`Izberi enoto ${u.re_key}`}
              >
                {/* Header row: human label + heart action (doesn't steal card click) */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{label}</div>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation(); // prevent selecting the card when toggling ♥
                      await toggleFavorite(u.re_key, {
                        reKey: u.re_key,
                        label,
                        address: fullAddress,
                      });
                    }}
                    aria-label={fav ? "Odstrani iz priljubljenih" : "Dodaj med priljubljene"}
                    title={fav ? "Odstrani iz priljubljenih" : "Dodaj med priljubljene"}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "1px solid #ddd",
                      background: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      cursor: "pointer",
                    }}
                  >
                    {fav ? "♥" : "♡"}
                  </button>
                </div>

                {/* RE-key parts as small chips (purely display) */}
                {parts.length === 3 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 8,
                      justifyContent: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    {parts.map((p, i) => (
                      <span key={`${u.re_key}-${i}`} style={tagStyle}>
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Meta row: floor and area (if available) */}
                <div style={{ marginTop: 10, color: "#444", fontSize: 14 }}>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span>Etaža: {typeof floor !== "undefined" ? floor : "–"}</span>
                    <span>Velikost: {typeof size === "number" ? `${size} m²` : "– m²"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Map preview below the list (only if Maps is loaded and we resolved a center) */}
      {canShowMap && center && (
        <div style={{ marginBottom: 18 }}>
          <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={16}>
            <Marker position={center} />
          </GoogleMap>
        </div>
      )}

      {/* Footer actions: centered and slightly longer buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",   // centered actions for cleaner look
          marginTop: 16,
          gap: 16,                    // spacing between actions
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            minWidth: 200,            // larger touch target
            padding: "1rem 2.25rem",
            borderRadius: 12,
            border: "none",
            background: "#ddd",
            fontWeight: 600,
          }}
        >
          Nazaj
        </button>

        <button
          onClick={() =>
            selectedReKey &&
            navigate(
              `/details/${encodeURIComponent(selectedReKey)}?addr=${encodeURIComponent(fullAddress)}`
            )
          }
          disabled={!selectedReKey}   // disabled until a unit is selected
          style={{
            minWidth: 220,
            padding: "1rem 2.25rem",
            borderRadius: 12,
            border: "none",
            background: selectedReKey ? "#f65e5a" : "#aaa",
            color: "white",
            fontWeight: 700,
            cursor: selectedReKey ? "pointer" : "not-allowed",
          }}
        >
          Nadaljuj
        </button>
      </div>
    </div>
  );
};

export default UnitsScreen;




