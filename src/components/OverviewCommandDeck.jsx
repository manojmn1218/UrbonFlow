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

      {/* 1. TOP SURGE ALERT BANNER IN REFINED MODERN WARM TONES */}
      <div className="p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#E8E2D9] text-[#231E1A] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#FEF6F0] border border-[#F2D7C4] text-[#A86032] flex-shrink-0">
            <Sparkles className="w-4 h-4 text-[#A86032]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A86032]">AI Traffic Telemetry Alert</span>
            </div>
            <p className="text-xs font-medium text-[#4C4138]">
              {shortName}: {corridors[0]?.name || "Main Corridor"} throughput at <strong className="text-[#231E1A]">{currentLocation?.currentSpeed || 42} km/h</strong>. {currentLocation?.predictions?.[activeHorizon]?.action || "Dynamic traffic pacing active."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={() => onSwitchView('traffic_map')}
            className="px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-white text-[#231E1A] text-xs font-bold border border-[#E8E2D9] shadow-2xs transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Map className="w-3.5 h-3.5 text-[#A86032]" />
            <span>Open GIS Map</span>
          </button>
          <button
            onClick={() => onSwitchView('predictions')}
            className="px-3 py-1.5 rounded-xl bg-[#362E28] hover:bg-[#231E1A] text-white text-xs font-semibold transition-all flex items-center gap-1 whitespace-nowrap shadow-xs"
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
          className="bg-white/90 backdrop-blur-xl p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs hover:border-[#D5CCC0] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-[#64564B] font-semibold uppercase tracking-wider mb-1">
            <span>Average Speed</span>
            <span className={`font-mono font-bold text-xs ${kpis.avgSpeed?.trend === 'down' ? 'text-[#B91C1C]' : 'text-[#2D6A4F]'}`}>
              {kpis.avgSpeed?.change || "+2.5%"}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-[#231E1A] tracking-tight">
              {kpis.avgSpeed?.value || 42.6}
            </span>
            <span className="text-xs font-semibold text-[#64564B]">km/h</span>
          </div>
          <span className="text-[10px] text-[#8C827A] block mt-0.5">Free-Flow: {kpis.avgSpeed?.optimal || 60} km/h target</span>
        </div>

        <div 
          onClick={() => onSwitchView('analytics')}
          className="bg-white/90 backdrop-blur-xl p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs hover:border-[#D5CCC0] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-[#64564B] font-semibold uppercase tracking-wider mb-1">
            <span>Congestion Level</span>
            <span className={`font-bold text-xs ${
              (kpis.congestionLevel?.value || 30) > 70 ? 'text-[#B91C1C]' : (kpis.congestionLevel?.value || 30) > 40 ? 'text-[#A86032]' : 'text-[#2D6A4F]'
            }`}>
              {kpis.congestionLevel?.status || "Moderate"}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-[#231E1A] tracking-tight">
              {kpis.congestionLevel?.value || 35}%
            </span>
            <span className="text-xs font-semibold text-[#64564B]">{kpis.congestionLevel?.change || "-3.2%"}</span>
          </div>
          <div className="w-full bg-[#E8E2D9]/60 rounded-full h-1 mt-1.5 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ 
                width: `${kpis.congestionLevel?.value || 35}%`,
                backgroundColor: kpis.congestionLevel?.color || "#A86032"
              }} 
            />
          </div>
        </div>

        <div 
          onClick={() => onSwitchView('traffic_map')}
          className="bg-white/90 backdrop-blur-xl p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs hover:border-[#D5CCC0] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-[#64564B] font-semibold uppercase tracking-wider mb-1">
            <span>Active Sector Probes</span>
            <span className="text-[#362E28] font-mono font-bold text-xs">
              {kpis.activeSensors?.rate || 98.4}% Rate
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-[#231E1A] tracking-tight">
              {kpis.activeSensors?.online || 840}
            </span>
            <span className="text-xs text-[#64564B]">/ {kpis.activeSensors?.total || 860}</span>
          </div>
          <span className="text-[10px] text-[#8C827A] block mt-0.5 truncate">
            {currentLocation?.isRealtime ? "TomTom Flow API Verified" : "Autonomous Radar Loops"}
          </span>
        </div>

        <div 
          onClick={() => onSwitchView('predictions')}
          className="bg-white/90 backdrop-blur-xl p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs hover:border-[#D5CCC0] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-[#64564B] font-semibold uppercase tracking-wider mb-1">
            <span>Forecast Surge</span>
            <span className="text-[#A86032] font-bold text-xs">
              +{activeHorizon}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#231E1A] tracking-tight">
              {kpis.predictedTraffic?.value || "Moderate"}
            </span>
            <span className="text-xs font-semibold text-[#A86032] font-mono">
              {kpis.predictedTraffic?.confidence || "95.4%"}
            </span>
          </div>
          <span className="text-[10px] text-[#8C827A] block mt-0.5 truncate">
            {kpis.predictedTraffic?.description || "ST-GNN forecast profile"}
          </span>
        </div>
      </div>

      {/* 3. MIDDLE DUAL STAGE: PERFECTLY BALANCED COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* LEFT COLUMN (7 COLS): 24-HOUR DYNAMICS + CONNECTED CORRIDORS */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          {/* Card 1: 24-Hour Velocity & Delay Dynamics */}
          <div className="bg-white/90 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-[#E8E2D9] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E8E2D9]/70">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#A86032]" />
                    <h3 className="text-base font-bold text-[#231E1A]">
                      {shortName} — Traffic Velocity & Delay Dynamics
                    </h3>
                  </div>
                  <p className="text-xs text-[#64564B] mt-0.5">
                    Continuous 24-hour speed (km/h) vs congestion delay (%) across monitored arteries
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E8E2D9] p-1 rounded-xl text-xs">
                  {['both', 'speed', 'congestion'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveCurveFilter(f)}
                      className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                        activeCurveFilter === f 
                          ? f === 'congestion' ? 'bg-[#B91C1C] text-white shadow-xs' : 'bg-[#362E28] text-white shadow-xs' 
                          : 'text-[#64564B] hover:text-[#231E1A]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#64564B] mt-3 mb-1.5">
                <div className="flex items-center gap-4">
                  {(activeCurveFilter === 'both' || activeCurveFilter === 'speed') && (
                    <span className="flex items-center gap-1.5 text-[#231E1A] font-semibold">
                      <span className="w-3.5 h-1 bg-[#8D5838] rounded-full"></span> Flow Speed (km/h)
                    </span>
                  )}
                  {(activeCurveFilter === 'both' || activeCurveFilter === 'congestion') && (
                    <span className="flex items-center gap-1.5 text-[#231E1A] font-semibold">
                      <span className="w-3.5 h-1 bg-[#B91C1C] rounded-full border-dashed border-b"></span> Congestion Index (%)
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-[#8C827A] font-medium">
                  {currentLocation?.dataSource || "Real-Time Telemetry"}
                </span>
              </div>

              {/* High-Contrast Velocity Curve SVG */}
              <div className="relative w-full h-48 mt-1">
                <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="speedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8D5838" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#8D5838" stopOpacity="0.01" />
                    </linearGradient>
                    <linearGradient id="congAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B91C1C" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Clean, visible gridlines */}
                  <line x1="45" y1="20" x2="585" y2="20" stroke="#EFEAE3" strokeDasharray="3 3" />
                  <line x1="45" y1="73" x2="585" y2="73" stroke="#EFEAE3" strokeDasharray="3 3" />
                  <line x1="45" y1="126" x2="585" y2="126" stroke="#EFEAE3" strokeDasharray="3 3" />
                  <line x1="45" y1="180" x2="585" y2="180" stroke="#DACFC2" />

                  <text x="35" y="24" fill="#8C827A" fontSize="10" fontWeight="600" textAnchor="end" fontFamily="monospace">80</text>
                  <text x="35" y="77" fill="#8C827A" fontSize="10" fontWeight="600" textAnchor="end" fontFamily="monospace">50</text>
                  <text x="35" y="130" fill="#8C827A" fontSize="10" fontWeight="600" textAnchor="end" fontFamily="monospace">25</text>
                  <text x="35" y="183" fill="#8C827A" fontSize="10" fontWeight="600" textAnchor="end" fontFamily="monospace">0</text>

                  {(activeCurveFilter === 'both' || activeCurveFilter === 'speed') && (
                    <g>
                      <path d={speedArea} fill="url(#speedAreaGrad)" />
                      <path d={speedLine} fill="none" stroke="#8D5838" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {speedCoords.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredTrendHour === i ? "6" : "3.5"}
                          fill="#FFFFFF"
                          stroke="#8D5838"
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
                      <path d={congLine} fill="none" stroke="#B91C1C" strokeWidth="2.2" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />
                      {congCoords.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredTrendHour === i ? "5.5" : "3"}
                          fill="#FFFFFF"
                          stroke="#B91C1C"
                          strokeWidth="2"
                          className="cursor-pointer"
                        />
                      ))}
                    </g>
                  )}

                  {hourlyTrend.map((p, i) => {
                    const x = 55 + i * stepX;
                    return (
                      <text key={i} x={x} y="196" fill="#8C827A" fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="monospace">
                        {p.hour}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#E8E2D9]/70 flex items-center justify-between text-xs text-[#64564B]">
              {hoveredTrendHour !== null && hourlyTrend[hoveredTrendHour] ? (
                <span className="font-semibold text-[#231E1A]">
                  At {hourlyTrend[hoveredTrendHour].hour} — Speed: <strong className="text-[#8D5838]">{hourlyTrend[hoveredTrendHour].speed} km/h</strong> | Congestion: <strong className="text-[#B91C1C]">{hourlyTrend[hoveredTrendHour].congestion}%</strong>
                </span>
              ) : (
                <span>Hover over points to inspect specific velocity & congestion levels</span>
              )}
              <button
                onClick={() => onSwitchView('analytics')}
                className="text-xs font-bold text-[#A86032] hover:text-[#8E4F28] flex items-center gap-1"
              >
                <span>Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Connected Arterial Corridors */}
          <div className="bg-white/90 backdrop-blur-2xl p-4 rounded-2xl border border-[#E8E2D9] shadow-xs">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64564B]">
                Connected Arterial Corridors ({shortName})
              </span>
              <span className="text-[10px] font-mono text-[#8C827A]">Real-Time Speed & Delays</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(corridors.length > 0 ? corridors : [
                { id: "CR-01", name: 'Main Expressway Spine', speed: 48, length: '6.4 km', delay: '+2m', colorClass: 'bg-emerald-500' },
                { id: "CR-02", name: 'Central Transit Boulevard', speed: 32, length: '4.8 km', delay: '+6m', colorClass: 'bg-amber-500' },
                { id: "CR-03", name: 'North Ring Road Bypass', speed: 54, length: '9.2 km', delay: 'Normal', colorClass: 'bg-emerald-500' },
                { id: "CR-04", name: 'Financial Commercial Avenue', speed: 22, length: '3.1 km', delay: '+11m', colorClass: 'bg-red-500' },
              ]).map((route) => (
                <div key={route.id} className="p-2.5 rounded-xl bg-[#FAF8F5]/80 border border-[#E8E2D9] flex items-center justify-between gap-2 shadow-2xs hover:bg-white transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${route.colorClass || 'bg-[#4C4138]'}`}></span>
                    <div className="min-w-0">
                      <h5 className="font-bold text-[#231E1A] text-xs truncate">{route.name}</h5>
                      <span className="text-[10px] text-[#64564B]">{route.length}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono font-bold text-[#362E28] text-xs block">{route.speed} km/h</span>
                    <span className={`text-[10px] font-bold ${route.status === 'Severe' ? 'text-[#B91C1C]' : route.status === 'Heavy' ? 'text-[#A86032]' : 'text-[#2D6A4F]'}`}>
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

          <div className="bg-white/90 backdrop-blur-2xl p-4 rounded-2xl border border-[#E8E2D9] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E8E2D9]/70">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#B91C1C]" />
                  <h4 className="text-xs font-bold text-[#231E1A]">Critical Congestion Hotspots ({shortName})</h4>
                </div>
                <button
                  onClick={() => onSwitchView('analytics')}
                  className="text-[11px] font-bold text-[#A86032] hover:text-[#8E4F28] flex items-center gap-0.5"
                >
                  <span>All Hotspots</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {hotspots.slice(0, 4).map((hotspot, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#FAF8F5]/80 border border-[#E8E2D9] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-md font-mono font-bold flex items-center justify-center text-[10px] flex-shrink-0 ${
                        idx === 0 ? 'bg-[#FDF0F0] text-[#B91C1C]' : 'bg-[#FEF6F0] text-[#A86032]'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-[#231E1A] block text-xs truncate">{hotspot.name}</span>
                        <span className="text-[10px] text-[#64564B]">{hotspot.speed} km/h • {hotspot.action}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-mono font-bold text-[#B91C1C] text-xs block">{hotspot.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingestion & Telemetry Health Strip */}
            <div className="mt-3 pt-2 border-t border-[#E8E2D9]/70 flex items-center justify-between text-[11px] text-[#64564B]">
              <span className="flex items-center gap-1.5 text-[#2D6A4F] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#2D6A4F] animate-pulse"></span>
                Sensor Stream: 1,420 pkts/s
              </span>
              <span className="font-mono text-[#8C827A]">Drift: 0.012 PSI</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FULL-WIDTH DAYTIME HOURLY LOAD DISTRIBUTION */}
      <div className="bg-white/90 backdrop-blur-2xl p-4 rounded-2xl border border-[#E8E2D9] shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64564B] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#A86032]" />
            {shortName} Daytime Hourly Load (06:00 – 20:00)
          </span>
          <span className="text-[10px] font-mono text-[#8C827A]">Congestion Relative Index</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {peakHours.slice(0, 10).map((hour, idx) => (
            <div key={idx} className="bg-[#FAF8F5]/80 p-2 rounded-xl border border-[#E8E2D9] text-center">
              <span className="text-[10px] font-mono text-[#64564B] block truncate">{hour.hour}</span>
              <span className={`text-xs font-mono font-bold block mt-0.5 ${
                hour.level === 'critical' ? 'text-[#B91C1C]' : hour.level === 'high' ? 'text-[#A86032]' : 'text-[#231E1A]'
              }`}>
                {hour.count}%
              </span>
              <div className="w-full bg-[#E8E2D9] rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    hour.level === 'critical' ? 'bg-[#B91C1C]' : hour.level === 'high' ? 'bg-[#A86032]' : 'bg-[#4C4138]'
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
        <div className="bg-white/90 backdrop-blur-2xl p-3 rounded-2xl border border-[#E8E2D9] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FAF8F5] text-[#2D6A4F] border border-[#E8E2D9]">
              <Radio className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64564B] block">Signal Headway</span>
              <span className="text-sm font-mono font-extrabold text-[#231E1A] block">+14s Green Wave</span>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-2xl p-3 rounded-2xl border border-[#E8E2D9] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FAF8F5] text-[#362E28] border border-[#E8E2D9]">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64564B] block">Dynamic VSL</span>
              <span className="text-sm font-mono font-extrabold text-[#231E1A] block">45 km/h Pacing</span>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-2xl p-3 rounded-2xl border border-[#E8E2D9] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FAF8F5] text-[#A86032] border border-[#E8E2D9]">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64564B] block">Ramp Ingress</span>
              <span className="text-sm font-mono font-extrabold text-[#231E1A] block">18 veh / min</span>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-2xl p-3 rounded-2xl border border-[#E8E2D9] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FAF8F5] text-[#2D6A4F] border border-[#E8E2D9]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64564B] block">Idle Conserved</span>
              <span className="text-sm font-mono font-extrabold text-[#231E1A] block">-15.4% Emissions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
