// src/pages/DetailsScreen.tsx
// This is step 3/3 (Details). It fetches full details for a selected RE unit (by :reKey),
// renders a Street View preview (if available), shows value/area/price-per-m2,
// allows sharing and opening the location in Google Maps, and supports favorites (♥).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useJsApiLoader } from "@react-google-maps/api";
import { useFavorites } from "../components/FavoritesContext";
import Steps from "../components/Steps";

// ------- types -------
// Payload shapes as returned (or normalized) by the backend.
// Kept minimal for rendering; we tolerate missing fields and use fallbacks.
interface GPS { lat?: number; lng?: number; lon?: number; }
interface UnitCore {
  story_no?: number;
  unit_type?: string;
  net_unit_size?: number;
  last_updated?: string;
  value?: number;
  gurs_value_2025?: number;
  address?: { full_address?: string };
  gps?: GPS;
}
interface UnitApi {
  re_key: string;
  address?: string;
  size?: number;
  value_m2?: number;
  re_type?: string;
  gps?: GPS;
  unit?: UnitCore;
  building?: { gps?: GPS };
  gurs_value_2025?: number;
  [k: string]: any;
}

// ------- consts -------
// All HTTP requests go to our Flask backend (proxy to Arvio). We read base URL from CRA env
//     and fall back to localhost to keep local development simple.
const API_BASE =
  (process.env.REACT_APP_BACKEND_URL || "http://localhost:5000") + "/api";

// Card-like container style reused across small info blocks (purely presentational)
const shellCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

// Round icon button used on top of Street View (heart/share)
const iconBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.9)",
  border: "none",
  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  pointerEvents: "auto", // allow clicks even if parent overlay uses pointer-events:none
};

// ------- helpers -------
// Small utilities to format/normalize numbers and pick GPS from alternative fields.
const asNum = (v: any) => (typeof v === "string" ? Number(v) : v);

// Format currency-like values with Slovenian locale; fallback text when value is missing
const money = (v?: number) =>
  typeof v === "number"
    ? v.toLocaleString("sl-SI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "ni podatka";

// Format areas in m² with one decimal; fallback dash when missing
const area = (v?: number) =>
  typeof v === "number" ? `${Number(v.toFixed(1))} m²` : "– m²";

// Given a unit payload, try to find a {lat,lng} pair from several possible locations (gps/unit/building).
function pickGps(u?: UnitApi): { lat: number; lng: number } | null {
  if (!u) return null;
  const from = (g?: GPS) => {
    const lat = asNum(g?.lat);
    const lng = asNum((g as any)?.lng ?? (g as any)?.lon);
    return typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)
      ? { lat, lng }
      : null;
  };
  return from(u.gps) || from(u.unit?.gps) || from(u.building?.gps) || null;
}

// ------- Imperative Street View -------
// A tiny component that imperatively mounts Google Street View into a div.
//     It shows a fallback overlay when Street View imagery is not available at the position.
const StreetViewPane: React.FC<{
  ready: boolean;                                   // Google Maps JS loaded?
  position: { lat: number; lng: number } | null;   // target pano position
  height?: number;                                  // container height
}> = ({ ready, position, height = 250 }) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!ready || !position || !divRef.current || !(window as any).google) return;
    try {
      const pano = new (window as any).google.maps.StreetViewPanorama(divRef.current, {
        position,
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        visible: true,
        fullscreenControl: false,
        motionTracking: false,
        addressControl: false,
        linksControl: true,
        panControl: false,
        enableCloseButton: false,
      });
      setOk(true);
      return () => { try { pano.setVisible(false); } catch {} };
    } catch { setOk(false); }
  }, [ready, position]);

  return (
    <div style={{ width: "100%", height, background: "#eee", position: "relative" }}>
      <div ref={divRef} style={{ width: "100%", height: "100%" }} />
      {!ok && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#666",
            fontSize: 14,
          }}
        >
          Street View ni na voljo.
        </div>
      )}
    </div>
  );
};

// ------- component -------
// EN: Fetches a single unit by :reKey, shows details + Street View preview,
//     allows toggling favorites and sharing/opening in Google Maps.
const DetailsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { reKey } = useParams(); // route param: /details/:reKey

  const [unit, setUnit] = useState<UnitApi | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Favorites integration (persists via Flask/SQLite)
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = !!(reKey && isFavorite(reKey));

  // Load Google Maps JS once. Use same loader id across app to avoid duplicates.
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY ?? "",
  });

  // Fetch unit details from backend once reKey is known.
  useEffect(() => {
    const load = async () => {
      if (!reKey) return;
      setError(null);
      try {
        const url = `${API_BASE}/unit_details/${encodeURIComponent(reKey)}`; // backend proxy
        const res = await axios.get(url);
        setUnit(res.data);
      } catch (e: any) {
        setError(
          axios.isAxiosError(e) && e.response?.data
            ? typeof e.response.data === "string"
              ? e.response.data
              : JSON.stringify(e.response.data)
            : e?.message || "Napaka pri nalaganju podrobnosti."
        );
      }
    };
    load();
  }, [reKey]);

  // Compute pano position from available gps fields (or null if missing)
  const panoPos = useMemo(() => pickGps(unit || undefined), [unit]);

  // Normalize values for display (use whichever source has data, in order of preference).
  const sizeNum =
    (typeof unit?.size === "number" ? unit?.size : undefined) ??
    (typeof unit?.unit?.net_unit_size === "number" ? unit?.unit?.net_unit_size : undefined);

  const totalValue =
    (unit?.unit?.value as number | undefined) ??
    (unit?.unit?.gurs_value_2025 as number | undefined) ??
    (unit?.gurs_value_2025 as number | undefined);

  const totalValueFmt = money(totalValue);

  const perM2 =
    (typeof unit?.value_m2 === "number" ? unit?.value_m2 : undefined) ??
    (typeof totalValue === "number" && typeof sizeNum === "number" && sizeNum > 0
      ? totalValue / sizeNum
      : undefined);

  const perM2Fmt = money(perM2);
  const sizeFmt = area(sizeNum);

  // Human-friendly label and address
  const label = unit?.unit?.unit_type || unit?.re_type || "Enota";
  const addressText = unit?.address || unit?.unit?.address?.full_address || "Neznan naslov";
  const aptNo = unit?.re_key?.split("-")?.[2]; // 3rd part of RE key sometimes denotes apt no.

  // Share the address via Web Share API (if available), else copy to clipboard.
  const doShare = async () => {
    const text = `Poglej nepremičnino: ${addressText}`;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "Nepremičnina", text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert("Povezava kopirana v odložišče.");
    }
  };

  // Open Maps at the computed pano position in a new tab
  const openInMaps = () => panoPos && window.open(`https://maps.google.com/?q=${panoPos.lat},${panoPos.lng}`, "_blank");

  return (
    <div style={{ padding: "1.25rem", maxWidth: 820, margin: "0 auto" }}>
      {/* Logo */}
      <img
        src={`${process.env.PUBLIC_URL}/arvio-logo.png`}
        alt="Arvio"
        style={{ height: 42, display: "block", margin: "0 auto 0.5rem auto" }}
      />

      {/* Unified stepper for consistent top layout across screens (active step = 2) */}
      <Steps active={2} />

      {/* Error/busy states */}
      {error && <p style={{ color: "crimson" }}>⚠️ {typeof error === "string" ? error : JSON.stringify(error)}</p>}
      {!unit && !error && <p>🔄 Nalagam podrobnosti ...</p>}

      {unit && (
        <>
          {/* Street View hero pane with overlay actions (♥ and Share) */}
          <div
            style={{
              ...shellCard,
              border: "none",
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <StreetViewPane ready={isLoaded} position={panoPos} height={250} />

            {/* Overlay column with heart/share; parent uses pointer-events:none so
                Street View remains draggable; individual buttons re-enable pointer-events. */}
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                zIndex: 999,
                pointerEvents: "none",
              }}
            >
              <button
                title={isFav ? "Odstrani iz priljubljenih" : "Dodaj med priljubljene"}
                style={iconBtn}
                onClick={() =>
                  reKey &&
                  toggleFavorite(reKey, {
                    reKey,
                    label,
                    address: addressText,
                  })
                }
                aria-pressed={isFav}
              >
                <span style={{ color: isFav ? "crimson" : "#d33", fontSize: 18 }}>❤</span>
              </button>

              <button title="Deli" style={iconBtn} onClick={doShare}>
                <span style={{ color: "#555", fontSize: 18 }}>⤴</span>
              </button>
            </div>
          </div>

          {/* Summary row centered under the hero: total value • area • price per m² */}
          <div style={{ textAlign: "center", marginTop: 12, fontWeight: 700 }}>
            {totalValueFmt} EUR&nbsp; • &nbsp;{sizeFmt}&nbsp; • &nbsp;{perM2Fmt} EUR/m²
          </div>

          {/* Display the full address with a small location icon and a country line */}
          <div style={{ display: "flex", alignItems: "start", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 18, lineHeight: "20px" }}>📍</span>
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{addressText}</div>
              <div style={{ fontSize: 13, color: "#666" }}>Slovenija</div>
            </div>
          </div>

          {/* Two quick actions: share the address or open in Google Maps */}
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button
              onClick={doShare}
              style={{ ...shellCard, flex: 1, height: 44, border: "none", cursor: "pointer", background: "#eee" }}
            >
              Deli
            </button>
            <button
              onClick={openInMaps}
              disabled={!panoPos}
              style={{
                ...shellCard,
                flex: 1,
                height: 44,
                border: "none",
                cursor: panoPos ? "pointer" : "not-allowed",
                background: "#90CAF9",
                color: "white",
                fontWeight: 600,
              }}
            >
              Poglej na mapi
            </button>
          </div>

          {/* Price breakdown box */}
          <div style={{ ...shellCard, marginTop: 16 }}>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Cenovni podatki</div>
              <div>Cena: {totalValueFmt} €</div>
              <div>Cena/m²: {perM2Fmt} €</div>
            </div>
          </div>

          {/* Additional attributes such as floor, unit type, area, apt number, timestamps */}
          <div style={{ ...shellCard, marginTop: 12 }}>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Dodatni podatki</div>
              <div>Nadstropje: {unit?.unit?.story_no ?? "–"}</div>
              <div>Tip enote: {label}</div>
              <div>Velikost: {area(sizeNum)}</div>
              {aptNo && <div>Stanovanje št.: {aptNo}</div>}
              <div>Zadnja posodobitev: {unit?.unit?.last_updated ?? "–"}</div>
            </div>
          </div>

          {/* Only a single centered "Back" button (the "Statistics" CTA was removed) */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",   // center
              marginTop: 16,
            }}
          >
            <button
              onClick={() => navigate(-1)}
              style={{
                minWidth: 220,             // a bit longer for better ergonomics
                padding: "1rem 2.25rem",   // taller and wider
                borderRadius: 12,
                border: "none",
                background: "#ddd",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Nazaj
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DetailsScreen;

