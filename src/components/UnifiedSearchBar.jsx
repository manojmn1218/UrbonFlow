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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/85 backdrop-blur-xl p-2.5 sm:px-3.5 sm:py-2 rounded-2xl border border-[#E8E2D9] shadow-subtle">
        {/* Active Location Indicator */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#A86032] border border-[#E8E2D9] flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-[#A86032] animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64564B]">Active Area</span>
            </div>
            <h4 className="text-xs font-extrabold text-[#231E1A] truncate">
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
              className="w-full bg-[#FAF8F5]/80 hover:bg-white border border-[#E8E2D9] text-[#231E1A] placeholder:text-[#8C827A] text-xs font-medium rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#A86032]/20 focus:border-[#A86032] focus:bg-white transition-all backdrop-blur-sm"
            />
            <Search className="w-3.5 h-3.5 text-[#8C827A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-3 py-1.5 rounded-xl bg-[#362E28] hover:bg-[#231E1A] text-white text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs whitespace-nowrap"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {/* Autocomplete Dropdown */}
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white/95 backdrop-blur-2xl border border-[#E8E2D9] rounded-2xl shadow-float z-50 max-h-56 overflow-y-auto divide-y divide-[#E8E2D9] animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider text-[#64564B] flex justify-between items-center">
            <span>Select Matching Area</span>
            <button onClick={() => setSearchResults([])}><X className="w-3 h-3 text-[#64564B]" /></button>
          </div>
          {results.map((res, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(res)}
              className="w-full p-2.5 text-left hover:bg-[#FAF8F5] transition-colors flex flex-col"
            >
              <span className="text-xs font-semibold text-[#231E1A] truncate">{res.name}</span>
              <span className="text-[10px] text-[#64564B] truncate">{res.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
