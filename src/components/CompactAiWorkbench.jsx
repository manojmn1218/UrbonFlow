import React, { useState } from 'react';
import { Cpu, ChevronDown, TrendingUp, TrendingDown, Sparkles, RotateCw, ArrowRight, MapPin, Globe } from 'lucide-react';
import { getLocationTraffic } from '../services/api';
import { generateLocationTelemetry } from '../services/trafficGenerator';

export default function CompactAiWorkbench({ 
  activeHorizon, 
  setActiveHorizon,
  onOpenFullPredictions,
  currentLocation,
  onLocationChange 
}) {
  const [isSimulating, setIsSimulating] = useState(false);

  const shortName = currentLocation?.shortName || "Selected Area";
  const pred = currentLocation?.predictions?.[activeHorizon] || currentLocation?.predictions?.['15m'] || {
    speed: 40.0,
    congestion: 35,
    change: "+1.2 km/h",
    confidence: 95.4,
    risk: "Optimal Flow",
    action: "Steady corridor throughput; maintain active baseline timing"
  };

  const handleSimulate = async () => {
    if (!currentLocation) return;
    setIsSimulating(true);
    const raw = await getLocationTraffic(currentLocation.lat, currentLocation.lon, currentLocation.name, activeHorizon);
    const updated = generateLocationTelemetry(currentLocation, raw);
    if (onLocationChange) onLocationChange(updated);
    setIsSimulating(false);
  };

  const currentSpeed = currentLocation?.currentSpeed || 42.0;

  return (
    <div className="bg-[#FFFDF9]/70 backdrop-blur-xl rounded-3xl border border-[#EADBCE]/70 shadow-premium p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#EADBCE]/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#F5EFEB] text-[#5C331E] border border-[#EADBCE]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C1810] tracking-tight">AI Prediction Workbench</h3>
              <p className="text-[11px] text-[#7D5138] font-mono">
                {currentLocation?.isRealtime ? 'TomTom Live Telemetry' : 'ST-GNN v4.2 Inference'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="p-1.5 rounded-xl bg-[#F5EFEB] hover:bg-[#EADBCE] text-[#4E2E1E] text-xs transition-colors border border-[#EADBCE]"
            title="Recalculate Inference"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-[#5C331E]' : ''}`} />
          </button>
        </div>

        {/* Active Target Info */}
        <div className="mt-3.5 p-3 rounded-2xl bg-[#F5EFEB]/50 backdrop-blur-sm border border-[#EADBCE]/60">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#7D5138] mb-1">
            <span>Target Location Profile</span>
            <span className="font-mono text-[#5C331E] font-bold">{currentLocation?.lat?.toFixed(3)}, {currentLocation?.lon?.toFixed(3)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#5C331E] flex-shrink-0" />
            <h4 className="text-xs font-bold text-[#2C1810] truncate">{currentLocation?.name}</h4>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#7D5138] mt-2 pt-2 border-t border-[#EADBCE]/60">
            <span>Now: <strong className="text-[#2C1810]">{currentSpeed} km/h</strong></span>
            <span>Free-Flow: <strong className="text-[#2C1810]">{currentLocation?.freeFlowSpeed || 60} km/h</strong></span>
          </div>
        </div>

        {/* Forecast Horizon Selector */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7D5138] block">
              Forecast Horizon
            </label>
            <span className="text-[10px] font-mono text-[#5C331E] font-semibold">{pred.confidence}% Conf</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-[#F5EFEB] border border-[#EADBCE]/60 p-1 rounded-xl">
            {['15m', '30m', '60m'].map((h) => (
              <button
                key={h}
                onClick={() => setActiveHorizon(h)}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeHorizon === h ? 'bg-[#5C331E] text-[#FFFDF9] shadow-sm' : 'text-[#7D5138] hover:text-[#2C1810]'
                }`}
              >
                +{h}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3.5">
          <div className="p-3 rounded-2xl bg-[#F5EFEB]/50 backdrop-blur-sm border border-[#EADBCE]/60">
            <span className="text-[10px] text-[#7D5138] font-medium block">PREDICTED SPEED</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-extrabold font-mono text-[#2C1810] tracking-tight">
                {pred.speed}
              </span>
              <span className="text-[11px] font-semibold text-[#7D5138]">km/h</span>
            </div>
            <div className="mt-1 text-[10px] font-semibold flex items-center gap-0.5">
              {pred.speed < currentSpeed ? (
                <span className="text-[#9E2A2B] flex items-center">
                  <TrendingDown className="w-3 h-3" /> {pred.change}
                </span>
              ) : (
                <span className="text-[#2D6A4F] flex items-center">
                  <TrendingUp className="w-3 h-3" /> {pred.change}
                </span>
              )}
              <span className="text-[#9C6D52] truncate">vs now ({currentSpeed} km/h)</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F5EFEB]/50 backdrop-blur-sm border border-[#EADBCE]/60">
            <span className="text-[10px] text-[#7D5138] font-medium block">CONGESTION INDEX</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-extrabold font-mono text-[#2C1810] tracking-tight">
                {pred.congestion}%
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                pred.congestion > 70 ? 'bg-[#FBEAEA] text-[#9E2A2B]' : 'bg-[#FDF2E9] text-[#C47D3B]'
              }`}>
                {pred.risk}
              </span>
            </div>
            <div className="w-full bg-[#EADBCE] rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full ${pred.congestion > 70 ? 'bg-[#9E2A2B]' : 'bg-[#C47D3B]'}`}
                style={{ width: `${pred.congestion}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-2xl bg-[#F5EFEB]/80 border border-[#EADBCE]">
          <div className="flex items-center gap-1.5 text-[#3D2317] font-bold text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#C47D3B]" />
            <span>Autonomous Mitigation:</span>
          </div>
          <p className="text-[11px] text-[#4E2E1E] leading-snug font-medium">
            "{pred.action}"
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-[#EADBCE]/50 flex items-center justify-between text-xs mt-3">
        <span className="text-[#9C6D52] font-mono text-[10px] truncate max-w-[200px]">
          {currentLocation?.dataSource || "Real-Time Telemetry"}
        </span>
        <button
          onClick={onOpenFullPredictions}
          className="text-xs font-bold text-[#5C331E] hover:text-[#3D2317] flex items-center gap-1 whitespace-nowrap"
        >
          <span>Deep Forecast Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
