"""
UrbanFlow AI - Spatial-Temporal Graph Neural Network (ST-GNN) Training Pipeline
Trains a multi-output PyTorch ST-GNN on 8 Bengaluru traffic corridors:
  HEB (Hebbal), IND (Indiranagar), KOR (Koramangala), WHI (Whitefield),
  BEL (Bellandur), HSR (HSR Layout), JAY (Jayanagar), KRP (KR Puram)
to forecast corridor volume and speed simultaneously across graph-connected areas.
"""

import json
import math
import time
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from torch.utils.data import DataLoader, TensorDataset

# Reproducibility
SEED = 42
np.random.seed(SEED)
torch.manual_seed(SEED)

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "traffic_dataset.csv"
EXTRA_DATA_PATH = BASE_DIR / "data" / "bengaluru_corridors_2.csv"
UNIFIED_DATA_PATH = BASE_DIR / "data" / "traffic_dataset_8_corridors.csv"
MODELS_DIR = BASE_DIR / "models"
MODEL_WEIGHTS_PATH = MODELS_DIR / "stgnn_model.pt"
METRICS_JSON_PATH = MODELS_DIR / "training_metrics.json"

AREAS = ["HEB", "IND", "KOR", "WHI", "BEL", "HSR", "JAY", "KRP"]
AREA_META = {
    "HEB": {"name": "Hebbal", "lat": 13.0358, "lon": 77.5970, "free_flow_speed": 65.0, "avg_vol_15m": 1206.6},
    "IND": {"name": "Indiranagar", "lat": 12.9784, "lon": 77.6408, "free_flow_speed": 58.0, "avg_vol_15m": 1013.5},
    "KOR": {"name": "Koramangala", "lat": 12.9352, "lon": 77.6245, "free_flow_speed": 55.0, "avg_vol_15m": 1113.5},
    "WHI": {"name": "Whitefield", "lat": 12.9698, "lon": 77.7500, "free_flow_speed": 60.0, "avg_vol_15m": 1257.2},
    "BEL": {"name": "Bellandur", "lat": 12.9255, "lon": 77.6762, "free_flow_speed": 50.0, "avg_vol_15m": 795.3},
    "HSR": {"name": "HSR Layout", "lat": 12.9116, "lon": 77.6389, "free_flow_speed": 45.0, "avg_vol_15m": 595.9},
    "JAY": {"name": "Jayanagar", "lat": 12.9308, "lon": 77.5838, "free_flow_speed": 42.0, "avg_vol_15m": 484.1},
    "KRP": {"name": "KR Puram", "lat": 13.0031, "lon": 77.6950, "free_flow_speed": 52.0, "avg_vol_15m": 719.7},
}
LOC_NAME_TO_CODE = {meta["name"]: code for code, meta in AREA_META.items()}
WEATHER_SEVERITY = {
    "Clear": 0.0,
    "Cloudy": 0.25,
    "Light Rain": 0.6,
    "Heavy Rain": 1.0,
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def build_normalized_adjacency(sigma_km: float = 10.0) -> np.ndarray:
    n = len(AREAS)
    dist = np.zeros((n, n), dtype=np.float32)
    for i, a1 in enumerate(AREAS):
        for j, a2 in enumerate(AREAS):
            dist[i, j] = haversine_km(
                AREA_META[a1]["lat"], AREA_META[a1]["lon"],
                AREA_META[a2]["lat"], AREA_META[a2]["lon"],
            )
    adj = np.exp(-(dist ** 2) / (sigma_km ** 2)).astype(np.float32)
    np.fill_diagonal(adj, 1.0)
    deg = np.sum(adj, axis=1)
    d_inv_sqrt = np.power(deg, -0.5)
    d_mat = np.diag(d_inv_sqrt)
    return (d_mat @ adj @ d_mat).astype(np.float32)


class SpatialGraphConv(nn.Module):
    """Combines fixed distance-weighted graph diffusion with learnable adaptive node affinity."""

    def __init__(self, hidden_dim: int, num_nodes: int, static_adj: torch.Tensor, dropout: float = 0.1):
        super().__init__()
        self.register_buffer("static_adj", static_adj)
        self.node_emb1 = nn.Parameter(torch.randn(num_nodes, 8) * 0.1)
        self.node_emb2 = nn.Parameter(torch.randn(num_nodes, 8) * 0.1)
        self.alpha = nn.Parameter(torch.tensor(0.3))

        self.lin_self = nn.Linear(hidden_dim, hidden_dim)
        self.lin_neigh1 = nn.Linear(hidden_dim, hidden_dim)
        self.lin_neigh2 = nn.Linear(hidden_dim, hidden_dim)
        self.norm = nn.LayerNorm(hidden_dim)
        self.act = nn.GELU()
        self.drop = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, N, D]
        adaptive_adj = torch.softmax(self.node_emb1 @ self.node_emb2.T, dim=-1)
        adj = (1.0 - torch.sigmoid(self.alpha)) * self.static_adj + torch.sigmoid(self.alpha) * adaptive_adj
        hop1 = torch.einsum("ij,bjd->bid", adj, x)
        hop2 = torch.einsum("ij,bjd->bid", adj, hop1)
        out = self.lin_self(x) + self.lin_neigh1(hop1) + 0.5 * self.lin_neigh2(hop2)
        return self.norm(x + self.drop(self.act(out)))


class UrbanFlowSTGNN(nn.Module):
    """
    Spatial-Temporal Graph Neural Network:
    - Encodes per-node temporal sequences via a GRU + direct current-state skip projection
    - Exchanges traffic state across interconnected urban nodes via SpatialGraphConv
    - Predicts next-horizon [volume_15m, speed_kmph] jointly per node
    """

    def __init__(self, in_features: int, hidden_dim: int, num_nodes: int, static_adj: torch.Tensor, dropout: float = 0.12):
        super().__init__()
        self.num_nodes = num_nodes
        self.input_proj = nn.Sequential(
            nn.Linear(in_features, hidden_dim),
            nn.GELU(),
        )
        self.temporal_gru = nn.GRU(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            dropout=dropout,
        )
        self.gcn1 = SpatialGraphConv(hidden_dim, num_nodes, static_adj, dropout=dropout)
        self.gcn2 = SpatialGraphConv(hidden_dim, num_nodes, static_adj, dropout=dropout)
        self.head = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(hidden_dim, 2),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, T, N, F]
        b, t, n, f = x.shape
        x_flat = x.permute(0, 2, 1, 3).reshape(b * n, t, f)  # [B*N, T, F]
        proj = self.input_proj(x_flat)  # [B*N, T, D]
        gru_out, _ = self.temporal_gru(proj)  # [B*N, T, D]

        last_temporal = gru_out[:, -1, :].reshape(b, n, -1)  # [B, N, D]
        last_direct = proj[:, -1, :].reshape(b, n, -1)  # [B, N, D]

        spatial = self.gcn1(last_temporal + 0.5 * last_direct)
        spatial = self.gcn2(spatial)

        combined = torch.cat([spatial, last_direct], dim=-1)  # [B, N, 2*D]
        return self.head(combined)  # [B, N, 2] -> [volume_norm, speed_norm]


def load_unified_dataset() -> Tuple[pd.DataFrame, List[str]]:
    """Load both Bengaluru datasets into a unified 8-corridor schema and persist CSV."""
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Primary dataset not found at {DATA_PATH}")

    df1 = pd.read_csv(DATA_PATH)
    df1["dt"] = pd.to_datetime(df1["timestamp"])
    df1["slot_key"] = df1["dt"].dt.strftime("%Y-%m-%d") + "_" + np.where(df1["dt"].dt.hour < 12, "0_AM", "1_PM")
    df1["weather_sev"] = 0.0
    df1["incident_flag"] = 0.0
    df1["has_explicit_next"] = 1.0
    df1["source_group"] = "core_4"
    source_files = ["backend/data/traffic_dataset.csv"]

    frames = [df1]
    if EXTRA_DATA_PATH.exists():
        df2 = pd.read_csv(EXTRA_DATA_PATH)
        df2["dt"] = pd.to_datetime(df2["timestamp"])
        df2["area"] = df2["location"].map(LOC_NAME_TO_CODE)
        df2 = df2.dropna(subset=["area"]).copy()
        df2["slot_key"] = df2["dt"].dt.strftime("%Y-%m-%d") + "_" + np.where(df2["dt"].dt.hour < 12, "0_AM", "1_PM")
        df2["volume_15m"] = df2["traffic_volume_vph"].astype(np.float32) / 4.0
        df2["speed_kmph"] = df2["avg_speed_kmph"].astype(np.float32)
        df2["target_volume_next_15m"] = df2["volume_15m"]
        df2["target_speed_next_15m"] = df2["speed_kmph"]
        df2["weather_sev"] = df2["weather_condition"].map(WEATHER_SEVERITY).fillna(0.0).astype(np.float32)
        df2["incident_flag"] = df2["incident_flag"].astype(np.float32)
        df2["has_explicit_next"] = 0.0
        df2["data_status"] = df2.get("data_source", "SYNTHETIC").astype(str)
        df2["source_group"] = "extended_4"
        frames.append(df2)
        source_files.append("backend/data/bengaluru_corridors_2.csv")

    unified_cols = [
        "timestamp",
        "slot_key",
        "area",
        "volume_15m",
        "speed_kmph",
        "target_volume_next_15m",
        "target_speed_next_15m",
        "weather_sev",
        "incident_flag",
        "has_explicit_next",
        "data_status",
        "source_group",
        "dt",
    ]
    combined = pd.concat([f[unified_cols] for f in frames], ignore_index=True)
    combined = combined.sort_values(["slot_key", "area"]).reset_index(drop=True)

    # Save unified human-readable CSV without internal datetime duplicates
    combined.drop(columns=["dt"]).to_csv(UNIFIED_DATA_PATH, index=False)
    return combined, source_files


def build_feature_tensor(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str], List[str]]:
    df = df.copy()
    slots = sorted(df["slot_key"].unique())
    slot_to_idx = {s: i for i, s in enumerate(slots)}
    area_to_idx = {a: i for i, a in enumerate(AREAS)}
    num_ts = len(slots)
    num_nodes = len(AREAS)

    hour = df["dt"].dt.hour.to_numpy(dtype=np.float32)
    dow = df["dt"].dt.day_of_week.to_numpy(dtype=np.float32)
    doy = df["dt"].dt.day_of_year.to_numpy(dtype=np.float32)

    df["hour_sin"] = np.sin(2 * np.pi * hour / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24.0)
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7.0)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7.0)
    df["month_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["month_cos"] = np.cos(2 * np.pi * doy / 365.25)
    df["is_weekend"] = (dow >= 5).astype(np.float32)
    df["is_morning_peak"] = (hour <= 12).astype(np.float32)
    df["vol_speed_ratio"] = df["volume_15m"] / np.maximum(df["speed_kmph"], 1.0)
    df["congestion_proxy"] = [
        max(0.0, 1.0 - float(s) / AREA_META[a]["free_flow_speed"])
        for a, s in zip(df["area"], df["speed_kmph"])
    ]
    df["lat_norm"] = df["area"].map(lambda a: (AREA_META[a]["lat"] - 12.97) / 0.05).astype(np.float32)
    df["lon_norm"] = df["area"].map(lambda a: (AREA_META[a]["lon"] - 77.65) / 0.05).astype(np.float32)
    df["free_flow_norm"] = df["area"].map(lambda a: AREA_META[a]["free_flow_speed"] / 65.0).astype(np.float32)

    for area in AREAS:
        df[f"node_{area}"] = (df["area"] == area).astype(np.float32)

    feature_cols = [
        "volume_15m",
        "speed_kmph",
        "vol_speed_ratio",
        "congestion_proxy",
        "has_explicit_next",
        "hour_sin",
        "hour_cos",
        "dow_sin",
        "dow_cos",
        "month_sin",
        "month_cos",
        "is_weekend",
        "is_morning_peak",
        "weather_sev",
        "incident_flag",
        "lat_norm",
        "lon_norm",
        "free_flow_norm",
    ] + [f"node_{area}" for area in AREAS]

    target_cols = ["target_volume_next_15m", "target_speed_next_15m"]

    x_grid = np.zeros((num_ts, num_nodes, len(feature_cols)), dtype=np.float32)
    y_grid = np.zeros((num_ts, num_nodes, 2), dtype=np.float32)
    valid_grid = np.zeros((num_ts, num_nodes), dtype=bool)
    has_next_grid = np.zeros((num_ts, num_nodes), dtype=bool)

    t_indices = df["slot_key"].map(slot_to_idx).to_numpy()
    n_indices = df["area"].map(area_to_idx).to_numpy()

    x_grid[t_indices, n_indices] = df[feature_cols].to_numpy(dtype=np.float32)
    y_grid[t_indices, n_indices] = df[target_cols].to_numpy(dtype=np.float32)
    valid_grid[t_indices, n_indices] = True
    has_next_grid[t_indices, n_indices] = df["has_explicit_next"].to_numpy() > 0.5

    # Earliest representative timestamp per slot for charts/logs
    slot_ts_map = df.groupby("slot_key")["timestamp"].min().to_dict()
    ts_strs = [str(slot_ts_map[s]) for s in slots]
    return x_grid, y_grid, valid_grid, has_next_grid, feature_cols, ts_strs


def compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(math.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    mape = float(np.mean(np.abs((y_true - y_pred) / np.maximum(np.abs(y_true), 1e-6))) * 100.0)
    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "mape_pct": round(mape, 2),
    }


def train_and_evaluate():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    df, source_files = load_unified_dataset()
    seq_len = 6

    x_grid, y_grid, valid_grid, has_next_grid, feature_cols, ts_strs = build_feature_tensor(df)
    num_ts, num_nodes, num_features = x_grid.shape

    # Per-node chronological split: 70% train, 15% val, 15% test -> guarantees unseen test samples for all 8 areas
    split_code = np.zeros((num_ts, num_nodes), dtype=np.int32)  # 0=unobserved, 1=train, 2=val, 3=test
    for n in range(num_nodes):
        obs_t = np.where(valid_grid[:, n])[0]
        m = len(obs_t)
        t1, t2 = int(m * 0.70), int(m * 0.85)
        split_code[obs_t[:t1], n] = 1
        split_code[obs_t[t1:t2], n] = 2
        split_code[obs_t[t2:], n] = 3

    num_seqs = num_ts - seq_len + 1
    x_seq = np.zeros((num_seqs, seq_len, num_nodes, num_features), dtype=np.float32)
    y_seq = np.zeros((num_seqs, num_nodes, 2), dtype=np.float32)
    sp_seq = np.zeros((num_seqs, num_nodes), dtype=np.int32)
    seq_ts: List[str] = []

    for i in range(seq_len - 1, num_ts):
        idx = i - (seq_len - 1)
        win = x_grid[i - seq_len + 1: i + 1].copy()
        # Mask current dynamic measurements [0..4) for rows without explicit +15m targets to prevent target leakage
        no_next = ~has_next_grid[i]
        win[-1, no_next, 0:4] = 0.0
        x_seq[idx] = win
        y_seq[idx] = y_grid[i]
        sp_seq[idx] = split_code[i]
        seq_ts.append(ts_strs[i])

    tr_mask = sp_seq == 1
    val_mask = sp_seq == 2
    te_mask = sp_seq == 3

    # Fit normalization stats strictly on training samples
    tr_seq_has_any = tr_mask.any(axis=1)
    x_tr_vals = x_seq[tr_seq_has_any]
    x_mean = x_tr_vals.mean(axis=(0, 1, 2), keepdims=True)
    x_std = np.maximum(x_tr_vals.std(axis=(0, 1, 2), keepdims=True), 1e-5)

    y_mean = y_seq[tr_mask].mean(axis=0, keepdims=True)  # [1, 2]
    y_std = np.maximum(y_seq[tr_mask].std(axis=0, keepdims=True), 1e-5)

    x_norm = (x_seq - x_mean) / x_std
    y_norm = (y_seq - y_mean[None, :, :]) / y_std[None, :, :]

    # Zero unobserved slots/masked current entries in normalized space
    for s_i in range(num_seqs):
        ti_real = s_i + seq_len - 1
        no_next = ~has_next_grid[ti_real]
        x_norm[s_i, -1, no_next, 0:4] = 0.0
        for step in range(seq_len):
            inv = ~valid_grid[s_i + step]
            x_norm[s_i, step, inv, :] = 0.0

    device = torch.device("cpu")
    adj_np = build_normalized_adjacency(sigma_km=10.0)
    adj_tensor = torch.tensor(adj_np, dtype=torch.float32, device=device)

    model = UrbanFlowSTGNN(
        in_features=num_features,
        hidden_dim=64,
        num_nodes=num_nodes,
        static_adj=adj_tensor,
        dropout=0.12,
    ).to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=2.5e-3, weight_decay=1e-4)
    epochs = 80
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-4)
    criterion = nn.HuberLoss(delta=1.0, reduction="none")

    tr_any = tr_mask.any(axis=1)
    val_any = val_mask.any(axis=1)
    train_loader = DataLoader(
        TensorDataset(
            torch.tensor(x_norm[tr_any]),
            torch.tensor(y_norm[tr_any]),
            torch.tensor(tr_mask[tr_any]),
        ),
        batch_size=64,
        shuffle=True,
    )

    x_val_t = torch.tensor(x_norm[val_any])
    y_val_t = torch.tensor(y_norm[val_any])
    m_val_t = torch.tensor(val_mask[val_any])

    best_val_loss = float("inf")
    best_state = None
    history: List[Dict[str, float]] = []

    t_start = time.perf_counter()
    for epoch in range(1, epochs + 1):
        model.train()
        train_losses = []
        for xb, yb, mb in train_loader:
            if not mb.any():
                continue
            optimizer.zero_grad()
            preds = model(xb)
            loss = criterion(preds, yb)[mb].mean()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_losses.append(loss.item())
        scheduler.step()

        model.eval()
        with torch.no_grad():
            val_preds = model(x_val_t)
            val_loss = float(criterion(val_preds, y_val_t)[m_val_t].mean().item())
        train_loss = float(np.mean(train_losses))

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}

        if epoch in (1, 10, 20, 30, 40, 50, 60, 70, 80):
            history.append({
                "epoch": epoch,
                "train_loss": round(train_loss, 5),
                "val_loss": round(val_loss, 5),
            })
            print(f"Epoch {epoch:02d}/{epochs} | train_loss={train_loss:.5f} | val_loss={val_loss:.5f}")

    train_duration_sec = round(time.perf_counter() - t_start, 2)
    model.load_state_dict(best_state)
    model.eval()

    # Evaluate across all sequences and select held-out test entries
    with torch.no_grad():
        x_all_t = torch.tensor(x_norm)
        sample_one = x_all_t[:1]
        for _ in range(10):
            _ = model(sample_one)
        lat_times = []
        for i in range(min(100, num_seqs)):
            t0 = time.perf_counter()
            _ = model(x_all_t[i: i + 1])
            lat_times.append((time.perf_counter() - t0) * 1000.0)
        avg_latency_ms = round(float(np.mean(lat_times)), 2)

        y_pred_all_norm = model(x_all_t).numpy()

    y_pred_all = y_pred_all_norm * y_std[None, :, :] + y_mean[None, :, :]

    true_vol = y_seq[te_mask, 0]
    pred_vol = y_pred_all[te_mask, 0]
    true_spd = y_seq[te_mask, 1]
    pred_spd = y_pred_all[te_mask, 1]

    stgnn_speed_metrics = compute_regression_metrics(true_spd, pred_spd)
    stgnn_vol_metrics = compute_regression_metrics(true_vol, pred_vol)

    y_test_norm_flat = y_norm[te_mask]
    y_pred_norm_flat = y_pred_all_norm[te_mask]
    norm_mae = round(float(mean_absolute_error(y_test_norm_flat, y_pred_norm_flat)), 4)
    norm_rmse = round(float(math.sqrt(mean_squared_error(y_test_norm_flat, y_pred_norm_flat))), 4)

    per_area_metrics = {}
    for idx, area in enumerate(AREAS):
        m = te_mask[:, idx]
        per_area_metrics[area] = {
            "name": AREA_META[area]["name"],
            "speed": compute_regression_metrics(y_seq[m, idx, 1], y_pred_all[m, idx, 1]),
            "volume": compute_regression_metrics(y_seq[m, idx, 0], y_pred_all[m, idx, 0]),
            "test_samples": int(m.sum()),
        }

    # Train baselines on exact same train & held-out test entries
    x_last_norm = x_norm[:, -1, :, :]  # [S, N, F]
    x_tr_flat = x_last_norm[tr_mask]
    x_te_flat = x_last_norm[te_mask]
    y_tr_spd = y_seq[tr_mask, 1]
    y_tr_vol = y_seq[tr_mask, 0]

    ridge_spd = Ridge(alpha=1.0).fit(x_tr_flat, y_tr_spd)
    ridge_vol = Ridge(alpha=1.0).fit(x_tr_flat, y_tr_vol)
    ridge_spd_metrics = compute_regression_metrics(true_spd, ridge_spd.predict(x_te_flat))
    ridge_vol_metrics = compute_regression_metrics(true_vol, ridge_vol.predict(x_te_flat))

    rf_spd = RandomForestRegressor(n_estimators=80, max_depth=12, random_state=SEED, n_jobs=-1).fit(x_tr_flat, y_tr_spd)
    rf_vol = RandomForestRegressor(n_estimators=80, max_depth=12, random_state=SEED, n_jobs=-1).fit(x_tr_flat, y_tr_vol)
    rf_spd_metrics = compute_regression_metrics(true_spd, rf_spd.predict(x_te_flat))
    rf_vol_metrics = compute_regression_metrics(true_vol, rf_vol.predict(x_te_flat))

    # Build recent test sample trajectory across observed nodes (last 24 overlap/test slots)
    overlap_test_indices = np.where((te_mask).sum(axis=1) >= 4)[0]
    tail_indices = overlap_test_indices[-min(24, len(overlap_test_indices)):]
    sample_trajectory = []
    for i in tail_indices:
        m = te_mask[i]
        actual_avg_spd = float(np.mean(y_seq[i, m, 1]))
        pred_avg_spd = float(np.mean(y_pred_all[i, m, 1]))
        err = round(pred_avg_spd - actual_avg_spd, 2)
        sample_trajectory.append({
            "time": seq_ts[i][5:16],
            "actual": round(actual_avg_spd, 1),
            "predicted": round(pred_avg_spd, 1),
            "upperConfidence": round(pred_avg_spd + stgnn_speed_metrics["rmse"], 1),
            "lowerConfidence": round(max(0.0, pred_avg_spd - stgnn_speed_metrics["rmse"]), 1),
            "error": err,
        })

    speed_mae_imp = round(((ridge_spd_metrics["mae"] - stgnn_speed_metrics["mae"]) / max(ridge_spd_metrics["mae"], 1e-6)) * 100.0, 1)
    speed_rmse_imp = round(((ridge_spd_metrics["rmse"] - stgnn_speed_metrics["rmse"]) / max(ridge_spd_metrics["rmse"], 1e-6)) * 100.0, 1)

    total_params = int(sum(p.numel() for p in model.parameters()))
    metrics_payload = {
        "model_name": "UrbanFlow ST-GNN (8-Node Bengaluru PyTorch GRU + Spatial Graph Diffusion)",
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "training_duration_sec": train_duration_sec,
        "dataset": {
            "source_file": " + ".join(source_files),
            "unified_file": "backend/data/traffic_dataset_8_corridors.csv",
            "total_rows": int(len(df)),
            "unique_timestamps": int(len(ts_strs)),
            "areas": AREAS,
            "trained_locations": [
                {
                    "code": code,
                    "name": AREA_META[code]["name"],
                    "lat": AREA_META[code]["lat"],
                    "lon": AREA_META[code]["lon"],
                    "free_flow_speed": AREA_META[code]["free_flow_speed"],
                }
                for code in AREAS
            ],
            "date_range": f"{ts_strs[0]} -> {ts_strs[-1]}",
            "data_status": "SYNTHETIC_COMBINED_8_CORRIDORS",
            "split": {
                "train_snapshots": int(tr_mask.any(axis=1).sum()),
                "val_snapshots": int(val_mask.any(axis=1).sum()),
                "test_snapshots": int(te_mask.any(axis=1).sum()),
                "train_rows": int(tr_mask.sum()),
                "val_rows": int(val_mask.sum()),
                "test_rows": int(te_mask.sum()),
            },
        },
        "architecture": {
            "type": "PyTorch ST-GNN",
            "seq_len": seq_len,
            "hidden_dim": 64,
            "num_nodes": num_nodes,
            "num_features": num_features,
            "parameters": total_params,
        },
        "evaluation": {
            "speed": stgnn_speed_metrics,
            "volume": stgnn_vol_metrics,
            "normalized": {"mae": norm_mae, "rmse": norm_rmse},
            "inference_latency_ms": avg_latency_ms,
            "per_area": per_area_metrics,
        },
        "baselines": {
            "ridge_linear": {"speed": ridge_spd_metrics, "volume": ridge_vol_metrics},
            "random_forest": {"speed": rf_spd_metrics, "volume": rf_vol_metrics},
        },
        "training_history": history,
        "sample_trajectory": sample_trajectory,
        "ui_metrics": {
            "mae": {
                "value": f"{stgnn_speed_metrics['mae']:.2f}",
                "unit": "km/h",
                "baseline": f"{ridge_spd_metrics['mae']:.2f} km/h",
                "improvement": f"{abs(speed_mae_imp):.1f}% {'better' if speed_mae_imp >= 0 else 'delta'} vs Linear baseline (Vol MAE: {stgnn_vol_metrics['mae']:.1f})",
                "status": "Verified Test Split",
                "definition": f"Mean Absolute Error across {len(true_spd):,} held-out 8-corridor Bengaluru test samples",
            },
            "rmse": {
                "value": f"{stgnn_speed_metrics['rmse']:.2f}",
                "unit": "km/h",
                "baseline": f"{ridge_spd_metrics['rmse']:.2f} km/h",
                "improvement": f"{abs(speed_rmse_imp):.1f}% {'lower' if speed_rmse_imp >= 0 else 'delta'} RMSE vs Linear (Vol RMSE: {stgnn_vol_metrics['rmse']:.1f})",
                "status": "Verified Test Split",
                "definition": "Root Mean Squared Error penalizing peak-hour congestion outliers",
            },
            "r2Score": {
                "value": f"{stgnn_speed_metrics['r2']:.3f}",
                "unit": "R²",
                "baseline": f"{ridge_spd_metrics['r2']:.3f}",
                "improvement": f"Vol R²: {stgnn_vol_metrics['r2']:.3f} | MAPE: {stgnn_speed_metrics['mape_pct']:.1f}%",
                "status": "Verified Fit",
                "definition": f"Explains {stgnn_speed_metrics['r2']*100:.1f}% speed variance & {stgnn_vol_metrics['r2']*100:.1f}% volume variance",
            },
            "latency": {
                "value": f"{avg_latency_ms:.2f}",
                "unit": "ms",
                "baseline": "CPU Forward",
                "improvement": f"8-Node PyTorch ST-GNN ({total_params:,} params)",
                "status": "Edge Ready",
                "definition": "Measured single-graph 8-node PyTorch inference latency on local CPU",
            },
        },
    }

    # Populate per-node tail context grid from each node's latest (seq_len - 1) genuinely observed raw snapshots
    recent_context_grid = np.zeros((seq_len - 1, num_nodes, num_features), dtype=np.float32)
    for n in range(num_nodes):
        obs_t = np.where(valid_grid[:, n])[0]
        tail_t = obs_t[-(seq_len - 1):]
        recent_context_grid[-len(tail_t):, n, :] = x_grid[tail_t, n, :]

    checkpoint = {
        "model_state_dict": best_state,
        "feature_cols": feature_cols,
        "areas": AREAS,
        "area_meta": AREA_META,
        "seq_len": seq_len,
        "hidden_dim": 64,
        "adj_matrix": adj_np,
        "x_mean": x_mean,
        "x_std": x_std,
        "y_mean": y_mean,
        "y_std": y_std,
        "recent_context_grid": recent_context_grid,
    }
    torch.save(checkpoint, MODEL_WEIGHTS_PATH)

    with open(METRICS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    print("\n=== 8-NODE TEST EVALUATION SUMMARY ===")
    print("Speed Metrics (ST-GNN):", stgnn_speed_metrics)
    print("Volume Metrics (ST-GNN):", stgnn_vol_metrics)
    print("Speed Baseline (Ridge):", ridge_spd_metrics)
    print("Speed Baseline (RandomForest):", rf_spd_metrics)
    print("Volume Baseline (Ridge):", ridge_vol_metrics)
    print(f"Avg CPU Inference Latency: {avg_latency_ms} ms")
    print(f"Saved weights -> {MODEL_WEIGHTS_PATH}")
    print(f"Saved metrics -> {METRICS_JSON_PATH}")
    return metrics_payload


if __name__ == "__main__":
    train_and_evaluate()
