import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Map, 
  Cpu, 
  BarChart3, 
  Network, 
  LayoutDashboard, 
  X,
  MapPin,
  Loader2,
  Globe
} from 'lucide-react';
import { searchLocations, getLocationTraffic } from '../services/api';
import { generateLocationTelemetry } from '../services/trafficGenerator';

export default function CommandPaletteModal({ 
  isOpen, 
  onClose, 
  onSelectTab, 
  currentLocation,
  onLocationChange 
}) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search for global places
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchLocations(query.trim());
      setSearchResults(res || []);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelectArea = async (area, tabToSwitch = null) => {
    setIsSearching(true);
    const raw = await getLocationTraffic(area.lat, area.lon, area.name, '15m');
    const fullTelemetry = generateLocationTelemetry(area, raw);
    setIsSearching(false);

    if (onLocationChange) onLocationChange(fullTelemetry);
    if (tabToSwitch && onSelectTab) onSelectTab(tabToSwitch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2C1810]/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[#FFFDF9]/95 backdrop-blur-2xl rounded-3xl border border-[#EADBCE] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[#2C1810]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative border-b border-[#EADBCE]/60 flex items-center px-4 py-3.5">
          <Search className="w-5 h-5 text-[#9C6D52] mr-3 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any global city, landmark, or view... (e.g. London, Paris, Tokyo, MAE)"
            className="w-full bg-transparent border-none text-sm font-medium text-[#2C1810] placeholder-[#9C6D52]/60 focus:outline-none"
          />
          {isSearching && <Loader2 className="w-4 h-4 text-[#5C331E] animate-spin mr-2" />}
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[#7D5138] hover:text-[#2C1810] hover:bg-[#F5EFEB]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results & Quick Actions */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-3">
          {/* Real-Time Location Search Results if query exists */}
          {searchResults.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C331E] px-3 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Live Global Places ({searchResults.length})
              </span>
              <div className="space-y-1 mt-1">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectArea(res, 'traffic_map')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F5EFEB] text-xs transition-all text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MapPin className="w-4 h-4 text-[#5C331E] flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-[#2C1810] block truncate">{res.name}</span>
                        <span className="text-[10px] text-[#7D5138] truncate block">{res.address}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#5C331E] bg-[#F5EFEB] border border-[#EADBCE] px-2 py-0.5 rounded flex-shrink-0">
                      Jump to GIS Map
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Views */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D5138] px-3">
              Quick Views
            </span>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {[
                { name: 'Overview Command Deck', tab: 'overview', icon: LayoutDashboard },
                { name: 'Live GIS Traffic Map & Routing', tab: 'traffic_map', icon: Map },
                { name: 'AI Studio: Deep Forecasting', tab: 'predictions', icon: Cpu },
                { name: 'AI Studio: Traffic Analytics & Heatmap', tab: 'analytics', icon: BarChart3 },
                { name: 'AI Studio: ST-GNN Model Verification', tab: 'insights', icon: Network },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectTab(item.tab);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#F5EFEB] text-[#3D2317] hover:text-[#1A0D08] text-xs font-semibold text-left transition-colors"
                  >
                    <Icon className="w-4 h-4 text-[#5C331E] flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-[#F5EFEB] px-4 py-2.5 border-t border-[#EADBCE]/60 flex items-center justify-between text-[11px] text-[#7D5138]">
          <span>Tip: Press <strong>Esc</strong> to close</span>
          <span className="font-mono">UrbanFlow Universal Telemetry</span>
        </div>
      </div>
    </div>
  );
}
