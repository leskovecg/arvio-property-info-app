# ### Narediti Flask API, ki bo te podatke bral, prikazoval kot JSON in bil pripravljen, da ga tvoja mobilna app pokliče.

# from flask import Flask, jsonify, request
# import requests  # Used for making HTTP requests to Arvio API
# import os
# from dotenv import load_dotenv
# from flask_cors import CORS

# load_dotenv()
# app = Flask(__name__)
# CORS(app)

# # --------------------------------------------
# # Arvio API Configuration
# # --------------------------------------------
# API_KEY = os.getenv("ARVIO_API_KEY")
# BASE_URL = "https://test.arvio.si/api/v1"
# HEADERS = {
#     "accept": "application/json",
#     "Content-Type": "application/json",
#     "Authorization": f"Token {API_KEY}"
# }

# # --------------------------------------------
# # Home route
# # --------------------------------------------
# @app.route('/')
# def home():
#     return "Flask backend for RealEstateInfoApp (Arvio Integration)"

# # --------------------------------------------
# # Endpoint: Search by address
# # --------------------------------------------
# # spremenjno ko mi ni delal zemljevid za prvi screen na spletni apliakciji in sem spodnje zakomentiral in naredil novo funkcijo search_address

# # @app.route('/api/search_address/<string:query>')
# # def search_address(query):
# #     url = f"{BASE_URL}/address/search/{query}"
# #     response = requests.get(url, headers=HEADERS, verify=False)
# #     return jsonify(response.json())

# @app.route('/api/search_address/<string:query>')
# def search_address(query):
#     url = f"{BASE_URL}/address/search/{query}"
#     response = requests.get(url, headers=HEADERS, verify=False)

#     if response.status_code != 200:
#         print("Napaka pri Arvio API:", response.status_code)
#         return jsonify([])

#     data = response.json()

#     # 👇 Tukaj je zdaj varno dodati izpis
#     print("PRVI REZULTAT:", data[0])  # ali json.dumps(data[0], indent=2)

#     # Za web frontend oblikuj gps z numeričnimi vrednostmi
#     if request.args.get("web") == "true":
#         results = []
#         for item in data:
#             lat = item.get("lat") or item.get("latitude")
#             lng = item.get("lng") or item.get("longitude")

#             try:
#                 lat = float(lat) if lat is not None else None
#                 lng = float(lng) if lng is not None else None
#             except (TypeError, ValueError):
#                 lat = None
#                 lng = None

#             results.append({
#                 "id": item.get("id"),
#                 "full_address": item.get("full_address"),
#                 "gps": {
#                     "lat": lat,
#                     "lng": lng
#                 }
#             })
#         return jsonify(results)

#     return jsonify(data)



# # --------------------------------------------
# # Endpoint: Get property details by ID
# # --------------------------------------------
# @app.route('/api/property/<string:reKey>')
# def get_property_details(reKey):
#     url = f"{BASE_URL}/real-estate/details/{reKey}"
#     try:
#         response = requests.get(url, headers=HEADERS, verify=False)  # ⚠️ dodaš verify=False
#         response.raise_for_status()  # vrže izjemo, če je 4xx ali 5xx
#         return jsonify(response.json())
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# # --------------------------------------------
# # Endpoint: Get property details by re_key (for Arvio API)
# # --------------------------------------------
# @app.route('/api/property_details/<re_key>', methods=['GET'])
# def get_property_details_by_rekey(re_key):  # <- ime funkcije spremeniš!
#     api_key = os.getenv("ARVIO_API_KEY")
#     if not api_key:
#         return jsonify({"error": "API key not configured"}), 500

#     headers = {
#         "Authorization": f"Token {api_key}"
#     }

#     try:
#         response = requests.get(f"https://test.arvio.si/api/property/{re_key}", headers=headers, verify=False)
#         response.raise_for_status()
#         return jsonify(response.json())
#     except requests.RequestException as e:
#         print("Error fetching property details:", e)
#         return jsonify({"error": "Failed to fetch property details"}), 500


# # --------------------------------------------
# # Run the Flask server
# # --------------------------------------------
# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=5000, debug=True)

#=====================================================================================================================
#=====================================================================================================================
"""
from flask import Flask, jsonify, request
import requests
import os
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()
app = Flask(__name__)
CORS(app)

# ---------------------------
# API Keys and Configs
# ---------------------------
ARVIO_API_KEY = os.getenv("ARVIO_API_KEY")
GOOGLE_MAPS_API_KEY_WEB = os.getenv("GOOGLE_MAPS_API_KEY_WEB")
BASE_URL = "https://test.arvio.si/api/v1"

HEADERS = {
    "accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": f"Token {ARVIO_API_KEY}"
}

# ---------------------------
# Home
# ---------------------------
@app.route('/')
def home():
    return "Flask backend for RealEstateInfoApp (Arvio + Google Maps Integration)"

# ---------------------------
# Address Search (Arvio)
# ---------------------------
@app.route('/api/search_address/<string:query>')
def search_address(query):
    url = f"{BASE_URL}/address/search/{query}"
    print(f"🔍 [SEARCH] Pošiljam klic na: {url}")
    response = requests.get(url, headers=HEADERS, verify=False)
    print(f"📡 [SEARCH] Status klica: {response.status_code}")
    if response.status_code != 200:
        print("❌ [SEARCH] Napaka pri Arvio API:", response.status_code)
        return jsonify([])

    data = response.json()
    print(f"📦 [SEARCH] Prvi rezultat: {data[0] if data else 'prazno'}")

    if request.args.get("web") == "true":
        results = []
        for item in data:
            lat = item.get("lat") or item.get("latitude")
            lng = item.get("lng") or item.get("longitude")

            try:
                lat = float(lat) if lat is not None else None
                lng = float(lng) if lng is not None else None
            except (TypeError, ValueError):
                lat, lng = None, None

            results.append({
                "id": item.get("id"),
                "full_address": item.get("full_address"),
                "gps": {
                    "lat": lat,
                    "lng": lng
                }
            })
        return jsonify(results)

    return jsonify(data)

# ---------------------------
# Property Details by ID
# ---------------------------
@app.route('/api/property/<string:reKey>')
def get_property_details(reKey):
    url = f"{BASE_URL}/real-estate/details/{reKey}"
    try:
        response = requests.get(url, headers=HEADERS, verify=False)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------
# Optional: Arvio fallback endpoint
# ---------------------------
@app.route('/api/property_details/<re_key>', methods=['GET'])
def get_property_details_by_rekey(re_key):
    try:
        response = requests.get(f"https://test.arvio.si/api/property/{re_key}", headers=HEADERS, verify=False)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.RequestException as e:
        print("Error fetching property details:", e)
        return jsonify({"error": "Failed to fetch property details"}), 500

# ---------------------------
# Web-only: Provide Google Maps API Key
# ---------------------------
@app.route('/api/google_maps_key')
def google_maps_key():
    return jsonify({"key": GOOGLE_MAPS_API_KEY_WEB})


@app.route('/api/geocode')
def geocode_address():
    address = request.args.get("address")
    api_key = os.getenv("GOOGLE_MAPS_API_KEY_WEB")

    if not address or not api_key:
        return jsonify({"error": "Missing address or API key"}), 400

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": api_key}
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/address_details/<int:address_id>')
def get_address_details(address_id):
    print(f"\n📥 [DETAILS] Prejemam zahtevek za naslov ID: {address_id}")
    
    url = f"https://test.arvio.si/api/v1/address/details/{address_id}"
    print(f"➡️ [DETAILS] Kličem Arvio URL: {url}")

    try:
        response = requests.get(url, verify=False)  # verify=False samo za testne namene
        print(f"📡 [DETAILS] Status: {response.status_code}")
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        print(f"❌ [DETAILS] Napaka: {e}")
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        print(f"❌ Splošna napaka: {e}")
        return jsonify({'error': 'Internal server error'}), 500

    data = response.json()
    print(f"✅ [DETAILS] JSON keys: {list(data.keys())}")
    print(f"📄 [DETAILS] Full Address: {data.get('full_address')}")
    print(f"🏷️ [DETAILS] Real estate IDs (re_keys): {data.get('real_estates')}")
    print(f"✅ Prejeti podatki: {data}")
    return jsonify(data)

@app.route("/api/address_units/<int:address_id>")
def get_units_for_address(address_id):
    print(f"\n📥 [UNITS] Zahtevek za naslov ID: {address_id}")
    
    # 1. Fetch address details
    details_url = f"{BASE_URL}/real-estate/details/{address_id}"
    print(f"➡️ [UNITS] Klic na: {details_url}")
    addr_response = requests.get(details_url, headers=HEADERS, verify=False)
    print(f"📡 [UNITS] Status addr_response: {addr_response.status_code}")
    addr_response.raise_for_status()
    address_data = addr_response.json()

    # 2. Extract re_keys (adjust this key if needed!)
    re_keys = address_data.get("units") or []
    print(f"📦 [UNITS] Najdeni re_keys: {re_keys}")

    units = []
    for re_key in re_keys:
        unit_url = f"{BASE_URL}/real-estate/details/{re_key}"
        print(f"🔍 [UNITS] Kličem za unit: {unit_url}")
        unit_response = requests.get(unit_url, headers=HEADERS, verify=False)
        print(f"📡 [UNITS] Status za {re_key}: {unit_response.status_code}")
        if unit_response.status_code == 200:
            units.append(unit_response.json())

    return jsonify({
        "address": {
            "id": address_id,
            "full_address": address_data.get("full_address")
        },
        "units": units
    })



"""





from flask import Flask, jsonify, request
import requests
import os
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()
app = Flask(__name__)
CORS(app)

# --------------------------------------------
# Arvio API Configuration
# --------------------------------------------
API_KEY = os.getenv("ARVIO_API_KEY")
BASE_URL = "https://test.arvio.si/api/v1"
HEADERS = {
    "accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": f"Token {API_KEY}"
}

# --------------------------------------------
# Home route
# --------------------------------------------
@app.route('/')
def home():
    return "Flask backend for RealEstateInfoApp (Arvio Integration)"

# --------------------------------------------
# Search Address Endpoint
# --------------------------------------------
@app.route('/api/search_address/<query>')
def search_address(query):
    web_flag = request.args.get("web") == "true"
    url = f"{BASE_URL}/address/search/{query}"
    if web_flag:
        url += "?web=true"

    print(f"[SEARCH] URL: {url}")

    try:
        res = requests.get(url, headers=HEADERS, verify=False)
        res.raise_for_status()
        results = res.json()
        print("[SEARCH] Results:", results)
        return jsonify(results)
    except Exception as e:
        print("[ERROR] Failed to search address:", str(e))
        return jsonify({"error": str(e)}), 500

# --------------------------------------------
# Get Address Units
# --------------------------------------------
@app.route('/api/address_units/<int:address_id>')
def get_address_units(address_id):
    print(f"[UNITS] Fetching address units for ID: {address_id}")
    try:
        # Get address info from search endpoint to find address by ID
        url = f"{BASE_URL}/address/search/?web=true"
        print(f"[UNITS] Fetching address list from: {url}")
        res = requests.get(url, headers=HEADERS, verify=False)
        res.raise_for_status()
        addresses = res.json()

        # Find the address with the matching ID
        address = next((addr for addr in addresses if addr.get("id") == address_id), None)
        if not address:
            print(f"[UNITS] Address ID {address_id} not found in fetched list.")
            return jsonify({"error": "Address not found"}), 404

        print(f"[DETAILS] Address found: {address['full_address']}")
        print(f"[DETAILS] Units: {address['units']}")

        # Build units as objects
        unit_objs = [{"re_key": re_key} for re_key in address["units"]]

        return jsonify({
            "address": {
                "id": address["id"],
                "full_address": address["full_address"],
                "gps": address.get("gps", {})
            },
            "units": unit_objs
        })

    except Exception as e:
        print("[ERROR] Fetching address units failed:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
