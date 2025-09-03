# app.py
# -----------------------------------------------------------------------------
# RealEstateInfoApp backend (Flask)
# -----------------------------------------------------------------------------
# This service acts as a small BFF (Backend-For-Frontend) for BOTH:
#   • the web app (Vite/React) and
#   • the Android app (Jetpack Compose).
#
# What it does:
#   1) Proxies selected Arvio API endpoints (adds auth header, SSL opts, timeouts).
#   2) Normalizes some responses (e.g., always include ?web=true for address search).
#   3) Persists small, local data in SQLite via SQLAlchemy:
#        - Favorites: saved units (re_key + optional address/label).
#        - Search history: last queries, with duplicate suppression.
#   4) Exposes a tiny JSON REST API used by both clients.
#
# Environment variables (see .env):
#   ARVIO_API_KEY      -> Token for Arvio API (required for remote calls).
#   ARVIO_BASE_URL     -> Base URL of Arvio (default https://test.arvio.si/api/v1).
#   ARVIO_VERIFY_SSL   -> "false" to skip TLS verification in dev (default false).
#   VOLATILE_FAVORITES -> "true" to clear favorites on startup (dev convenience).
#
# Database:
#   SQLite file at backend/instance/favorites.db with two tables:
#     - favorites(id, re_key, address, label, created_at)
#     - search_history(id, query, timestamp)
#
# Notes:
#   - All routes are CORS-enabled.
#   - We keep logic minimal: no background jobs; no migrations (simple create_all()).
#   - This file intentionally mixes proxy logic and DB endpoints to stay compact.
# -----------------------------------------------------------------------------

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import select                       # <-- SQLAlchemy 2.0 style
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import requests
import urllib3

load_dotenv()

app = Flask(__name__)
CORS(app)

# -----------------------------------------------------------------------------
# SQLAlchemy / SQLite – database in backend/instance/favorites.db
# -----------------------------------------------------------------------------
# Use Flask's instance folder for writable runtime files. We ensure the folder
# exists and point SQLAlchemy at a file-based SQLite DB inside it.
os.makedirs(app.instance_path, exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(app.instance_path, "favorites.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# -----------------------------------------------------------------------------
# ORM models
# -----------------------------------------------------------------------------
class Favorite(db.Model):
    __tablename__ = "favorites"
    id = db.Column(db.Integer, primary_key=True)
    re_key = db.Column(db.String(64), unique=True, nullable=False)  # e.g. "2636-2697-48"
    address = db.Column(db.String(255))  # optional e.g. "Dunajska cesta 51, 1000 Ljubljana"
    label = db.Column(db.String(120))    # optional e.g. "Basement / Apartment / Commercial ..."
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "re_key": self.re_key,
            "address": self.address,
            "label": self.label,
            "created_at": self.created_at.isoformat(),
        }

class SearchHistory(db.Model):
    __tablename__ = "search_history"
    id = db.Column(db.Integer, primary_key=True)
    query = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "query": self.query,
            "timestamp": self.timestamp.isoformat(),
        }

with app.app_context():
    # Create tables on startup if they don't exist (simple dev setup).
    db.create_all()
    # Optional: start with a clean favorites table each run (useful in dev).
    if os.getenv("VOLATILE_FAVORITES", "false").lower() in ("1", "true", "yes"):
        db.session.query(Favorite).delete()
        db.session.commit()

# -----------------------------------------------------------------------------
# Arvio API configuration (auth, base URL, SSL)
# -----------------------------------------------------------------------------
API_KEY = os.getenv("ARVIO_API_KEY", "").strip()
BASE_URL = os.getenv("ARVIO_BASE_URL", "https://test.arvio.si/api/v1").rstrip("/")
VERIFY_SSL = os.getenv("ARVIO_VERIFY_SSL", "false").lower() not in ("0", "false", "no")

# In dev you can skip SSL verification; suppress urllib3 warnings in that case.
if not VERIFY_SSL:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    "accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": f"Token {API_KEY}" if API_KEY else "",
}
TIMEOUT = 30  # seconds

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def _best_match(results: list, q: str):
    """Pick the best search match: (1) exact full_address match; (2) otherwise first item."""
    if not isinstance(results, list) or not results:
        return None
    q_norm = (q or "").strip().lower()
    exact = next((r for r in results if (r.get("full_address") or "").lower() == q_norm), None)
    return exact or results[0]

def _extract_units_from_address_payload(payload: dict):
    """
    Extract the list of unit RE keys from different possible response shapes.
    Returns a list of strings (re_key).
    """
    if not isinstance(payload, dict):
        return []
    # 1) Directly at root: payload["units"]
    units = payload.get("units")
    if isinstance(units, list) and units:
        return units
    # 2) Nested under "building.units"
    b_units = payload.get("building", {}).get("units")
    if isinstance(b_units, list) and b_units:
        return b_units
    # 3) Nothing found
    return []

def _extract_gps_from_address_payload(payload: dict):
    """
    Extract GPS either from payload["gps"] or payload["building"]["gps"].
    Returns a dict or {} if none found.
    """
    if not isinstance(payload, dict):
        return {}
    gps = payload.get("gps")
    if isinstance(gps, dict):
        return gps
    b_gps = payload.get("building", {}).get("gps")
    if isinstance(b_gps, dict):
        return b_gps
    return {}

def _fetch_address_by_id(address_id: int) -> dict:
    """Call Arvio GET /address/<id> and return JSON dict (or {})."""
    url = f"{BASE_URL}/address/{address_id}"
    app.logger.info(f"[ADDRESS_BY_ID] -> {url}")
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, verify=VERIFY_SSL)
    r.raise_for_status()
    return r.json() if r.text else {}

def _log_search_once(q: str, window_sec: int = 10):
    """
    Insert one entry in SearchHistory for the provided query 'q'.
    Suppresses duplicates in a short time window (default 10s) to avoid double
    logs caused by React StrictMode (double fetch in dev) or quick retries.
    """
    now = datetime.utcnow()
    stmt = (
        select(SearchHistory)
        .where(SearchHistory.query == q)
        .order_by(SearchHistory.timestamp.desc())
        .limit(1)
    )
    last = db.session.execute(stmt).scalars().first()
    if not last or (now - last.timestamp) > timedelta(seconds=window_sec):
        db.session.add(SearchHistory(query=q))
        db.session.commit()

def _enrich_favorite_from_arvio(re_key: str):
    """
    Best-effort enrichment of a favorite from Arvio details:
      - Tries to derive a human-friendly 'label' (unit type/name) and
        a full 'address' from multiple possible fields because the API can vary
        by unit type.
      - Returns a tuple (address, label). Missing values are returned as None.
    """
    try:
        url = f"{BASE_URL}/real-estate/details/{re_key}"
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, verify=VERIFY_SSL)
        r.raise_for_status()
        j = r.json() if r.text else {}

        def pick_first_str(src: dict, *keys: str):
            for k in keys:
                v = src.get(k)
                if isinstance(v, str) and v.strip():
                    return v.strip()
            return None

        # --- label (unit name/type) ---
        label = (
            pick_first_str(
                j,
                "unit_type_title", "unit_type_name", "unit_type",
                "label", "name", "title", "unit_name", "usage",
                "unit_usage", "unit_subtype", "unit_subtype_name",
                "space_name", "function",
            )
            or pick_first_str(j.get("unit", {}) if isinstance(j.get("unit"), dict) else {}, "type_name", "name", "title")
            or "Enota"
        )

        # --- address (full address) ---
        address = (
            pick_first_str(j, "full_address", "address")
            or pick_first_str(j.get("building", {}) if isinstance(j.get("building"), dict) else {}, "address")
            or (
                (j.get("building", {}) or {}).get("addresses")[0]
                if isinstance((j.get("building", {}) or {}).get("addresses"), list) and (j.get("building", {}) or {}).get("addresses")
                else None
            )
        )

        return (address, label)
    except Exception:
        return (None, None)


# -----------------------------------------------------------------------------
# Root route
# -----------------------------------------------------------------------------
@app.route("/")
def home():
    return "Flask backend for RealEstateInfoApp (Arvio Integration)"


# -----------------------------------------------------------------------------
# /api/search_address/<query>
# Unified for web + Android: force ?web=true so Arvio returns 'units' in matches.
# -----------------------------------------------------------------------------
@app.route("/api/search_address/<path:query>")
def search_address(query):
    # Always add web=true. The Android app doesn't send it; web app might.
    url = f"{BASE_URL}/address/search/{query}?web=true"
    app.logger.info(f"[SEARCH] -> {url}")

    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, verify=VERIFY_SSL)
        r.raise_for_status()
        data = r.json()
        return jsonify(data)
    except requests.HTTPError as e:
        app.logger.error(f"[SEARCH][HTTP {r.status_code}] {e}")
        return jsonify({"error": f"HTTP {r.status_code}: {r.text}"}), r.status_code
    except Exception as e:
        app.logger.exception("[SEARCH] Unexpected error")
        return jsonify({"error": str(e)}), 500


# -----------------------------------------------------------------------------
# Backward-compatibility alias used by older Android code paths (if any).
# Fetches a unit by re_key via Arvio and proxies the payload unchanged.
# -----------------------------------------------------------------------------
@app.route("/api/property/<path:re_key>")
def property_alias(re_key):
    url = f"{BASE_URL}/real-estate/details/{re_key}"
    app.logger.info(f"[PROPERTY_ALIAS] -> {url}")
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, verify=VERIFY_SSL)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        status = getattr(e.response, "status_code", 500)
        body = getattr(e.response, "text", str(e))
        app.logger.error(f"[PROPERTY_ALIAS][HTTP {status}] {body}")
        return jsonify({"error": f"HTTP {status}: {body}"}), status
    except Exception as e:
        app.logger.exception("[PROPERTY_ALIAS] Unexpected error")
        return jsonify({"error": str(e)}), 500


# -----------------------------------------------------------------------------
# /api/address_units?query=...
# Given a free-text address query, this:
#   1) logs the search once (anti-dup),
#   2) uses Arvio search to find the best address,
#   3) fetches the address by ID to extract units + GPS,
#   4) returns a normalized object {address, units:[{re_key}, ...]}.
# -----------------------------------------------------------------------------
@app.route("/api/address_units")
def get_address_units_by_query():
    q = request.args.get("query", "").strip()
    if not q:
        return jsonify({"error": "Missing query"}), 400

    _log_search_once(q)  # anti-duplicate logging window (dev friendliness)

    # 1) SEARCH
    search_url = f"{BASE_URL}/address/search/{q}?web=true"
    app.logger.info(f"[UNITS_BY_QUERY][SEARCH] -> {search_url}")

    try:
        s = requests.get(search_url, headers=HEADERS, timeout=TIMEOUT, verify=VERIFY_SSL)
        s.raise_for_status()
        results = s.json() if isinstance(s.json(), list) else []
    except requests.HTTPError as e:
        app.logger.error(f"[UNITS_BY_QUERY][SEARCH][HTTP {s.status_code}] {e}")
        return jsonify({"error": f"HTTP {s.status_code}: {s.text}"}), s.status_code
    except Exception as e:
        app.logger.exception("[UNITS_BY_QUERY][SEARCH] Unexpected error")
        return jsonify({"error": str(e)}), 500

    best = _best_match(results, q)
    if not best or not best.get("id"):
        return jsonify({"address": None, "units": []})

    addr_id = best["id"]

    # 2) ADDRESS BY ID
    try:
        address_payload = _fetch_address_by_id(addr_id)
        units = _extract_units_from_address_payload(address_payload) or best.get("units") or []
        gps = _extract_gps_from_address_payload(address_payload) or best.get("gps") or {}

        return jsonify({
            "address": {
                "id": addr_id,
                "full_address": best.get("full_address"),
                "gps": gps
            },
            "units": [{"re_key": rk} for rk in units]
        })
    except requests.HTTPError as e:
        # If the ID call fails, fall back to units provided by the search result itself.
        app.logger.warning(f"[UNITS_BY_QUERY][ID] HTTP error, using fallback: {e}")
        units = best.get("units") or []
        return jsonify({
            "address": {
                "id": addr_id,
                "full_address": best.get("full_address"),
                "gps": best.get("gps", {})
            },
            "units": [{"re_key": rk} for rk in units]
        })
    except Exception as e:
        app.logger.exception("[UNITS_BY_QUERY][ID] Unexpected error")
        return jsonify({"error": str(e)}), 500

# -----------------------------------------------------------------------------
# /api/address_units/<id>
# Fetch units by a known address ID (used in a few flows).
# Returns the same normalized shape as the query version.
# -----------------------------------------------------------------------------
@app.route("/api/address_units/<int:address_id>")
def get_address_units_by_id(address_id: int):
    try:
        payload = _fetch_address_by_id(address_id)
        units = _extract_units_from_address_payload(payload)
        gps = _extract_gps_from_address_payload(payload)

        full_address = (
            payload.get("full_address")
            or payload.get("address")
            or payload.get("building", {}).get("addresses", [None])[0]
        )

        if not units:
            app.logger.warning(f"[ADDRESS_BY_ID] No units found for {address_id}. Returning empty list.")
            units = []

        return jsonify({
            "address": {
                "id": address_id,
                "full_address": full_address,
                "gps": gps
            },
            "units": [{"re_key": rk} for rk in units]
        })
    except requests.HTTPError as e:
        status = getattr(e.response, "status_code", 500)
        body = getattr(e.response, "text", str(e))
        app.logger.error(f"[ADDRESS_BY_ID][HTTP {status}] {body}")
        return jsonify({"error": f"HTTP {status}: {body}"}), status
    except Exception as e:
        app.logger.exception("[ADDRESS_BY_ID] Unexpected error")
        return jsonify({"error": str(e)}), 500

# -----------------------------------------------------------------------------
# /api/unit_details/<re_key>
# Simple pass-through to Arvio unit details; returns raw JSON from Arvio.
# Clients derive label/size/floor etc. from multiple possible fields.
# -----------------------------------------------------------------------------
@app.route("/api/unit_details/<path:re_key>")
def unit_details(re_key):
    """
    Proxy to Arvio: GET /real-estate/details/<re_key>
    Returns unit details (unit_type, net_unit_size, story_no, gps, ...).
    """
    url = f"{BASE_URL}/real-estate/details/{re_key}"
    app.logger.info(f"[UNIT_DETAILS] -> {url}")
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, verify=VERIFY_SSL)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        status = getattr(e.response, "status_code", 500)
        body = getattr(e.response, "text", str(e))
        app.logger.error(f"[UNIT_DETAILS][HTTP {status}] {body}")
        return jsonify({"error": f"HTTP {status}: {body}"}), status
    except Exception as e:
        app.logger.exception("[UNIT_DETAILS] Unexpected error")
        return jsonify({"error": str(e)}), 500

# -----------------------------------------------------------------------------
# Favorites API
# -----------------------------------------------------------------------------
@app.get("/api/favorites")
def list_favorites():
    """Return favorites sorted by creation time (newest first)."""
    rows = Favorite.query.order_by(Favorite.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rows])

@app.post("/api/favorites")
def add_favorite():
    """
    Create or update a favorite.
      - If the re_key already exists, update address/label when provided.
      - If address/label are missing, try to enrich them from Arvio details.
    """
    data = request.get_json(force=True) or {}
    re_key = data.get("re_key")
    if not re_key:
        return jsonify({"error": "Missing re_key"}), 400

    exists = Favorite.query.filter_by(re_key=re_key).first()
    if exists:
        # If caller provided updated metadata, merge it.
        if data.get("address") or data.get("label"):
            exists.address = data.get("address") or exists.address
            exists.label = data.get("label") or exists.label
            db.session.commit()
        return jsonify(exists.to_dict()), 200

    # Enrich if the client didn't send metadata
    address = data.get("address")
    label = data.get("label")
    if not address or not label:
        e_addr, e_label = _enrich_favorite_from_arvio(re_key)
        address = address or e_addr
        label = label or e_label

    fav = Favorite(re_key=re_key, address=address, label=label)
    db.session.add(fav)
    db.session.commit()
    return jsonify(fav.to_dict()), 201

@app.delete("/api/favorites/<re_key>")
def delete_favorite(re_key):
    """Remove a single favorite by re_key."""
    fav = Favorite.query.filter_by(re_key=re_key).first()
    if not fav:
        return jsonify({"status": "not_found"}), 404
    db.session.delete(fav)
    db.session.commit()
    return jsonify({"status": "deleted", "re_key": re_key})

@app.delete("/api/favorites")
def clear_favorites():
    """Delete ALL favorites (primarily for dev/testing)."""
    db.session.query(Favorite).delete()
    db.session.commit()
    return jsonify({"status": "cleared"})

# -----------------------------------------------------------------------------
# Search history API
# -----------------------------------------------------------------------------
@app.get("/api/search_history")
def list_search_history():
    """Return the 50 most recent search queries."""
    rows = SearchHistory.query.order_by(SearchHistory.timestamp.desc()).limit(50).all()
    return jsonify([r.to_dict() for r in rows])

# -----------------------------------------------------------------------------
# Entrypoint
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
