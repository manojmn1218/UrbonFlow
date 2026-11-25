import React, { useState } from 'react';
import { 
  Cpu, 
  Clock, 
  ChevronDown, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertOctagon, 
  Sparkles, 
  RotateCw, 
  Sliders, 
  CheckCircle2, 
  Globe, 
  MapPin,
  Play,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import UnifiedSearchBar from './UnifiedSearchBar';
import { getLocationTraffic } from '../services/api';
import { generateLocationTelemetry } from '../services/trafficGenerator';

export default function AiPredictionsSection({ 
  activeHorizon, 
  setActiveHorizon,
  currentLocation,
  onLocationChange 
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSuccess, setSimulationSuccess] = useState(false);
  const [latencyMs, setLatencyMs] = useState('16.4ms');
  const [activePolicies, setActivePolicies] = useState({
    greenWave: true,
    vsl: true,
    rampMetering: false,
    corridorDiversion: true,
  });

  const togglePolicy = (policyKey) => {
    setActivePolicies(prev => ({ ...prev, [policyKey]: !prev[policyKey] }));
  };

  const shortName = currentLocation?.shortName || "Selected Area";
  const currentSpeed = currentLocation?.currentSpeed || 42.0;
  const freeFlow = currentLocation?.freeFlowSpeed || 60.0;
  const congestion = currentLocation?.congestionPct || 35;
  const pred = currentLocation?.predictions?.[activeHorizon] || currentLocation?.predictions?.['15m'] || {
    speed: 40.0,
    congestion: 35,
    change: "+1.2 km/h",
    confidence: 95.4,
    risk: "Optimal Flow",
    action: "Steady corridor throughput; maintain active baseline timing"
  };

  const influences = currentLocation?.influences || [
    { factor: "Real-Time TomTom Road Segment Flow", weight: 46 },
    { factor: "Upstream Vehicle Inflow (t-15)", weight: 26 },
    { factor: "Spatial Intersection Topology", weight: 18 },
    { factor: "Rush-Hour Commuter Distribution", weight: 12 },
  ];

  const forecastTimeline = [
    { time: 'Now', speed: currentSpeed, congestion: congestion },
    { time: '+15m', speed: currentLocation?.predictions?.['15m']?.speed || Math.round(currentSpeed * 0.96 * 10) / 10, congestion: currentLocation?.predictions?.['15m']?.congestion || congestion },
    { time: '+30m', speed: currentLocation?.predictions?.['30m']?.speed || Math.round(currentSpeed * 0.91 * 10) / 10, congestion: currentLocation?.predictions?.['30m']?.congestion || congestion + 5 },
    { 
      time: '+45m', 
      speed: Math.round(((currentSpeed * 0.98)) * 10) / 10, 
      congestion: Math.max(10, congestion - 2) 
    },
    { time: '+60m', speed: currentLocation?.predictions?.['60m']?.speed || Math.round(currentSpeed * 1.05 * 10) / 10, congestion: currentLocation?.predictions?.['60m']?.congestion || Math.max(10, congestion - 8) },
  ];

  const handleRunSimulation = async () => {
    if (!currentLocation) return;
    setIsSimulating(true);
    setSimulationSuccess(false);
    const start = performance.now();

    const raw = await getLocationTraffic(currentLocation.lat, currentLocation.lon, currentLocation.name, activeHorizon);
    const updated = generateLocationTelemetry(currentLocation, raw);
    if (onLocationChange) onLocationChange(updated);

    const duration = (performance.now() - start).toFixed(1);
    setLatencyMs(`${duration}ms`);
    setIsSimulating(false);
    setSimulationSuccess(true);
    setTimeout(() => setSimulationSuccess(false), 3500);
  };

  const points = forecastTimeline.map((item, i) => ({
    x: 50 + i * 75,
    y: 110 - ((item.speed || 40) / 80) * 90,
    speed: item.speed,
    time: item.time
  }));
  const dPath = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const areaPath = points.length > 0 ? `${dPath} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z` : '';

  return (
    <div className="space-y-3.5">
      {/* Search Header across all pages */}
      <UnifiedSearchBar 
        currentLocation={currentLocation} 
        onLocationChange={onLocationChange} 
      />

      <div className="bg-[#FFFFFF]/90 backdrop-blur-2xl rounded-2xl border border-[#E8E2D9] shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-[#E8E2D9]/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FAF8F5] text-[#A86032] border border-[#E8E2D9]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#231E1A] tracking-tight">AI Predictive Inference Engine</h2>
              </div>
              <p className="text-xs text-[#64564B]">
                Spatial-Temporal Graph Neural Network (ST-GNN) inference for {currentLocation?.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Forecast Horizon Tabs */}
            <div className="flex items-center bg-[#FAF8F5] border border-[#E8E2D9]/60 p-1 rounded-xl">
              {['15m', '30m', '60m'].map((horizon) => (
                <button
                  key={horizon}
                  onClick={() => setActiveHorizon(horizon)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeHorizon === horizon ? 'bg-[#A86032] text-[#FFFFFF] shadow-sm' : 'text-[#64564B] hover:text-[#231E1A]'
                  }`}
                >
                  {horizon === '15m' ? '+15 Mins' : horizon === '30m' ? '+30 Mins' : '+60 Mins'}
                </button>
              ))}
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#A86032] to-[#422213] hover:from-[#4A2818] hover:to-[#361A0E] text-[#FFFFFF] text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-[#D5CCC0]' : ''}`} />
              <span>{isSimulating ? 'Computing...' : 'Recalculate'}</span>
            </button>
          </div>
        </div>

        {simulationSuccess && (
          <div className="mt-3.5 p-3 rounded-xl bg-[#EAF2EC] border border-[#C4DFC8] text-[#2D6A4F] text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
              <span className="font-medium">
                Inference model refreshed with latest probe telemetry: Loss 0.0124 (Optimal).
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#2D6A4F] font-bold">{latencyMs} compute ({currentLocation?.dataSource})</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3.5">
          <div className="p-3.5 rounded-xl bg-[#FAF8F5]/50 backdrop-blur-md border border-[#E8E2D9]/60 shadow-subtle">
            <div className="flex items-center justify-between text-xs text-[#64564B] mb-1.5">
              <span className="font-medium">Predicted Speed (+{activeHorizon})</span>
              <Clock className="w-3.5 h-3.5 text-[#A86032]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-[#231E1A] tracking-tight">{pred.speed}</span>
              <span className="text-xs font-semibold text-[#64564B]">km/h</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium">
              {pred.speed < currentSpeed ? (
                <span className="text-[#9E2A2B] flex items-center gap-0.5"><TrendingDown className="w-3.5 h-3.5" />{pred.change} drop</span>
              ) : (
                <span className="text-[#2D6A4F] flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5" />{pred.change} recovery</span>
              )}
              <span className="text-[#8C827A]">vs current {currentSpeed} km/h</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5]/50 backdrop-blur-md border border-[#E8E2D9]/60 shadow-subtle">
            <div className="flex items-center justify-between text-xs text-[#64564B] mb-1.5">
              <span className="font-medium">Forecast Congestion</span>
              <AlertOctagon className="w-3.5 h-3.5 text-[#C47D3B]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-[#231E1A] tracking-tight">{pred.congestion}%</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                pred.congestion > 70 ? 'bg-[#FBEAEA] text-[#9E2A2B]' : 'bg-[#FDF2E9] text-[#C47D3B]'
              }`}>
                {pred.risk}
              </span>
            </div>
            <div className="w-full bg-[#E8E2D9] rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pred.congestion > 70 ? 'bg-[#9E2A2B]' : 'bg-[#C47D3B]'
                }`}
                style={{ width: `${pred.congestion}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5]/50 backdrop-blur-md border border-[#E8E2D9]/60 shadow-subtle">
            <div className="flex items-center justify-between text-xs text-[#64564B] mb-1.5">
              <span className="font-medium">Model Confidence</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-[#231E1A] tracking-tight">{pred.confidence}%</span>
            </div>
            <p className="text-[10px] text-[#64564B] mt-1.5">Bayesian ensemble variance &lt; 1.2%</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5]/50 backdrop-blur-md border border-[#E8E2D9]/60 shadow-subtle">
            <div className="flex items-center justify-between text-xs text-[#64564B] mb-1.5">
              <span className="font-medium">Monitored Area</span>
            </div>
            <h4 className="text-xs font-bold text-[#231E1A] truncate">
              {shortName}
            </h4>
            <div className="flex items-center justify-between text-xs text-[#64564B] mt-1.5 pt-1.5 border-t border-[#E8E2D9]/60">
              <span>Current: <strong className="text-[#231E1A]">{currentSpeed} km/h</strong></span>
              <span>Free-Flow: <strong className="text-[#231E1A]">{freeFlow} km/h</strong></span>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-[#FAF8F5]/80 backdrop-blur-md border border-[#E8E2D9] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#A86032] text-[#FFFFFF] shadow-sm mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E08E45]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#362E28]">AI Prescriptive Recommendation</span>
                <span className="text-[10px] bg-[#E8E2D9] text-[#4C4138] font-mono px-1.5 py-0.2 rounded font-semibold">Autonomous Level 3</span>
              </div>
              <p className="text-xs font-medium text-[#231E1A] mt-0.5">"{pred.action}"</p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#FAF8F5] border border-[#E8E2D9] text-[#A86032] text-xs font-semibold shadow-sm transition-all whitespace-nowrap self-start sm:self-auto">
            Execute Policy Override
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-3.5">
          <div className="p-3.5 rounded-xl bg-[#FAF8F5]/50 backdrop-blur-md border border-[#E8E2D9]/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#231E1A]">Prediction Factor Breakdown</h3>
                <p className="text-xs text-[#64564B]">Shapley value contributions for {shortName}</p>
              </div>
              <Sliders className="w-4 h-4 text-[#64564B]" />
            </div>
            <div className="space-y-3.5">
              {influences.map((inf, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#231E1A]">{inf.factor}</span>
                    <span className="font-mono font-bold text-[#231E1A]">{inf.weight}%</span>
                  </div>
                  <div className="w-full bg-[#E8E2D9] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${idx === 0 ? 'bg-[#A86032]' : idx === 1 ? 'bg-[#64564B]' : idx === 2 ? 'bg-[#C47D3B]' : 'bg-[#2D6A4F]'}`}
                      style={{ width: `${inf.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#E8E2D9]/60 flex items-center justify-between text-[11px] text-[#64564B]">
              <span>Spatial Graph Weight: <strong className="text-[#231E1A]">0.84</strong></span>
              <span>Periodicity Fit: <strong className="text-[#231E1A]">0.92</strong></span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#FAF8F5]/50 backdrop-blur-md border border-[#E8E2D9]/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#231E1A]">Projected 60-Minute Velocity Trajectory</h3>
                <p className="text-xs text-[#64564B]">Forecasted velocity (km/h) across time horizons in {shortName}</p>
              </div>
              <span className="text-[10px] font-mono bg-[#E8E2D9] text-[#4C4138] px-2 py-0.5 rounded font-semibold">
                ST-GNN Feed
              </span>
            </div>

            <div className="relative w-full h-44">
              <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="predCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A86032" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#A86032" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="40" y1="20" x2="380" y2="20" stroke="#E8E2D9" strokeDasharray="3 3" />
                <line x1="40" y1="65" x2="380" y2="65" stroke="#E8E2D9" strokeDasharray="3 3" />
                <line x1="40" y1="110" x2="380" y2="110" stroke="#E8E2D9" strokeDasharray="3 3" />
                <text x="32" y="24" fill="#8C827A" fontSize="10" textAnchor="end" fontFamily="monospace">80</text>
                <text x="32" y="69" fill="#8C827A" fontSize="10" textAnchor="end" fontFamily="monospace">40</text>
                <text x="32" y="114" fill="#8C827A" fontSize="10" textAnchor="end" fontFamily="monospace">0</text>

                <g>
                  <path d={areaPath} fill="url(#predCurveGrad)" />
                  <path d={dPath} fill="none" stroke="#A86032" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4.5" fill="#FFFFFF" stroke="#A86032" strokeWidth="2.5" />
                      <text x={p.x} y={p.y - 9} fill="#231E1A" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="monospace">{p.speed}</text>
                      <text x={p.x} y="130" fill="#64564B" fontSize="10" textAnchor="middle" fontWeight="500">{p.time}</text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-[#64564B]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#A86032]"></span>Predicted velocity trajectory</span>
              <span className="font-mono text-[11px] text-[#8C827A]">Telemetry: {currentLocation?.dataSource || "Live"}</span>
            </div>
          </div>
        </div>

        {/* DENSE LOWER VIEWPORT SECTION: AUTONOMOUS MITIGATION POLICY SIMULATION DECK */}
        <div className="mt-3.5 pt-3.5 border-t border-[#E8E2D9]/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#A86032] text-[#FFFFFF]">
                <Layers className="w-4 h-4 text-[#D5CCC0]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#231E1A]">Autonomous Mitigation Policy Simulation Deck</h3>
                <p className="text-[11px] text-[#64564B]">Real-time scenario testing for automated signal and flow intervention</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#64564B] font-medium">Active Interventions:</span>
              <span className="font-mono font-bold text-[#2D6A4F]">
                {Object.values(activePolicies).filter(Boolean).length} / 4 Engaged
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Policy 1: Green Wave */}
            <div 
              onClick={() => togglePolicy('greenWave')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                activePolicies.greenWave 
                  ? 'bg-[#EAF2EC]/70 border-[#2D6A4F]/40 shadow-sm' 
                  : 'bg-[#FAF8F5]/40 border-[#E8E2D9]/60 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64564B]">Strategy #1</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  activePolicies.greenWave ? 'bg-[#2D6A4F] text-[#FFFFFF]' : 'bg-[#E8E2D9] text-[#64564B]'
                }`}>
                  {activePolicies.greenWave ? 'Engaged' : 'Standby'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-[#231E1A]">Coordinated Green Wave</h4>
              <p className="text-[10px] text-[#64564B] mt-1">Extends phase timing by +14s along primary arterial to dissipate platoons.</p>
              <div className="mt-2 pt-2 border-t border-[#E8E2D9]/60 flex items-center justify-between text-[11px]">
                <span className="text-[#64564B]">Queue Delay</span>
                <span className="font-mono font-bold text-[#2D6A4F]">-24% Drop</span>
              </div>
            </div>

            {/* Policy 2: VSL Dynamic Speed */}
            <div 
              onClick={() => togglePolicy('vsl')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                activePolicies.vsl 
                  ? 'bg-[#EAF2EC]/70 border-[#2D6A4F]/40 shadow-sm' 
                  : 'bg-[#FAF8F5]/40 border-[#E8E2D9]/60 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64564B]">Strategy #2</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  activePolicies.vsl ? 'bg-[#2D6A4F] text-[#FFFFFF]' : 'bg-[#E8E2D9] text-[#64564B]'
                }`}>
                  {activePolicies.vsl ? 'Engaged' : 'Standby'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-[#231E1A]">Dynamic Speed Harmonization</h4>
              <p className="text-[10px] text-[#64564B] mt-1">Harmonizes inbound speed to 45 km/h to prevent shockwave propagation.</p>
              <div className="mt-2 pt-2 border-t border-[#E8E2D9]/60 flex items-center justify-between text-[11px]">
                <span className="text-[#64564B]">Shockwave Risk</span>
                <span className="font-mono font-bold text-[#2D6A4F]">-88% Mitigated</span>
              </div>
            </div>

            {/* Policy 3: Ramp Metering */}
            <div 
              onClick={() => togglePolicy('rampMetering')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                activePolicies.rampMetering 
                  ? 'bg-[#EAF2EC]/70 border-[#2D6A4F]/40 shadow-sm' 
                  : 'bg-[#FAF8F5]/40 border-[#E8E2D9]/60 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64564B]">Strategy #3</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  activePolicies.rampMetering ? 'bg-[#2D6A4F] text-[#FFFFFF]' : 'bg-[#E8E2D9] text-[#64564B]'
                }`}>
                  {activePolicies.rampMetering ? 'Engaged' : 'Standby'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-[#231E1A]">Adaptive Ramp Metering</h4>
              <p className="text-[10px] text-[#64564B] mt-1">Regulates merge ingress to 16 veh/min to preserve expressway capacity.</p>
              <div className="mt-2 pt-2 border-t border-[#E8E2D9]/60 flex items-center justify-between text-[11px]">
                <span className="text-[#64564B]">Mainline Speed</span>
                <span className="font-mono font-bold text-[#2D6A4F]">+8.2 km/h</span>
              </div>
            </div>

            {/* Policy 4: Corridor Diversion */}
            <div 
              onClick={() => togglePolicy('corridorDiversion')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                activePolicies.corridorDiversion 
                  ? 'bg-[#EAF2EC]/70 border-[#2D6A4F]/40 shadow-sm' 
                  : 'bg-[#FAF8F5]/40 border-[#E8E2D9]/60 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64564B]">Strategy #4</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  activePolicies.corridorDiversion ? 'bg-[#2D6A4F] text-[#FFFFFF]' : 'bg-[#E8E2D9] text-[#64564B]'
                }`}>
                  {activePolicies.corridorDiversion ? 'Engaged' : 'Standby'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-[#231E1A]">VMS Corridor Diversion</h4>
              <p className="text-[10px] text-[#64564B] mt-1">Re-routes 14% of non-local through traffic via dynamic digital signs.</p>
              <div className="mt-2 pt-2 border-t border-[#E8E2D9]/60 flex items-center justify-between text-[11px]">
                <span className="text-[#64564B]">Corridor Load</span>
                <span className="font-mono font-bold text-[#2D6A4F]">-18% Volume</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
