import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  Search, 
  MapPin, 
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
  ZoomIn,
  ZoomOut,
  Crosshair, 
  Loader2, 
  Layers, 
  X,
  ArrowUpDown,
  Route,
  Clock,
  Car,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Milestone
} from 'lucide-react';
import { searchLocations, getLocationTraffic, calculateRoutes } from '../services/api';
import { generateLocationTelemetry } from '../services/trafficGenerator';
import { TRAINED_LOCATIONS, filterTrainedLocations } from '../services/trainedLocations';

export default function TrafficMap2D({ 
  currentLocation, 
  onLocationChange,
  isVisible = true
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const routePolylinesRef = useRef([]);
  const routeMarkersRef = useRef([]);
  const destInputRef = useRef(null);
  const plannerDockRef = useRef(null);

  // Map Modes & High-Clarity Visual Styles
  const [mapMode, setMapMode] = useState('planner'); // 'planner' | 'telemetry'
  const [tileMode, setTileMode] = useState('osm'); // 'osm' | 'satellite' | 'esri_streets' | 'esri_canvas' | 'tomtom'
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Single location search (for Telemetry mode)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Origin & Destination state - starts clean without hardcoded preset bias
  const [origin, setOrigin] = useState(() => {
    if (currentLocation?.name && currentLocation?.lat && currentLocation?.lon) {
      return {
        name: currentLocation.name,
        lat: currentLocation.lat,
        lon: currentLocation.lon
      };
    }
    return null;
  });

  const [destination, setDestination] = useState(null);

  // Independent text inputs for typing & clearing
  const [originInput, setOriginInput] = useState(() => currentLocation?.name || '');
  const [destInput, setDestInput] = useState('');

  // Autocomplete suggestion lists
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState(null); // 'origin' | 'dest' | null

  // Route calculation results
  const [routesData, setRoutesData] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);

  // Active location telemetry stats
  const lat = currentLocation?.lat || 12.9784;
  const lon = currentLocation?.lon || 77.6408;
  const name = currentLocation?.name || "Indiranagar, Bengaluru";
  const currentSpeed = currentLocation?.currentSpeed || 34.6;
  const congestion = currentLocation?.congestionPct || 40;

  // Clear existing polylines and marker pins
  const clearRouteLayers = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    routePolylinesRef.current.forEach((layer) => {
      try {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      } catch (e) {}
    });
    routePolylinesRef.current = [];

    routeMarkersRef.current.forEach((marker) => {
      try {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      } catch (e) {}
    });
    routeMarkersRef.current = [];
  };

  // Render Target Marker for single telemetry mode
  const renderTargetMarker = (map, targetLat, targetLon, targetName, speed, cong) => {
    if (!map) return;
    if (targetMarkerRef.current) {
      try {
        if (map.hasLayer(targetMarkerRef.current)) map.removeLayer(targetMarkerRef.current);
      } catch (e) {}
      targetMarkerRef.current = null;
    }

    const targetHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-12 h-12 rounded-full bg-blue-500 opacity-30 animate-ping"></span>
        <span class="absolute w-8 h-8 rounded-full bg-blue-600 opacity-50 animate-pulse"></span>
        <div class="relative w-9 h-9 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-blue-500/50 font-mono text-[10px] font-bold">
          ${speed}
        </div>
      </div>
    `;

    const targetIcon = L.divIcon({
      className: 'custom-target-div',
      html: targetHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([targetLat, targetLon], { icon: targetIcon })
      .addTo(map)
      .bindPopup(`
        <div style="min-width: 200px; font-family: sans-serif; padding: 4px;">
          <span style="font-size: 10px; font-weight: 700; color: #2563eb; text-transform: uppercase;">Real-Time Monitored Area</span>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin: 2px 0 6px 0;">${targetName}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${targetLat.toFixed(4)}, ${targetLon.toFixed(4)}</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #334155; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <span>Speed: <strong>${speed} km/h</strong></span>
            <span>Congestion: <strong>${cong}%</strong></span>
          </div>
        </div>
      `);

    targetMarkerRef.current = marker;
  };

  // Draw routes with casing and anti-aliased polylines
  const drawRoutesOnMap = (data, activeId = null) => {
    const map = mapInstanceRef.current;
    if (!map || !data || !data.routes || data.routes.length === 0) return;

    clearRouteLayers();

    const activeRoute = data.routes.find((r) => r.id === (activeId || selectedRouteId)) || data.routes[0];
    const newLayers = [];

    // Draw alternative routes first (muted, secondary styling)
    data.routes.forEach((route) => {
      if (route.id === activeRoute.id) return;
      const validCoords = (route.coordinates || []).filter(
        (pt) => Array.isArray(pt) && pt.length === 2 && !isNaN(pt[0]) && !isNaN(pt[1])
      );
      if (validCoords.length < 2) return;

      // Subtle underlay for clean contrast
      const halo = L.polyline(validCoords, {
        color: '#ffffff',
        weight: 6,
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      newLayers.push(halo);

      const altPolyline = L.polyline(validCoords, {
        color: '#64748b',
        weight: 4,
        opacity: 0.8,
        dashArray: '6, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      altPolyline.bindTooltip(`
        <div style="font-family: sans-serif; font-size: 11px;">
          <strong>${route.name}</strong><br/>
          ${route.duration_min} min • ${route.distance_km} km
        </div>
      `, { sticky: true });

      altPolyline.on('click', () => {
        setSelectedRouteId(route.id);
        drawRoutesOnMap(data, route.id);
      });

      newLayers.push(altPolyline);
    });

    // Draw active selected route with crisp white casing
    const activeValidCoords = (activeRoute.coordinates || []).filter(
      (pt) => Array.isArray(pt) && pt.length === 2 && !isNaN(pt[0]) && !isNaN(pt[1])
    );

    if (activeValidCoords.length >= 2) {
      // 1. Crisp white underlay casing (halo)
      const casing = L.polyline(activeValidCoords, {
        color: '#ffffff',
        weight: 9,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      newLayers.push(casing);

      // 2. High-vibrancy core route polyline
      const activePolyline = L.polyline(activeValidCoords, {
        color: activeRoute.color || '#2563eb',
        weight: 5.5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      activePolyline.bindTooltip(`
        <div style="font-family: sans-serif; font-size: 12px; font-weight: bold; color: #0f172a;">
          ${activeRoute.name} (${activeRoute.badge})<br/>
          <span style="color: #2563eb;">${activeRoute.duration_min} min</span> • ${activeRoute.distance_km} km
        </div>
      `, { sticky: true });

      newLayers.push(activePolyline);

      // Smoothly zoom and frame the route
      try {
        const bounds = activePolyline.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [60, 60],
            maxZoom: 15,
            animate: true,
            duration: 0.8
          });
        }
      } catch (err) {}
    }

    routePolylinesRef.current = newLayers;

    // Origin Marker (Pin A - Crisp Emerald Beacon)
    if (data.origin && !isNaN(data.origin.lat) && !isNaN(data.origin.lon)) {
      const originIcon = L.divIcon({
        className: 'route-origin-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-emerald-500 opacity-40 animate-ping"></span>
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-emerald-700/50 font-black text-xs">
              A
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const originMarker = L.marker([data.origin.lat, data.origin.lon], { icon: originIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <span style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase;">Origin (Point A)</span>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 2px;">${data.origin.name}</div>
          </div>
        `);
      routeMarkersRef.current.push(originMarker);
    }

    // Destination Marker (Pin B - Crisp Rose/Red Beacon)
    if (data.destination && !isNaN(data.destination.lat) && !isNaN(data.destination.lon)) {
      const destIcon = L.divIcon({
        className: 'route-dest-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-rose-500 opacity-40 animate-ping"></span>
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-red-600 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-rose-600/50 font-black text-xs">
              B
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const destMarker = L.marker([data.destination.lat, data.destination.lon], { icon: destIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <span style="font-size: 10px; font-weight: 700; color: #e11d48; text-transform: uppercase;">Destination (Point B)</span>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 2px;">${data.destination.name}</div>
          </div>
        `);
      routeMarkersRef.current.push(destMarker);
    }
  };

  // Fetch routes from backend
  const fetchAndDrawRoutes = async (orig = origin, dest = destination) => {
    if (!orig?.lat || !orig?.lon || !dest?.lat || !dest?.lon) {
      clearRouteLayers();
      setRoutesData(null);
      return;
    }
    setIsCalculatingRoutes(true);
    try {
      const data = await calculateRoutes(
        orig.lat,
        orig.lon,
        dest.lat,
        dest.lon,
        orig.name,
        dest.name
      );

      if (data && data.routes && data.routes.length > 0) {
        setRoutesData(data);
        const defaultRoute = data.routes[0];
        setSelectedRouteId(defaultRoute.id);
        drawRoutesOnMap(data, defaultRoute.id);
      }
    } catch (err) {
      console.warn('Error calculating routes:', err);
    } finally {
      setIsCalculatingRoutes(false);
    }
  };

  // 100% Free, High-Definition, Watermark-Free Basemap Tile Configurations
  // Configured with maxNativeZoom so zooming into deep street levels (zoom 18-22)
  // NEVER disappears, times out, or turns blank.
  const getTileConfig = (mode) => {
    switch (mode) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          options: {
            maxZoom: 22,
            maxNativeZoom: 18,
            keepBuffer: 8,
            attribution: 'Tiles &copy; Esri &mdash; World Imagery',
          }
        };
      case 'tomtom':
        return {
          url: 'http://localhost:8000/api/map/tile/{z}/{x}/{y}.png',
          options: {
            maxZoom: 22,
            maxNativeZoom: 18,
            keepBuffer: 8,
            attribution: '&copy; TomTom &copy; UrbanFlow AI',
          }
        };
      case 'esri_streets':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          options: {
            maxZoom: 22,
            maxNativeZoom: 17, // Native tiles stop at 17 outside US; upscales smoothly for 18-22
            keepBuffer: 8,
            attribution: 'Tiles &copy; Esri &mdash; World Street Map',
          }
        };
      case 'esri_canvas':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          options: {
            maxZoom: 22,
            maxNativeZoom: 16, // Canvas only has native tiles up to 16; upscales smoothly for 17-22
            keepBuffer: 8,
            attribution: 'Tiles &copy; Esri &mdash; Light Gray Canvas',
          }
        };
      case 'osm':
      default:
        return {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          options: {
            maxZoom: 22,
            maxNativeZoom: 19, // Deep street/lane/house detail up to 19, upscales smoothly for 20-22
            keepBuffer: 8,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }
        };
    }
  };

  // Initialize Leaflet Map with Canvas acceleration & smooth animation
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {}
      mapInstanceRef.current = null;
    }

    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    try {
      const initialCenter = [origin?.lat || lat, origin?.lon || lon];
      const map = L.map(container, {
        center: initialCenter,
        zoom: 14,
        minZoom: 2,
        maxZoom: 22,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,  // Smooth mouse-wheel zoom
        wheelDebounceTime: 40,
        wheelPxPerZoomLevel: 80,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        doubleClickZoom: true,  // Double click zoom
        touchZoom: true,        // Trackpad / touch pinch zoom
        boxZoom: true,          // Shift + drag box zoom
        dragging: true,         // Allows smooth dragging / moving in all directions
        inertia: true,          // Smooth momentum panning
        inertiaDeceleration: 2800,
        inertiaMaxSpeed: 2400,
        easeLinearity: 0.2,
        preferCanvas: true,     // Hardware-accelerated canvas vector rendering
        fadeAnimation: true,
        zoomAnimation: true,
      });

      const initialCfg = getTileConfig(tileMode);
      L.tileLayer(initialCfg.url, initialCfg.options).addTo(map);

      mapInstanceRef.current = map;

      // Invalidate map size after DOM layout stabilizes
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      // Render initial mode layers
      if (mapMode === 'planner') {
        if (origin?.lat && destination?.lat) {
          fetchAndDrawRoutes(origin, destination);
        }
      } else {
        renderTargetMarker(map, lat, lon, name, currentSpeed, congestion);
      }
    } catch (err) {
      console.warn('Leaflet initialization caught:', err);
    }

    return () => {
      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        if (container && container._leaflet_id) {
          delete container._leaflet_id;
        }
      } catch (e) {}
    };
  }, []);

  // Invalidate map size when tab becomes visible or window resizes
  useEffect(() => {
    if (isVisible && mapInstanceRef.current) {
      const t1 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 200);
      const t2 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 750);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('focus', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', handleResize);
    };
  }, []);

  // Update base tiles smoothly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const cfg = getTileConfig(tileMode);
    L.tileLayer(cfg.url, cfg.options).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);
  }, [tileMode]);

  // Sync with global currentLocation updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation?.lat || !currentLocation?.lon) return;

    const newCenter = {
      name: currentLocation.name || "Selected Location",
      lat: currentLocation.lat,
      lon: currentLocation.lon
    };

    if (mapMode === 'telemetry') {
      map.flyTo([currentLocation.lat, currentLocation.lon], 14, {
        animate: true,
        duration: 1.0,
      });
      renderTargetMarker(map, currentLocation.lat, currentLocation.lon, currentLocation.name, currentLocation.currentSpeed || 42, currentLocation.congestionPct || 35);
    } else {
      setOrigin(newCenter);
      setOriginInput(newCenter.name);
      if (destination?.lat) {
        fetchAndDrawRoutes(newCenter, destination);
      } else {
        clearRouteLayers();
        setRoutesData(null);
        map.flyTo([newCenter.lat, newCenter.lon], 13, { animate: true, duration: 0.8 });
      }
    }
  }, [currentLocation?.lat, currentLocation?.lon, currentLocation?.name]);

  // Mode change handler
  const handleModeChange = (newMode) => {
    setMapMode(newMode);
    const map = mapInstanceRef.current;
    if (!map) return;

    setTimeout(() => map.invalidateSize(), 100);

    if (newMode === 'telemetry') {
      clearRouteLayers();
      renderTargetMarker(map, lat, lon, name, currentSpeed, congestion);
      map.flyTo([lat, lon], 14, { animate: true, duration: 0.8 });
    } else {
      if (targetMarkerRef.current) {
        try {
          if (map.hasLayer(targetMarkerRef.current)) map.removeLayer(targetMarkerRef.current);
        } catch (e) {}
        targetMarkerRef.current = null;
      }
      if (routesData) {
        drawRoutesOnMap(routesData, selectedRouteId);
      } else if (origin?.lat && destination?.lat) {
        fetchAndDrawRoutes(origin, destination);
      }
    }
  };

  // Swap Origin and Destination
  const handleSwapLocations = () => {
    if (!origin && !destination) return;
    const nextOrigin = destination ? { ...destination } : null;
    const nextDest = origin ? { ...origin } : null;
    setOrigin(nextOrigin);
    setDestination(nextDest);
    setOriginInput(nextOrigin?.name || '');
    setDestInput(nextDest?.name || '');
    setOriginSuggestions([]);
    setDestSuggestions([]);
    if (nextOrigin?.lat && nextDest?.lat) {
      fetchAndDrawRoutes(nextOrigin, nextDest);
    } else {
      clearRouteLayers();
      setRoutesData(null);
    }
  };

  // Clear both A & B inputs and route graphics cleanly
  const handleClearOrigin = () => {
    setOriginInput('');
    setOrigin(null);
    setOriginSuggestions(TRAINED_LOCATIONS);
    setActiveSearchField('origin');
    clearRouteLayers();
    setRoutesData(null);
    setSelectedRouteId(null);
  };

  const handleClearDest = () => {
    setDestInput('');
    setDestination(null);
    setDestSuggestions(TRAINED_LOCATIONS);
    setActiveSearchField('dest');
    clearRouteLayers();
    setRoutesData(null);
    setSelectedRouteId(null);
  };

  // Optimize route selection: picks lowest travel time & lowest traffic delay
  const handleOptimizeRoute = () => {
    if (!routesData?.routes?.length) {
      if (origin?.lat && destination?.lat) {
        fetchAndDrawRoutes(origin, destination);
      }
      return;
    }
    const sorted = [...routesData.routes].sort(
      (a, b) => (a.duration_min - b.duration_min) || ((a.delay_min || 0) - (b.delay_min || 0))
    );
    const best = sorted[0];
    const updatedData = { ...routesData, routes: sorted };
    setRoutesData(updatedData);
    setSelectedRouteId(best.id);
    drawRoutesOnMap(updatedData, best.id);
  };

  // Focus handlers always reveal trained locations cleanly
  const handleOriginFocus = () => {
    setActiveSearchField('origin');
    if (!originInput.trim() || origin) {
      setOriginSuggestions(TRAINED_LOCATIONS);
    } else {
      setOriginSuggestions(filterTrainedLocations(originInput));
    }
  };

  const handleDestFocus = () => {
    setActiveSearchField('dest');
    if (!destInput.trim() || destination) {
      setDestSuggestions(TRAINED_LOCATIONS);
    } else {
      setDestSuggestions(filterTrainedLocations(destInput));
    }
  };

  // Quick-pick a trained Bengaluru corridor into the active or next empty slot
  const handleQuickCorridorSelect = (place) => {
    if (activeSearchField === 'dest' || (origin?.lat && !destination?.lat && activeSearchField !== 'origin')) {
      handleSelectDest(place);
    } else {
      handleSelectOrigin(place);
    }
  };

  // Debounced search for Origin input
  const originTimerRef = useRef(null);
  const handleOriginInputChange = (val) => {
    setOriginInput(val);
    setActiveSearchField('origin');
    if (origin && val.trim() !== origin.name) {
      setOrigin(null);
    }
    if (originTimerRef.current) clearTimeout(originTimerRef.current);

    if (!val.trim()) {
      setOriginSuggestions(TRAINED_LOCATIONS);
      return;
    }

    const localMatches = filterTrainedLocations(val);
    if (localMatches.length > 0) {
      setOriginSuggestions(localMatches);
    }

    originTimerRef.current = setTimeout(async () => {
      setIsSearchingOrigin(true);
      const results = await searchLocations(val);
      setOriginSuggestions(results && results.length > 0 ? results : localMatches);
      setIsSearchingOrigin(false);
    }, 220);
  };

  // Debounced search for Destination input
  const destTimerRef = useRef(null);
  const handleDestInputChange = (val) => {
    setDestInput(val);
    setActiveSearchField('dest');
    if (destination && val.trim() !== destination.name) {
      setDestination(null);
    }
    if (destTimerRef.current) clearTimeout(destTimerRef.current);

    if (!val.trim()) {
      setDestSuggestions(TRAINED_LOCATIONS);
      return;
    }

    const localMatches = filterTrainedLocations(val);
    if (localMatches.length > 0) {
      setDestSuggestions(localMatches);
    }

    destTimerRef.current = setTimeout(async () => {
      setIsSearchingDest(true);
      const results = await searchLocations(val);
      setDestSuggestions(results && results.length > 0 ? results : localMatches);
      setIsSearchingDest(false);
    }, 220);
  };

  // Select Origin
  const handleSelectOrigin = (place) => {
    const newOrigin = { name: place.name, lat: place.lat, lon: place.lon };
    setOrigin(newOrigin);
    setOriginInput(place.name);
    setOriginSuggestions([]);
    setActiveSearchField(null);
    if (destination?.lat && destination?.lon) {
      fetchAndDrawRoutes(newOrigin, destination);
    } else {
      clearRouteLayers();
      setRoutesData(null);
      mapInstanceRef.current?.flyTo([newOrigin.lat, newOrigin.lon], 13);
      setTimeout(() => destInputRef.current?.focus(), 150);
    }
  };

  // Select Destination
  const handleSelectDest = (place) => {
    const newDest = { name: place.name, lat: place.lat, lon: place.lon };
    setDestination(newDest);
    setDestInput(place.name);
    setDestSuggestions([]);
    setActiveSearchField(null);
    if (origin?.lat && origin?.lon) {
      fetchAndDrawRoutes(origin, newDest);
    } else {
      clearRouteLayers();
      setRoutesData(null);
      mapInstanceRef.current?.flyTo([newDest.lat, newDest.lon], 13);
    }
  };

  // Keydown Enter handler for Origin
  const handleOriginKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (originSuggestions.length > 0) {
        handleSelectOrigin(originSuggestions[0]);
      } else if (originInput.trim()) {
        setIsSearchingOrigin(true);
        const results = await searchLocations(originInput);
        setIsSearchingOrigin(false);
        if (results && results.length > 0) {
          handleSelectOrigin(results[0]);
        }
      }
    }
  };

  // Keydown Enter handler for Destination
  const handleDestKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (destSuggestions.length > 0) {
        handleSelectDest(destSuggestions[0]);
      } else if (destInput.trim()) {
        setIsSearchingDest(true);
        const results = await searchLocations(destInput);
        setIsSearchingDest(false);
        if (results && results.length > 0) {
          handleSelectDest(results[0]);
        }
      }
    }
  };

  // Single location search (for Telemetry mode)
  const handleSingleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchLocations(searchQuery);
    setSearchResults(results || []);
    setIsSearching(false);
  };

  const handleSelectSearchedResult = async (res) => {
    setSearchResults([]);
    setSearchQuery('');
    setIsSearching(true);
    const raw = await getLocationTraffic(res.lat, res.lon, res.name, '15m');
    const fullTelemetry = generateLocationTelemetry(res, raw);
    setIsSearching(false);

    if (onLocationChange) onLocationChange(fullTelemetry);
    if (mapMode === 'planner') {
      handleSelectDest(res);
    }
  };

  const panIntervalRef = useRef(null);

  const handlePan = (dx, dy) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.panBy([dx, dy], { animate: true, duration: 0.28, easeLinearity: 0.2 });
  };

  const startContinuousPan = (dx, dy) => {
    handlePan(dx, dy);
    if (panIntervalRef.current) clearInterval(panIntervalRef.current);
    panIntervalRef.current = setInterval(() => {
      handlePan(dx * 0.75, dy * 0.75);
    }, 140);
  };

  const stopContinuousPan = () => {
    if (panIntervalRef.current) {
      clearInterval(panIntervalRef.current);
      panIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (panIntervalRef.current) clearInterval(panIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (plannerDockRef.current && !plannerDockRef.current.contains(e.target)) {
        setOriginSuggestions([]);
        setDestSuggestions([]);
        setActiveSearchField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (mapMode === 'telemetry') {
      map.flyTo([lat, lon], 14, { animate: true, duration: 0.8 });
    } else if (routesData && routePolylinesRef.current.length > 0) {
      try {
        const activePoly = routePolylinesRef.current[routePolylinesRef.current.length - 1];
        if (activePoly && activePoly.getBounds().isValid()) {
          map.fitBounds(activePoly.getBounds(), { padding: [50, 50], animate: true, duration: 0.8 });
        }
      } catch (e) {}
    }
  };

  return (
    <div className="relative w-full h-full flex-1 min-h-0 rounded-2xl overflow-hidden bg-white border border-[#E8E2D9] shadow-xs flex flex-col">
      {/* Sleek Single-Line Header Controls Bar */}
      <div className="px-3 py-2 bg-white/95 backdrop-blur-xl border-b border-[#E8E2D9] flex items-center justify-between gap-2 z-20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl bg-[#FAF8F5] text-[#A86032] border border-[#E8E2D9] shrink-0">
            <Route className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-[#231E1A] tracking-tight truncate">
                {mapMode === 'planner' ? 'Point-to-Point Trip Navigation' : 'Live GIS Traffic Grid'}
              </h3>
            </div>
            <p className="text-[11px] text-[#64564B] truncate max-w-[180px] sm:max-w-xs md:max-w-sm">
              {mapMode === 'planner' 
                ? (origin?.name && destination?.name 
                    ? `${origin.name.split(',')[0]} ➔ ${destination.name.split(',')[0]}`
                    : 'Search A & B below to calculate route')
                : `Tracking: ${name}`}
            </p>
          </div>
        </div>

        {/* Global Single Search (Available in Telemetry Mode) */}
        {mapMode === 'telemetry' && (
          <div className="relative w-40 sm:w-56 md:w-64 shrink-0">
            <form onSubmit={handleSingleSearchSubmit} className="flex gap-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search area / city..."
                  value={searchQuery}
                  onFocus={() => {
                    if (!searchQuery.trim()) setSearchResults(TRAINED_LOCATIONS);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (!val.trim()) setSearchResults(TRAINED_LOCATIONS);
                    else {
                      const matches = filterTrainedLocations(val);
                      if (matches.length > 0) setSearchResults(matches);
                    }
                  }}
                  className="w-full bg-[#FAF8F5] hover:bg-white border border-[#E8E2D9] text-[#231E1A] text-xs font-medium rounded-lg pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#A86032] focus:bg-white transition-all placeholder:text-[#8C827A]"
                />
                <Search className="w-3 h-3 text-[#8C827A] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-2.5 py-1 rounded-lg bg-[#362E28] hover:bg-[#231E1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Find'}
              </button>
            </form>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-2xl border border-[#E8E2D9] rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#E8E2D9]/50">
                <div className="p-2 bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider text-[#64564B] flex justify-between items-center">
                  <span>{searchQuery.trim() ? 'Select Target Coordinates' : 'Trained Corridors'}</span>
                  <button type="button" onClick={() => setSearchResults([])}><X className="w-3 h-3 text-[#64564B]" /></button>
                </div>
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSearchedResult(res)}
                    className="w-full p-2.5 text-left hover:bg-[#FAF8F5] transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[#231E1A] block truncate">{res.name}</span>
                      <span className="text-[10px] text-[#64564B] block truncate">{res.address}</span>
                    </div>
                    {res.code && (
                      <span className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EAF2EC] text-[#2D6A4F]">
                        {res.code}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mode Switcher & HD Basemap Selectors */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Planner vs Telemetry toggle */}
          <div className="flex items-center bg-[#FAF8F5] p-0.5 rounded-lg border border-[#E8E2D9]">
            <button
              onClick={() => handleModeChange('planner')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md transition-all ${
                mapMode === 'planner'
                  ? 'bg-[#A86032] text-white shadow-xs'
                  : 'text-[#64564B] hover:text-[#231E1A]'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span className="hidden sm:inline">Planner</span>
            </button>
            <button
              onClick={() => handleModeChange('telemetry')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md transition-all ${
                mapMode === 'telemetry'
                  ? 'bg-[#A86032] text-white shadow-xs'
                  : 'text-[#64564B] hover:text-[#231E1A]'
              }`}
            >
              <Navigation className="w-3 h-3" />
              <span className="hidden sm:inline">Telemetry</span>
            </button>
          </div>

          {/* Compact Basemap Selector */}
          <div className="hidden sm:flex items-center bg-[#FAF8F5] p-0.5 rounded-lg border border-[#E8E2D9]">
            {[
              { id: 'osm', label: 'OSM' },
              { id: 'satellite', label: 'Sat' },
              { id: 'esri_canvas', label: 'Canvas' },
              { id: 'tomtom', label: 'TomTom' }
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setTileMode(b.id)}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  tileMode === b.id ? 'bg-white text-[#231E1A] font-bold shadow-xs' : 'text-[#64564B] hover:text-[#231E1A]'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Quick Recenter */}
          <button 
            onClick={handleRecenter} 
            className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#362E28] hover:bg-white border border-[#E8E2D9] hover:text-[#231E1A] transition-all shadow-xs" 
            title="Recenter Map"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map Body Canvas with Floating Controls */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        {/* Leaflet Canvas Container */}
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" 
        />

        {/* Floating 4-Way Directional Navigator & Zoom Pad on Map */}
        <div className="hidden sm:flex absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-2xl rounded-2xl border border-[#E8E2D9] shadow-lg p-2.5 flex-col items-center select-none">
          <div className="flex items-center justify-between w-full pb-1 mb-1.5 border-b border-[#E8E2D9]/70">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#A86032] font-mono flex items-center gap-1">
              <Move className="w-3 h-3 text-[#A86032]" />
              Move & Zoom
            </span>
          </div>
          
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* North */}
            <button
              onMouseDown={() => startContinuousPan(0, -220)}
              onMouseUp={stopContinuousPan}
              onMouseLeave={stopContinuousPan}
              onClick={() => handlePan(0, -220)}
              className="absolute top-0 p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#362E28] hover:text-white text-[#64564B] border border-[#E8E2D9] transition-all active:scale-90 shadow-2xs"
              title="Move Up (North)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            {/* West */}
            <button
              onMouseDown={() => startContinuousPan(-220, 0)}
              onMouseUp={stopContinuousPan}
              onMouseLeave={stopContinuousPan}
              onClick={() => handlePan(-220, 0)}
              className="absolute left-0 p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#362E28] hover:text-white text-[#64564B] border border-[#E8E2D9] transition-all active:scale-90 shadow-2xs"
              title="Move Left (West)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {/* Center Recenter Button */}
            <button
              onClick={handleRecenter}
              className="p-2 rounded-full bg-[#362E28] hover:bg-[#231E1A] text-white transition-all active:scale-90 shadow-xs"
              title="Recenter on Target"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            {/* East */}
            <button
              onMouseDown={() => startContinuousPan(220, 0)}
              onMouseUp={stopContinuousPan}
              onMouseLeave={stopContinuousPan}
              onClick={() => handlePan(220, 0)}
              className="absolute right-0 p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#362E28] hover:text-white text-[#64564B] border border-[#E8E2D9] transition-all active:scale-90 shadow-2xs"
              title="Move Right (East)"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* South */}
            <button
              onMouseDown={() => startContinuousPan(0, 220)}
              onMouseUp={stopContinuousPan}
              onMouseLeave={stopContinuousPan}
              onClick={() => handlePan(0, 220)}
              className="absolute bottom-0 p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#362E28] hover:text-white text-[#64564B] border border-[#E8E2D9] transition-all active:scale-90 shadow-2xs"
              title="Move Down (South)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dedicated Zoom In & Out Cluster on Pad */}
          <div className="flex items-center gap-1.5 w-full mt-2 pt-1.5 border-t border-[#E8E2D9]/70">
            <button
              onClick={() => mapInstanceRef.current?.zoomOut(1)}
              className="flex-1 py-1 px-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#362E28] hover:text-white text-[#64564B] border border-[#E8E2D9] transition-all active:scale-90 flex items-center justify-center gap-1 text-[10px] font-bold shadow-2xs"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3 h-3" />
              <span>Out</span>
            </button>
            <button
              onClick={() => mapInstanceRef.current?.zoomIn(1)}
              className="flex-1 py-1 px-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#362E28] hover:text-white text-[#64564B] border border-[#E8E2D9] transition-all active:scale-90 flex items-center justify-center gap-1 text-[10px] font-bold shadow-2xs"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3 h-3" />
              <span>In</span>
            </button>
          </div>
          <span className="text-[8px] font-mono text-[#8C827A] mt-1">Pan, Drag or Zoom</span>
        </div>

        {/* ======================================================== */}
        {/* REDESIGNED 2-LOCATION TRIP & ROUTE PLANNER DOCK PANEL    */}
        {/* ======================================================== */}
        {mapMode === 'planner' && (
          <div ref={plannerDockRef} className="absolute top-3 left-3 z-[400] w-[332px] sm:w-[376px] max-h-[calc(100%-24px)] overflow-y-auto bg-white/95 backdrop-blur-2xl rounded-2xl border border-[#E8E2D9] shadow-xl p-3.5 flex flex-col gap-2.5 animate-in fade-in slide-in-from-left-4">
            {/* Header toggle for minimizing panel */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D9]/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#A86032] border border-[#E8E2D9]">
                  <Compass className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs font-extrabold text-[#231E1A] tracking-tight block leading-tight">
                    Trip Route Planner
                  </span>
                  <span className="text-[10px] text-[#64564B] block">
                    Select Origin A & Destination B
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                className="text-[#64564B] hover:text-[#231E1A] p-1 rounded-lg hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                title={isPanelCollapsed ? "Expand Panel" : "Collapse Panel"}
              >
                {isPanelCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {!isPanelCollapsed && (
              <>
                {/* 2-Location Inputs Stack with Clean Connector Line & Floating Swap */}
                <div className="relative space-y-2 p-2.5 rounded-2xl bg-[#FAF8F5]/90 border border-[#E8E2D9]">
                  {/* Vertical Route Dotted Connecting Line aligned to badge centers */}
                  <div className="absolute left-[31px] top-[34px] bottom-[34px] w-0.5 border-l-2 border-dashed border-[#D5CCC0] pointer-events-none z-0" />

                  {/* Origin (A) Field */}
                  <div className="relative z-10">
                    <div className={`flex items-center gap-2.5 px-2.5 py-2 pr-9 bg-white border rounded-xl transition-all shadow-xs ${
                      activeSearchField === 'origin'
                        ? 'border-[#2D6A4F] ring-2 ring-[#2D6A4F]/20'
                        : 'border-[#E8E2D9] focus-within:border-[#2D6A4F] focus-within:ring-2 focus-within:ring-[#2D6A4F]/20'
                    }`}>
                      <div className="w-6 h-6 rounded-full bg-[#2D6A4F] text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-xs">
                        A
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-[#64564B] leading-none mb-0.5">
                          Starting Location {origin?.lat ? '• Selected' : ''}
                        </span>
                        <input
                          type="text"
                          placeholder="Choose or type origin..."
                          value={originInput}
                          onFocus={handleOriginFocus}
                          onChange={(e) => handleOriginInputChange(e.target.value)}
                          onKeyDown={handleOriginKeyDown}
                          className="w-full bg-transparent text-xs font-semibold text-[#231E1A] placeholder-[#8C827A] focus:outline-none truncate"
                        />
                      </div>
                      {isSearchingOrigin && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#64564B] shrink-0" />}
                      {originInput && !isSearchingOrigin && (
                        <button
                          type="button"
                          onClick={handleClearOrigin}
                          className="text-[#8C827A] hover:text-[#231E1A] shrink-0 p-0.5 cursor-pointer"
                          title="Clear Origin"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Floating Centered Swap Button */}
                  <button
                    type="button"
                    onClick={handleSwapLocations}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white border border-[#E8E2D9] text-[#A86032] hover:text-[#231E1A] hover:border-[#A86032] shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Swap Origin and Destination"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Destination (B) Field */}
                  <div className="relative z-10">
                    <div className={`flex items-center gap-2.5 px-2.5 py-2 pr-9 bg-white border rounded-xl transition-all shadow-xs ${
                      activeSearchField === 'dest'
                        ? 'border-[#9E2A2B] ring-2 ring-[#9E2A2B]/20'
                        : 'border-[#E8E2D9] focus-within:border-[#9E2A2B] focus-within:ring-2 focus-within:ring-[#9E2A2B]/20'
                    }`}>
                      <div className="w-6 h-6 rounded-full bg-[#9E2A2B] text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-xs">
                        B
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-[#64564B] leading-none mb-0.5">
                          Destination {destination?.lat ? '• Selected' : ''}
                        </span>
                        <input
                          ref={destInputRef}
                          type="text"
                          placeholder="Choose or type destination..."
                          value={destInput}
                          onFocus={handleDestFocus}
                          onChange={(e) => handleDestInputChange(e.target.value)}
                          onKeyDown={handleDestKeyDown}
                          className="w-full bg-transparent text-xs font-semibold text-[#231E1A] placeholder-[#8C827A] focus:outline-none truncate"
                        />
                      </div>
                      {isSearchingDest && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#64564B] shrink-0" />}
                      {destInput && !isSearchingDest && (
                        <button
                          type="button"
                          onClick={handleClearDest}
                          className="text-[#8C827A] hover:text-[#231E1A] shrink-0 p-0.5 cursor-pointer"
                          title="Clear Destination"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visible Trained Corridor Locations Quick-Pick Strip */}
                <div className="px-2.5 py-2 rounded-xl bg-[#FAF8F5]/80 border border-[#E8E2D9]/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64564B] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#A86032]" />
                      Trained Corridors (8)
                    </span>
                    <span className="text-[10px] font-semibold text-[#A86032]">
                      Sets {activeSearchField === 'dest' || (origin?.lat && !destination?.lat && activeSearchField !== 'origin') ? 'Dest (B)' : 'Origin (A)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {TRAINED_LOCATIONS.map((loc) => {
                      const isOrigin = origin?.name?.toLowerCase().includes(loc.shortLabel.toLowerCase());
                      const isDest = destination?.name?.toLowerCase().includes(loc.shortLabel.toLowerCase());
                      return (
                        <button
                          key={loc.code}
                          type="button"
                          onClick={() => handleQuickCorridorSelect(loc)}
                          className={`px-2 py-1 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-1 ${
                            isOrigin
                              ? 'bg-[#EAF2EC] border-[#2D6A4F]/50 text-[#231E1A]'
                              : isDest
                                ? 'bg-[#FBEAEA] border-[#9E2A2B]/40 text-[#231E1A]'
                                : 'bg-white border-[#E8E2D9] hover:border-[#A86032] text-[#231E1A]'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold block truncate leading-tight">{loc.shortLabel}</span>
                            <span className="text-[9px] font-mono text-[#64564B]">{loc.code}</span>
                          </div>
                          {isOrigin && (
                            <span className="w-4 h-4 rounded-full bg-[#2D6A4F] text-white text-[9px] font-black flex items-center justify-center shrink-0">A</span>
                          )}
                          {!isOrigin && isDest && (
                            <span className="w-4 h-4 rounded-full bg-[#9E2A2B] text-white text-[9px] font-black flex items-center justify-center shrink-0">B</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DEDICATED AUTOCOMPLETE SUGGESTIONS CONTAINER (NON-COLLIDING) */}
                {activeSearchField === 'origin' && originSuggestions.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#E8E2D9] shadow-md max-h-52 overflow-y-auto divide-y divide-[#E8E2D9]/60 animate-in fade-in slide-in-from-top-1">
                    <div className="px-2.5 py-2 bg-[#FAF8F5] text-[10px] font-bold text-[#64564B] uppercase tracking-wider flex justify-between items-center sticky top-0 z-10 border-b border-[#E8E2D9]/60">
                      <span className="flex items-center gap-1.5 text-[#2D6A4F]">
                        <span className="w-4 h-4 rounded-full bg-[#2D6A4F] text-white text-[9px] font-black flex items-center justify-center">A</span>
                        {originInput.trim() ? 'Matching Origins' : 'Select Starting Corridor'}
                      </span>
                      <button type="button" onClick={() => setOriginSuggestions([])} className="text-[#8C827A] hover:text-[#231E1A] p-0.5 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {originSuggestions.map((place, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectOrigin(place)}
                        className="w-full px-2.5 py-2 text-left hover:bg-[#FAF8F5] transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#231E1A] group-hover:text-[#A86032] block truncate">{place.name}</span>
                          <span className="text-[10px] text-[#64564B] block truncate">{place.address}</span>
                        </div>
                        {place.code && (
                          <span className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EAF2EC] text-[#2D6A4F]">
                            {place.code}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeSearchField === 'dest' && destSuggestions.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#E8E2D9] shadow-md max-h-52 overflow-y-auto divide-y divide-[#E8E2D9]/60 animate-in fade-in slide-in-from-top-1">
                    <div className="px-2.5 py-2 bg-[#FAF8F5] text-[10px] font-bold text-[#64564B] uppercase tracking-wider flex justify-between items-center sticky top-0 z-10 border-b border-[#E8E2D9]/60">
                      <span className="flex items-center gap-1.5 text-[#9E2A2B]">
                        <span className="w-4 h-4 rounded-full bg-[#9E2A2B] text-white text-[9px] font-black flex items-center justify-center">B</span>
                        {destInput.trim() ? 'Matching Destinations' : 'Select Destination Corridor'}
                      </span>
                      <button type="button" onClick={() => setDestSuggestions([])} className="text-[#8C827A] hover:text-[#231E1A] p-0.5 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {destSuggestions.map((place, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectDest(place)}
                        className="w-full px-2.5 py-2 text-left hover:bg-[#FAF8F5] transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#231E1A] group-hover:text-[#A86032] block truncate">{place.name}</span>
                          <span className="text-[10px] text-[#64564B] block truncate">{place.address}</span>
                        </div>
                        {place.code && (
                          <span className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EAF2EC] text-[#2D6A4F]">
                            {place.code}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Calculate & Optimize Actions Row */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fetchAndDrawRoutes(origin, destination)}
                    disabled={isCalculatingRoutes || !origin?.lat || !destination?.lat}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#A86032] via-[#4A2818] to-[#3B1F13] hover:from-[#4A2818] hover:to-[#231E1A] text-[#FFFFFF] text-xs font-bold shadow-md shadow-[#4A2818]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isCalculatingRoutes ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Car className="w-4 h-4" />
                        Calculate Route
                      </>
                    )}
                  </button>
                  {routesData?.routes?.length > 1 && (
                    <button
                      type="button"
                      onClick={handleOptimizeRoute}
                      className="py-2.5 px-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1E4D38] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shrink-0"
                      title="Select & sort by fastest low-delay route"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Optimize
                    </button>
                  )}
                </div>

                {/* Empty State / Prompt if no routes yet */}
                {!routesData && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5]/60 backdrop-blur-md border border-dashed border-[#E8E2D9] text-center space-y-1">
                    <Route className="w-5 h-5 text-[#8C827A] mx-auto" />
                    <p className="text-xs font-bold text-[#231E1A]">Select A & B to Calculate</p>
                    <p className="text-[11px] text-[#64564B] leading-relaxed">
                      Pick a trained Bengaluru corridor above or search any address to compare live routes.
                    </p>
                  </div>
                )}

                {/* Route Options Comparison List */}
                {routesData && routesData.routes && routesData.routes.length > 0 && (
                  <div className="space-y-2 mt-0.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#64564B] uppercase tracking-wider">
                      <span>Available Routes ({routesData.routes.length})</span>
                      <span className="text-[#8C827A] lowercase font-normal font-mono">
                        direct {routesData.direct_distance_km} km
                      </span>
                    </div>

                    <div className="space-y-2">
                      {routesData.routes.map((route) => {
                        const isSelected = route.id === (selectedRouteId || routesData.routes[0].id);
                        return (
                          <div
                            key={route.id}
                            onClick={() => {
                              setSelectedRouteId(route.id);
                              drawRoutesOnMap(routesData, route.id);
                            }}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#FAF8F5]/90 border-[#A86032] shadow-sm ring-2 ring-[#A86032]/20 backdrop-blur-md'
                                : 'bg-[#FFFFFF]/50 border-[#E8E2D9]/60 hover:bg-[#FFFFFF]/80 backdrop-blur-md'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#231E1A] truncate">
                                {route.name}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isSelected 
                                  ? 'bg-[#A86032] text-[#FFFFFF]' 
                                  : 'bg-[#E8E2D9] text-[#4C4138]'
                              }`}>
                                {route.badge}
                              </span>
                            </div>

                            {/* Route Metrics: Duration & Distance */}
                            <div className="mt-2 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-mono font-black text-[#231E1A]">
                                  {route.duration_min}
                                </span>
                                <span className="text-xs font-bold text-[#64564B]">min</span>
                                {route.delay_min > 0 && (
                                  <span className="text-[10px] font-semibold text-[#C47D3B] ml-1">
                                    (+{route.delay_min}m delay)
                                  </span>
                                )}
                              </div>

                              <div className="text-right">
                                <span className="text-sm font-mono font-bold text-[#362E28]">
                                  {route.distance_km}
                                </span>
                                <span className="text-[10px] text-[#64564B] ml-0.5">km</span>
                              </div>
                            </div>

                            {/* Traffic Status Indicator */}
                            <div className="mt-1.5 flex items-center justify-between text-[10px] pt-1.5 border-t border-[#E8E2D9]/60 text-[#64564B] gap-1.5">
                              <span className="flex items-center gap-1 font-medium truncate">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  route.traffic_status === 'Optimal Flow' 
                                    ? 'bg-[#2D6A4F]' 
                                    : (route.traffic_status === 'Steady Flow' ? 'bg-[#A86032]' : 'bg-[#C47D3B]')
                                }`}></span>
                                {route.traffic_status}
                                {route.stgnn_predicted_speed && (
                                  <span className="ml-1 font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#EAF2EC] text-[#2D6A4F] font-semibold">
                                    ST-GNN {route.stgnn_predicted_speed} km/h
                                  </span>
                                )}
                              </span>
                              <span className={`font-semibold shrink-0 ${isSelected ? 'text-[#A86032]' : 'text-[#8C827A]'}`}>
                                {isSelected ? 'Active Route' : 'Click to select'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SINGLE AREA TELEMETRY HUD (When in 'telemetry' mode)     */}
        {/* ======================================================== */}
        {mapMode === 'telemetry' && (
          <div className="absolute bottom-4 left-4 z-[400] max-w-xs sm:max-w-sm bg-[#FFFFFF]/80 backdrop-blur-2xl rounded-2xl border border-[#E8E2D9]/70 shadow-2xl p-3.5 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#E8E2D9]/50">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#A86032] animate-ping"></span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64564B]">
                  Target Area Telemetry
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#A86032] bg-[#FAF8F5] border border-[#E8E2D9] px-1.5 py-0.2 rounded">
                {lat.toFixed(3)}, {lon.toFixed(3)}
              </span>
            </div>

            <h4 className="text-xs font-extrabold text-[#231E1A] truncate mb-2">
              {name}
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-xl bg-[#FAF8F5]/50 backdrop-blur-sm border border-[#E8E2D9]/60">
                <span className="text-[10px] text-[#64564B] font-medium block">Current Speed</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-mono font-extrabold text-[#231E1A]">
                    {currentSpeed}
                  </span>
                  <span className="text-[10px] font-semibold text-[#64564B]">km/h</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-[#FAF8F5]/50 backdrop-blur-sm border border-[#E8E2D9]/60">
                <span className="text-[10px] text-[#64564B] font-medium block">Congestion Index</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-mono font-extrabold text-[#231E1A]">
                    {congestion}%
                  </span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    congestion > 70 
                      ? 'bg-[#FBEAEA] text-[#9E2A2B]' 
                      : 'bg-[#EAF2EC] text-[#2D6A4F]'
                  }`}>
                    {congestion > 70 ? 'High' : 'Optimal'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-[#8C827A] font-medium flex items-center justify-between">
              <span className="truncate max-w-[200px]">Source: {currentLocation?.dataSource || 'TomTom GIS Engine'}</span>
              <span className="text-[#A86032] font-bold">Live Flow Sync</span>
            </div>
          </div>
        )}

        {/* Floating Route Legend on Bottom Right */}
        <div className="hidden sm:flex absolute bottom-4 right-4 z-[400] bg-[#FFFFFF]/80 backdrop-blur-md rounded-2xl border border-[#E8E2D9]/70 shadow-lg px-3 py-2 items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2 rounded-full bg-[#A86032] shadow-sm shadow-[#A86032]/40"></span>
            <span className="text-[#231E1A] text-[11px] font-bold">Selected Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1.5 rounded-full bg-[#C49A80]"></span>
            <span className="text-[#64564B] text-[11px]">Alternative Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2D6A4F]"></span>
            <span className="text-[#64564B] text-[11px]">Origin A</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9E2A2B]"></span>
            <span className="text-[#64564B] text-[11px]">Dest B</span>
          </div>
        </div>
      </div>
    </div>
  );
}
