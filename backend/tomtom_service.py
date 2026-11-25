import os
import math
import requests
from dotenv import load_dotenv, set_key
try:
    import google_service
except ImportError:
    from backend import google_service
try:
    import ml_service
except ImportError:
    from backend import ml_service

# Load environment variables from backend/.env
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH)

def get_api_key() -> str:
    return os.getenv("TOMTOM_API_KEY", "").strip()

def set_api_key(new_key: str):
    new_key = new_key.strip()
    os.environ["TOMTOM_API_KEY"] = new_key
    try:
        set_key(ENV_PATH, "TOMTOM_API_KEY", new_key)
    except Exception as e:
        print(f"Warning: could not write to .env file: {e}")
    return {"status": "success", "key_configured": bool(new_key)}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return max(0.2, R * c)

def generate_curved_waypoints(lat1: float, lon1: float, lat2: float, lon2: float, curvature: float, steps: int = 18):
    coords = []
    dx = lat2 - lat1
    dy = lon2 - lon1
    perp_x = -dy
    perp_y = dx
    
    for i in range(steps + 1):
        t = i / float(steps)
        # Primary arc envelope
        arc = math.sin(math.pi * t)
        # Minor road oscillation
        wiggle = math.sin(3 * math.pi * t) * 0.15
        
        offset = (arc * curvature) + (wiggle * curvature * 0.4)
        c_lat = lat1 + (dx * t) + (perp_x * offset)
        c_lon = lon1 + (dy * t) + (perp_y * offset)
        coords.append([round(c_lat, 5), round(c_lon, 5)])
    return coords

TRAINED_CORRIDOR_PLACES = [
    {
        "name": "Indiranagar, Bengaluru",
        "address": "100 Feet Rd & CMH Corridor, Bengaluru (Trained Node: IND)",
        "lat": 12.9784,
        "lon": 77.6408,
        "code": "IND",
        "source": "ST-GNN Trained Node",
    },
    {
        "name": "Koramangala, Bengaluru",
        "address": "Inner Ring Rd & Sony World, Bengaluru (Trained Node: KOR)",
        "lat": 12.9352,
        "lon": 77.6245,
        "code": "KOR",
        "source": "ST-GNN Trained Node",
    },
    {
        "name": "Whitefield, Bengaluru",
        "address": "ITPL Main Rd & Hope Farm, Bengaluru (Trained Node: WHI)",
        "lat": 12.9698,
        "lon": 77.7500,
        "code": "WHI",
        "source": "ST-GNN Trained Node",
    },
    {
        "name": "Hebbal, Bengaluru",
        "address": "Hebbal Flyover & Airport Arterial, Bengaluru (Trained Node: HEB)",
        "lat": 13.0358,
        "lon": 77.5970,
        "code": "HEB",
        "source": "ST-GNN Trained Node",
    },
]


def _format_clean_place_name(primary: str, secondary: str = "", country: str = "") -> str:
    """Builds a deduplicated location label without repeated city/state tokens."""
    raw_parts = []
    for chunk in (primary, secondary):
        for token in chunk.split(","):
            t = token.strip()
            if t and t.lower() not in [p.lower() for p in raw_parts]:
                raw_parts.append(t)
    label = ", ".join(raw_parts[:3]) if raw_parts else primary
    if country and country.lower() not in label.lower():
        label = f"{label} ({country})"
    return label


def search_locations(query: str):
    """
    Search real-world locations by text query.
    1. Matches trained Bengaluru ST-GNN corridor nodes when relevant.
    2. Primary: Google Location & Places API (if configured in .env).
    3. Secondary: TomTom Places Search API.
    4. Fallback: OpenStreetMap Nominatim.
    """
    query = query.strip()
    if not query:
        return TRAINED_CORRIDOR_PLACES

    q_lower = query.lower()
    trained_matches = [
        p for p in TRAINED_CORRIDOR_PLACES
        if q_lower in p["name"].lower()
        or q_lower in p["code"].lower()
        or q_lower in p["address"].lower()
        or q_lower in "bengaluru"
        or q_lower in "bangalore"
    ]

    remote_results = []

    # 1. Primary Priority: Google Location API (Places Text Search & Geocoding)
    google_results = google_service.search_locations_google(query)
    if google_results:
        remote_results = google_results
    else:
        api_key = get_api_key()

        # 2. Secondary: TomTom Search API
        if api_key:
            try:
                url = f"https://api.tomtom.com/search/2/search/{requests.utils.quote(query)}.json"
                params = {"key": api_key, "limit": 5, "typeahead": "true"}
                res = requests.get(url, params=params, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    for item in data.get("results", []):
                        pos = item.get("position", {})
                        addr = item.get("address", {})
                        name = item.get("poi", {}).get("name") or addr.get("freeformAddress") or query
                        city = addr.get("municipality") or addr.get("countrySubdivision") or ""
                        country = addr.get("country") or ""
                        display_name = _format_clean_place_name(name, city, country)
                        remote_results.append({
                            "name": display_name,
                            "address": addr.get("freeformAddress", name),
                            "lat": pos.get("lat"),
                            "lon": pos.get("lon"),
                            "source": "TomTom Places API"
                        })
            except Exception as e:
                print(f"TomTom search error: {e}")

        # 3. Fallback: OpenStreetMap Nominatim (works without any key)
        if not remote_results:
            try:
                url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(query)}&format=json&limit=5"
                headers = {"User-Agent": "UrbanFlow-Traffic-AI/1.0"}
                res = requests.get(url, headers=headers, timeout=5)
                if res.status_code == 200:
                    items = res.json()
                    remote_results = [
                        {
                            "name": _format_clean_place_name(
                                item.get("display_name", "").split(",")[0],
                                item.get("display_name", "").split(",")[-1],
                            ),
                            "address": item.get("display_name", ""),
                            "lat": float(item.get("lat")),
                            "lon": float(item.get("lon")),
                            "source": "OpenStreetMap Geocoder"
                        }
                        for item in items
                    ]
            except Exception as e:
                print(f"Fallback search error: {e}")

    # Merge trained corridor matches first, avoiding duplicate names
    seen_names = {p["name"].lower() for p in trained_matches}
    combined = list(trained_matches)
    for item in remote_results:
        if item.get("name", "").lower() not in seen_names:
            combined.append(item)
            seen_names.add(item.get("name", "").lower())

    if combined:
        return combined[:6]

    # 4. Default fallback
    return [
        {"name": f"{query.title()} (Central)", "address": query.title(), "lat": 12.9716, "lon": 77.5946, "source": "Simulated Coordinates"}
    ]

def get_traffic_flow(lat: float, lon: float, location_name: str = "Selected Location", horizon: str = "15m"):
    """
    Fetch live TomTom Traffic Flow Segment data for given coordinates.
    Generates real-time speed, congestion percentage, and predictive AI trajectory.
    """
    api_key = get_api_key()
    current_speed = 42.0
    free_flow_speed = 60.0
    congestion_pct = 30
    confidence = 94.0
    is_live = False
    source = "UrbanFlow ST-GNN Simulator"

    # Call TomTom Flow API if key exists
    if api_key:
        try:
            url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json"
            params = {
                "point": f"{lat},{lon}",
                "unit": "KMPH",
                "key": api_key
            }
            res = requests.get(url, params=params, timeout=5)
            if res.status_code == 200:
                flow = res.json().get("flowSegmentData", {})
                current_speed = round(float(flow.get("currentSpeed", 42)), 1)
                free_flow_speed = round(float(flow.get("freeFlowSpeed", max(50, current_speed))), 1)
                confidence = round(float(flow.get("confidence", 0.95)) * 100, 1)
                
                # Calculate congestion percentage from actual speed vs free flow
                if free_flow_speed > 0:
                    delay_ratio = max(0.0, 1.0 - (current_speed / free_flow_speed))
                    congestion_pct = min(99, max(5, int(delay_ratio * 100)))
                
                is_live = True
                source = "TomTom Real-Time Traffic Flow API"
        except Exception as e:
            print(f"TomTom Flow API error: {e}")

    # If TomTom wasn't used, derive realistic speed based on coordinate pseudo-entropy
    if not is_live:
        seed = int((abs(lat) * 1000 + abs(lon) * 1000) % 50)
        current_speed = round(25.0 + seed * 0.8, 1)
        free_flow_speed = 65.0
        congestion_pct = min(95, max(12, int((1.0 - current_speed / free_flow_speed) * 100)))

    # Compute AI Forecasting using trained PyTorch ST-GNN model (with heuristic fallback)
    ml_pred = ml_service.predict_traffic(
        lat=lat,
        lon=lon,
        speed_kmph=current_speed,
        horizon=horizon,
    )
    if ml_pred:
        pred_speed = ml_pred["predicted_speed"]
        pred_cong = ml_pred["predicted_congestion"]
        speed_change = ml_pred["speed_change"]
        confidence = ml_pred["confidence"] if not is_live else confidence
        model_engine = ml_pred["model_engine"]
        predicted_volume_15m = ml_pred["predicted_volume_15m"]
        matched_area_code = ml_pred["matched_area_code"]
        inference_latency_ms = ml_pred["inference_latency_ms"]
        all_horizons = ml_pred["all_horizons"]
    else:
        horizon_factors = {
            "15m": {"speed_mult": 0.94 if congestion_pct > 50 else 1.02, "cong_delta": 4 if congestion_pct > 50 else -3},
            "30m": {"speed_mult": 0.88 if congestion_pct > 50 else 1.05, "cong_delta": 9 if congestion_pct > 50 else -6},
            "60m": {"speed_mult": 1.12 if congestion_pct > 50 else 0.95, "cong_delta": -12 if congestion_pct > 50 else 5},
        }
        h_data = horizon_factors.get(horizon, horizon_factors["15m"])
        pred_speed = round(current_speed * h_data["speed_mult"], 1)
        pred_cong = max(5, min(98, congestion_pct + h_data["cong_delta"]))
        speed_diff = round(pred_speed - current_speed, 1)
        speed_change = f"{'+' if speed_diff > 0 else ''}{speed_diff} km/h"
        model_engine = "Heuristic Fallback"
        predicted_volume_15m = None
        matched_area_code = None
        inference_latency_ms = None
        all_horizons = None

    # Risk level classification
    if pred_cong >= 75:
        risk = "Critical Congestion"
        action = f"Trigger adaptive signal green wave & divert traffic via nearest arterial link"
    elif pred_cong >= 50:
        risk = "Heavy Flow"
        action = f"Ramp metering adjustment to 12 veh/min & update Variable Message Signs"
    else:
        risk = "Nominal / Optimal"
        action = f"Steady corridor throughput; maintain active baseline timing"

    return {
        "location_name": location_name,
        "coordinates": {"lat": lat, "lon": lon},
        "current_speed": current_speed,
        "free_flow_speed": free_flow_speed,
        "current_congestion": congestion_pct,
        "confidence": confidence,
        "is_realtime_api": is_live,
        "data_source": source,
        "model_engine": model_engine,
        "matched_area_code": matched_area_code,
        "inference_latency_ms": inference_latency_ms,
        "horizon": horizon,
        "predicted_speed": pred_speed,
        "predicted_volume_15m": predicted_volume_15m,
        "predicted_congestion": pred_cong,
        "speed_change": speed_change,
        "all_horizons": all_horizons,
        "risk_level": risk,
        "prescriptive_action": action,
        "influences": [
            {"factor": "PyTorch ST-GNN Temporal State", "weight": 44 if is_live else 38},
            {"factor": "Spatial Corridor Adjacency (4-Node Graph)", "weight": 28},
            {"factor": "15m Volume-to-Speed Ratio", "weight": 18},
            {"factor": "Diurnal Peak & Weekday Cyclicality", "weight": 10},
        ]
    }

def calculate_routes(
    origin_lat: float, origin_lon: float,
    dest_lat: float, dest_lon: float,
    origin_name: str = "Origin Point",
    dest_name: str = "Destination Point"
):
    """
    Calculate multiple route options between Origin and Destination with
    varying distances, estimated travel times, traffic delays, and coordinate polylines.
    """
    dist_direct = haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)

    # 1. Primary: Google Directions API with live traffic pacing (if configured in .env)
    google_routes_res = google_service.calculate_routes_google(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        origin_name=origin_name,
        dest_name=dest_name
    )
    if google_routes_res:
        return google_routes_res

    api_key = get_api_key()
    routes = []
    source = "UrbanFlow ST-GNN Route Synthesizer"

    # 2. Secondary: TomTom Routing API if API key configured
    if api_key:
        try:
            url = f"https://api.tomtom.com/routing/1/calculateRoute/{origin_lat},{origin_lon}:{dest_lat},{dest_lon}/json"
            params = {
                "key": api_key,
                "maxAlternatives": 2,
                "traffic": "true",
                "travelMode": "car",
                "routeType": "fastest"
            }
            res = requests.get(url, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                raw_routes = data.get("routes", [])
                
                route_meta = [
                    {"name": "Via Expressway / Main Arterial", "badge": "Fastest Route", "color": "#2563EB"},
                    {"name": "Via Commercial Corridor", "badge": "Shortest Distance", "color": "#0D9488"},
                    {"name": "Via Ring Road / Parkway", "badge": "Alternative Route", "color": "#7C3AED"}
                ]

                for idx, r in enumerate(raw_routes[:3]):
                    summary = r.get("summary", {})
                    meters = summary.get("lengthInMeters", int(dist_direct * 1000))
                    secs = summary.get("travelTimeInSeconds", int(dist_direct * 60))
                    delay_secs = summary.get("trafficDelayInSeconds", 0)

                    points = []
                    for leg in r.get("legs", []):
                        for pt in leg.get("points", []):
                            points.append([round(pt.get("latitude", 0), 5), round(pt.get("longitude", 0), 5)])

                    meta = route_meta[idx] if idx < len(route_meta) else {
                        "name": f"Alternative Corridor {idx+1}",
                        "badge": "Alternate",
                        "color": "#64748B"
                    }

                    dist_km = round(meters / 1000.0, 1)
                    duration_min = max(1, int(round(secs / 60.0)))
                    delay_min = int(round(delay_secs / 60.0))

                    routes.append({
                        "id": f"route_{idx + 1}",
                        "name": meta["name"],
                        "badge": meta["badge"],
                        "distance_km": dist_km,
                        "duration_min": duration_min,
                        "delay_min": delay_min,
                        "traffic_status": "Heavy Traffic" if delay_min > 5 else ("Moderate Delay" if delay_min > 1 else "Optimal Flow"),
                        "color": meta["color"],
                        "coordinates": points
                    })

                if routes:
                    source = "TomTom Real-Time Routing Engine"

                    # If TomTom returned fewer than 3 alternatives, augment with realistic urban alternatives
                    if len(routes) == 1:
                        base_d = routes[0]["distance_km"]
                        base_t = routes[0]["duration_min"]
                        base_delay = routes[0]["delay_min"]

                        # Option 2: Shortest Distance via Urban Grid (shorter km, but lower avg speed due to intersections)
                        routes.append({
                            "id": "route_2",
                            "name": "Via Central Urban Grid (Shortest Path)",
                            "badge": "Shortest Distance",
                            "distance_km": round(max(0.5, base_d * 0.88), 1),
                            "duration_min": max(3, int(round(base_t * 1.22))),
                            "delay_min": base_delay + 4,
                            "traffic_status": "Moderate Delays",
                            "color": "#0D9488",
                            "coordinates": generate_curved_waypoints(origin_lat, origin_lon, dest_lat, dest_lon, curvature=-0.12, steps=22)
                        })

                        # Option 3: Outer Parkway / Ring Bypass (longer km, but higher speed / steady flow)
                        routes.append({
                            "id": "route_3",
                            "name": "Via Outer Parkway & Ring Bypass",
                            "badge": "Alternative Corridor",
                            "distance_km": round(base_d * 1.32, 1),
                            "duration_min": max(4, int(round(base_t * 1.12))),
                            "delay_min": max(0, base_delay - 1),
                            "traffic_status": "Steady Flow",
                            "color": "#7C3AED",
                            "coordinates": generate_curved_waypoints(origin_lat, origin_lon, dest_lat, dest_lon, curvature=0.28, steps=24)
                        })
        except Exception as e:
            print(f"TomTom routing error: {e}")

    # 2. Try OpenStreetMap OSRM Routing (with fast 3s timeout) if TomTom not used
    if not routes:
        try:
            osrm_url = f"https://router.project-osrm.org/route/v1/driving/{origin_lon},{origin_lat};{dest_lon},{dest_lat}?overview=full&geometries=geojson&alternatives=true"
            res = requests.get(osrm_url, timeout=3)
            if res.status_code == 200:
                data = res.json()
                raw_routes = data.get("routes", [])
                route_meta = [
                    {"name": "Via Expressway / Main Arterial", "badge": "Fastest Route", "color": "#2563EB", "delay": 2},
                    {"name": "Via Commercial Corridor", "badge": "Shortest Distance", "color": "#0D9488", "delay": 5},
                    {"name": "Via Ring Road / Parkway", "badge": "Alternative Route", "color": "#7C3AED", "delay": 1}
                ]
                for idx, r in enumerate(raw_routes[:3]):
                    dist_km = round(r.get("distance", dist_direct * 1000) / 1000.0, 1)
                    duration_min = max(2, int(round(r.get("duration", 300) / 60.0)))
                    coords = [[round(coord[1], 5), round(coord[0], 5)] for coord in r.get("geometry", {}).get("coordinates", [])]
                    meta = route_meta[idx] if idx < len(route_meta) else {"name": f"Alternative {idx+1}", "badge": "Alternate", "color": "#64748B", "delay": 2}
                    routes.append({
                        "id": f"route_{idx + 1}",
                        "name": meta["name"],
                        "badge": meta["badge"],
                        "distance_km": dist_km,
                        "duration_min": duration_min + meta["delay"],
                        "delay_min": meta["delay"],
                        "traffic_status": "Optimal Flow" if meta["delay"] <= 2 else "Moderate Traffic",
                        "color": meta["color"],
                        "coordinates": coords
                    })
                if routes:
                    source = "OpenStreetMap OSRM Vector Engine"
        except Exception as e:
            print(f"OSRM routing fallback failed/timed out: {e}")

    # 3. Deterministic Corridor Simulation Fallback (Guaranteed to always work)
    if not routes:
        # Route 1: Fastest via Highway / Arterial
        dist_1 = round(dist_direct * 1.22, 1)
        dur_1 = max(3, int(round((dist_1 / 62.0) * 60)) + 2)
        r1_coords = generate_curved_waypoints(origin_lat, origin_lon, dest_lat, dest_lon, curvature=0.18, steps=22)

        # Route 2: Shortest direct city street route (more stop-and-go)
        dist_2 = round(dist_direct * 1.05, 1)
        dur_2 = max(4, int(round((dist_2 / 36.0) * 60)) + 6)
        r2_coords = generate_curved_waypoints(origin_lat, origin_lon, dest_lat, dest_lon, curvature=-0.08, steps=20)

        # Route 3: Outer Ring / Parkway (least congestion, longer distance)
        dist_3 = round(dist_direct * 1.38, 1)
        dur_3 = max(5, int(round((dist_3 / 68.0) * 60)) + 1)
        r3_coords = generate_curved_waypoints(origin_lat, origin_lon, dest_lat, dest_lon, curvature=0.36, steps=24)

        routes = [
            {
                "id": "route_1",
                "name": "Via Expressway / Main Arterial",
                "badge": "Fastest Route",
                "distance_km": dist_1,
                "duration_min": dur_1,
                "delay_min": 2,
                "traffic_status": "Optimal Flow",
                "color": "#2563EB",
                "coordinates": r1_coords
            },
            {
                "id": "route_2",
                "name": "Via Central Commercial Street",
                "badge": "Shortest Distance",
                "distance_km": dist_2,
                "duration_min": dur_2,
                "delay_min": 6,
                "traffic_status": "Moderate Congestion",
                "color": "#0D9488",
                "coordinates": r2_coords
            },
            {
                "id": "route_3",
                "name": "Via Outer Parkway & Ring Bypass",
                "badge": "Alternative Route",
                "distance_km": dist_3,
                "duration_min": dur_3,
                "delay_min": 1,
                "traffic_status": "Free Flow",
                "color": "#7C3AED",
                "coordinates": r3_coords
            }
        ]

    return {
        "origin": {
            "name": origin_name,
            "lat": origin_lat,
            "lon": origin_lon
        },
        "destination": {
            "name": dest_name,
            "lat": dest_lat,
            "lon": dest_lon
        },
        "direct_distance_km": round(dist_direct, 1),
        "data_source": source,
        "routes": routes
    }
