// App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import StartScreen from "./pages/StartScreen";
import UnitsScreen from "./pages/UnitsScreen";
import DetailsScreen from "./pages/DetailsScreen";
import StatisticsScreen from "./pages/StatisticsScreen"; // opcijsko

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/units/:addressId" element={<UnitsScreen />} />
        <Route path="/details/:reKey" element={<DetailsScreen />} />
        <Route path="/statistics/:reKey" element={<StatisticsScreen />} />
      </Routes>
    </Router>
  );
};

export default App;
