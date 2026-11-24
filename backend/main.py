from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import requests
import traffic_data
import tomtom_service

app = FastAPI(
    title="UrbanFlow AI - Smart City Traffic Prediction Engine",
    version="1.0.0",
    description="Backend API powering metropolitan traffic telemetry, ST-GNN inference, and spatial congestion analytics."
)

# Enable CORS for frontend applications (Vite default :5173 and custom :8080)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionRequest(BaseModel):
    sensor_id: str
    horizon: str = "15m"  # 15m, 30m, 60m

class TomTomKeyRequest(BaseModel):
    api_key: str


@app.get("/")
def root():
    return {
        "service": "UrbanFlow AI Backend",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "kpi": "/api/kpi",
            "zones": "/api/zones",
            "sensors": "/api/sensors",
            "routes": "/api/routes",
            "trends": "/api/analytics/trend",
            "hotspots": "/api/analytics/hotspots",
            "model_metrics": "/api/model/metrics",
            "predict": "/api/predict",
            "location_search": "/api/location/search",
            "location_traffic": "/api/location/traffic",
            "calculate_routes": "/api/routes/calculate",
            "settings_tomtom": "/api/settings/tomtom"
        }
    }


@app.get("/api/kpi")
def get_kpi_metrics():
    return traffic_data.KPI_METRICS


@app.get("/api/zones")
def get_zones():
    return traffic_data.METRO_ZONES


@app.get("/api/sensors")
def get_sensors(zone_id: Optional[str] = Query(None, description="Filter by zone ID (e.g. downtown, harbor)")):
    if zone_id and zone_id != "all":
        return [s for s in traffic_data.SENSORS if s.get("zoneId") == zone_id]
    return traffic_data.SENSORS


@app.get("/api/sensors/{sensor_id}")
def get_sensor_detail(sensor_id: str):
    sensor = next((s for s in traffic_data.SENSORS if s["id"].lower() == sensor_id.lower()), None)
    if not sensor:
        raise HTTPException(status_code=404, detail=f"Sensor '{sensor_id}' not found")
    return sensor


@app.get("/api/routes")
def get_traffic_routes():
    return traffic_data.TRAFFIC_ROUTES


@app.get("/api/analytics/trend")
def get_hourly_traffic_trend():
    return traffic_data.HOURLY_TRAFFIC_TREND


@app.get("/api/analytics/peak-hours")
def get_peak_hours():
    return traffic_data.PEAK_HOURS_DISTRIBUTION


@app.get("/api/analytics/hotspots")
def get_congestion_hotspots():
    return traffic_data.CONGESTION_HOTSPOTS


@app.get("/api/model/metrics")
def get_model_metrics():
    return traffic_data.MODEL_METRICS


@app.get("/api/model/actual-vs-predicted")
def get_actual_vs_predicted():
    return traffic_data.ACTUAL_VS_PREDICTED_DATA


@app.get("/api/model/horizon-accuracy")
def get_horizon_accuracy():
    return traffic_data.HORIZON_ACCURACY


@app.get("/api/predict")
def predict_traffic_get(
    sensor_id: str = Query("SN-402", description="Sensor ID (e.g. SN-402, SN-118)"),
    horizon: str = Query("15m", description="Forecast window: 15m, 30m, 60m")
):
    return compute_prediction(sensor_id, horizon)


@app.post("/api/predict")
def predict_traffic_post(req: PredictionRequest):
    return compute_prediction(req.sensor_id, req.horizon)


def compute_prediction(sensor_id: str, horizon: str):
    sensor = next((s for s in traffic_data.SENSORS if s["id"].lower() == sensor_id.lower()), None)
    if not sensor:
        raise HTTPException(status_code=404, detail=f"Sensor '{sensor_id}' not found")

    horizon_key = horizon if horizon in ["15m", "30m", "60m"] else "15m"
    pred = sensor["predictions"].get(horizon_key, sensor["predictions"]["15m"])

    return {
        "sensor_id": sensor["id"],
        "sensor_name": sensor["name"],
        "current_speed": sensor["speed"],
        "current_congestion": sensor["congestion"],
        "horizon": horizon_key,
        "predicted_speed": pred["speed"],
        "predicted_congestion": pred["congestion"],
        "speed_change": pred["change"],
        "confidence": pred["confidence"],
        "risk_level": pred["risk"],
        "prescriptive_action": pred["action"],
        "influences": sensor["influences"],
    }


# ==========================================
# TOMTOM REAL-TIME LOCATION & TRAFFIC FLOW
# ==========================================

@app.get("/api/location/search")
def search_locations_endpoint(query: str = Query(..., min_length=1, description="Location search query")):
    """
    Search real-world locations globally using TomTom Places API (with OpenStreetMap fallback).
    """
    return tomtom_service.search_locations(query)


@app.get("/api/location/traffic")
def get_location_traffic_endpoint(
    lat: float = Query(..., description="Latitude of chosen location"),
    lon: float = Query(..., description="Longitude of chosen location"),
    name: str = Query("Selected Location", description="Display label for location"),
    horizon: str = Query("15m", description="Forecast horizon: 15m, 30m, 60m")
):
    """
    Fetch real-time traffic speeds, delays, congestion %, and AI forecasting using TomTom Flow API.
    """
    return tomtom_service.get_traffic_flow(lat=lat, lon=lon, location_name=name, horizon=horizon)


@app.get("/api/routes/calculate")
def calculate_routes_endpoint(
    origin_lat: float = Query(..., description="Latitude of Origin Point A"),
    origin_lon: float = Query(..., description="Longitude of Origin Point A"),
    dest_lat: float = Query(..., description="Latitude of Destination Point B"),
    dest_lon: float = Query(..., description="Longitude of Destination Point B"),
    origin_name: str = Query("Origin Point", description="Label of origin"),
    dest_name: str = Query("Destination Point", description="Label of destination")
):
    """
    Calculate and compare travel routes from Point A to Point B with live traffic,
    alternative paths, distances, travel times, and map polylines.
    """
    return tomtom_service.calculate_routes(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        origin_name=origin_name,
        dest_name=dest_name
    )


@app.get("/api/settings/tomtom")
def get_tomtom_settings():
    """
    Check if a TomTom API key is active.
    """
    key = tomtom_service.get_api_key()
    masked = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else ("Configured" if key else "")
    return {
        "configured": bool(key),
        "masked_key": masked
    }


@app.post("/api/settings/tomtom")
def save_tomtom_key(req: TomTomKeyRequest):
    """
    Save or update TomTom API Key dynamically in backend environment.
    """
    return tomtom_service.set_api_key(req.api_key)


@app.get("/api/map/tile/{z}/{x}/{y}.png")
def get_map_tile(z: int, x: int, y: int):
    """
    Proxy high-definition TomTom map tiles with fallback to OpenStreetMap and Esri (100% watermark-free, zero blank tiles).
    """
    key = tomtom_service.get_api_key()
    if key and z <= 18:
        try:
            url = f"https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key={key}"
            res = requests.get(url, timeout=4)
            if res.status_code == 200 and len(res.content) > 500:
                return Response(content=res.content, media_type="image/png")
        except Exception as e:
            print(f"TomTom tile proxy error: {e}")

    # High-detail fallback to OpenStreetMap (supports up to zoom 19 globally)
    if z <= 19:
        try:
            osm_url = f"https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            res = requests.get(osm_url, headers={"User-Agent": "UrbanFlow-TrafficEngine/1.0"}, timeout=4)
            if res.status_code == 200 and len(res.content) > 500:
                return Response(content=res.content, media_type="image/png")
        except Exception:
            pass

    # Fallback to Esri World Street Map (capped at zoom 17 to prevent blank 2521-byte tiles)
    safe_z = min(z, 17)
    safe_factor = 2 ** (z - safe_z)
    safe_x = x // safe_factor
    safe_y = y // safe_factor
    esri_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{safe_z}/{safe_y}/{safe_x}"
    try:
        res = requests.get(esri_url, timeout=4)
        if res.status_code == 200:
            return Response(content=res.content, media_type="image/png")
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Tile not found")

