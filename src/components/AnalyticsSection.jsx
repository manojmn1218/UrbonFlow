import React, { useState } from 'react';
import { 
  BarChart3, 
  Clock, 
  Flame, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Activity,
  Grid,
  Truck,
  Bus,
  Car,
  Fuel,
  TrendingDown,
  CheckCircle2,
  ShieldAlert,
  Zap
} from 'lucide-react';
import UnifiedSearchBar from './UnifiedSearchBar';

export default function AnalyticsSection({ currentLocation, onLocationChange }) {
  const [hoveredHour, setHoveredHour] = useState(null);
  const [activeRange, setActiveRange] = useState('24h');

  const hourlyTrend = currentLocation?.hourlyTrend || [];
  const peakHours = currentLocation?.peakHours || [];
  const hotspots = currentLocation?.hotspots || [];
  const shortName = currentLocation?.shortName || "Selected Area";

  const totalPoints = hourlyTrend.length || 12;
  const stepX = (680 - 60) / (totalPoints - 1 || 1);
  const speedCoords = hourlyTrend.map((d, i) => ({
    x: 60 + i * stepX,
    y: 200 - ((d.speed || 40) / 80) * 180,
    ...d,
  }));
  const congCoords = hourlyTrend.map((d, i) => ({
    x: 60 + i * stepX,
    y: 200 - ((d.congestion || 35) / 100) * 180,
    ...d,
  }));
  const speedLine = speedCoords.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const speedArea = speedCoords.length > 0 ? `${speedLine} L ${speedCoords[speedCoords.length - 1].x} 200 L ${speedCoords[0].x} 200 Z` : '';
  const congLine = congCoords.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const congArea = congCoords.length > 0 ? `${congLine} L ${congCoords[congCoords.length - 1].x} 200 L ${congCoords[0].x} 200 Z` : '';

  return (
    <div className="space-y-3.5">
      {/* Search Header across all pages */}
      <UnifiedSearchBar 
        currentLocation={currentLocation} 
        onLocationChange={onLocationChange} 
      />

      <div className="bg-[#FFFDF9]/70 backdrop-blur-xl p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-[#EADBCE]/70 shadow-premium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#2C1810] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#5C331E]" />
            Urban Flow Analytics & Trend Intelligence — {shortName}
          </h2>
          <p className="text-[11px] text-[#7D5138]">
            Real-time traffic curves, diurnal commuter surges, and spatial bottleneck rankings for {currentLocation?.name}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#F5EFEB] border border-[#EADBCE]/60 p-1 rounded-xl">
          {['24h', '7d', 'weekend'].map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeRange === range ? 'bg-[#FFFDF9] text-[#2C1810] shadow-sm font-bold' : 'text-[#7D5138] hover:text-[#2C1810]'
              }`}
            >
              {range === '24h' ? '24h Real-Time' : range === '7d' ? '7-Day Benchmark' : 'Weekend Profile'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="lg:col-span-2 bg-[#FFFDF9]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-[#EADBCE]/70 shadow-premium flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#2C1810]">24-Hour Speed vs Congestion Dynamics</span>
                <span className="text-[10px] font-mono bg-[#EADBCE] text-[#4E2E1E] px-2 py-0.5 rounded border border-[#C49A80]/50 font-semibold">
                  {currentLocation?.isRealtime ? "TomTom Live Telemetry" : "ST-GNN Sensor Grid"}
                </span>
              </div>
              <p className="text-xs text-[#7D5138]">Correlation between average velocity (km/h) and congestion delay (%) in {shortName}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[#2C1810] font-medium"><span className="w-2.5 h-2.5 rounded-full bg-[#5C331E]"></span>Speed (km/h)</span>
              <span className="flex items-center gap-1.5 text-[#2C1810] font-medium"><span className="w-2.5 h-2.5 rounded-full bg-[#9E2A2B]"></span>Congestion (%)</span>
            </div>
          </div>

          <div className="relative w-full h-48 sm:h-52 mt-1">
            <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="speedAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5C331E" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#5C331E" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="congestionAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9E2A2B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#9E2A2B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="50" y1="20" x2="680" y2="20" stroke="#F4ECE1" strokeDasharray="3 3" />
              <line x1="50" y1="80" x2="680" y2="80" stroke="#F4ECE1" strokeDasharray="3 3" />
              <line x1="50" y1="140" x2="680" y2="140" stroke="#F4ECE1" strokeDasharray="3 3" />
              <line x1="50" y1="200" x2="680" y2="200" stroke="#EADBCE" />

              <text x="40" y="24" fill="#9C6D52" fontSize="10" textAnchor="end" fontFamily="monospace">80</text>
              <text x="40" y="84" fill="#9C6D52" fontSize="10" textAnchor="end" fontFamily="monospace">50</text>
              <text x="40" y="144" fill="#9C6D52" fontSize="10" textAnchor="end" fontFamily="monospace">25</text>
              <text x="40" y="204" fill="#9C6D52" fontSize="10" textAnchor="end" fontFamily="monospace">0</text>

              <g>
                <path d={speedArea} fill="url(#speedAreaGradient)" />
                <path d={speedLine} fill="none" stroke="#5C331E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {speedCoords.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredHour === i ? "6" : "3.5"}
                    fill="#FFFDF9"
                    stroke="#5C331E"
                    strokeWidth="2.5"
                    onMouseEnter={() => setHoveredHour(i)}
                    onMouseLeave={() => setHoveredHour(null)}
                    className="cursor-pointer transition-all"
                  />
                ))}
              </g>

              <g>
                <path d={congArea} fill="url(#congestionAreaGradient)" />
                <path d={congLine} fill="none" stroke="#9E2A2B" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />
                {congCoords.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredHour === i ? "5" : "3"}
                    fill="#FFFDF9"
                    stroke="#9E2A2B"
                    strokeWidth="2"
                    className="cursor-pointer"
                  />
                ))}
              </g>

              {hourlyTrend.map((d, i) => {
                const x = 60 + i * stepX;
                return (
                  <text key={i} x={x} y="222" fill="#9C6D52" fontSize="10" textAnchor="middle" fontFamily="monospace">
                    {d.hour}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EADBCE]/50 flex items-center justify-between text-xs text-[#7D5138]">
            {hoveredHour !== null && hourlyTrend[hoveredHour] ? (
              <span className="font-semibold text-[#2C1810]">
                At {hourlyTrend[hoveredHour].hour} — Speed: <strong className="text-[#5C331E]">{hourlyTrend[hoveredHour].speed} km/h</strong>, Congestion: <strong className="text-[#9E2A2B]">{hourlyTrend[hoveredHour].congestion}%</strong>
              </span>
            ) : (
              <span>Hover over markers along the trajectory for precise velocity & volume</span>
            )}
            <span className="font-mono text-[11px] text-[#9C6D52]">Peak delay: ~18:00</span>
          </div>
        </div>

        {/* Bottleneck Hotspots */}
        <div className="bg-[#FFFDF9]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-[#EADBCE]/70 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#EADBCE]/50">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#9E2A2B]" />
                <h3 className="text-sm font-bold text-[#2C1810]">Critical Congestion Hotspots</h3>
              </div>
              <span className="text-[10px] font-mono text-[#9C6D52]">Top 4</span>
            </div>

            <div className="space-y-2">
              {hotspots.map((h, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[#F5EFEB]/50 backdrop-blur-sm border border-[#EADBCE]/60 hover:border-[#5C331E] transition-all">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[#2C1810] truncate">{h.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${h.color === '#EF4444' ? 'bg-[#FBEAEA] text-[#9E2A2B]' : 'bg-[#FDF2E9] text-[#C47D3B]'}`}>
                      {h.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#7D5138]">
                    <span>Speed: <strong className="text-[#2C1810]">{h.speed} km/h</strong></span>
                    <span className="font-mono font-bold text-[#3D2317]">Index {h.delayIndex}%</span>
                  </div>
                  <div className="mt-1 text-[10px] text-[#5C331E] font-medium">Action: {h.action}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EADBCE]/50 flex items-center justify-between text-xs text-[#9C6D52]">
            <span>Coordinates: {currentLocation?.lat?.toFixed(3)}, {currentLocation?.lon?.toFixed(3)}</span>
            <span className="text-[#5C331E] font-bold">Live Flow Sync</span>
          </div>
        </div>
      </div>

      {/* Daytime Peak Hour Distribution */}
      <div className="bg-[#FFFDF9]/70 backdrop-blur-xl p-4 rounded-2xl border border-[#EADBCE]/70 shadow-premium">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C47D3B]" />
            <h3 className="text-sm font-bold text-[#2C1810]">Daytime Hourly Traffic Distribution (06:00 – 20:00)</h3>
          </div>
          <span className="text-xs text-[#7D5138]">Relative Load Index (%)</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-15 gap-2">
          {peakHours.map((hour, idx) => (
            <div key={idx} className="bg-[#F5EFEB]/50 backdrop-blur-sm p-2.5 rounded-xl border border-[#EADBCE]/60 text-center">
              <span className="text-[10px] font-mono text-[#7D5138] block truncate">{hour.hour}</span>
              <span className={`text-xs font-mono font-bold block mt-0.5 ${
                hour.level === 'critical' ? 'text-[#9E2A2B]' : hour.level === 'high' ? 'text-[#C47D3B]' : 'text-[#2C1810]'
              }`}>
                {hour.count}%
              </span>
              <div className="w-full bg-[#EADBCE] rounded-full h-1 mt-1.5 overflow-hidden">
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

      {/* DENSE LOWER VIEWPORT SECTION: ARTERIAL CONGESTION HEATMAP & FLEET FLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Arterial Heatmap Matrix across Diurnal Windows (7 Cols) */}
        <div className="lg:col-span-7 bg-[#FFFDF9]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-[#EADBCE]/70 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#EADBCE]/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#5C331E] text-[#FFFDF9]">
                  <Grid className="w-4 h-4 text-[#DFC4B3]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C1810]">Diurnal Arterial Bottleneck Heatmap</h3>
                  <p className="text-[11px] text-[#7D5138]">Congestion pressure across diurnal time blocks in {shortName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#7D5138]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#EAF2EC] border border-[#C4DFC8]"></span>&lt;30%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#FDF2E9] border border-[#EADBCE]"></span>30-60%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#FBEAEA] border border-[#F4C7C7]"></span>&gt;60%</span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#EADBCE]/60 text-[10px] font-semibold uppercase text-[#7D5138]">
                    <th className="pb-2 font-bold min-w-[140px]">Corridor</th>
                    <th className="pb-2 font-bold text-center">Morning Peak<br/><span className="text-[9px] font-normal font-mono lowercase">07:00-10:00</span></th>
                    <th className="pb-2 font-bold text-center">Midday Steady<br/><span className="text-[9px] font-normal font-mono lowercase">11:00-15:00</span></th>
                    <th className="pb-2 font-bold text-center">Evening Rush<br/><span className="text-[9px] font-normal font-mono lowercase">16:00-20:00</span></th>
                    <th className="pb-2 font-bold text-center">Night Flow<br/><span className="text-[9px] font-normal font-mono lowercase">21:00-06:00</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EADBCE]/40">
                  {((currentLocation?.corridors && currentLocation.corridors.length > 0) 
                    ? currentLocation.corridors 
                    : [
                        { id: 1, name: 'North Arterial Boulevard', speed: 38, delay: '+4m' },
                        { id: 2, name: 'Central Transit Ring Road', speed: 29, delay: '+9m' },
                        { id: 3, name: 'Westside Expressway Bypass', speed: 52, delay: '+1m' },
                        { id: 4, name: 'East Financial Corridor', speed: 24, delay: '+12m' },
                      ]
                  ).map((route, rIdx) => {
                    // Diurnal variation model based on corridor speed
                    const baseCong = Math.min(85, Math.max(15, Math.round((70 - (route.speed || 40)) * 1.5)));
                    const morningCong = Math.min(95, Math.round(baseCong * 1.25));
                    const middayCong = Math.max(15, Math.round(baseCong * 0.75));
                    const eveningCong = Math.min(98, Math.round(baseCong * 1.4));
                    const nightCong = Math.max(10, Math.round(baseCong * 0.35));

                    const getCellBadge = (cong) => {
                      if (cong > 65) return 'bg-[#FBEAEA] text-[#9E2A2B] border-[#F4C7C7]';
                      if (cong > 35) return 'bg-[#FDF2E9] text-[#C47D3B] border-[#EADBCE]';
                      return 'bg-[#EAF2EC] text-[#2D6A4F] border-[#C4DFC8]';
                    };

                    return (
                      <tr key={route.id || rIdx} className="hover:bg-[#F5EFEB]/40 transition-colors">
                        <td className="py-2.5 pr-2">
                          <span className="font-bold text-[#2C1810] block text-xs truncate max-w-[170px]">{route.name}</span>
                          <span className="text-[10px] text-[#7D5138]">{route.speed} km/h • {route.delay || 'Normal'}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-1 rounded-lg font-mono font-bold text-xs border ${getCellBadge(morningCong)}`}>
                            {morningCong}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-1 rounded-lg font-mono font-bold text-xs border ${getCellBadge(middayCong)}`}>
                            {middayCong}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-1 rounded-lg font-mono font-bold text-xs border ${getCellBadge(eveningCong)}`}>
                            {eveningCong}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-1 rounded-lg font-mono font-bold text-xs border ${getCellBadge(nightCong)}`}>
                            {nightCong}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EADBCE]/50 flex items-center justify-between text-xs text-[#7D5138]">
            <span>Automated signal pacing balances peak load across adjacent routes</span>
            <span className="font-mono text-[11px] text-[#5C331E] font-bold">ST-GNN Sensor Grid</span>
          </div>
        </div>

        {/* Right: Multimodal Fleet Distribution & Carbon Efficiency (5 Cols) */}
        <div className="lg:col-span-5 bg-[#FFFDF9]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-[#EADBCE]/70 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#EADBCE]/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#5C331E] text-[#FFFDF9]">
                  <Activity className="w-4 h-4 text-[#DFC4B3]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C1810]">Multimodal Fleet & Eco Index</h3>
                  <p className="text-[11px] text-[#7D5138]">Vehicle mix and fuel optimization metrics</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold bg-[#EAF2EC] text-[#2D6A4F] border border-[#C4DFC8]">
                -15.4% Idle
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-[#F5EFEB]/50 border border-[#EADBCE]/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#FFFDF9] text-[#5C331E] border border-[#EADBCE]">
                    <Car className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-[#2C1810] block">Private Passenger Vehicles</span>
                    <span className="text-[10px] text-[#7D5138]">Avg 42.4 km/h • 1,420 veh/hr peak</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-[#2C1810] text-sm">64%</span>
                  <span className="text-[10px] text-[#7D5138] block">Volume</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F5EFEB]/50 border border-[#EADBCE]/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#FFFDF9] text-[#C47D3B] border border-[#EADBCE]">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-[#2C1810] block">Commercial Logistics Freight</span>
                    <span className="text-[10px] text-[#7D5138]">Avg 34.8 km/h • Off-peak windowed</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-[#C47D3B] text-sm">22%</span>
                  <span className="text-[10px] text-[#7D5138] block">Volume</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F5EFEB]/50 border border-[#EADBCE]/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#FFFDF9] text-[#2D6A4F] border border-[#EADBCE]">
                    <Bus className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-[#2C1810] block">Public Transit & Micro-Mobility</span>
                    <span className="text-[10px] text-[#7D5138]">TSP signal priority headway +18%</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-[#2D6A4F] text-sm">14%</span>
                  <span className="text-[10px] text-[#7D5138] block">Volume</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#EAF2EC]/60 border border-[#C4DFC8] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#FFFDF9] text-[#2D6A4F] border border-[#C4DFC8]">
                    <Fuel className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-[#2D6A4F] block">Stop-and-Go Idle Emissions</span>
                    <span className="text-[10px] text-[#2D6A4F]/80">Pacing saves ~310 kg CO₂ / day</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-[#2D6A4F] text-sm">-15.4%</span>
                  <span className="text-[10px] text-[#2D6A4F] block">Conserved</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EADBCE]/50 flex items-center justify-between text-xs text-[#7D5138]">
            <span className="flex items-center gap-1 text-[#2C1810]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
              Eco-Wave Transit Priority Active
            </span>
            <span className="font-mono text-[11px] text-[#9C6D52]">EPA Modeled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
