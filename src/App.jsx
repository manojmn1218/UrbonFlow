import React, { useState, Component, useRef, useEffect } from 'react';
import { LayoutDashboard, Map, Cpu, BarChart3, Network, AlertCircle, Layers } from 'lucide-react';
import OverviewCommandDeck from './components/OverviewCommandDeck';
import TrafficMap2D from './components/TrafficMap2D';
import AiStudioSection from './components/AiStudioSection';
import PipelineFlowchartNav from './components/PipelineFlowchartNav';
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
  const [aiStudioSubTab, setAiStudioSubTab] = useState('predictions'); // 'predictions' | 'analytics' | 'insights'
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
            if (mode === 'traffic_map' || mode === '3d_studio' || mode === '3d_twin') {
              handleSelectTab(1);
            } else if (['predictions', 'analytics', 'insights'].includes(mode)) {
              setAiStudioSubTab(mode);
              handleSelectTab(2);
            } else {
              handleSelectTab(0);
            }
          }}
        />
      ),
    },
    {
      id: 'traffic_map',
      label: 'Live GIS Map',
      icon: Map,
      component: (
        <div className="w-full h-full flex-1 min-h-0 flex flex-col">
          <TrafficMap2D 
            currentLocation={activeLocation}
            onLocationChange={setActiveLocation}
            isVisible={currentWindowIndex === 1}
          />
        </div>
      ),
    },
    {
      id: 'ai_studio',
      label: 'AI Studio & Analytics',
      icon: Cpu,
      component: (
        <AiStudioSection 
          activeHorizon={activeHorizon}
          setActiveHorizon={setActiveHorizon}
          currentLocation={activeLocation}
          onLocationChange={setActiveLocation}
          activeSubTab={aiStudioSubTab}
          setActiveSubTab={setAiStudioSubTab}
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
      if (e.key >= '1' && e.key <= '3') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < windows.length) handleSelectTab(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWindowIndex, windows.length]);

  // Dynamic atmospheric opacity & filter calibration in Refined Warm Porcelain & Soft Mocha
  const bgConfigs = {
    subtle: {
      opacity: 0.08,
      filter: 'brightness(1.05) contrast(0.95) saturate(0.8)',
      label: 'Subtle',
      scrim: 'bg-gradient-to-b from-[#F9F8F6]/95 via-[#F9F8F6]/90 to-[#F4EFE9]/95'
    },
    standard: {
      opacity: 0.14,
      filter: 'brightness(1.04) contrast(0.98) saturate(0.9)',
      label: 'Balanced',
      scrim: 'bg-gradient-to-b from-[#F9F8F6]/90 via-[#F9F8F6]/80 to-[#F4EFE9]/90'
    },
    vivid: {
      opacity: 0.22,
      filter: 'brightness(1.02) contrast(1.02) saturate(1.0)',
      label: 'Atmospheric',
      scrim: 'bg-gradient-to-b from-[#F9F8F6]/80 via-[#F9F8F6]/65 to-[#F4EFE9]/85'
    }
  };
  const activeBg = bgConfigs[bgIntensity] || bgConfigs.standard;

  return (
    <ErrorBoundary>
      <div className="h-screen w-full bg-[#F9F8F6] text-[#231E1A] font-sans antialiased selection:bg-[#4C4138] selection:text-white flex flex-col relative overflow-hidden">
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
          
          {/* Subtle Ambient Radial Lighting with soft warm glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#C87A46]/4 via-transparent to-[#362E28]/6 pointer-events-none" />
        </div>

        {/* Sleek Enterprise Brand Header with UrbanFlow AI Clean & Decent Theme */}
        <header className="w-full bg-white/85 backdrop-blur-xl border-b border-[#E8E2D9] px-4 sm:px-6 py-2.5 flex items-center justify-between z-30 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#362E28] via-[#4C4138] to-[#64564B] flex items-center justify-center text-white shadow-xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                  <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
                </svg>
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2D6A4F] border border-white"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-[#231E1A] text-sm tracking-tight">UrbanFlow</span>
                <span className="text-[10px] font-mono font-bold bg-[#362E28] text-white px-1.5 py-0.5 rounded-md">AI</span>
              </div>
              <span className="text-[10px] text-[#64564B] font-medium">Metropolitan Traffic Intelligence</span>
            </div>
          </div>

          {/* Right Header Navigation & Context */}
          <div className="flex items-center gap-2.5">
            {/* Ambient Backdrop Atmosphere Controller */}
            <button
              onClick={() => setBgIntensity(prev => prev === 'standard' ? 'vivid' : prev === 'vivid' ? 'subtle' : 'standard')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FAF8F5] hover:bg-white text-[#4C4138] hover:text-[#231E1A] text-xs font-semibold transition-all border border-[#E8E2D9] shadow-2xs"
              title={`Cycle background backdrop atmosphere (${activeBg.label})`}
            >
              <Layers className="w-3.5 h-3.5 text-[#A86032]" />
              <span className="text-[11px] font-bold">{activeBg.label} Backdrop</span>
            </button>

            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FAF8F5] hover:bg-white text-[#4C4138] text-xs font-medium transition-colors border border-[#E8E2D9]"
              title="Open Command Palette"
            >
              <span>Search</span>
              <kbd className="font-mono text-[9px] bg-white px-1 py-0.5 rounded border border-[#E8E2D9] text-[#64564B]">
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
        <div className="flex-1 w-full h-full overflow-hidden relative flex flex-col min-h-0">
          <div 
            ref={contentContainerRef}
            className={`flex-1 w-full h-full relative ${
              currentWindowIndex === 1 
                ? 'overflow-hidden flex flex-col' 
                : 'overflow-y-auto overflow-x-hidden'
            }`}
          >
            <div className={`max-w-[1520px] mx-auto px-3 sm:px-6 lg:px-8 w-full box-border ${
              currentWindowIndex === 1 
                ? 'h-full flex-1 flex flex-col pt-2 pb-2 min-h-0' 
                : 'pt-4 pb-10'
            }`}>
              {windows.map((win, idx) => {
                const isActive = currentWindowIndex === idx;
                return (
                  <div 
                    key={win.id} 
                    style={{ display: isActive ? (currentWindowIndex === 1 ? 'flex' : 'block') : 'none' }}
                    className={`${
                      currentWindowIndex === 1 ? 'h-full flex-1 flex flex-col min-h-0 w-full' : 'w-full'
                    } ${
                      isActive ? (slideDirection === 'forward' ? 'tab-flow-forward' : 'tab-flow-backward') : ''
                    }`}
                  >
                    <ErrorBoundary>
                      {win.component}
                    </ErrorBoundary>
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
            if (tabId === 'overview') handleSelectTab(0);
            else if (tabId === 'traffic_map' || tabId === '3d_studio') handleSelectTab(1);
            else if (['predictions', 'analytics', 'insights', 'ai_studio'].includes(tabId)) {
              if (['predictions', 'analytics', 'insights'].includes(tabId)) setAiStudioSubTab(tabId);
              handleSelectTab(2);
            }
          }}
          currentLocation={activeLocation}
          onLocationChange={setActiveLocation}
        />
      </div>
    </ErrorBoundary>
  );
}
