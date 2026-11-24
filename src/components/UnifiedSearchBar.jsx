import React, { useState } from 'react';
import { Search, MapPin, Loader2, X, Globe, Sparkles } from 'lucide-react';
import { searchLocations, getLocationTraffic } from '../services/api';
import { generateLocationTelemetry } from '../services/trafficGenerator';

export default function UnifiedSearchBar({ 
  currentLocation, 
  onLocationChange,
  placeholder = "Search any city, district, or landmark (e.g. London, Paris, Tokyo...)" 
}) {
  const [query, setQuery] = useState('');
  const [results, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    const data = await searchLocations(query.trim());
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const handleSelect = async (loc) => {
    setSearchResults([]);
    setQuery('');
    setIsSearching(true);
    const rawTraffic = await getLocationTraffic(loc.lat, loc.lon, loc.name, '15m');
    const fullTelemetry = generateLocationTelemetry(loc, rawTraffic);
    setIsSearching(false);
    if (onLocationChange) {
      onLocationChange(fullTelemetry);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#FFFDF9]/75 backdrop-blur-xl p-2.5 sm:px-3.5 sm:py-2 rounded-2xl border border-[#EADBCE]/70 shadow-subtle">
        {/* Active Location Indicator */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-[#F5EFEB] text-[#5C331E] border border-[#EADBCE] flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-[#5C331E] animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D5138]">Active Area</span>
              {currentLocation?.isRealtime && (
                <span className="text-[9px] font-mono font-bold bg-[#EAF2EC] text-[#2D6A4F] px-1.5 py-0.2 rounded flex items-center gap-1 border border-[#C4DFC8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F] animate-pulse"></span>
                  TomTom Live
                </span>
              )}
            </div>
            <h4 className="text-xs font-extrabold text-[#2C1810] truncate">
              {currentLocation?.name || "Global Metropolitan Grid"}
            </h4>
          </div>
        </div>

        {/* Global Search Input Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 min-w-[280px] sm:min-w-[340px]">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#FFFDF9]/60 hover:bg-[#FFFDF9]/85 border border-[#EADBCE] text-[#2C1810] placeholder:text-[#9C6D52]/70 text-xs font-medium rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#7D5138]/20 focus:border-[#7D5138] focus:bg-[#FFFDF9] transition-all backdrop-blur-sm"
            />
            <Search className="w-3.5 h-3.5 text-[#9C6D52] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#5C331E] to-[#422213] hover:from-[#4A2818] hover:to-[#361A0E] text-[#FFFDF9] text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {/* Autocomplete Dropdown */}
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[#FFFDF9]/95 backdrop-blur-2xl border border-[#EADBCE] rounded-2xl shadow-float z-50 max-h-56 overflow-y-auto divide-y divide-[#EADBCE]/50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 bg-[#F5EFEB]/90 text-[10px] font-bold uppercase tracking-wider text-[#7D5138] flex justify-between items-center">
            <span>Select Matching Area</span>
            <button onClick={() => setSearchResults([])}><X className="w-3 h-3 text-[#7D5138]" /></button>
          </div>
          {results.map((res, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(res)}
              className="w-full p-2.5 text-left hover:bg-[#F5EFEB] transition-colors flex flex-col"
            >
              <span className="text-xs font-semibold text-[#2C1810] truncate">{res.name}</span>
              <span className="text-[10px] text-[#7D5138] truncate">{res.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
