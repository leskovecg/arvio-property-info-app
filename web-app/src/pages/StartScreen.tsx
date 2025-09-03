import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import Steps from "../components/Steps"; // [NEW] unified stepper used on all three screens

// --- Map container styling (purely UI) ---
const containerStyle = {
  width: "100%",
  height: "300px",
  border: "2px solid red",
  backgroundColor: "#eee",
};

// --- Shape of an address suggestion coming from the backend ---
interface Address {
  id: number;
  full_address: string;
  gps?: {
    lat: number;
    lng?: number;  // some APIs use "lng"
    lon?: number;  // some APIs use "lon" instead of "lng"
  };
}

// [NEW] Single source for backend URL (reads from CRA env, falls back to localhost).
// All HTTP requests in this file go to the Flask backend, not directly to Arvio.
// The backend then proxies/normalizes Arvio responses for the web app.
const API_BASE =
  (process.env.REACT_APP_BACKEND_URL || "http://localhost:5000") + "/api";

const StartScreen: React.FC = () => {
  // --- Local state for search box, suggestion list, and chosen address ---
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const navigate = useNavigate();

  // --- Google Maps JS API key pulled from env (CRA expects REACT_APP_* prefixes) ---
  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY!;
  console.log("[ENV] REACT_APP_GOOGLE_MAPS_API_KEY =", GOOGLE_MAPS_API_KEY);

  // --- Asynchronously loads Google Maps JS library once (shared id across screens) ---
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // --- Called on each keystroke; debouncing kept simple via length>2 guard ---
  // Makes a GET to our backend: /api/search_address/<query>?web=true
  // The backend hits Arvio's /address/search endpoint and returns normalized suggestions.
  const handleInputChange = async (value: string) => {
    setQuery(value);
    if (value.length > 2) {
      try {
        const res = await axios.get(
          `${API_BASE}/search_address/${encodeURIComponent(value)}?web=true` // [CHANGED] backend proxy call
        );
        setSuggestions(res.data); // expected to be an array of addresses with full_address + id (+optional gps)
      } catch (error) {
        console.error("[ERROR] Napaka pri iskanju naslovov:", error);
      }
    } else {
      // Clear suggestions when query is too short
      setSuggestions([]);
    }
  };

  // --- When user clicks a suggestion: fill the input, clear the list, try to geocode it ---
  // If Google Maps JS isn't loaded, we still keep the selected address to allow continue.
  const handleSelect = async (clicked: Address) => {
    setQuery(clicked.full_address);
    setSuggestions([]);

    // Keep consistent object (prefer the one we have in the list if present)
    const selected = suggestions.find((s) => s.id === clicked.id) || clicked;

    // If Google Maps isn't loaded yet, store selection and bail out (no geocode).
    if (!isLoaded || !(window as any).google) {
      console.warn("[GEOCODER] Google Maps JS še ni naložen");
      setSelectedAddress(selected);
      return;
    }

    // Use Google Geocoding to turn the address string into lat/lng
    // Region "SI" helps Maps bias results for Slovenia
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode(
      { address: selected.full_address, region: "SI" },
      (results: any, status: any) => {
        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          const gps = { lat: loc.lat(), lng: loc.lng() };
          setSelectedAddress({ ...selected, gps });
        } else {
          // If geocoding fails, we still keep the selected address (without GPS)
          console.warn("[GEOCODER] Geocoding ni vrnil lokacije:", status);
          setSelectedAddress(selected);
        }
      }
    );
  };

  // --- Continue button: navigates to Units screen (2nd step) with ?q=<full_address> ---
  // On the next screen, the backend will search this address again and list its units.
  const handleContinue = () => {
    if (selectedAddress?.full_address) {
      navigate(`/units?q=${encodeURIComponent(selectedAddress.full_address)}`);
    } else {
      console.warn("[CONTINUE] Address ni ustrezen ali nima GPS..");
    }
  };

  // --- Simple validation: consider coordinates valid if we have a number lat and (lng or lon) ---
  // Controls the "Continue" button and whether to show the map preview.
  const isValidGps =
    selectedAddress?.gps &&
    typeof selectedAddress.gps.lat === "number" &&
    (typeof selectedAddress.gps.lng === "number" ||
      typeof (selectedAddress.gps as any).lon === "number");

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto" }}>
      {/* Logo centered */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
        <img
          src={`${process.env.PUBLIC_URL}/arvio-logo.png`}
          alt="Arvio"
          style={{ height: "50px" }}
        />
      </div>

      {/* [NEW] Unified stepper so all screens align the same (active step = 0) */}
      <Steps active={0} />

      {/* Title + example hint */}
      <h2>Vnesite naslov nepremičnine</h2>
      <p style={{ fontStyle: "italic", color: "#888" }}>
        Primer: Dunajska cesta 51, 1000 Ljubljana
      </p>

      {/* Address input (triggers backend search onChange) */}
      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="Vnesi naslov..."
        style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
      />

      {/* Suggestions dropdown/list (clicking one runs handleSelect) */}
      <div
        style={{
          maxHeight: "200px",
          overflowY: "auto",
          borderRadius: "4px",
          background: "#f9f9f9",
        }}
      >
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            onClick={() => handleSelect(suggestion)}
            style={{ padding: "10px", cursor: "pointer" }}
          >
            {suggestion.full_address}
          </div>
        ))}
      </div>

      {/* Map preview (only when Google Maps is loaded and we have valid GPS) */}
      {isLoaded && isValidGps && (
        <div style={{ marginTop: "1rem" }}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={{
              // prefer lng, else use lon (some APIs return "lon")
              lat: selectedAddress!.gps!.lat,
              lng: selectedAddress!.gps!.lng ?? (selectedAddress!.gps as any).lon!,
            }}
            zoom={16} // street-level zoom
          >
            <Marker
              position={{
                lat: selectedAddress!.gps!.lat,
                lng: selectedAddress!.gps!.lng ?? (selectedAddress!.gps as any).lon!,
              }}
            />
          </GoogleMap>
        </div>
      )}

      {/* Primary action: continue to Units screen (disabled until we have valid GPS) */}
      <button
        disabled={!isValidGps}
        onClick={handleContinue}
        style={{
          marginTop: "1rem",
          width: "100%",
          padding: "0.75rem",
          backgroundColor: "#f65e5a",
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontSize: "1rem",
        }}
      >
        Nadaljuj
      </button>
    </div>
  );
};

export default StartScreen;
