import React, { useState } from 'react';
import { 
  Map, 
  BarChart3, 
  Sparkles, 
  Car, 
  Flame, 
  ArrowRight, 
  ChevronRight, 
  Clock, 
  Maximize2,
  Radio,
  CheckCircle2,
  ShieldCheck,
  Activity,
  Zap,
  TrendingDown,
  Layers
} from 'lucide-react';
import CompactAiWorkbench from './CompactAiWorkbench';
import UnifiedSearchBar from './UnifiedSearchBar';

export default function OverviewCommandDeck({
  currentLocation,
  onLocationChange,
  activeHorizon,
  setActiveHorizon,
  onSwitchView,
}) {
  const [hoveredTrendHour, setHoveredTrendHour] = useState(null);
  const [activeCurveFilter, setActiveCurveFilter] = useState('both');

  // Fallbacks in case currentLocation is loading
  const kpis = currentLocation?.kpis || {};
  const hourlyTrend = currentLocation?.hourlyTrend || [];
  const peakHours = currentLocation?.peakHours || [];
  const hotspots = currentLocation?.hotspots || [];
  const corridors = currentLocation?.corridors || [];
  const shortName = currentLocation?.shortName || "Selected Area";

  const totalPoints = hourlyTrend.length || 12;
  const stepX = (580 - 55) / (totalPoints - 1 || 1);
  const speedCoords = hourlyTrend.map((p, i) => ({
    x: 55 + i * stepX,
    y: 180 - ((p.speed || 40) / 80) * 160,
    ...p
  }));
  const congCoords = hourlyTrend.map((p, i) => ({
    x: 55 + i * stepX,
    y: 180 - ((p.congestion || 35) / 100) * 160,
    ...p
  }));
  const speedLine = speedCoords.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const speedArea = speedCoords.length > 0 ? `${speedLine} L ${speedCoords[speedCoords.length - 1].x} 180 L ${speedCoords[0].x} 180 Z` : '';
  const congLine = congCoords.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const congArea = congCoords.length > 0 ? `${congLine} L ${congCoords[congCoords.length - 1].x} 180 L ${congCoords[0].x} 180 Z` : '';

  return (
    <div className="space-y-3.5">
      {/* 0. UNIFIED GLOBAL SEARCH BAR */}
      <UnifiedSearchBar 
        currentLocation={currentLocation} 
        onLocationChange={onLocationChange} 
      />

      {/* 1. TOP SURGE ALERT BANNER IN LUXURY CHOCOLATE & CREAM */}
      <div className="p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-r from-[#4E2E1E] via-[#3D2317] to-[#2C1810] text-[#FFFDF9] shadow-premium flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex-shrink-0">
            <Sparkles className="w-4 h-4 text-[#E08E45]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#DFC4B3]">AI Traffic Telemetry Alert</span>
              <span className="text-[10px] bg-[#C47D3B] text-[#FFFDF9] px-2 py-0.2 rounded-full font-bold">
                {currentLocation?.status || "Live Monitoring"}
              </span>
            </div>
            <p className="text-xs font-medium text-[#FFFDF9]/95">
              {shortName}: {corridors[0]?.name || "Main Corridor"} throughput at {currentLocation?.currentSpeed || 42} km/h. {currentLocation?.predictions?.[activeHorizon]?.action || "Dynamic traffic pacing active."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={() => onSwitchView('traffic_map')}
            className="px-3.5 py-1.5 rounded-xl bg-[#FFFDF9] text-[#3D2317] hover:bg-[#F5EFEB] text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Map className="w-3.5 h-3.5 text-[#5C331E]" />
            <span>Open GIS Map</span>
          </button>
          <button
            onClick={() => onSwitchView('predictions')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFFDF9] text-xs font-semibold border border-white/20 transition-all flex items-center gap-1 whitespace-nowrap"
          >
            <span>Inference</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. TOP HIGH-DENSITY KPI TELEMETRY STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div 
          onClick={() => onSwitchView('analytics')}
          className="bg-[#FFFDF9]/70 backdrop-blur-xl p-3.5 rounded-2xl border border-[#EADBCE]/70 shadow-subtle hover:shadow-premium transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-[#7D5138] font-semibold uppercase tracking-wider mb-1">
            <span>Average Speed</span>
            <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${kpis.avgSpeed?.trend === 'down' ? 'text-[#9E2A2B] bg-[#FBEAEA]' : 'text-[#2D6A4F] bg-[#EAF2EC]'}`}>
              {kpis.avgSpeed?.change || "+2.5%"}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-[#2C1810] tracking-tight">
              {kpis.avgSpeed?.value || 42.6}
            </span>
            <span className="text-xs font-semibold text-[#7D5138]">km/h</span>
          </div>
          <span className="text-[10px] text-[#9C6D52] block mt-0.5">Free-Flow: {kpis.avgSpeed?.optimal || 60} km/h target</span>
        </div>

        <div 
          onClick={() => onSwitchView('analytics')}
          className="bg-[#FFFDF9]/70 backdrop-blur-xl p-3.5 rounded-2xl border border-[#EADBCE]/70 shadow-subtle hover:shadow-premium transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-[#7D5138] font-semibold uppercase tracking-wider mb-1">
            <span>Congestion Level</span>
            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
              (kpis.congestionLevel?.value || 30) > 70 ? 'text-[#9E2A2B] bg-[#FBEAEA]' : (kpis.congestionLevel?.value || 30) > 40 ? 'text-[#C47D3B] bg-[#FDF2E9]' : 'text-[#2D6A4F] bg-[#EAF2EC]'
            }`}>
              {kpis.congestionLevel?.status || "Moderate"}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-[#2C1810] tracking-tight">
              {kpis.congestionLevel?.value || 35}%
            </span>
            <span className="text-xs font-semibold text-[#7D5138]">{kpis.congestionLevel?.change || "-3.2%"}</span>
          </div>
          <div className="w-full bg-[#EADBCE]/50 rounded-full h-1 mt-1.5 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ 
                width: `${kpis.congestionLevel?.value || 35}%`,
                backgroundColor: kpis.congestionLevel?.color || "#C47D3B"
              }} 
            />
          </div>
        </div>

        <div 
          onClick={() => onSwitchView('traffic_map')}
          className="bg-[#FFFDF9]/70 backdrop-blur-xl p-3.5 rounded-2xl border border-[#EADBCE]/70 shadow-subtle hover:shadow-premium transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-[#7D5138] font-semibold uppercase tracking-wider mb-1">
            <span>Active Sector Probes</span>
            <span className="text-[#5C331E] bg-[#F5EFEB] border border-[#EADBCE] px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
              {kpis.activeSensors?.rate || 98.4}% Rate
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-[#2C1810] tracking-tight">
              {kpis.activeSensors?.online || 840}
            </span>
            <span className="text-xs text-[#7D5138]">/ {kpis.activeSensors?.total || 860}</span>
          </div>
          <span className="text-[10px] text-[#9C6D52] block mt-0.5 truncate">
            {currentLocation?.isRealtime ? "TomTom Flow API Verified" : "Autonomous Radar Loops"}
          </span>
        </div>

        <div 
          onClick={() => onSwitchView('predictions')}
          className="bg-[#FFFDF9]/70 backdrop-blur-xl p-3.5 rounded-2xl border border-[#EADBCE]/70 shadow-subtle hover:shadow-premium transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-[#7D5138] font-semibold uppercase tracking-wider mb-1">
            <span>Forecast Surge</span>
            <span className="text-[#5C331E] bg-[#F5EFEB] border border-[#EADBCE] px-1.5 py-0.5 rounded font-bold text-[10px]">
              +{activeHorizon}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#2C1810] tracking-tight">
              {kpis.predictedTraffic?.value || "Moderate"}
            </span>
            <span className="text-xs font-semibold text-[#5C331E] font-mono">
              {kpis.predictedTraffic?.confidence || "95.4%"}
            </span>
          </div>
          <span className="text-[10px] text-[#9C6D52] block mt-0.5 truncate">
            {kpis.predictedTraffic?.description || "ST-GNN forecast profile"}
          </span>
        </div>
      </div>

      {/* 3. MIDDLE DUAL STAGE: PERFECTLY BALANCED COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* LEFT COLUMN (7 COLS): 24-HOUR DYNAMICS + CONNECTED CORRIDORS */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          {/* Card 1: 24-Hour Velocity & Delay Dynamics */}
          <div className="bg-[#FFFDF9]/90 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-[#EADBCE] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#EADBCE]/60">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#5C331E]" />
                    <h3 className="text-base font-bold text-[#2C1810]">
                      {shortName} — Traffic Velocity & Delay Dynamics
                    </h3>
                  </div>
                  <p className="text-xs text-[#7D5138] mt-0.5">
                    Continuous 24-hour speed (km/h) vs congestion delay (%) across monitored arteries
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#F5EFEB] border border-[#EADBCE]/70 p-1 rounded-xl text-xs">
                  {['both', 'speed', 'congestion'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveCurveFilter(f)}
                      className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                        activeCurveFilter === f 
                          ? f === 'congestion' ? 'bg-[#9E2A2B] text-white shadow-xs' : 'bg-[#5C331E] text-white shadow-xs' 
                          : 'text-[#7D5138] hover:text-[#2C1810]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#7D5138] mt-3 mb-1.5">
                <div className="flex items-center gap-4">
                  {(activeCurveFilter === 'both' || activeCurveFilter === 'speed') && (
                    <span className="flex items-center gap-1.5 text-[#2C1810] font-semibold">
                      <span className="w-3.5 h-1 bg-[#5C331E] rounded-full"></span> Flow Speed (km/h)
                    </span>
                  )}
                  {(activeCurveFilter === 'both' || activeCurveFilter === 'congestion') && (
                    <span className="flex items-center gap-1.5 text-[#2C1810] font-semibold">
                      <span className="w-3.5 h-1 bg-[#9E2A2B] rounded-full border-dashed border-b"></span> Congestion Index (%)
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-[#9C6D52] font-medium">
                  {currentLocation?.dataSource || "Real-Time Telemetry"}
                </span>
              </div>

              {/* High-Contrast Velocity Curve SVG */}
              <div className="relative w-full h-48 mt-1">
                <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="speedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5C331E" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#5C331E" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="congAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9E2A2B" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#9E2A2B" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Clean, visible gridlines */}
                  <line x1="45" y1="20" x2="585" y2="20" stroke="#EADBCE" strokeDasharray="3 3" />
                  <line x1="45" y1="73" x2="585" y2="73" stroke="#EADBCE" strokeDasharray="3 3" />
                  <line x1="45" y1="126" x2="585" y2="126" stroke="#EADBCE" strokeDasharray="3 3" />
                  <line x1="45" y1="180" x2="585" y2="180" stroke="#C49A80" />

                  <text x="35" y="24" fill="#7D5138" fontSize="10" fontWeight="600" textAnchor="end" fontFamily="monospace">80</text>
                  <text x="35" y="77" fill="#7D5138" fontSize="10" fontWeight="600" textAnchor="end" fontFamily="monospace">50</text>
                  <text x="35" y="130" fill="#7D5138" fontSize="10" fontWeight="600" textAnchor="end" fontFamily="monospace">25</text>
                  <text x="35" y="183" fill="#7D5138" fontSize="10" fontWeight="600" textAnchor="end" fontFamily="monospace">0</text>

                  {(activeCurveFilter === 'both' || activeCurveFilter === 'speed') && (
                    <g>
                      <path d={speedArea} fill="url(#speedAreaGrad)" />
                      <path d={speedLine} fill="none" stroke="#5C331E" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                      {speedCoords.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredTrendHour === i ? "6" : "3.5"}
                          fill="#FFFDF9"
                          stroke="#5C331E"
                          strokeWidth="2.5"
                          onMouseEnter={() => setHoveredTrendHour(i)}
                          onMouseLeave={() => setHoveredTrendHour(null)}
                          className="cursor-pointer transition-all"
                        />
                      ))}
                    </g>
                  )}

                  {(activeCurveFilter === 'both' || activeCurveFilter === 'congestion') && (
                    <g>
                      <path d={congArea} fill="url(#congAreaGrad)" />
                      <path d={congLine} fill="none" stroke="#9E2A2B" strokeWidth="2.2" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />
                      {congCoords.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredTrendHour === i ? "5.5" : "3"}
                          fill="#FFFDF9"
                          stroke="#9E2A2B"
                          strokeWidth="2"
                          className="cursor-pointer"
                        />
                      ))}
                    </g>
                  )}

                  {hourlyTrend.map((p, i) => {
                    const x = 55 + i * stepX;
                    return (
                      <text key={i} x={x} y="196" fill="#7D5138" fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="monospace">
                        {p.hour}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#EADBCE]/60 flex items-center justify-between text-xs text-[#7D5138]">
              {hoveredTrendHour !== null && hourlyTrend[hoveredTrendHour] ? (
                <span className="font-semibold text-[#2C1810]">
                  At {hourlyTrend[hoveredTrendHour].hour} — Speed: <strong className="text-[#5C331E]">{hourlyTrend[hoveredTrendHour].speed} km/h</strong> | Congestion: <strong className="text-[#9E2A2B]">{hourlyTrend[hoveredTrendHour].congestion}%</strong>
                </span>
              ) : (
                <span>Hover over points to inspect specific velocity & congestion levels</span>
              )}
              <button
                onClick={() => onSwitchView('analytics')}
                className="text-xs font-bold text-[#5C331E] hover:text-[#3D2317] flex items-center gap-1"
              >
                <span>Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Connected Arterial Corridors */}
          <div className="bg-[#FFFDF9]/90 backdrop-blur-2xl p-4 rounded-2xl border border-[#EADBCE] shadow-sm">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D5138]">
                Connected Arterial Corridors ({shortName})
              </span>
              <span className="text-[10px] font-mono text-[#9C6D52]">Real-Time Speed & Delays</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(corridors.length > 0 ? corridors : [
                { id: "CR-01", name: 'Main Expressway Spine', speed: 48, length: '6.4 km', delay: '+2m', colorClass: 'bg-emerald-500' },
                { id: "CR-02", name: 'Central Transit Boulevard', speed: 32, length: '4.8 km', delay: '+6m', colorClass: 'bg-amber-500' },
                { id: "CR-03", name: 'North Ring Road Bypass', speed: 54, length: '9.2 km', delay: 'Normal', colorClass: 'bg-emerald-500' },
                { id: "CR-04", name: 'Financial Commercial Avenue', speed: 22, length: '3.1 km', delay: '+11m', colorClass: 'bg-red-500' },
              ]).map((route) => (
                <div key={route.id} className="p-2.5 rounded-xl bg-[#F5EFEB]/60 border border-[#EADBCE]/70 flex items-center justify-between gap-2 shadow-2xs hover:bg-[#FFFDF9] transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${route.colorClass || 'bg-[#5C331E]'}`}></span>
                    <div className="min-w-0">
                      <h5 className="font-bold text-[#2C1810] text-xs truncate">{route.name}</h5>
                      <span className="text-[10px] text-[#7D5138]">{route.length}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono font-bold text-[#3D2317] text-xs block">{route.speed} km/h</span>
                    <span className={`text-[10px] font-bold ${route.status === 'Severe' ? 'text-[#9E2A2B]' : route.status === 'Heavy' ? 'text-[#C47D3B]' : 'text-[#2D6A4F]'}`}>
                      {route.delay}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 COLS): AI PREDICTION WORKBENCH + CONGESTION HOTSPOTS */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          <CompactAiWorkbench 
            activeHorizon={activeHorizon}
            setActiveHorizon={setActiveHorizon}
            onOpenFullPredictions={() => onSwitchView('predictions')}
            currentLocation={currentLocation}
            onLocationChange={onLocationChange}
          />

          <div className="bg-[#FFFDF9]/90 backdrop-blur-2xl p-4 rounded-2xl border border-[#EADBCE] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#EADBCE]/60">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#9E2A2B]" />
                  <h4 className="text-xs font-bold text-[#2C1810]">Critical Congestion Hotspots ({shortName})</h4>
                </div>
                <button
                  onClick={() => onSwitchView('analytics')}
                  className="text-[11px] font-bold text-[#5C331E] hover:text-[#3D2317] flex items-center gap-0.5"
                >
                  <span>All Hotspots</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {hotspots.slice(0, 4).map((hotspot, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#F5EFEB]/60 border border-[#EADBCE]/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-md font-mono font-bold flex items-center justify-center text-[10px] flex-shrink-0 ${
                        idx === 0 ? 'bg-[#FBEAEA] text-[#9E2A2B]' : 'bg-[#FDF2E9] text-[#C47D3B]'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-[#2C1810] block text-xs truncate">{hotspot.name}</span>
                        <span className="text-[10px] text-[#7D5138]">{hotspot.speed} km/h • {hotspot.action}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-mono font-bold text-[#9E2A2B] text-xs block">{hotspot.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingestion & Telemetry Health Strip */}
            <div className="mt-3 pt-2 border-t border-[#EADBCE]/60 flex items-center justify-between text-[11px] text-[#7D5138]">
              <span className="flex items-center gap-1.5 text-[#2D6A4F] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#2D6A4F] animate-pulse"></span>
                Sensor Stream: 1,420 pkts/s
              </span>
              <span className="font-mono text-[#9C6D52]">Drift: 0.012 PSI</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FULL-WIDTH DAYTIME HOURLY LOAD DISTRIBUTION */}
      <div className="bg-[#FFFDF9]/90 backdrop-blur-2xl p-4 rounded-2xl border border-[#EADBCE] shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D5138] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C47D3B]" />
            {shortName} Daytime Hourly Load (06:00 – 20:00)
          </span>
          <span className="text-[10px] font-mono text-[#9C6D52]">Congestion Relative Index</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {peakHours.slice(0, 10).map((hour, idx) => (
            <div key={idx} className="bg-[#F5EFEB]/60 p-2 rounded-xl border border-[#EADBCE]/70 text-center">
              <span className="text-[10px] font-mono text-[#7D5138] block truncate">{hour.hour}</span>
              <span className={`text-xs font-mono font-bold block mt-0.5 ${
                hour.level === 'critical' ? 'text-[#9E2A2B]' : hour.level === 'high' ? 'text-[#C47D3B]' : 'text-[#2C1810]'
              }`}>
                {hour.count}%
              </span>
              <div className="w-full bg-[#EADBCE] rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    hour.level === 'critical' ? 'bg-[#9E2A2B]' : hour.level === 'high' ? 'bg-[#C47D3B]' : 'bg-[#5C331E]'
                  }`}
                  style={{ width: `${Math.min(100, hour.count)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. METROPOLITAN NETWORK PACING & INFRASTRUCTURE TELEMETRY STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFFDF9]/90 backdrop-blur-2xl p-3 rounded-2xl border border-[#EADBCE] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EAF2EC] text-[#2D6A4F] border border-[#C4DFC8]">
              <Radio className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D5138] block">Signal Headway</span>
              <span className="text-sm font-mono font-extrabold text-[#2C1810] block">+14s Green Wave</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#2D6A4F] bg-[#EAF2EC] px-1.5 py-0.5 rounded">Synced</span>
        </div>

        <div className="bg-[#FFFDF9]/90 backdrop-blur-2xl p-3 rounded-2xl border border-[#EADBCE] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#F5EFEB] text-[#5C331E] border border-[#EADBCE]">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D5138] block">Dynamic VSL</span>
              <span className="text-sm font-mono font-extrabold text-[#2C1810] block">45 km/h Pacing</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#5C331E] bg-[#F5EFEB] px-1.5 py-0.5 rounded">Active</span>
        </div>

        <div className="bg-[#FFFDF9]/90 backdrop-blur-2xl p-3 rounded-2xl border border-[#EADBCE] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FDF2E9] text-[#C47D3B] border border-[#EADBCE]">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D5138] block">Ramp Ingress</span>
              <span className="text-sm font-mono font-extrabold text-[#2C1810] block">18 veh / min</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#C47D3B] bg-[#FDF2E9] px-1.5 py-0.5 rounded">Metered</span>
        </div>

        <div className="bg-[#FFFDF9]/90 backdrop-blur-2xl p-3 rounded-2xl border border-[#EADBCE] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EAF2EC] text-[#2D6A4F] border border-[#C4DFC8]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D5138] block">Idle Conserved</span>
              <span className="text-sm font-mono font-extrabold text-[#2C1810] block">-15.4% Emissions</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#2D6A4F] bg-[#EAF2EC] px-1.5 py-0.5 rounded">Eco-Wave</span>
        </div>
      </div>
    </div>
  );
}
