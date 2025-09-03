# Real-Estate Info App – Web, Android & Flask

End-to-end demo for exploring **real-estate data by address**: search an address, pick a unit, view details (location, area, price, price/m², metadata).
Built with **React/TypeScript (web)**, **Kotlin/Compose (Android)** and a **Flask** backend that proxies & normalizes Arvio data.

> Developed with the support of **Arvio**.

---

## Architecture

- **Backend (Flask):** proxy to Arvio, response **normalization**, favorites & search history in SQLite.
- **Web (React/TS):** three steps (Start → Units → Details), favorites context, Google Maps/Street View.
- **Android (Kotlin/Compose):** same flow with native UI, Retrofit client, Maps & Street View.

---

## Project structure

```
ARVIO-PROPERTY-INFO-APP/
├─ backend/
│  ├─ app.py                 # Flask API (search, units, unit_details, favorites) 
│  ├─ requirements.txt       # Python deps
│  └─ instance/
|      └─ favorites.db       # runtime DB (gitignored)
|      └─ peek_db.py         # Quick SQLite inspector
├─ web-app/
│  ├─ public/
│  │  └─ index.html          # entry (mount #root)
│  ├─ src/
│  │  ├─ api/favorites.ts    # tiny CRUD client for favorites
│  │  ├─ components/
│  │  │  ├─ FavoritesContext.tsx
│  │  │  └─ Steps.tsx
│  │  ├─ pages/
│  │  │  ├─ StartScreen.tsx  # address input + map
│  │  │  ├─ UnitsScreen.tsx  # list of units for address
│  │  │  └─ DetailsScreen.tsx# unit details + Street View
│  │  ├─ App.tsx             # routes
│  │  ├─ index.tsx / index.css
│  │  └─ tsconfig.json
│  ├─ package.json
├─ android-app/RealEstateInfoApp/
│  ├─ app/src/main/java/com/gasper/realestateinfo/
│  │  ├─ data/model/AddressResult.kt, Property.kt
│  │  ├─ network/ApiService.kt, RetrofitInstance.kt
│  │  ├─ ui/screen/{Search,AddressDetails,PropertyDetails}Screen.kt
│  │  ├─ ui/theme/{Color,Theme,Type}.kt
│  │  └─ MainActivity.kt
│  └─ src/main/AndroidManifest.xml
└─ README.md
```

---

## Quick start

### 1) Backend (Flask)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
# Create .env (see Env below), then:
python app.py
# -> http://localhost:5000
```

**Key endpoints**
- `GET /api/address_units?query=...` → address + unit list  
- `GET /api/address_units/{address_id}` → same, by address id  
- `GET /api/unit_details/{re_key}` → unit details  
- `GET|POST|DELETE /api/favorites` → favorites CRUD  
- `GET /api/search_history` → last 50 searches

### 2) Web (React/TypeScript)
```bash
cd web-app
# (Optional) add .env with your keys (see below)
npm install
npm start
```
- Mount point: `public/index.html` (`#root`).
- Routing: `App.tsx` (Start → Units → Details).
- Favorites client: `src/api/favorites.ts` + global `FavoritesContext`.

### 3) Android (Kotlin/Compose)
- Open `android-app/RealEstateInfoApp` in Android Studio.
- For emulator, set backend to `http://10.0.2.2:5000`; for device, use your machine’s LAN IP (change in `RetrofitInstance.kt`).
- Run on emulator/device. Main routes are in `MainActivity.kt`.

---

## Environment

**Backend `.env`**
```
ARVIO_API_KEY=REPLACE_ME
# ARVIO_BASE_URL=...
# ARVIO_VERIFY_SSL=true
VOLATILE_FAVORITES=false
```

**Web `web-app/.env`**
```
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=REPLACE_ME
```

---

## Screens
Typical flow:
1. **Start** – address input + map marker  
2. **Units** – list of units for the chosen address  
3. **Details** – unit details (price, size, price/m², metadata) + Street View

---

## Tech stack
- **Backend:** Flask, SQLAlchemy/SQLite, CORS, `requests` (Arvio proxy)
- **Web:** React, React Router, TypeScript, Google Maps/Street View
- **Android:** Kotlin, Jetpack Compose, Retrofit, Google Maps & Street View

## Acknowledgements
Built with the support of **Arvio**. Thanks to **Klemen** and the team for guidance and feedback.