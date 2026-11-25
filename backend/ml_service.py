"""
UrbanFlow AI - PyTorch ST-GNN Model Serving & Inference Service
Loads trained weights from backend/models/stgnn_model.pt and provides
real-time single-horizon & recursive multi-horizon forecasting + evaluation metrics.
"""

import datetime as dt
import json
import math
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import torch

try:
    from train_model import AREA_META, AREAS, MODEL_WEIGHTS_PATH, METRICS_JSON_PATH, UrbanFlowSTGNN, haversine_km
except ImportError:
    from backend.train_model import AREA_META, AREAS, MODEL_WEIGHTS_PATH, METRICS_JSON_PATH, UrbanFlowSTGNN, haversine_km

_CACHE: Dict[str, Any] = {
    "loaded": False,
    "model": None,
    "checkpoint": None,
    "metrics": None,
}


def _ensure_loaded() -> bool:
    if _CACHE["loaded"] and _CACHE["model"] is not None:
        return True

    if not MODEL_WEIGHTS_PATH.exists():
        return False

    ckpt = torch.load(MODEL_WEIGHTS_PATH, map_location="cpu", weights_only=False)
    adj_t = torch.tensor(ckpt["adj_matrix"], dtype=torch.float32)
    model = UrbanFlowSTGNN(
        in_features=len(ckpt["feature_cols"]),
        hidden_dim=int(ckpt["hidden_dim"]),
        num_nodes=len(ckpt["areas"]),
        static_adj=adj_t,
        dropout=0.0,
    )
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    metrics_data = None
    if METRICS_JSON_PATH.exists():
        with open(METRICS_JSON_PATH, "r", encoding="utf-8") as f:
            metrics_data = json.load(f)

    _CACHE["model"] = model
    _CACHE["checkpoint"] = ckpt
    _CACHE["metrics"] = metrics_data
    _CACHE["loaded"] = True
    return True


def is_model_ready() -> bool:
    return _ensure_loaded()


def invalidate_cache() -> None:
    """Clear in-memory model weights and metrics cache so freshly trained artifacts reload."""
    _CACHE["loaded"] = False
    _CACHE["model"] = None
    _CACHE["checkpoint"] = None
    _CACHE["metrics"] = None


def map_coords_to_area(lat: Optional[float], lon: Optional[float]) -> Dict[str, Any]:
    if lat is None or lon is None:
        return {"area": "IND", "name": AREA_META["IND"]["name"], "distance_km": 0.0}

    best_area = "IND"
    best_dist = float("inf")
    for code, meta in AREA_META.items():
        d = haversine_km(lat, lon, meta["lat"], meta["lon"])
        if d < best_dist:
            best_dist = d
            best_area = code

    return {
        "area": best_area,
        "name": AREA_META[best_area]["name"],
        "distance_km": round(best_dist, 2),
    }


def estimate_volume_from_speed(area: str, speed_kmph: float) -> float:
    """Estimate 15-min corridor vehicle volume consistent with area traffic flow when only speed is given."""
    meta = AREA_META.get(area, AREA_META["IND"])
    free_flow = meta["free_flow_speed"]
    base_vol = {"HEB": 1206.0, "IND": 1013.0, "KOR": 1113.0, "WHI": 1257.0}.get(area, 1140.0)
    congestion = max(0.05, min(0.95, 1.0 - speed_kmph / max(free_flow, 1.0)))
    return round(base_vol * (0.78 + 0.55 * congestion), 1)


def _build_node_feature_vector(area: str, volume_15m: float, speed_kmph: float, when: dt.datetime) -> np.ndarray:
    hour = float(when.hour) + float(when.minute) / 60.0
    dow = float(when.weekday())
    doy = float(when.timetuple().tm_yday)

    vol_speed_ratio = float(volume_15m) / max(float(speed_kmph), 1.0)
    meta = AREA_META.get(area, AREA_META["IND"])
    free_flow = meta["free_flow_speed"]
    cong_proxy = max(0.0, 1.0 - float(speed_kmph) / max(free_flow, 1.0))
    lat_norm = (float(meta["lat"]) - 12.97) / 0.05
    lon_norm = (float(meta["lon"]) - 77.65) / 0.05
    free_flow_norm = float(free_flow) / 65.0

    node_onehot = [1.0 if a == area else 0.0 for a in AREAS]
    return np.array(
        [
            float(volume_15m),
            float(speed_kmph),
            vol_speed_ratio,
            cong_proxy,
            math.sin(2 * math.pi * hour / 24.0),
            math.cos(2 * math.pi * hour / 24.0),
            math.sin(2 * math.pi * dow / 7.0),
            math.cos(2 * math.pi * dow / 7.0),
            math.sin(2 * math.pi * doy / 365.25),
            math.cos(2 * math.pi * doy / 365.25),
            1.0 if dow >= 5 else 0.0,
            1.0 if hour <= 12.0 else 0.0,
            lat_norm,
            lon_norm,
            free_flow_norm,
            *node_onehot,
        ],
        dtype=np.float32,
    )


def _parse_timestamp(ts_str: Optional[str]) -> dt.datetime:
    if ts_str:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M"):
            try:
                return dt.datetime.strptime(ts_str, fmt)
            except ValueError:
                continue
    return dt.datetime.now()


def predict_traffic(
    area: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    volume_15m: Optional[float] = None,
    speed_kmph: Optional[float] = None,
    horizon: str = "15m",
    timestamp_str: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Runs the trained PyTorch ST-GNN model for 15m (1 step), 30m (2 steps), or 60m (4 steps)
    via multi-step recursive spatial-temporal graph inference.
    """
    if not _ensure_loaded():
        return None

    t0 = time.perf_counter()
    ckpt = _CACHE["checkpoint"]
    model: UrbanFlowSTGNN = _CACHE["model"]

    mapped = map_coords_to_area(lat, lon)
    target_area = area.upper() if area and area.upper() in AREAS else mapped["area"]
    area_idx = AREAS.index(target_area)
    when = _parse_timestamp(timestamp_str)

    # Use recent real snapshot grid [T-1, 4, F] as temporal context and append live/current snapshot
    context = ckpt["recent_context_grid"].copy()  # shape: (5, 4, F)
    last_snapshot = context[-1].copy()  # shape: (4, F)

    cur_speed = float(speed_kmph) if speed_kmph is not None else float(last_snapshot[area_idx, 1])
    cur_vol = float(volume_15m) if volume_15m is not None else estimate_volume_from_speed(target_area, cur_speed)

    # Update target node in the current snapshot; keep neighbor nodes synchronized in time with realistic baseline
    cur_snapshot = last_snapshot.copy()
    for i, code in enumerate(AREAS):
        if i == area_idx:
            cur_snapshot[i] = _build_node_feature_vector(code, cur_vol, cur_speed, when)
        else:
            cur_snapshot[i] = _build_node_feature_vector(code, float(last_snapshot[i, 0]), float(last_snapshot[i, 1]), when)

    seq_grid = np.concatenate([context, cur_snapshot[None, :, :]], axis=0)  # (6, 4, F)

    x_mean = ckpt["x_mean"]
    x_std = ckpt["x_std"]
    y_mean = ckpt["y_mean"]
    y_std = ckpt["y_std"]

    horizon_steps = {"15m": 1, "30m": 2, "60m": 4}.get(horizon, 1)
    step_forecasts: Dict[str, Dict[str, float]] = {}

    cur_seq = seq_grid.copy()
    sim_time = when
    with torch.no_grad():
        for step in range(1, 5):  # compute 15m (step 1), 30m (step 2), 60m (step 4)
            x_norm = (cur_seq[None, :, :, :] - x_mean) / x_std
            y_pred_norm = model(torch.tensor(x_norm, dtype=torch.float32)).numpy()  # (1, 4, 2)
            y_pred = y_pred_norm * y_std + y_mean  # (1, 4, 2)

            pred_vol_node = round(max(100.0, float(y_pred[0, area_idx, 0])), 1)
            pred_spd_node = round(max(8.0, min(80.0, float(y_pred[0, area_idx, 1]))), 1)
            free_flow = AREA_META[target_area]["free_flow_speed"]
            pred_cong = min(98, max(5, int((1.0 - pred_spd_node / free_flow) * 100)))

            if step == 1:
                step_forecasts["15m"] = {"volume": pred_vol_node, "speed": pred_spd_node, "congestion": pred_cong}
            elif step == 2:
                step_forecasts["30m"] = {"volume": pred_vol_node, "speed": pred_spd_node, "congestion": pred_cong}
            elif step == 4:
                step_forecasts["60m"] = {"volume": pred_vol_node, "speed": pred_spd_node, "congestion": pred_cong}

            # Advance autoregressive graph sequence by +15m
            sim_time = sim_time + dt.timedelta(minutes=15)
            next_snap = np.zeros_like(cur_snapshot)
            for i, code in enumerate(AREAS):
                nv = max(100.0, float(y_pred[0, i, 0]))
                ns = max(8.0, min(80.0, float(y_pred[0, i, 1])))
                next_snap[i] = _build_node_feature_vector(code, nv, ns, sim_time)
            cur_seq = np.concatenate([cur_seq[1:], next_snap[None, :, :]], axis=0)

    inference_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    selected = step_forecasts.get(horizon, step_forecasts["15m"])
    free_flow = AREA_META[target_area]["free_flow_speed"]
    cur_cong = min(98, max(5, int((1.0 - cur_speed / free_flow) * 100)))
    speed_diff = round(selected["speed"] - cur_speed, 1)

    metrics = _CACHE.get("metrics") or {}
    area_r2 = metrics.get("evaluation", {}).get("per_area", {}).get(target_area, {}).get("speed", {}).get("r2", 0.76)
    base_conf = min(98.5, max(82.0, 88.0 + area_r2 * 10.0 - (horizon_steps - 1) * 1.4))

    return {
        "model_engine": "UrbanFlow PyTorch ST-GNN",
        "matched_area_code": target_area,
        "matched_area_name": AREA_META[target_area]["name"],
        "distance_to_node_km": mapped["distance_km"] if lat is not None else 0.0,
        "current_volume_15m": round(cur_vol, 1),
        "current_speed": round(cur_speed, 1),
        "current_congestion": cur_cong,
        "horizon": horizon if horizon in ("15m", "30m", "60m") else "15m",
        "predicted_volume_15m": selected["volume"],
        "predicted_speed": selected["speed"],
        "predicted_congestion": selected["congestion"],
        "speed_change": f"{'+' if speed_diff > 0 else ''}{speed_diff} km/h",
        "confidence": round(base_conf, 1),
        "inference_latency_ms": inference_ms,
        "all_horizons": step_forecasts,
    }


def get_model_metrics_payload() -> Optional[Dict[str, Any]]:
    if not _ensure_loaded():
        return None
    return _CACHE.get("metrics")
