import React, { useState, Component, useRef, useEffect } from 'react';
import { LayoutDashboard, Map, Cpu, BarChart3, Network, AlertCircle, Layers } from 'lucide-react';
import OverviewCommandDeck from './components/OverviewCommandDeck';
import TrafficMap2D from './components/TrafficMap2D';
import AiPredictionsSection from './components/AiPredictionsSection';
import AnalyticsSection from './components/AnalyticsSection';
import ModelInsightsSection from './components/ModelInsightsSection';
import PipelineFlowchartNav from './components/PipelineFlowchartNav';
import PipelineFlowFooter from './components/PipelineFlowFooter';
import CommandPaletteModal from './components/CommandPaletteModal';
import UnifiedSearchBar from './components/UnifiedSearchBar';
import { generateLocationTelemetry } from './services/trafficGenerator';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-3xl m-6 text-red-800">
          <div className="flex items-center gap-2 mb-2 font-bold text-base">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>UI Render Warning</span>
          </div>
          <p className="text-xs text-red-700 font-mono mb-4">{this.state.error?.message || "Unknown error"}</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold"
          >
            Retry Render
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentWindowIndex, setCurrentWindowIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState('forward'); // 'forward' | 'backward'
  const [activeHorizon, setActiveHorizon] = useState('15m');
  const [isLiveStream, setIsLiveStream] = useState(true);
  const [activeLocation, setActiveLocation] = useState(() => generateLocationTelemetry({ name: "Metropolitan Transit Grid", lat: 40.7128, lon: -74.0060, zone: "Urban Grid" }));
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [bgIntensity, setBgIntensity] = useState('standard'); // 'subtle' | 'standard' | 'vivid'
  const contentContainerRef = useRef(null);

  const handleSelectTab = (newIndex) => {
    if (newIndex === currentWindowIndex) return;
    setSlideDirection(newIndex > currentWindowIndex ? 'forward' : 'backward');
    setCurrentWindowIndex(newIndex);
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const windows = [
    {
      id: 'overview',
      label: 'Overview Deck',
      icon: LayoutDashboard,
      component: (
        <OverviewCommandDeck 
          activeHorizon={activeHorizon}
          setActiveHorizon={setActiveHorizon}
          currentLocation={activeLocation}
          onLocationChange={setActiveLocation}
          onSwitchView={(mode) => {
            const map = { traffic_map: 1, '3d_studio': 1, '3d_twin': 1, predictions: 2, analytics: 3, insights: 4 };
            if (map[mode] !== undefined) handleSelectTab(map[mode]);
          }}
        />
      ),
    },
    {
      id: 'traffic_map',
      label: 'Live GIS Map',
      icon: Map,
      component: (
        <div className="space-y-3.5">
          <UnifiedSearchBar 
            currentLocation={activeLocation} 
            onLocationChange={setActiveLocation} 
          />

          <TrafficMap2D 
            currentLocation={activeLocation}
            onLocationChange={setActiveLocation}
            isVisible={currentWindowIndex === 1}
          />

          {/* DENSE TELEMETRY & OPERATIONS STRIP UNDER MAP */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Left 7 Cols: Connected Arterial Corridors */}
            <div className="lg:col-span-7 bg-[#FFFDF9]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-[#EADBCE]/70 shadow-premium flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#EADBCE]/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D5138]">
                    Connected Arterial Corridors ({activeLocation?.shortName || "Active Area"})
                  </span>
                  <span className="text-[10px] font-mono text-[#9C6D52]">Real-Time Velocity & Delays</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(activeLocation?.corridors || [
                    { id: 1, name: 'Main Expressway', speed: 48, length: '6.4 km', delay: '+2m', colorClass: 'bg-emerald-500' },
                    { id: 2, name: 'Central Boulevard', speed: 32, length: '4.8 km', delay: '+6m', colorClass: 'bg-amber-500' },
                    { id: 3, name: 'North Ring Road', speed: 54, length: '9.2 km', delay: 'Normal', colorClass: 'bg-emerald-500' },
                    { id: 4, name: 'Financial Dist Ave', speed: 22, length: '3.1 km', delay: '+11m', colorClass: 'bg-red-500' },
                  ]).map((route) => (
                    <div key={route.id} className="p-3 rounded-xl border border-[#EADBCE]/60 bg-[#F5EFEB]/50 backdrop-blur-md flex items-center justify-between gap-2 shadow-2xs hover:bg-[#FFFDF9]/80 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${route.colorClass || 'bg-[#5C331E]'}`}></span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#2C1810] truncate">{route.name}</h4>
                          <span className="text-[10px] text-[#7D5138]">{route.length}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-mono font-bold text-[#3D2317] block">{route.speed} km/h</span>
                        <span className={`text-[10px] font-bold ${route.status === 'Severe' ? 'text-[#9E2A2B]' : route.status === 'Heavy' ? 'text-[#C47D3B]' : 'text-[#2D6A4F]'}`}>
                          {route.delay}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#EADBCE]/50 flex items-center justify-between text-xs text-[#7D5138]">
                <span>Corridor speed profiles updated every 15s</span>
                <span className="font-mono text-[11px] text-[#5C331E] font-bold">TomTom Telemetry</span>
              </div>
            </div>

            {/* Right 5 Cols: Live Sector Operations & Incident Alert Feed */}
            <div className="lg:col-span-5 bg-[#FFFDF9]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-[#EADBCE]/70 shadow-premium flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#EADBCE]/50">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2D6A4F] animate-pulse"></span>
                    <h4 className="text-xs font-bold text-[#2C1810]">Metropolitan Operations HUD</h4>
                  </div>
                  <span className="text-[10px] font-mono text-[#2D6A4F] font-bold bg-[#EAF2EC] px-1.5 py-0.2 rounded border border-[#C4DFC8]">
                    100% Online
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#F5EFEB]/50 border border-[#EADBCE]/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#2C1810] block">Signal Controllers Sync</span>
                      <span className="text-[10px] text-[#7D5138]">12 Adaptive SCATS Nodes • 90s Cycle</span>
                    </div>
                    <span className="font-mono font-bold text-[#2D6A4F] text-xs">Synched</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F5EFEB]/50 border border-[#EADBCE]/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#2C1810] block">Dynamic VMS Pacing Advisory</span>
                      <span className="text-[10px] text-[#7D5138]">Broadcast: Maintain 45 km/h green wave</span>
                    </div>
                    <span className="font-mono font-bold text-[#5C331E] text-xs">Broadcasting</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FDF2E9]/60 border border-[#EADBCE] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#C47D3B] block">Sector Roadway Incidents</span>
                      <span className="text-[10px] text-[#7D5138]">0 Critical Blocks • Normal Flow Pacing</span>
                    </div>
                    <span className="font-mono font-bold text-[#C47D3B] text-xs">Optimal</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#EADBCE]/50 flex items-center justify-between text-xs text-[#7D5138]">
                <span>Probe Pings: 1,420 pkts/s</span>
                <span className="font-mono text-[11px] text-[#9C6D52]">Latency: 14ms</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'predictions',
      label: 'AI Forecasting',
      icon: Cpu,
      component: (
        <AiPredictionsSection 
          activeHorizon={activeHorizon}
          setActiveHorizon={setActiveHorizon}
          currentLocation={activeLocation}
          onLocationChange={setActiveLocation}
        />
      ),
    },
    {
      id: 'analytics',
      label: 'Traffic Analytics',
      icon: BarChart3,
      component: (
        <AnalyticsSection 
          currentLocation={activeLocation}
          onLocationChange={setActiveLocation}
        />
      ),
    },
    {
      id: 'insights',
      label: 'Model Evaluation',
      icon: Network,
      component: (
        <ModelInsightsSection 
          currentLocation={activeLocation}
          onLocationChange={setActiveLocation}
        />
      ),
    },
  ];

  // Keyboard Left / Right arrow navigation and number shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft') handleSelectTab(Math.max(0, currentWindowIndex - 1));
      if (e.key === 'ArrowRight') handleSelectTab(Math.min(windows.length - 1, currentWindowIndex + 1));
      if (e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < windows.length) handleSelectTab(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWindowIndex, windows.length]);

  // Dynamic atmospheric opacity & filter calibration in Chocolate & Cream
  const bgConfigs = {
    subtle: {
      opacity: 0.28,
      filter: 'brightness(1.02) contrast(1.05) sepia(0.24) saturate(1.15)',
      label: 'Subtle',
      scrim: 'bg-gradient-to-b from-[#FAF6F0]/75 via-[#FAF6F0]/55 to-[#F5EFEB]/80'
    },
    standard: {
      opacity: 0.44,
      filter: 'brightness(1.04) contrast(1.08) sepia(0.20) saturate(1.22)',
      label: 'Balanced',
      scrim: 'bg-gradient-to-b from-[#FAF6F0]/55 via-[#FAF6F0]/35 to-[#F5EFEB]/65'
    },
    vivid: {
      opacity: 0.65,
      filter: 'brightness(1.06) contrast(1.12) sepia(0.16) saturate(1.28)',
      label: 'Vivid',
      scrim: 'bg-gradient-to-b from-[#FAF6F0]/35 via-transparent to-[#F5EFEB]/45'
    }
  };
  const activeBg = bgConfigs[bgIntensity] || bgConfigs.standard;

  return (
    <ErrorBoundary>
      <div className="h-screen w-full bg-[#FAF6F0] text-[#2C1810] font-sans antialiased selection:bg-[#5C331E] selection:text-[#FFFDF9] flex flex-col relative overflow-hidden">
        {/* Ambient Smart City Infrastructure Background Layer */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <picture>
            <source srcSet="/images/traffic-bg.webp" type="image/webp" />
            <img 
              src="/images/traffic-bg.jpg" 
              alt="UrbanFlow Smart City Digital Twin Backdrop" 
              className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02] transition-all duration-700 ease-out"
              style={{
                filter: activeBg.filter,
                opacity: activeBg.opacity,
              }}
            />
          </picture>

          {/* High-End Architectural Gradient Scrim in Warm Cream */}
          <div className={`absolute inset-0 ${activeBg.scrim} backdrop-blur-[1px] transition-all duration-700`} />
          
          {/* Subtle Ambient Radial Lighting with warm amber & chocolate glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#C47D3B]/8 via-transparent to-[#2C1810]/12 pointer-events-none" />
        </div>

        {/* Sleek Enterprise Brand Header with UrbanFlow AI Chocolate & Cream Theme */}
        <header className="w-full bg-[#FFFDF9]/75 backdrop-blur-xl border-b border-[#EADBCE]/70 px-4 sm:px-6 py-2.5 flex items-center justify-between z-30 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3D2317] via-[#5C331E] to-[#7D5138] flex items-center justify-center text-white shadow-sm shadow-[#3D2317]/25">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                  <circle cx="12" cy="12" r="2.5" fill="#FFFDF9" />
                </svg>
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2D6A4F] border border-[#FFFDF9]"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-[#2C1810] text-sm tracking-tight">UrbanFlow</span>
                <span className="text-[10px] font-mono font-bold bg-[#4E2E1E] text-[#FFFDF9] px-1.5 py-0.5 rounded-md">AI</span>
              </div>
              <span className="text-[10px] text-[#7D5138] font-medium">Metropolitan Traffic Intelligence</span>
            </div>
          </div>

          {/* Right Header Navigation & Context */}
          <div className="flex items-center gap-2.5">
            {/* Ambient Backdrop Atmosphere Controller */}
            <button
              onClick={() => setBgIntensity(prev => prev === 'standard' ? 'vivid' : prev === 'vivid' ? 'subtle' : 'standard')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F5EFEB]/80 hover:bg-[#FFFDF9] text-[#4E2E1E] hover:text-[#2C1810] text-xs font-semibold transition-all border border-[#EADBCE]/70 shadow-2xs"
              title={`Cycle background backdrop atmosphere (${activeBg.label})`}
            >
              <Layers className="w-3.5 h-3.5 text-[#C47D3B]" />
              <span className="text-[11px] font-bold">{activeBg.label} Backdrop</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5EFEB]/80 text-[#3D2317] border border-[#EADBCE]/60 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#5C331E]"></span>
              <span>{windows[currentWindowIndex]?.label || "Live System"}</span>
            </div>
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F5EFEB]/80 hover:bg-[#FFFDF9] text-[#4E2E1E] text-xs font-medium transition-colors border border-[#EADBCE]/60"
              title="Open Command Palette"
            >
              <span>Search</span>
              <kbd className="font-mono text-[9px] bg-[#FFFDF9] px-1 py-0.5 rounded border border-[#EADBCE] text-[#7D5138]">
                Ctrl K
              </kbd>
            </button>
          </div>
        </header>

        {/* Interactive AI Traffic Engineering Pipeline Flowchart Bar */}
        <PipelineFlowchartNav 
          currentIndex={currentWindowIndex}
          onSelectIndex={handleSelectTab}
          currentLocation={activeLocation}
        />

        {/* Fluid, Hardware-Accelerated Directional Tab Flow Container */}
        <div className="flex-1 w-full h-full overflow-hidden relative flex flex-col">
          <div 
            ref={contentContainerRef}
            className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden relative"
          >
            <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-10 box-border">
              {windows.map((win, idx) => {
                const isActive = currentWindowIndex === idx;
                return (
                  <div 
                    key={win.id} 
                    style={{ display: isActive ? 'block' : 'none' }}
                    className={isActive ? (slideDirection === 'forward' ? 'tab-flow-forward' : 'tab-flow-backward') : ''}
                  >
                    <ErrorBoundary>
                      {win.component}
                    </ErrorBoundary>

                    {/* Integrated Pipeline Flow Stepper Footer */}
                    <PipelineFlowFooter 
                      currentIndex={currentWindowIndex}
                      onSelectIndex={handleSelectTab}
                      currentLocation={activeLocation}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <CommandPaletteModal 
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectTab={(tabId) => {
            const map = { overview: 0, traffic_map: 1, '3d_studio': 1, predictions: 2, analytics: 3, insights: 4 };
            if (map[tabId] !== undefined) handleSelectTab(map[tabId]);
          }}
          currentLocation={activeLocation}
          onLocationChange={setActiveLocation}
        />
      </div>
    </ErrorBoundary>
  );
}
