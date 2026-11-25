// UrbanFlow AI - Trained Bengaluru ST-GNN Corridor Locations
// Matches exact node coordinates configured in backend/train_model.py

export const TRAINED_LOCATIONS = [
  {
    code: 'IND',
    name: 'Indiranagar, Bengaluru',
    shortLabel: 'Indiranagar',
    address: '100 Feet Rd & CMH Corridor · Trained Node (IND)',
    lat: 12.9784,
    lon: 77.6408,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'KOR',
    name: 'Koramangala, Bengaluru',
    shortLabel: 'Koramangala',
    address: 'Inner Ring Rd & Sony Signal · Trained Node (KOR)',
    lat: 12.9352,
    lon: 77.6245,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'WHI',
    name: 'Whitefield, Bengaluru',
    shortLabel: 'Whitefield',
    address: 'ITPL Main Rd & Hope Farm · Trained Node (WHI)',
    lat: 12.9698,
    lon: 77.7500,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'HEB',
    name: 'Hebbal, Bengaluru',
    shortLabel: 'Hebbal',
    address: 'Outer Ring Flyover & Airport Link · Trained Node (HEB)',
    lat: 13.0358,
    lon: 77.5970,
    source: 'ST-GNN Trained Node',
  },
];

export function filterTrainedLocations(query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return TRAINED_LOCATIONS;
  return TRAINED_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(q) ||
      loc.shortLabel.toLowerCase().includes(q) ||
      loc.code.toLowerCase().includes(q) ||
      loc.address.toLowerCase().includes(q) ||
      'bengaluru'.includes(q) ||
      'bangalore'.includes(q)
  );
}
