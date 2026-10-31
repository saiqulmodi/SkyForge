"""Builds assets/airports/south_india_airports.json from OurAirports data (public domain).

Usage:  python -I tools/build_airports.py <dir with airports.csv + runways.csv> <out_dir>
Source: https://davidmegginson.github.io/ourairports-data/

Keeps South Indian airports (Karnataka, Tamil Nadu, Kerala, Andhra Pradesh, Telangana, Puducherry) inside
the game's terrain area (lat 8-19.5 N, lon 74-85 E) that have scheduled service or are medium/large airports,
with their open, paved runways of at least 1,300 m. Runway ends without coordinates are rebuilt from the
airport position, the runway heading and its length.
"""
import csv
import json
import math
import sys
from pathlib import Path

LAT_MIN, LAT_MAX, LON_MIN, LON_MAX = 8.0, 19.5, 74.0, 85.0
MIN_LENGTH_M = 1300
REGIONS = ("IN-KA", "IN-TN", "IN-KL", "IN-AP", "IN-TG", "IN-PY")
PAVED = ("ASP", "CON", "PEM", "BIT", "ASPH", "CONC", "TAR", "BLACKTOP")
FT = 0.3048


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def destination(lat, lon, bearing_deg, dist_m):
    """Point dist_m from lat/lon on a true bearing (small-distance approximation)."""
    b = math.radians(bearing_deg)
    dlat = dist_m * math.cos(b) / 110574.0
    dlon = dist_m * math.sin(b) / (111320.0 * math.cos(math.radians(lat)))
    return lat + dlat, lon + dlon


def bearing(lat1, lon1, lat2, lon2):
    dy = (lat2 - lat1) * 110574.0
    dx = (lon2 - lon1) * 111320.0 * math.cos(math.radians((lat1 + lat2) / 2))
    return (math.degrees(math.atan2(dx, dy)) + 360) % 360


def main():
    src = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    airports = {}
    with open(src / "airports.csv", newline="", encoding="utf-8") as f:
        for a in csv.DictReader(f):
            lat, lon = num(a["latitude_deg"]), num(a["longitude_deg"])
            if a["iso_region"] not in REGIONS or lat is None or lon is None:
                continue
            if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
                continue
            if a["scheduled_service"] != "yes" and a["type"] not in ("large_airport", "medium_airport"):
                continue
            icao = a["icao_code"] or a["gps_code"] or a["ident"]
            airports[a["ident"]] = {
                "icao": icao, "iata": a["iata_code"], "name": a["name"], "city": a["municipality"],
                "lat": round(lat, 6), "lon": round(lon, 6), "elevFt": int(num(a["elevation_ft"]) or 0),
                "runways": []
            }

    with open(src / "runways.csv", newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            apt = airports.get(r["airport_ident"])
            if not apt or r["closed"] == "1":
                continue
            length_ft = num(r["length_ft"])
            if not length_ft or length_ft * FT < MIN_LENGTH_M:
                continue
            if not any(p in (r["surface"] or "").upper() for p in PAVED):
                continue
            length_m = length_ft * FT
            width_m = (num(r["width_ft"]) or 148) * FT
            le = (num(r["le_latitude_deg"]), num(r["le_longitude_deg"]))
            he = (num(r["he_latitude_deg"]), num(r["he_longitude_deg"]))
            hdg = num(r["le_heading_degT"])
            if hdg is None:
                digits = "".join(c for c in r["le_ident"] if c.isdigit())
                hdg = int(digits) * 10 if digits else 90
            if None in le or None in he:
                # Rebuild both ends around the airport reference point
                le = destination(apt["lat"], apt["lon"], hdg + 180, length_m / 2)
                he = destination(apt["lat"], apt["lon"], hdg, length_m / 2)
            else:
                hdg = bearing(le[0], le[1], he[0], he[1])
            apt["runways"].append({
                "le": r["le_ident"], "he": r["he_ident"],
                "leLat": round(le[0], 6), "leLon": round(le[1], 6),
                "heLat": round(he[0], 6), "heLon": round(he[1], 6),
                "headingT": round(hdg, 1), "lengthM": round(length_m), "widthM": round(width_m)
            })

    result = [a for a in airports.values() if a["runways"]]
    result.sort(key=lambda a: a["icao"])
    out = out_dir / "south_india_airports.json"
    out.write_text(json.dumps({
        "source": "OurAirports (public domain), https://ourairports.com",
        "airports": result
    }, separators=(",", ":")))
    for a in result:
        rw = ", ".join(f'{r["le"]}/{r["he"]} {r["lengthM"]}m' for r in a["runways"])
        print(f'{a["icao"]:5} {a["iata"]:4} {a["city"][:18]:18} {a["elevFt"]:5} ft  {rw}')
    print(f"{len(result)} airports, {out.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
