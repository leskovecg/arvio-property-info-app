import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "300px",
  border: "2px solid red",
  backgroundColor: "#eee",
};

interface Address {
  id: number;
  full_address: string;
  gps?: {
    lat: number;
    lng: number;
  };
}

const StartScreen: React.FC = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const navigate = useNavigate();

  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY!;
  console.log("[ENV] REACT_APP_GOOGLE_MAPS_API_KEY =", GOOGLE_MAPS_API_KEY);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  console.log("[JS API] isLoaded =", isLoaded);

  const handleInputChange = async (value: string) => {
    console.log("[INPUT] User typed:", value);
    setQuery(value);
    if (value.length > 2) {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/search_address/${encodeURIComponent(value)}?web=true`
        );
        console.log("[SUGGESTIONS] Fetched from backend:", res.data);
        setSuggestions(res.data);
      } catch (error) {
        console.error("[ERROR] Napaka pri iskanju naslovov:", error);
      }
    } else {
      setSuggestions([]);
    }
  };

  // const handleSelect = async (address: Address) => {
  //   console.log("[SELECT] Chosen address:", address);
  //   setQuery(address.full_address);
  //   setSuggestions([]);

  //   try {
  //     console.log("[GEOCODING] Sending request to Google Maps API...");
  //     const res = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
  //       params: {
  //         address: address.full_address,
  //         key: GOOGLE_MAPS_API_KEY,
  //       },
  //     });

  //     console.log("[GEOCODING RESPONSE]:", res.data);

  //     const result = res.data.results[0];
  //     const location = result?.geometry?.location;

  //     if (location) {
  //       const gps = {
  //         lat: Number(location.lat),
  //         lng: Number(location.lng),
  //       };
  //       console.log("[GEOCODING] Parsed GPS:", gps);

  //       setSelectedAddress({
  //         ...address,
  //         gps,
  //       });
  //     } else {
  //       console.warn("[GEOCODING] No location found for:", address.full_address);
  //       setSelectedAddress({ ...address, gps: undefined });
  //     }
  //   } catch (err) {
  //     console.error("[GEOCODING ERROR] Napaka pri geokodiranju naslova:", err);
  //   }
  // };

  // const handleSelect = async (address: Address) => {
  //   console.log("[SELECT] Chosen address:", address);
  //   setQuery(address.full_address);
  //   setSuggestions([]);

  //   try {
  //     const res = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
  //       params: {
  //         address: address.full_address,
  //         key: GOOGLE_MAPS_API_KEY,
  //       },
  //     });

  //     console.log("[GEOCODING RESPONSE]:", res.data);

  //     console.log("[GEOCODING RAW RESPONSE]:", res.data); // <-- tukaj dodaj

  //     const result = res.data.results[0];
  //     const location = result?.geometry?.location;

  //     const updatedGps = location
  //       ? { lat: Number(location.lat), lng: Number(location.lng) }
  //       : undefined;

  //     if (!updatedGps) {
  //       console.warn("[GEOCODING] No location found for:", address.full_address);
  //     }

  //     // 📌 Shrani celoten address objekt z dopolnjenim GPS-em
  //     setSelectedAddress({
  //       ...address,
  //       gps: updatedGps,
  //     });

  //     console.log("[SELECT] Final selectedAddress =", {
  //       ...address,
  //       gps: updatedGps,
  //     });
  //   } catch (err) {
  //     console.error("[GEOCODING ERROR] Napaka pri geokodiranju naslova:", err);
  //     setSelectedAddress(address); // fallback brez gps
  //   }
  // };


  // const handleSelect = async (address: Address) => {
  //   console.log("[DEBUG] Seznam suggestions:", suggestions);

  //   console.log("[SELECT] Uporabnik je kliknil naslov:", address);
  //   setQuery(address.full_address);
  //   setSuggestions([]);

  //   try {
  //     const res = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
  //       params: {
  //         address: address.full_address,
  //         key: GOOGLE_MAPS_API_KEY,
  //       },
  //     });

  //     const results = res.data.results;
  //     if (!Array.isArray(results) || results.length === 0) {
  //       console.warn("[GEOCODING] Ni rezultatov.");
  //       setSelectedAddress(address);
  //       return;
  //     }

  //     const location = results[0]?.geometry?.location;
  //     if (!location) {
  //       console.warn("[GEOCODING] Ni lokacije.");
  //       setSelectedAddress(address);
  //       return;
  //     }

  //     const gps = {
  //       lat: Number(location.lat),
  //       lng: Number(location.lng),
  //     };

  //     // ✅ Shrani pravi ID iz kliknjenega suggestion + dopolni GPS
  //     setSelectedAddress({
  //       ...address,
  //       gps,
  //     });

  //     console.log("[SELECT] Final selectedAddress =", {
  //       ...address,
  //       gps,
  //     });
  //   } catch (err) {
  //     console.error("[GEOCODING ERROR]", err);
  //     setSelectedAddress(address); // fallback
  //   }
  // };

  const handleSelect = async (clicked: Address) => {
    console.log("[SELECT] User clicked:", clicked);
    setQuery(clicked.full_address);
    setSuggestions([]); // skrij predloge

    // najdi pravi objekt iz suggestions po ID (če ni referenca ohranjena)
    const selected = suggestions.find((s) => s.id === clicked.id) || clicked;

    try {
      const res = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
          address: selected.full_address,
          key: GOOGLE_MAPS_API_KEY,
        },
      });

      const result = res.data.results[0];
      const location = result?.geometry?.location;

      const gps = location
        ? { lat: Number(location.lat), lng: Number(location.lng) }
        : undefined;

      setSelectedAddress({
        ...selected,
        gps, // dodamo GPS
      });

      console.log("[SELECT] Final selectedAddress =", {
        ...selected,
        gps,
      });
    } catch (err) {
      console.error("[GEOCODING ERROR]", err);
      setSelectedAddress(selected); // brez GPS fallback
    }
  };


  const handleContinue = () => {
    console.log("[CONTINUE] Clicked. Address:", selectedAddress);
    console.log("[CHECK ID]", selectedAddress?.id);
    if (selectedAddress?.gps && selectedAddress.id) {
      navigate(`/units/${selectedAddress.id}`);
    } else {
      console.warn("[CONTINUE] Address ni ustrezen ali nima GPS..");
    }
  };

  const isValidGps =
    selectedAddress?.gps &&
    typeof selectedAddress.gps.lat === "number" &&
    typeof selectedAddress.gps.lng === "number";

  console.log("[STATE] selectedAddress:", selectedAddress);
  console.log("[STATE] selectedAddress.gps:", selectedAddress?.gps);
  console.log("[STATE] isValidGps:", isValidGps);

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
        <img
          src={`${process.env.PUBLIC_URL}/arvio-logo.png`}
          alt="Arvio"
          style={{ height: "50px" }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        {['Naslov', 'Pregled', 'Rezultati'].map((step, idx) => (
          <div key={idx} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              backgroundColor: idx === 0 ? '#f44336' : '#ccc',
              color: 'white',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              lineHeight: '30px',
              margin: '0 auto'
            }}>{idx + 1}</div>
            <div style={{ marginTop: '0.5rem' }}>{step}</div>
          </div>
        ))}
      </div>
      <h2>Vnesite naslov nepremičnine</h2>
      <p style={{ fontStyle: "italic", color: "#888" }}>
        Primer: Dunajska cesta 51, 1000 Ljubljana
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="Vnesi naslov..."
        style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
      />

      <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '4px', background: '#f9f9f9' }}>
        {suggestions.map((suggestion, index) => (
          <div key={index} onClick={() => handleSelect(suggestion)} style={{ padding: '10px', cursor: 'pointer' }}>
            {suggestion.full_address}
          </div>
        ))}
      </div>

      {isLoaded && isValidGps && (
        <div style={{ marginTop: "1rem" }}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={{
              lat: selectedAddress!.gps!.lat,
              lng: selectedAddress!.gps!.lng,
            }}
            zoom={16}
          >
            <Marker
              position={{
                lat: selectedAddress!.gps!.lat,
                lng: selectedAddress!.gps!.lng,
              }}
            />
          </GoogleMap>
        </div>
      )}

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
