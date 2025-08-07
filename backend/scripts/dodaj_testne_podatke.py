import sqlite3

conn = sqlite3.connect("data/real_estate_info.db")
cursor = conn.cursor()

# Dodaj en naslov in lokacijo
cursor.execute("""
INSERT INTO addresses (street_name, house_number, postal_code, city, municipality)
VALUES (?, ?, ?, ?, ?)""", ("Rusjanov trg", "5", "1000", "Ljubljana", "Ljubljana"))

address_id = cursor.lastrowid

cursor.execute("""
INSERT INTO locations (latitude, longitude, address_id)
VALUES (?, ?, ?)""", (46.0500, 14.5400, address_id))

location_id = cursor.lastrowid

# Dodaj nepremičnino
cursor.execute("""
INSERT INTO properties (
    unit_label, area_m2, floor, total_floors, rooms, built_year,
    renovated_year, price_per_m2, heating, equipment, property_type,
    usage_type, cadastral_number, location_id
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
    "Stanovanje 105", 59.70, 2, 12, "2 sobe, balkon", 1986,
    None, 2011, "centralno", "dvigalo", "stanovanje",
    "stanovanjsko", "1772-1828-113", location_id
))

property_id = cursor.lastrowid

# Dodaj stavbne podatke
cursor.execute("""
INSERT INTO building_details (
    building_height, entrances, flats_count, business_spaces_count,
    facade_renovation_year, roof_renovation_year, elevator, materials, property_id
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
    12, 2, 183, 0, 2010, 2012, True, "beton, železobeton", property_id
))

# Dodaj okoljska tveganja
cursor.execute("""
INSERT INTO risk_factors (property_id, flood_risk, earthquake_risk, noise_level, crime_level)
VALUES (?, ?, ?, ?, ?)""", (
    property_id, "srednja", "nizka", "srednja", "nizka"
))

# Dodaj nekaj storitev v bližini
services = [
    ("šola", "Osnovna šola Nove Fužine", 0.25),
    ("zdravnik", "Zdravstveni dom Fužine", 0.41),
    ("posta", "Pošta Slovenije", 0.50),
    ("postaja", "Fužine P+R", 0.16)
]

for service in services:
    cursor.execute("""
    INSERT INTO nearby_services (property_id, service_type, name, distance_km)
    VALUES (?, ?, ?, ?)""", (property_id, *service))

conn.commit()
conn.close()
print("✅ Testni podatki uspešno vstavljeni.")
