import os
import requests
from dotenv import load_dotenv, set_key

# Load environment variables from backend/.env
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH)

def get_google_api_key() -> str:
    """
    Retrieve Google Maps / Location API key from environment.
    Supports GOOGLE_MAPS_API_KEY, GOOGLE_LOCATION_API_KEY, or GOOGLE_API_KEY.
    """
    return (
        os.getenv("GOOGLE_MAPS_API_KEY", "") or
        os.getenv("GOOGLE_LOCATION_API_KEY", "") or
        os.getenv("GOOGLE_API_KEY", "")
    ).strip()

def set_google_api_key(new_key: str):
    """
    Save or update Google API Key dynamically in backend/.env.
    """
    new_key = new_key.strip()
    os.environ["GOOGLE_MAPS_API_KEY"] = new_key
    try:
        set_key(ENV_PATH, "GOOGLE_MAPS_API_KEY", new_key)
    except Exception as e:
        print(f"Warning: could not write to .env file: {e}")
    return {"status": "success", "key_configured": bool(new_key)}

def decode_google_polyline(polyline_str: str):
    """
    Decodes a Google Maps encoded polyline string into a list of [lat, lon] coordinates.
    Standard Google Polyline Algorithm (pure Python, 0 extra dependencies).
    """
    coords = []
    index = 0
    lat = 0
    lng = 0
    length = len(polyline_str)

    while index < length:
        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        coords.append([round(lat * 1e-5, 5), round(lng * 1e-5, 5)])

    return coords

def search_locations_google(query: str):
    """
    Search real-world locations using Google Places Text Search and Geocoding API.
    Returns list of dicts: [{name, address, lat, lon, source}]
    """
    query = query.strip()
    if not query:
        return []

    api_key = get_google_api_key()
    if not api_key:
        return []

    results = []

    # 1. Google Places Text Search API
    try:
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {"query": query, "key": api_key}
        res = requests.get(url, params=params, timeout=5)
        if res.status_code == 200:
            data = res.json()
            for item in data.get("results", [])[:5]:
                loc = item.get("geometry", {}).get("location", {})
                lat = loc.get("lat")
                lon = loc.get("lng")
                name = item.get("name") or query
                addr = item.get("formatted_address") or name
                if lat is not None and lon is not None:
                    display_name = name
                    addr_parts = addr.split(",")
                    if name not in addr and len(addr_parts) > 1:
                        display_name = f"{name}, {addr_parts[-2].strip()}"
                    results.append({
                        "name": display_name,
                        "address": addr,
                        "lat": round(float(lat), 5),
                        "lon": round(float(lon), 5),
                        "source": "Google Places API"
                    })
            if results:
                return results
    except Exception as e:
        print(f"Google Places search error: {e}")

    # 2. Google Geocoding API Fallback
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {"address": query, "key": api_key}
        res = requests.get(url, params=params, timeout=5)
        if res.status_code == 200:
            data = res.json()
            for item in data.get("results", [])[:5]:
                loc = item.get("geometry", {}).get("location", {})
                lat = loc.get("lat")
                lon = loc.get("lng")
                addr = item.get("formatted_address") or query
                parts = addr.split(",")
                short_name = f"{parts[0].strip()}, {parts[-1].strip()}" if len(parts) > 1 else addr
                if lat is not None and lon is not None:
                    results.append({
                        "name": short_name,
                        "address": addr,
                        "lat": round(float(lat), 5),
                        "lon": round(float(lon), 5),
                        "source": "Google Geocoding API"
                    })
            if results:
                return results
    except Exception as e:
        print(f"Google Geocode search error: {e}")

    return results

def calculate_routes_google(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float, origin_name: str, dest_name: str):
    """
    Calculate and compare travel routes between Point A and Point B using Google Directions API.
    Extracts travel times, live traffic delay, distance, and polyline coordinates.
    """
    api_key = get_google_api_key()
    if not api_key:
        return None

    try:
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": f"{origin_lat},{origin_lon}",
            "destination": f"{dest_lat},{dest_lon}",
            "alternatives": "true",
            "departure_time": "now",
            "traffic_model": "best_guess",
            "key": api_key
        }
        res = requests.get(url, params=params, timeout=6)
        if res.status_code != 200:
            return None

        data = res.json()
        if data.get("status") != "OK":
            return None

        raw_routes = data.get("routes", [])
        if not raw_routes:
            return None

        route_meta = [
            {"name": "Via Fastest Arterial", "badge": "Fastest Route", "color": "#2563EB"},
            {"name": "Via Secondary Corridor", "badge": "Shortest Distance", "color": "#0D9488"},
            {"name": "Via Ring Road / Bypass", "badge": "Alternative Route", "color": "#7C3AED"}
        ]

        routes = []
        for idx, r in enumerate(raw_routes[:3]):
            legs = r.get("legs", [])
            if not legs:
                continue
            leg = legs[0]
            meters = leg.get("distance", {}).get("value", 0)
            dist_km = round(meters / 1000.0, 1)

            normal_secs = leg.get("duration", {}).get("value", 60)
            traffic_secs = leg.get("duration_in_traffic", {}).get("value", normal_secs)

            duration_min = max(1, int(round(traffic_secs / 60.0)))
            delay_sec = max(0, traffic_secs - normal_secs)
            delay_min = int(round(delay_sec / 60.0))

            summary = r.get("summary") or f"Corridor {idx+1}"
            clean_summary = summary.replace("<b>", "").replace("</b>", "").replace("<div", "").replace("</div>", "")
            route_name = f"Via {clean_summary}" if not clean_summary.lower().startswith("via") else clean_summary

            points = []
            overview_polyline = r.get("overview_polyline", {}).get("points")
            if overview_polyline:
                points = decode_google_polyline(overview_polyline)

            meta = route_meta[idx] if idx < len(route_meta) else {
                "name": route_name,
                "badge": "Alternate",
                "color": "#64748B"
            }

            traffic_status = "Optimal Flow"
            if delay_min > 5:
                traffic_status = "Heavy Traffic"
            elif delay_min > 1:
                traffic_status = "Moderate Delays"

            routes.append({
                "id": f"route_{idx + 1}",
                "name": meta.get("name") or route_name,
                "badge": meta.get("badge") or ("Fastest Route" if idx == 0 else "Alternate"),
                "distance_km": dist_km,
                "duration_min": duration_min,
                "delay_min": delay_min,
                "traffic_status": traffic_status,
                "color": meta["color"],
                "coordinates": points
            })

        if routes:
            return {
                "origin": {"name": origin_name, "lat": origin_lat, "lon": origin_lon},
                "destination": {"name": dest_name, "lat": dest_lat, "lon": dest_lon},
                "data_source": "Google Directions & Traffic API",
                "routes": routes
            }
    except Exception as e:
        print(f"Google Directions API error: {e}")

    return None
