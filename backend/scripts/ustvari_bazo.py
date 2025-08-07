import sqlite3

# Povezava z novo SQLite bazo (ustvari se datoteka)
conn = sqlite3.connect("data/real_estate_info.db")
cursor = conn.cursor()

# SQL ukaz za ustvarjanje vseh tabel
cursor.executescript("""
CREATE TABLE addresses (
    id INTEGER PRIMARY KEY,
    street_name TEXT,
    house_number TEXT,
    postal_code TEXT,
    city TEXT,
    municipality TEXT
);

CREATE TABLE locations (
    id INTEGER PRIMARY KEY,
    latitude REAL,
    longitude REAL,
    address_id INTEGER,
    FOREIGN KEY (address_id) REFERENCES addresses(id)
);

CREATE TABLE properties (
    id INTEGER PRIMARY KEY,
    unit_label TEXT,
    area_m2 REAL,
    floor INTEGER,
    total_floors INTEGER,
    rooms TEXT,
    built_year INTEGER,
    renovated_year INTEGER,
    price_per_m2 REAL,
    heating TEXT,
    equipment TEXT,
    property_type TEXT,
    usage_type TEXT,
    cadastral_number TEXT,
    location_id INTEGER,
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE building_details (
    id INTEGER PRIMARY KEY,
    building_height INTEGER,
    entrances INTEGER,
    flats_count INTEGER,
    business_spaces_count INTEGER,
    facade_renovation_year INTEGER,
    roof_renovation_year INTEGER,
    elevator BOOLEAN,
    materials TEXT,
    property_id INTEGER,
    FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE risk_factors (
    id INTEGER PRIMARY KEY,
    property_id INTEGER,
    flood_risk TEXT,
    earthquake_risk TEXT,
    noise_level TEXT,
    crime_level TEXT,
    FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE nearby_services (
    id INTEGER PRIMARY KEY,
    property_id INTEGER,
    service_type TEXT,
    name TEXT,
    distance_km REAL,
    FOREIGN KEY (property_id) REFERENCES properties(id)
);
""")

# Shrani in zapri povezavo
conn.commit()
conn.close()

print("Baza in tabele uspešno ustvarjene!")
