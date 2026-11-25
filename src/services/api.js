// UrbanFlow AI - Frontend API Client (Phase 2 Backend Integration)

const API_BASE = 'http://localhost:8000/api';

/**
 * Generic API fetch helper with automatic fallback to static data
 */
export async function fetchApi(endpoint, fallbackData = null) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    // Graceful fallback to static data if backend is offline
    return fallbackData;
  }
}

/**
 * Check if the FastAPI backend is running and reachable
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch('http://localhost:8000/', { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch live prediction for a sensor and time horizon
 */
export async function getPrediction(sensorId, horizon = '15m') {
  return await fetchApi(`/predict?sensor_id=${encodeURIComponent(sensorId)}&horizon=${encodeURIComponent(horizon)}`);
}

/**
 * Fetch citywide KPI telemetry
 */
export async function getKpiMetrics(fallback) {
  return await fetchApi('/kpi', fallback);
}

/**
 * Fetch sensor grid
 */
export async function getSensors(zoneId = 'all', fallback = []) {
  const query = zoneId && zoneId !== 'all' ? `?zone_id=${encodeURIComponent(zoneId)}` : '';
  return await fetchApi(`/sensors${query}`, fallback);
}

/**
 * Fetch monitored arterial routes
 */
export async function getRoutes(fallback = []) {
  return await fetchApi('/routes', fallback);
}

/**
 * Fetch 24-hour traffic trend
 */
export async function getHourlyTrend(fallback = []) {
  return await fetchApi('/analytics/trend', fallback);
}

/**
 * Search global locations via TomTom Places API (with OSM fallback)
 */
export async function searchLocations(query) {
  if (!query || query.trim().length === 0) return [];
  return await fetchApi(`/location/search?query=${encodeURIComponent(query.trim())}`, []);
}

/**
 * Get real-time TomTom traffic flow and AI predictions for specific coordinates
 */
export async function getLocationTraffic(lat, lon, name = 'Custom Location', horizon = '15m') {
  return await fetchApi(
    `/location/traffic?lat=${lat}&lon=${lon}&name=${encodeURIComponent(name)}&horizon=${encodeURIComponent(horizon)}`
  );
}

/**
 * Calculate multi-route alternatives between Origin (Point A) and Destination (Point B)
 */
export async function calculateRoutes(originLat, originLon, destLat, destLon, originName = 'Origin', destName = 'Destination') {
  const query = `origin_lat=${originLat}&origin_lon=${originLon}&dest_lat=${destLat}&dest_lon=${destLon}&origin_name=${encodeURIComponent(originName)}&dest_name=${encodeURIComponent(destName)}`;
  return await fetchApi(`/routes/calculate?${query}`, {
    origin: { name: originName, lat: originLat, lon: originLon },
    destination: { name: destName, lat: destLat, lon: destLon },
    direct_distance_km: 12.0,
    routes: []
  });
}

/**
 * Get TomTom API configuration status
 */
export async function getTomTomSettings() {
  return await fetchApi('/settings/tomtom', { configured: false, masked_key: '' });
}

/**
 * Get Google Location / Maps API configuration status
 */
export async function getGoogleSettings() {
  return await fetchApi('/settings/google', { configured: false, masked_key: '' });
}

/**
 * Save / Update Google Maps & Location API Key
 */
export async function saveGoogleKey(apiKey) {
  try {
    const res = await fetch(`${API_BASE}/settings/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to save Google API key:', err);
    return { status: 'error', error: err.message };
  }
}

/**
 * Save / Update TomTom API Key
 */
export async function saveTomTomKey(apiKey) {
  try {
    const res = await fetch(`${API_BASE}/settings/tomtom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to save TomTom API key:', err);
    return { status: 'error', error: err.message };
  }
}

