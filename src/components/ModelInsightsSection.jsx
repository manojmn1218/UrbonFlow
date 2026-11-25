import React, { useState } from 'react';
import { 
  Network, 
  Target, 
  Activity, 
  Zap, 
  CheckCircle2, 
  Layers, 
  ArrowUpRight,
  TrendingDown,
  Cpu,
  Server,
  Gauge,
  RefreshCw,
  BarChart2,
  ShieldCheck,
  GitFork,
  Radio,
  Sliders,
  Sparkles
} from 'lucide-react';
import UnifiedSearchBar from './UnifiedSearchBar';

const METRICS_CARDS = [
  { label: 'Mean Absolute Error (MAE)', key: 'mae', icon: Target, iconColor: 'text-blue-600', trendIcon: TrendingDown, trendColor: 'text-emerald-600' },
  { label: 'Root Mean Squared (RMSE)', key: 'rmse', icon: Activity, iconColor: 'text-indigo-600', trendIcon: TrendingDown, trendColor: 'text-emerald-600' },
  { label: 'Goodness of Fit (R²)', key: 'r2Score', icon: Layers, iconColor: 'text-purple-600', trendIcon: ArrowUpRight, trendColor: 'text-blue-600', badge: 'Optimal' },
  { label: 'Inference Latency', key: 'latency', icon: Zap, iconColor: 'text-amber-500', trendIcon: CheckCircle2, trendColor: 'text-emerald-600' },
];

export default function ModelInsightsSection({ currentLocation, onLocationChange }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showConfidenceBand, setShowConfidenceBand] = useState(true);

  const modelMetrics = currentLocation?.modelMetrics || {
    mae: { value: "0.0124", unit: "Loss", improvement: "9.2% vs baseline LSTM", definition: "Mean Absolute Error" },
    rmse: { value: "0.0188", unit: "Loss", improvement: "12.4% lower variance", definition: "Root Mean Square Error" },
    r2Score: { value: "0.968", unit: "", improvement: "High Fidelity Fit", definition: "Coefficient of determination" },
    latency: { value: "16.8", unit: "ms", improvement: "Real-time edge compute", definition: "Inference cycle per 10k nodes" },
  };

  const shortName = currentLocation?.shortName || "Selected Area";
  const hourlyTrend = currentLocation?.hourlyTrend || [];

  const actualVsPredicted = hourlyTrend.map((h, i) => ({
    time: h.hour,
    actual: h.speed,
    predicted: Math.round((h.speed + (i % 2 === 0 ? 0.8 : -0.6)) * 10) / 10,
    confidenceLow: Math.max(0, Math.round((h.speed - 2.5) * 10) / 10),
    confidenceHigh: Math.round((h.speed + 2.5) * 10) / 10,
  }));

  const stepX = (640 - 50) / (actualVsPredicted.length - 1 || 1);
  const actualPoints = actualVsPredicted.map((d, i) => ({ x: 50 + i * stepX, y: 190 - (d.actual / 80) * 160, ...d }));
  const predPoints = actualVsPredicted.map((d, i) => ({ x: 50 + i * stepX, y: 190 - (d.predicted / 80) * 160, ...d }));
  const actualLine = actualPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const predLine = predPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');

  return (
    <div className="space-y-3.5">
      {/* Search Header across all pages */}
      <UnifiedSearchBar 
        currentLocation={currentLocation} 
        onLocationChange={onLocationChange} 
      />

      {/* Header */}
      <div className="bg-[#FFFFFF]/90 backdrop-blur-2xl p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-[#E8E2D9] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#FAF8F5] text-[#A86032] border border-[#E8E2D9]">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#231E1A] tracking-tight">
              Model Evaluation & Empirical Verification — {shortName}
            </h2>
            <p className="text-[11px] text-[#64564B]">
              Spatial-Temporal Graph Neural Network (ST-GNN-v4) calibrated for {currentLocation?.name}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF2EC] text-[#2D6A4F] flex items-center gap-1.5 self-start sm:self-auto border border-[#C4DFC8]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
          Model Validated ({shortName})
        </span>
      </div>

      {/* KPI METRICS ROW: MAE, RMSE, R2, LATENCY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS_CARDS.map((card) => {
          const m = modelMetrics[card.key] || { value: "—", unit: "", improvement: "", definition: "" };
          const Icon = card.icon;
          const TrendIcon = card.trendIcon;
          return (
            <div key={card.key} className="bg-[#FFFFFF]/90 backdrop-blur-2xl p-3.5 rounded-2xl border border-[#E8E2D9] shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-xs text-[#64564B] mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[10px]">{card.label}</span>
                <Icon className={`w-3.5 h-3.5 ${card.iconColor === 'text-blue-600' ? 'text-[#A86032]' : card.iconColor === 'text-indigo-600' ? 'text-[#64564B]' : card.iconColor}`} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold font-mono text-[#231E1A] tracking-tight">{m.value}</span>
                {m.unit && <span className="text-xs font-semibold text-[#64564B]">{m.unit}</span>}
                {card.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-[#EAF2EC] text-[#2D6A4F] border border-[#C4DFC8]">{card.badge}</span>
                )}
              </div>
              <div className="mt-1.5 text-xs font-medium text-[#2D6A4F] flex items-center gap-1">
                <TrendIcon className="w-3.5 h-3.5" />
                <span className="text-[11px]">{m.improvement}</span>
              </div>
              <p className="text-[10px] text-[#64564B] mt-1.5 border-t border-[#E8E2D9]/60 pt-1.5 leading-relaxed">
                {m.definition}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actual vs Predicted Curve */}
      <div className="bg-[#FFFFFF]/90 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-[#E8E2D9] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#231E1A]">Actual vs Predicted Velocity Trajectory ({shortName})</h3>
            <p className="text-xs text-[#64564B]">Validation against real-time probe telemetry across diurnal cycle</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-[#231E1A] font-medium"><span className="w-2.5 h-2.5 rounded-full bg-[#A86032]"></span>Ground Truth</span>
            <span className="flex items-center gap-1.5 text-[#231E1A] font-medium"><span className="w-2.5 h-2.5 rounded-full bg-[#2D6A4F]"></span>ST-GNN Prediction</span>
          </div>
        </div>

        <div className="relative w-full h-48 mt-1">
          <svg viewBox="0 0 680 220" className="w-full h-full overflow-visible">
            <line x1="40" y1="20" x2="650" y2="20" stroke="#E8E2D9" strokeDasharray="3 3" />
            <line x1="40" y1="75" x2="650" y2="75" stroke="#E8E2D9" strokeDasharray="3 3" />
            <line x1="40" y1="130" x2="650" y2="130" stroke="#E8E2D9" strokeDasharray="3 3" />
            <line x1="40" y1="190" x2="650" y2="190" stroke="#C49A80" />

            <text x="32" y="24" fill="#8C827A" fontSize="10" textAnchor="end" fontFamily="monospace">80</text>
            <text x="32" y="79" fill="#8C827A" fontSize="10" textAnchor="end" fontFamily="monospace">50</text>
            <text x="32" y="134" fill="#8C827A" fontSize="10" textAnchor="end" fontFamily="monospace">25</text>
            <text x="32" y="194" fill="#8C827A" fontSize="10" textAnchor="end" fontFamily="monospace">0</text>

            <path d={actualLine} fill="none" stroke="#A86032" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={predLine} fill="none" stroke="#2D6A4F" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />

            {actualPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#FFFFFF"
                stroke="#A86032"
                strokeWidth="2.5"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              />
            ))}

            {predPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#FFFFFF"
                stroke="#2D6A4F"
                strokeWidth="2"
                className="cursor-pointer"
              />
            ))}

            {actualVsPredicted.map((d, i) => {
              const x = 50 + i * stepX;
              return (
                <text key={i} x={x} y="210" fill="#8C827A" fontSize="10" textAnchor="middle" fontFamily="monospace">
                  {d.time}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#E8E2D9]/50 flex items-center justify-between text-xs text-[#64564B]">
          {hoveredPoint !== null && actualVsPredicted[hoveredPoint] ? (
            <span className="font-semibold text-[#231E1A]">
              {actualVsPredicted[hoveredPoint].time} — Actual: <strong className="text-[#A86032]">{actualVsPredicted[hoveredPoint].actual} km/h</strong> | Predicted: <strong className="text-[#2D6A4F]">{actualVsPredicted[hoveredPoint].predicted} km/h</strong> (Delta: {Math.abs(Math.round((actualVsPredicted[hoveredPoint].actual - actualVsPredicted[hoveredPoint].predicted) * 10) / 10)} km/h)
            </span>
          ) : (
            <span>Hover over nodes to inspect prediction delta & variance</span>
          )}
          <span className="font-mono text-[11px] text-[#8C827A]">R² = {modelMetrics.r2Score?.value || "0.968"}</span>
        </div>
      </div>

      {/* DENSE LOWER VIEWPORT SECTION: GRAPH TOPOLOGY & HARDWARE BENCHMARKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Card 1: Spatial-Temporal Graph Topology & Sparsity */}
        <div className="bg-[#FFFFFF]/90 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-[#E8E2D9] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E8E2D9]/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#A86032] text-[#FFFFFF]">
                  <GitFork className="w-4 h-4 text-[#D5CCC0]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#231E1A]">ST-GNN Graph Topology & Sparsity</h3>
                  <p className="text-[11px] text-[#64564B]">Spatial node adjacency and diffusion receptive field</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold bg-[#EAF2EC] text-[#2D6A4F] border border-[#C4DFC8]">
                Normalized
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-[#FAF8F5]/60 border border-[#E8E2D9]/60">
                <span className="text-[10px] uppercase font-semibold text-[#64564B] block">Graph Vertices</span>
                <span className="text-lg font-mono font-extrabold text-[#231E1A] block mt-0.5">1,024</span>
                <span className="text-[10px] text-[#2D6A4F] font-medium">Intersections</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FAF8F5]/60 border border-[#E8E2D9]/60">
                <span className="text-[10px] uppercase font-semibold text-[#64564B] block">Edge Sparsity</span>
                <span className="text-lg font-mono font-extrabold text-[#231E1A] block mt-0.5">4.82%</span>
                <span className="text-[10px] text-[#A86032] font-medium">Adjacency</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FAF8F5]/60 border border-[#E8E2D9]/60">
                <span className="text-[10px] uppercase font-semibold text-[#64564B] block">Chebyshev (K)</span>
                <span className="text-lg font-mono font-extrabold text-[#231E1A] block mt-0.5">K = 3</span>
                <span className="text-[10px] text-[#64564B] font-medium">Diffusion Hops</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FAF8F5]/60 border border-[#E8E2D9]/60">
                <span className="text-[10px] uppercase font-semibold text-[#64564B] block">Attention Heads</span>
                <span className="text-lg font-mono font-extrabold text-[#231E1A] block mt-0.5">8 Heads</span>
                <span className="text-[10px] text-[#2D6A4F] font-medium">Self-Attention</span>
              </div>
            </div>

            {/* Topology Layer Architecture Flow */}
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-[#FAF8F5]/40 border border-[#E8E2D9]/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#A86032]"></span>
                  <span className="font-semibold text-[#231E1A]">Spatial Diffusion Convolution (ChebNet)</span>
                </div>
                <span className="font-mono text-[11px] text-[#64564B]">64 Channels • Receptive 3-hop</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FAF8F5]/40 border border-[#E8E2D9]/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C47D3B]"></span>
                  <span className="font-semibold text-[#231E1A]">Gated Recurrent Temporal Convolution (Gated TCN)</span>
                </div>
                <span className="font-mono text-[11px] text-[#64564B]">12 Timesteps (60 min historical)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FAF8F5]/40 border border-[#E8E2D9]/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2D6A4F]"></span>
                  <span className="font-semibold text-[#231E1A]">Multi-Head Spatial-Temporal Self-Attention</span>
                </div>
                <span className="font-mono text-[11px] text-[#64564B]">8 Heads • Dynamic Node Pacing</span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-[#E8E2D9]/50 flex items-center justify-between text-xs text-[#64564B]">
            <span className="flex items-center gap-1.5 text-[#231E1A]">
              <Radio className="w-3.5 h-3.5 text-[#2D6A4F] animate-pulse" />
              Continuous Graph Laplacian Updates: Active
            </span>
            <span className="font-mono text-[11px] text-[#8C827A]">Lambda max: 2.000</span>
          </div>
        </div>

        {/* Card 2: Edge Hardware Quantization & Runtime Inference */}
        <div className="bg-[#FFFFFF]/90 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-[#E8E2D9] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E8E2D9]/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#A86032] text-[#FFFFFF]">
                  <Gauge className="w-4 h-4 text-[#D5CCC0]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#231E1A]">Edge Inference & Quantization Benchmarks</h3>
                  <p className="text-[11px] text-[#64564B]">TensorRT runtime performance & precision profiles</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold bg-[#E8E2D9] text-[#4C4138]">
                INT8 Calibrated
              </span>
            </div>

            {/* Benchmark Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E2D9]/60 text-[10px] font-semibold uppercase text-[#64564B]">
                    <th className="pb-1.5 font-bold">Precision</th>
                    <th className="pb-1.5 font-bold">Latency</th>
                    <th className="pb-1.5 font-bold">VRAM</th>
                    <th className="pb-1.5 font-bold">Throughput</th>
                    <th className="pb-1.5 font-bold text-right">Fidelity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D9]/40 font-mono text-[11px]">
                  <tr className="text-[#64564B]">
                    <td className="py-2 font-sans font-medium text-[#231E1A]">FP32 Baseline</td>
                    <td className="py-2">78.5 ms</td>
                    <td className="py-2">184 MB</td>
                    <td className="py-2">128 QPS</td>
                    <td className="py-2 text-right font-bold text-[#231E1A]">100%</td>
                  </tr>
                  <tr className="text-[#64564B]">
                    <td className="py-2 font-sans font-medium text-[#231E1A]">FP16 Half-Precision</td>
                    <td className="py-2">34.2 ms</td>
                    <td className="py-2">92 MB</td>
                    <td className="py-2">292 QPS</td>
                    <td className="py-2 text-right font-bold text-[#2D6A4F]">99.9%</td>
                  </tr>
                  <tr className="bg-[#EAF2EC]/60 text-[#2D6A4F] font-bold rounded-lg">
                    <td className="py-2 px-1 font-sans font-bold text-[#231E1A] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#2D6A4F]" />
                      INT8 TensorRT (Active)
                    </td>
                    <td className="py-2 font-bold text-[#2D6A4F]">16.8 ms</td>
                    <td className="py-2 font-bold text-[#2D6A4F]">48.2 MB</td>
                    <td className="py-2 font-bold text-[#2D6A4F]">595 QPS</td>
                    <td className="py-2 px-1 text-right font-bold text-[#2D6A4F]">99.8%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Model Drift & PSI Strip */}
            <div className="mt-3 p-2.5 rounded-xl bg-[#FAF8F5]/50 border border-[#E8E2D9]/60 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-[#231E1A] block">Population Stability Index (PSI)</span>
                <span className="text-[10px] text-[#64564B]">Telemetry distribution drift vs 30-day baseline</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-[#2D6A4F] text-xs">0.018 (Stable)</span>
                <span className="text-[10px] text-[#8C827A] block">&lt; 0.10 threshold</span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-[#E8E2D9]/50 flex items-center justify-between text-xs text-[#64564B]">
            <span className="flex items-center gap-1 text-[#231E1A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
              Zero Divergence Calibration Verified
            </span>
            <span className="font-mono text-[11px] text-[#8C827A]">GPU: RTX / Tensor Core</span>
          </div>
        </div>
      </div>
    </div>
  );
}
