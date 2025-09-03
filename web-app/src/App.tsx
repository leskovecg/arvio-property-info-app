// App.tsx
// Top-level router for the web app.
// - Maps URL paths to screens/components using React Router.
// - Two routes target UnitsScreen:
//    • "/units"            → when navigating with a query string (?q=<full address>)
//    • "/units/:addressId" → when loading units by a numeric address ID
// - DetailsScreen is shown at "/details/:reKey" for a specific real-estate unit.

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import StartScreen from "./pages/StartScreen";
import UnitsScreen from "./pages/UnitsScreen";
import DetailsScreen from "./pages/DetailsScreen";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Step 1 (Start) – address search & map preview */}
        <Route path="/" element={<StartScreen />} />

        {/* Step 2 (Units) – list of units for an address passed via query string (?q=...) */}
        <Route path="/units" element={<UnitsScreen />} />

        {/* Alternate Step 2 – same screen but loads by route param ":addressId" instead of ?q */}
        <Route path="/units/:addressId" element={<UnitsScreen />} />

        {/* Step 3 (Details) – details for a single unit identified by :reKey */}
        <Route path="/details/:reKey" element={<DetailsScreen />} />
      </Routes>
    </Router>
  );
};

export default App;
