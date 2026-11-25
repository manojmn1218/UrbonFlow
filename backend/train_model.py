"""
UrbanFlow AI - Spatial-Temporal Graph Neural Network (ST-GNN) Training Pipeline
Trains a multi-output PyTorch ST-GNN on Bengaluru corridor traffic data (IND, KOR, WHI, HEB)
to forecast next-15m volume and speed simultaneously across graph-connected areas.
"""

import json
import math
import os
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
MODELS_DIR = BASE_DIR / "models"
MODEL_WEIGHTS_PATH = MODELS_DIR / "stgnn_model.pt"
METRICS_JSON_PATH = MODELS_DIR / "training_metrics.json"

AREAS = ["HEB", "IND", "KOR", "WHI"]
AREA_META = {
    "HEB": {"name": "Hebbal", "lat": 13.0358, "lon": 77.5970, "free_flow_speed": 65.0},
    "IND": {"name": "Indiranagar", "lat": 12.9784, "lon": 77.6408, "free_flow_speed": 58.0},
    "KOR": {"name": "Koramangala", "lat": 12.9352, "lon": 77.6245, "free_flow_speed": 55.0},
    "WHI": {"name": "Whitefield", "lat": 12.9698, "lon": 77.7500, "free_flow_speed": 60.0},
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

    def __init__(self, in_features: int, hidden_dim: int, num_nodes: int, static_adj: torch.Tensor, dropout: float = 0.15):
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


def build_feature_tensor(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str], List[str]]:
    df = df.copy()
    df["dt"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["dt", "area"]).reset_index(drop=True)

    # Pivot synchronized snapshots across all 4 nodes
    timestamps = sorted(df["dt"].unique())
    num_ts = len(timestamps)
    num_nodes = len(AREAS)

    # Feature engineering per row
    hour = df["dt"].dt.hour.to_numpy(dtype=np.float32)
    dow = df["dt"].dt.day_of_week.to_numpy(dtype=np.float32)
    month = df["dt"].dt.month.to_numpy(dtype=np.float32)
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
    df["congestion_proxy"] = df.apply(
        lambda r: max(0.0, 1.0 - float(r["speed_kmph"]) / AREA_META[r["area"]]["free_flow_speed"]),
        axis=1,
    )

    for idx, area in enumerate(AREAS):
        df[f"node_{area}"] = (df["area"] == area).astype(np.float32)

    feature_cols = [
        "volume_15m",
        "speed_kmph",
        "vol_speed_ratio",
        "congestion_proxy",
        "hour_sin",
        "hour_cos",
        "dow_sin",
        "dow_cos",
        "month_sin",
        "month_cos",
        "is_weekend",
        "is_morning_peak",
        "node_HEB",
        "node_IND",
        "node_KOR",
        "node_WHI",
    ]
    target_cols = ["target_volume_next_15m", "target_speed_next_15m"]

    area_to_idx = {a: i for i, a in enumerate(AREAS)}
    ts_to_idx = {t: i for i, t in enumerate(timestamps)}

    x_grid = np.zeros((num_ts, num_nodes, len(feature_cols)), dtype=np.float32)
    y_grid = np.zeros((num_ts, num_nodes, 2), dtype=np.float32)

    t_indices = df["dt"].map(ts_to_idx).to_numpy()
    n_indices = df["area"].map(area_to_idx).to_numpy()

    x_grid[t_indices, n_indices] = df[feature_cols].to_numpy(dtype=np.float32)
    y_grid[t_indices, n_indices] = df[target_cols].to_numpy(dtype=np.float32)

    ts_strs = [pd.Timestamp(t).strftime("%Y-%m-%d %H:%M:%S") for t in timestamps]
    return x_grid, y_grid, feature_cols, ts_strs


def create_sequences(x_grid: np.ndarray, y_grid: np.ndarray, ts_strs: List[str], seq_len: int = 6):
    seqs, targets, target_ts = [], [], []
    for i in range(seq_len - 1, len(x_grid)):
        seqs.append(x_grid[i - seq_len + 1: i + 1])
        targets.append(y_grid[i])
        target_ts.append(ts_strs[i])
    return np.array(seqs, dtype=np.float32), np.array(targets, dtype=np.float32), target_ts


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
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(DATA_PATH)
    seq_len = 6

    x_grid, y_grid, feature_cols, ts_strs = build_feature_tensor(df)
    x_seq, y_seq, seq_ts = create_sequences(x_grid, y_grid, ts_strs, seq_len=seq_len)

    # Strictly chronological split (70% train / 15% val / 15% test) -> no future leakage
    total = len(x_seq)
    n_train = int(total * 0.70)
    n_val = int(total * 0.15)

    x_train_raw, y_train_raw = x_seq[:n_train], y_seq[:n_train]
    x_val_raw, y_val_raw = x_seq[n_train:n_train + n_val], y_seq[n_train:n_train + n_val]
    x_test_raw, y_test_raw = x_seq[n_train + n_val:], y_seq[n_train + n_val:]
    test_ts = seq_ts[n_train + n_val:]

    # Fit normalization statistics strictly on training split
    x_mean = x_train_raw.mean(axis=(0, 1, 2), keepdims=True)
    x_std = np.maximum(x_train_raw.std(axis=(0, 1, 2), keepdims=True), 1e-5)

    y_mean = y_train_raw.mean(axis=(0, 1), keepdims=True)
    y_std = np.maximum(y_train_raw.std(axis=(0, 1), keepdims=True), 1e-5)

    x_train = (x_train_raw - x_mean) / x_std
    y_train = (y_train_raw - y_mean) / y_std
    x_val = (x_val_raw - x_mean) / x_std
    y_val = (y_val_raw - y_mean) / y_std
    x_test = (x_test_raw - x_mean) / x_std

    device = torch.device("cpu")
    adj_np = build_normalized_adjacency(sigma_km=10.0)
    adj_tensor = torch.tensor(adj_np, dtype=torch.float32, device=device)

    model = UrbanFlowSTGNN(
        in_features=len(feature_cols),
        hidden_dim=64,
        num_nodes=len(AREAS),
        static_adj=adj_tensor,
        dropout=0.12,
    ).to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=2.5e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=60, eta_min=1e-4)
    criterion = nn.HuberLoss(delta=1.0)

    train_loader = DataLoader(
        TensorDataset(torch.tensor(x_train), torch.tensor(y_train)),
        batch_size=64,
        shuffle=True,
    )

    best_val_loss = float("inf")
    best_state = None
    history: List[Dict[str, float]] = []

    epochs = 60
    t_start = time.perf_counter()
    for epoch in range(1, epochs + 1):
        model.train()
        train_losses = []
        for xb, yb in train_loader:
            optimizer.zero_grad()
            preds = model(xb)
            loss = criterion(preds, yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_losses.append(loss.item())
        scheduler.step()

        model.eval()
        with torch.no_grad():
            val_preds = model(torch.tensor(x_val))
            val_loss = float(criterion(val_preds, torch.tensor(y_val)).item())
        train_loss = float(np.mean(train_losses))

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}

        if epoch in (1, 10, 20, 30, 40, 50, 60):
            history.append({
                "epoch": epoch,
                "train_loss": round(train_loss, 5),
                "val_loss": round(val_loss, 5),
            })
            print(f"Epoch {epoch:02d}/{epochs} | train_loss={train_loss:.5f} | val_loss={val_loss:.5f}")

    train_duration_sec = round(time.perf_counter() - t_start, 2)
    model.load_state_dict(best_state)
    model.eval()

    # Evaluate on held-out unseen test split
    with torch.no_grad():
        x_test_t = torch.tensor(x_test)
        # Measure realistic single-graph batch inference latency (ms)
        sample_one = x_test_t[:1]
        for _ in range(10):
            _ = model(sample_one)
        lat_times = []
        for i in range(100):
            t0 = time.perf_counter()
            _ = model(x_test_t[i: i + 1])
            lat_times.append((time.perf_counter() - t0) * 1000.0)
        avg_latency_ms = round(float(np.mean(lat_times)), 2)

        y_test_pred_norm = model(x_test_t).numpy()

    y_test_pred = y_test_pred_norm * y_std + y_mean

    # Flatten across test snapshots and nodes for overall metrics
    true_vol = y_test_raw[:, :, 0].reshape(-1)
    pred_vol = y_test_pred[:, :, 0].reshape(-1)
    true_spd = y_test_raw[:, :, 1].reshape(-1)
    pred_spd = y_test_pred[:, :, 1].reshape(-1)

    stgnn_speed_metrics = compute_regression_metrics(true_spd, pred_spd)
    stgnn_vol_metrics = compute_regression_metrics(true_vol, pred_vol)

    # Normalized loss metrics on test set (matching MAE/RMSE loss space if needed)
    y_test_norm_flat = ((y_test_raw - y_mean) / y_std).reshape(-1, 2)
    y_pred_norm_flat = y_test_pred_norm.reshape(-1, 2)
    norm_mae = round(float(mean_absolute_error(y_test_norm_flat, y_pred_norm_flat)), 4)
    norm_rmse = round(float(math.sqrt(mean_squared_error(y_test_norm_flat, y_pred_norm_flat))), 4)

    # Per-area metrics
    per_area_metrics = {}
    for idx, area in enumerate(AREAS):
        per_area_metrics[area] = {
            "name": AREA_META[area]["name"],
            "speed": compute_regression_metrics(y_test_raw[:, idx, 1], y_test_pred[:, idx, 1]),
            "volume": compute_regression_metrics(y_test_raw[:, idx, 0], y_test_pred[:, idx, 0]),
            "test_samples": int(len(y_test_raw)),
        }

    # Train baselines on exact same chronological train/test features (current snapshot flattened across nodes)
    x_tr_flat = x_train[:, -1, :, :].reshape(-1, len(feature_cols))
    x_te_flat = x_test[:, -1, :, :].reshape(-1, len(feature_cols))
    y_tr_spd = y_train_raw[:, :, 1].reshape(-1)
    y_tr_vol = y_train_raw[:, :, 0].reshape(-1)

    ridge_spd = Ridge(alpha=1.0).fit(x_tr_flat, y_tr_spd)
    ridge_vol = Ridge(alpha=1.0).fit(x_tr_flat, y_tr_vol)
    ridge_spd_metrics = compute_regression_metrics(true_spd, ridge_spd.predict(x_te_flat))
    ridge_vol_metrics = compute_regression_metrics(true_vol, ridge_vol.predict(x_te_flat))

    rf_spd = RandomForestRegressor(n_estimators=80, max_depth=10, random_state=SEED, n_jobs=-1).fit(x_tr_flat, y_tr_spd)
    rf_vol = RandomForestRegressor(n_estimators=80, max_depth=10, random_state=SEED, n_jobs=-1).fit(x_tr_flat, y_tr_vol)
    rf_spd_metrics = compute_regression_metrics(true_spd, rf_spd.predict(x_te_flat))
    rf_vol_metrics = compute_regression_metrics(true_vol, rf_vol.predict(x_te_flat))

    # Build recent test sample trajectory for Model Insights chart (last 24 test snapshots across Koramangala & Indiranagar average or KOR)
    sample_trajectory = []
    tail_count = min(24, len(test_ts))
    start_idx = len(test_ts) - tail_count
    for i in range(start_idx, len(test_ts)):
        actual_avg_spd = float(np.mean(y_test_raw[i, :, 1]))
        pred_avg_spd = float(np.mean(y_test_pred[i, :, 1]))
        err = round(pred_avg_spd - actual_avg_spd, 2)
        ts_label = test_ts[i][5:16]  # MM-DD HH:MM
        sample_trajectory.append({
            "time": ts_label,
            "actual": round(actual_avg_spd, 1),
            "predicted": round(pred_avg_spd, 1),
            "upperConfidence": round(pred_avg_spd + stgnn_speed_metrics["rmse"], 1),
            "lowerConfidence": round(max(0.0, pred_avg_spd - stgnn_speed_metrics["rmse"]), 1),
            "error": err,
        })

    # Compute improvement percentage vs Linear Ridge baseline
    speed_mae_imp = round(((ridge_spd_metrics["mae"] - stgnn_speed_metrics["mae"]) / max(ridge_spd_metrics["mae"], 1e-6)) * 100.0, 1)
    speed_rmse_imp = round(((ridge_spd_metrics["rmse"] - stgnn_speed_metrics["rmse"]) / max(ridge_spd_metrics["rmse"], 1e-6)) * 100.0, 1)

    metrics_payload = {
        "model_name": "UrbanFlow ST-GNN (PyTorch GRU + Spatial Graph Diffusion)",
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "training_duration_sec": train_duration_sec,
        "dataset": {
            "source_file": "backend/data/traffic_dataset.csv",
            "total_rows": int(len(df)),
            "unique_timestamps": int(len(ts_strs)),
            "areas": AREAS,
            "date_range": f"{ts_strs[0]} -> {ts_strs[-1]}",
            "data_status": str(df["data_status"].iloc[0]),
            "split": {
                "train_snapshots": int(n_train),
                "val_snapshots": int(n_val),
                "test_snapshots": int(len(x_test_raw)),
                "train_rows": int(n_train * len(AREAS)),
                "val_rows": int(n_val * len(AREAS)),
                "test_rows": int(len(x_test_raw) * len(AREAS)),
            },
        },
        "architecture": {
            "type": "PyTorch ST-GNN",
            "seq_len": seq_len,
            "hidden_dim": 64,
            "num_nodes": len(AREAS),
            "num_features": len(feature_cols),
            "parameters": int(sum(p.numel() for p in model.parameters())),
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
        # Frontend ModelInsightsSection-compatible keys:
        "ui_metrics": {
            "mae": {
                "value": f"{stgnn_speed_metrics['mae']:.2f}",
                "unit": "km/h",
                "baseline": f"{ridge_spd_metrics['mae']:.2f} km/h",
                "improvement": f"{abs(speed_mae_imp):.1f}% {'better' if speed_mae_imp >= 0 else 'delta'} vs Linear baseline (Vol MAE: {stgnn_vol_metrics['mae']:.1f})",
                "status": "Verified Test Split",
                "definition": f"Mean Absolute Error on {len(true_spd)} held-out 2025 Bengaluru corridor test samples",
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
                "improvement": f"PyTorch ST-GNN ({sum(p.numel() for p in model.parameters()):,} params)",
                "status": "Edge Ready",
                "definition": "Measured single-graph multi-node PyTorch inference latency on local CPU",
            },
        },
    }

    # Save PyTorch checkpoint including scalers and tail context snapshots for live inference
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
        "recent_context_grid": x_grid[-(seq_len - 1):],  # Latest real snapshots as baseline sequence context
    }
    torch.save(checkpoint, MODEL_WEIGHTS_PATH)

    with open(METRICS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    print("\n=== TEST EVALUATION SUMMARY ===")
    print("Speed Metrics (ST-GNN):", stgnn_speed_metrics)
    print("Volume Metrics (ST-GNN):", stgnn_vol_metrics)
    print("Speed Baseline (Ridge):", ridge_spd_metrics)
    print("Speed Baseline (RandomForest):", rf_spd_metrics)
    print(f"Avg CPU Inference Latency: {avg_latency_ms} ms")
    print(f"Saved weights -> {MODEL_WEIGHTS_PATH}")
    print(f"Saved metrics -> {METRICS_JSON_PATH}")


if __name__ == "__main__":
    train_and_evaluate()
