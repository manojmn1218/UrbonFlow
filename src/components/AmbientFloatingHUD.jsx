import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Activity, Wifi, Key, X, Check, ExternalLink, ShieldCheck, AlertCircle, MapPin } from 'lucide-react';
import { checkBackendHealth, getKpiMetrics, getTomTomSettings, saveTomTomKey } from '../services/api';
import { GLOBAL_AREAS, generateLocationTelemetry } from '../services/trafficGenerator';

export default function AmbientFloatingHUD({
  currentLocation,
  onLocationChange,
  isLiveStream,
  setIsLiveStream,
  onOpenCommandPalette,
  currentWindowLabel
}) {
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [liveSpeed, setLiveSpeed] = useState(currentLocation?.currentSpeed || 42.6);
  const [tomtomConfigured, setTomtomConfigured] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [isTomTomModalOpen, setIsTomTomModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTomTomStatus = async () => {
    const settings = await getTomTomSettings();
    if (settings) {
      setTomtomConfigured(settings.configured || false);
      setMaskedKey(settings.masked_key || '');
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      const online = await checkBackendHealth();
      if (!isMounted) return;
      setIsBackendOnline(online);
      if (online) {
        const kpi = await getKpiMetrics(null);
        if (kpi?.avgSpeed?.value && isMounted) {
          setLiveSpeed(kpi.avgSpeed.value);
        }
        await fetchTomTomStatus();
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSaveKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setIsSaving(true);
    setSaveStatus(null);
    const res = await saveTomTomKey(apiKeyInput.trim());
    setIsSaving(false);
    if (res?.status === 'success') {
      setSaveStatus({ type: 'success', message: 'TomTom API Key successfully saved and active!' });
      setTomtomConfigured(true);
      setApiKeyInput('');
      fetchTomTomStatus();
      setTimeout(() => {
        setSaveStatus(null);
        setIsTomTomModalOpen(false);
      }, 2000);
    } else {
      setSaveStatus({ type: 'error', message: res?.error || 'Failed to save API key' });
    }
  };
  return (
    <div className="fixed top-4 left-4 right-4 z-40 pointer-events-none flex items-center justify-between gap-3">
      {/* FLOATING TOP-LEFT MICRO CAPSULE */}
      <div className="pointer-events-auto bg-white/92 backdrop-blur-2xl border border-slate-200/90 rounded-full px-3 py-1.5 shadow-[0_15px_40px_-10px_rgba(15,23,42,0.1)] flex items-center gap-2 sm:gap-3 transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/25">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
                <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
              </svg>
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1 leading-none">
              <span className="font-extrabold text-slate-900 text-xs tracking-tight">UrbanFlow</span>
              <span className="text-[9px] font-mono font-bold bg-blue-600 text-white px-1 py-0.2 rounded">AI</span>
            </div>
          </div>
        </div>

        <div className="border-l border-slate-200 pl-2">
          <div className="relative">
            <select
              value={currentLocation?.name || ''}
              onChange={(e) => {
                const found = GLOBAL_AREAS.find(a => a.name === e.target.value);
                if (found && onLocationChange) {
                  onLocationChange(generateLocationTelemetry(found));
                }
              }}
              className="appearance-none bg-slate-100/90 hover:bg-slate-200/90 border border-transparent text-slate-800 text-xs font-semibold rounded-full pl-2.5 pr-6 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all max-w-[140px] sm:max-w-[170px] truncate"
            >
              <option value={currentLocation?.name || ''}>
                {currentLocation?.shortName || "Select Area"}
              </option>
              {GLOBAL_AREAS.map((area, idx) => (
                <option key={idx} value={area.name}>
                  {area.shortName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-50 border border-slate-200">
          <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
          <span className={isBackendOnline ? 'text-emerald-700' : 'text-amber-700'}>
            {isBackendOnline ? 'API LIVE' : 'MOCK'}
          </span>
        </div>

        {/* TomTom Real-Time Status Pill */}
        <button
          onClick={() => setIsTomTomModalOpen(true)}
          className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-colors ${
            tomtomConfigured 
              ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200' 
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title="Configure TomTom Real-Time Traffic API Key"
        >
          <Key className="w-3 h-3 text-slate-500" />
          <span className={`w-1.5 h-1.5 rounded-full ${tomtomConfigured ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          <span>{tomtomConfigured ? 'TOMTOM LIVE' : 'TOMTOM API'}</span>
        </button>

        <button
          onClick={() => setIsLiveStream(!isLiveStream)}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
            isLiveStream ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title="Toggle Simulation Stream"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isLiveStream ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
          <span>{isLiveStream ? '60FPS' : 'PAUSED'}</span>
        </button>
      </div>

      {/* FLOATING TOP-RIGHT MICRO CAPSULE */}
      <div className="pointer-events-auto bg-white/92 backdrop-blur-2xl border border-slate-200/90 rounded-full px-3 py-1.5 shadow-[0_15px_40px_-10px_rgba(15,23,42,0.1)] flex items-center gap-2 sm:gap-2.5 transition-all duration-300">
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 pr-2 border-r border-slate-200">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>{currentWindowLabel}</span>
        </div>

        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors py-0.5 px-1.5"
          title="Search Sensor Grid (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline font-medium">Search</span>
          <kbd className="hidden sm:inline font-mono text-[9px] bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-500">
            Ctrl K
          </kbd>
        </button>

        <div className="hidden lg:flex items-center gap-1 font-mono text-xs font-bold text-slate-800 pl-1 border-l border-slate-200">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span>{currentLocation?.currentSpeed || liveSpeed} km/h</span>
        </div>
      </div>

      {/* TomTom API Key Settings Modal */}
      {isTomTomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsTomTomModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">TomTom Traffic API</h3>
                <p className="text-xs text-slate-500">Real-time road flow, speed limits & live delays</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Integration Status:</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                  tomtomConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tomtomConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {tomtomConfigured ? `Active (${maskedKey || 'Key Set'})` : 'No API Key Set (OSM Simulated)'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  TomTom API Key
                </label>
                <input
                  type="password"
                  placeholder={maskedKey ? `Current: ${maskedKey}` : "Paste your TomTom API key here..."}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              {saveStatus && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  saveStatus.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {saveStatus.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  <span>{saveStatus.message}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-2">
                <a
                  href="https://developer.tomtom.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <span>Get Free Key (2,500 calls/day)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTomTomModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !apiKeyInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {isSaving ? 'Saving...' : 'Save & Activate'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
