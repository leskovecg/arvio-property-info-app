// src/index.tsx
// Entry point for the React application.
// - Creates a root and mounts <App /> into the DOM element with id="root".
// - Wraps the entire app with <FavoritesProvider> so favorites state is available everywhere.
// - Uses <React.StrictMode> to surface potential problems during development.

import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { FavoritesProvider } from "./components/FavoritesContext";

// Create a concurrent React root from the #root container in index.html
const root = createRoot(document.getElementById("root")!);

// Render the app tree
root.render(
  <React.StrictMode>
    {/* Global context: exposes favorites API (list/add/remove) to all components */}
    <FavoritesProvider>
      {/* Top-level router and screens */}
      <App />
    </FavoritesProvider>
  </React.StrictMode>
);


