// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import axios from "axios";
// import {
//   GoogleMap,
//   Marker,
//   useJsApiLoader,
// } from "@react-google-maps/api";

// interface Property {
//   re_key: string;
//   re_type: string;
//   size?: number;
//   unit?: {
//     story_no?: string;
//     net_unit_size?: number;
//     unit_type?: string;
//   };
// }

// interface Address {
//   id: number;
//   full_address?: string;
//   gps?: {
//     lat: number;
//     lng: number;
//   };
// }

// const UnitsScreen: React.FC = () => {
//   const { addressId } = useParams();
//   const navigate = useNavigate();
//   const [address, setAddress] = useState<Address | null>(null);
//   const [units, setUnits] = useState<Property[]>([]);
//   const [selectedUnit, setSelectedUnit] = useState<Property | null>(null);

//   const { isLoaded } = useJsApiLoader({
//     googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY!,
//   });

//   const containerStyle = {
//     width: "100%",
//     height: "200px",
//     borderRadius: "12px",
//     border: "2px solid #ccc",
//     marginBottom: "1rem",
//   };

//   useEffect(() => {
//     console.log("📦 addressId from URL:", addressId);
//     console.log("💡 Prejemam addressId =", addressId);
    

//     if (!addressId) {
//       console.warn("⚠️ addressId je undefined!");
//       return;
//     }

//     console.log(`🌍 Pošiljam zahtevek na backend: /api/address_details/${addressId}`);

//     const fetchUnits = async () => {
//       try {
//         const url = `http://localhost:5000/api/address_units/${addressId}`;
//         console.log(`🌍 Pošiljam zahtevek na: ${url}`);
//         const res = await axios.get(url);

//         console.log("✅ Backend response:", res.data);

//         setAddress(res.data.address);
//         setUnits(res.data.units);

//         console.log("🏠 Nastavljen naslov:", res.data.address);
//         console.log("📋 Enote:", res.data.units);
//       } catch (err) {
//         console.error("❌ Napaka pri pridobivanju podrobnosti naslova:", err);

//         // 🔍 Dodajamo dodatni izpis napake iz backenda:
//         if (axios.isAxiosError(err) && err.response) {
//           console.error("📄 Backend napaka:", err.response.data);
//         }
//       }
//     };

//     fetchUnits();
//   }, [addressId]);

//   return (
//     <div style={{ padding: "2rem", maxWidth: "800px", margin: "auto" }}>
//       <img
//         src={`${process.env.PUBLIC_URL}/arvio-logo.png`}
//         alt="Arvio"
//         style={{ height: 40, display: "block", margin: "0 auto 1rem auto" }}
//       />

//       <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
//         {["Začetek", "Naslov", "Podrobnosti"].map((step, index) => (
//           <div key={index} style={{ textAlign: "center", margin: "0 1rem" }}>
//             <div
//               style={{
//                 width: 28,
//                 height: 28,
//                 borderRadius: "50%",
//                 backgroundColor: index === 1 ? "#f65e5a" : "#ccc",
//                 color: "white",
//                 lineHeight: "28px",
//                 margin: "0 auto",
//               }}
//             >
//               {index + 1}
//             </div>
//             <div style={{ marginTop: 6, color: index === 1 ? "#f65e5a" : "#888" }}>{step}</div>
//           </div>
//         ))}
//       </div>

//       {address && (
//         <>
//           <h3 style={{ marginBottom: "1rem" }}>
//             {address.full_address || `Naslov ID: ${address.id}`}
//           </h3>

//           {units.map((unit) => {
//             const label = unit.unit?.unit_type || unit.re_type;
//             const floor = unit.unit?.story_no || "-";
//             const size = unit.unit?.net_unit_size || unit.size || "-";
//             const reKeyParts = unit.re_key.split("-");

//             return (
//               <div
//                 key={unit.re_key}
//                 onClick={() => {
//                   setSelectedUnit(unit);
//                   console.log("🟠 Izbrana enota:", unit);
//                 }}
//                 style={{
//                   padding: "0.75rem",
//                   borderRadius: "8px",
//                   border: selectedUnit?.re_key === unit.re_key ? "2px solid #f65e5a" : "1px solid #ccc",
//                   marginBottom: "0.5rem",
//                   cursor: "pointer",
//                   backgroundColor: selectedUnit?.re_key === unit.re_key ? "#fbe9e7" : "white",
//                 }}
//               >
//                 <strong>{label}</strong>
//                 <div>Etaza: {floor} &nbsp; | &nbsp; Velikost: {size} m²</div>
//                 <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
//                   {reKeyParts.map((part, idx) => (
//                     <span
//                       key={idx}
//                       style={{
//                         backgroundColor: "#ffcdd2",
//                         borderRadius: 6,
//                         padding: "2px 8px",
//                         fontSize: 12,
//                       }}
//                     >
//                       {part}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             );
//           })}

//           {isLoaded && address.gps && (
//             <div style={{ marginTop: "1.5rem" }}>
//               <GoogleMap
//                 mapContainerStyle={containerStyle}
//                 center={{ lat: address.gps.lat, lng: address.gps.lng }}
//                 zoom={16}
//               >
//                 <Marker position={{ lat: address.gps.lat, lng: address.gps.lng }} />
//               </GoogleMap>
//             </div>
//           )}
//         </>
//       )}

//       <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
//         <button
//           onClick={() => navigate(-1)}
//           style={{
//             padding: "0.75rem 2rem",
//             borderRadius: 8,
//             border: "none",
//             backgroundColor: "#ddd",
//           }}
//         >
//           Nazaj
//         </button>
//         <button
//           onClick={() => {
//             console.log("➡️ Grem na propertyDetails za:", selectedUnit?.re_key);
//             selectedUnit && navigate(`/unit/${selectedUnit.re_key}`);
//           }}
//           disabled={!selectedUnit}
//           style={{
//             padding: "0.75rem 2rem",
//             borderRadius: 8,
//             border: "none",
//             backgroundColor: selectedUnit ? "#f65e5a" : "#aaa",
//             color: "white",
//           }}
//         >
//           Nadaljuj
//         </button>
//       </div>
//     </div>
//   );
// };

// export default UnitsScreen;


import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface Unit {
  re_key: string;
  type: string;
  size: number;
  price: number;
  [key: string]: any;
}

interface Address {
  id: number;
  full_address: string;
  gps?: {
    lat: number;
    lon: number;
  };
}

const UnitsScreen = () => {
  const [searchParams] = useSearchParams();
  const [units, setUnits] = useState<Unit[]>([]);
  const [address, setAddress] = useState<Address | null>(null);

  const query = searchParams.get("q");

  useEffect(() => {
    if (!query) {
      console.warn("⚠️ Parameter 'q' (naslov) manjka v URL-ju");
      return;
    }

    const fetchUnits = async () => {
      try {
        const url = `http://localhost:5000/api/address_units?query=${encodeURIComponent(query)}`;
        console.log("🌍 Pošiljam zahtevek na:", url);
        const res = await axios.get(url);

        console.log("✅ Backend response:", res.data);

        const addressResp = res.data.address || null;
        const unitsResp = Array.isArray(res.data.units) ? res.data.units : [];

        console.log("🏠 Naslov:", addressResp);
        console.log("📋 Enote:", unitsResp);

        setAddress(addressResp);
        setUnits(unitsResp);
      } catch (err) {
        console.error("❌ Napaka pri pridobivanju podrobnosti naslova:", err);
        if (axios.isAxiosError(err) && err.response) {
          console.error("📄 Backend napaka:", err.response.data);
        }
      }
    };

    fetchUnits();
  }, [query]);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🗺️ Enote na naslovu</h2>
      {address ? (
        <div style={{ marginBottom: '1rem' }}>
          <strong>Naslov:</strong> {address.full_address}
        </div>
      ) : (
        <p>🔄 Nalagam naslov...</p>
      )}

      {units.length === 0 ? (
        <p>ℹ️ Ni enot za prikaz. Poskusi drug naslov.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {units.map((unit, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '1rem',
                width: '250px',
                backgroundColor: '#f9f9f9'
              }}
            >
              <p><strong>RE Key:</strong> {unit.re_key}</p>
              <p><strong>Vrsta:</strong> {unit.type || 'ni podatka'}</p>
              <p><strong>Velikost:</strong> {unit.size || '–'} m²</p>
              <p><strong>Cena:</strong> {unit.price || '–'} €</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnitsScreen;
