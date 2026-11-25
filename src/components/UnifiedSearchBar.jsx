import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2, X, Sparkles } from 'lucide-react';
import { searchLocations, getLocationTraffic } from '../services/api';
import { generateLocationTelemetry } from '../services/trafficGenerator';
import { TRAINED_LOCATIONS, filterTrainedLocations } from '../services/trainedLocations';

export default function UnifiedSearchBar({ 
  currentLocation, 
  onLocationChange,
  placeholder = "Search Bengaluru corridors or any city..." 
}) {
  const [query, setQuery] = useState('');
  const [results, setSearchResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    setIsDropdownOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setSearchResults(TRAINED_LOCATIONS);
      return;
    }

    const instantMatches = filterTrainedLocations(val);
    if (instantMatches.length > 0) {
      setSearchResults(instantMatches);
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const data = await searchLocations(val.trim());
      setSearchResults(data && data.length > 0 ? data : instantMatches);
      setIsSearching(false);
    }, 240);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults(TRAINED_LOCATIONS);
      setIsDropdownOpen(true);
      return;
    }
    setIsSearching(true);
    const data = await searchLocations(query.trim());
    setSearchResults(data || filterTrainedLocations(query));
    setIsDropdownOpen(true);
    setIsSearching(false);
  };

  const handleSelect = async (loc) => {
    setIsDropdownOpen(false);
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
    <div ref={containerRef} className="relative w-full">
      <div className="flex flex-col gap-2 bg-white/85 backdrop-blur-xl p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl border border-[#E8E2D9] shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Active Location Indicator */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#A86032] border border-[#E8E2D9] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#A86032]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64564B]">Active Area</span>
                {currentLocation?.lat && (
                  <span className="text-[10px] font-mono text-[#8C827A]">
                    ({Number(currentLocation.lat).toFixed(3)}, {Number(currentLocation.lon).toFixed(3)})
                  </span>
                )}
              </div>
              <h4 className="text-xs font-extrabold text-[#231E1A] truncate">
                {currentLocation?.name || "Indiranagar, Bengaluru"}
              </h4>
            </div>
          </div>

          {/* Global Search Input Bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-1.5 min-w-[260px] sm:min-w-[330px]">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={placeholder}
                value={query}
                onFocus={() => {
                  setIsDropdownOpen(true);
                  if (!query.trim()) setSearchResults(TRAINED_LOCATIONS);
                }}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full bg-[#FAF8F5]/80 hover:bg-white border border-[#E8E2D9] text-[#231E1A] placeholder:text-[#8C827A] text-xs font-medium rounded-xl pl-8 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#A86032]/20 focus:border-[#A86032] focus:bg-white transition-all backdrop-blur-sm"
              />
              <Search className="w-3.5 h-3.5 text-[#8C827A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setSearchResults(TRAINED_LOCATIONS); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C827A] hover:text-[#231E1A] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-3 py-1.5 rounded-xl bg-[#362E28] hover:bg-[#231E1A] text-white text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs whitespace-nowrap cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Select'}
            </button>
          </form>
        </div>

        {/* Visible Quick-Select Trained Locations Strip */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-[#E8E2D9]/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64564B] flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-[#A86032]" />
            Trained Nodes (8):
          </span>
          {TRAINED_LOCATIONS.map((loc) => {
            const isActive = currentLocation?.name?.toLowerCase().includes(loc.shortLabel.toLowerCase());
            return (
              <button
                key={loc.code}
                type="button"
                onClick={() => handleSelect(loc)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#A86032] text-white border-[#A86032] shadow-xs'
                    : 'bg-[#FAF8F5] text-[#231E1A] border-[#E8E2D9] hover:border-[#A86032] hover:bg-white'
                }`}
              >
                <span className={`font-mono text-[10px] font-bold ${isActive ? 'text-[#FBECE2]' : 'text-[#A86032]'}`}>
                  {loc.code}
                </span>
                <span>{loc.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isDropdownOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-2xl border border-[#E8E2D9] rounded-2xl shadow-float z-50 max-h-60 overflow-y-auto divide-y divide-[#E8E2D9]/70 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider text-[#64564B] flex justify-between items-center sticky top-0">
            <span>{query.trim() ? 'Matching Locations' : 'ST-GNN Trained Bengaluru Locations'}</span>
            <button type="button" onClick={() => setIsDropdownOpen(false)} className="text-[#8C827A] hover:text-[#231E1A] cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {results.map((res, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(res)}
              className="w-full px-3 py-2.5 text-left hover:bg-[#FAF8F5] transition-colors flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#231E1A] block truncate">{res.name}</span>
                <span className="text-[10px] text-[#64564B] block truncate">{res.address}</span>
              </div>
              {res.code && (
                <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#EAF2EC] text-[#2D6A4F] border border-[#2D6A4F]/20">
                  {res.code}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
