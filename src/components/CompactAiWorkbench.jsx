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
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-[#E8E2D9] shadow-xs p-4 flex flex-col">
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E8E2D9]/70">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#FAF8F5] text-[#A86032] border border-[#E8E2D9]">
              <Cpu className="w-4 h-4 text-[#A86032]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#231E1A] tracking-tight">AI Prediction Workbench</h3>
              <p className="text-[11px] text-[#8C827A] font-mono">
                {currentLocation?.isRealtime ? 'TomTom Live Telemetry' : 'ST-GNN v4.2 Inference'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#FAF8F5] border border-[#E8E2D9] p-0.5 rounded-lg">
              {['15m', '30m', '60m'].map((h) => (
                <button
                  key={h}
                  onClick={() => setActiveHorizon(h)}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all ${
                    activeHorizon === h ? 'bg-[#362E28] text-white shadow-xs' : 'text-[#64564B] hover:text-[#231E1A]'
                  }`}
                >
                  +{h}
                </button>
              ))}
            </div>
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-white text-[#4C4138] text-xs transition-colors border border-[#E8E2D9]"
              title="Recalculate Inference"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-[#A86032]' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="p-2.5 rounded-xl bg-[#FAF8F5]/80 border border-[#E8E2D9]">
            <span className="text-[10px] text-[#64564B] font-bold block uppercase tracking-wider">PREDICTED SPEED</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-extrabold font-mono text-[#231E1A] tracking-tight">
                {pred.speed}
              </span>
              <span className="text-[11px] font-semibold text-[#64564B]">km/h</span>
            </div>
            <div className="mt-1 text-[10px] font-semibold flex items-center gap-0.5">
              {pred.speed < currentSpeed ? (
                <span className="text-[#B91C1C] flex items-center">
                  <TrendingDown className="w-3 h-3" /> {pred.change}
                </span>
              ) : (
                <span className="text-[#2D6A4F] flex items-center">
                  <TrendingUp className="w-3 h-3" /> {pred.change}
                </span>
              )}
              <span className="text-[#8C827A] truncate">vs {currentSpeed} km/h</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FAF8F5]/80 border border-[#E8E2D9]">
            <span className="text-[10px] text-[#64564B] font-bold block uppercase tracking-wider">CONGESTION INDEX</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-extrabold font-mono text-[#231E1A] tracking-tight">
                {pred.congestion}%
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                pred.congestion > 70 ? 'bg-[#FDF0F0] text-[#B91C1C]' : 'bg-[#FEF6F0] text-[#A86032]'
              }`}>
                {pred.risk}
              </span>
            </div>
            <div className="w-full bg-[#E8E2D9] rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full ${pred.congestion > 70 ? 'bg-[#B91C1C]' : 'bg-[#A86032]'}`}
                style={{ width: `${pred.congestion}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-2.5 p-2.5 rounded-xl bg-[#FEF6F0]/90 border border-[#F2D7C4]">
          <div className="flex items-center gap-1.5 text-[#A86032] font-bold text-xs mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-[#A86032]" />
            <span>Autonomous Mitigation:</span>
          </div>
          <p className="text-[11px] text-[#362E28] leading-snug font-medium">
            "{pred.action}"
          </p>
        </div>
      </div>

      <div className="pt-2.5 border-t border-[#E8E2D9]/70 flex items-center justify-between text-xs mt-2.5">
        <span className="text-[#8C827A] font-mono text-[10px] truncate max-w-[180px]">
          {currentLocation?.dataSource || "Real-Time Telemetry"}
        </span>
        <button
          onClick={onOpenFullPredictions}
          className="text-xs font-bold text-[#A86032] hover:text-[#8E4F28] flex items-center gap-1 whitespace-nowrap"
        >
          <span>Deep Forecast Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
