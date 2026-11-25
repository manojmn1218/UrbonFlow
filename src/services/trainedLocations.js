/**
 * Trained Bengaluru ST-GNN Graph Corridors (matching backend/train_model.py AREA_META)
 */
export const TRAINED_LOCATIONS = [
  {
    code: 'IND',
    shortLabel: 'Indiranagar',
    name: 'Indiranagar, Bengaluru',
    address: '100 Feet Rd & CMH Corridor, Bengaluru (Trained Node: IND)',
    lat: 12.9784,
    lon: 77.6408,
    freeFlowSpeed: 58,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'KOR',
    shortLabel: 'Koramangala',
    name: 'Koramangala, Bengaluru',
    address: 'Inner Ring Rd & Sony World, Bengaluru (Trained Node: KOR)',
    lat: 12.9352,
    lon: 77.6245,
    freeFlowSpeed: 55,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'WHI',
    shortLabel: 'Whitefield',
    name: 'Whitefield, Bengaluru',
    address: 'ITPL Main Rd & Hope Farm, Bengaluru (Trained Node: WHI)',
    lat: 12.9698,
    lon: 77.7500,
    freeFlowSpeed: 60,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'HEB',
    shortLabel: 'Hebbal',
    name: 'Hebbal, Bengaluru',
    address: 'Hebbal Flyover & Airport Arterial, Bengaluru (Trained Node: HEB)',
    lat: 13.0358,
    lon: 77.5970,
    freeFlowSpeed: 65,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'BEL',
    shortLabel: 'Bellandur',
    name: 'Bellandur, Bengaluru',
    address: 'Outer Ring Rd & EcoSpace Junction, Bengaluru (Trained Node: BEL)',
    lat: 12.9255,
    lon: 77.6762,
    freeFlowSpeed: 50,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'HSR',
    shortLabel: 'HSR Layout',
    name: 'HSR Layout, Bengaluru',
    address: '27th Main & Agara Flyover Corridor, Bengaluru (Trained Node: HSR)',
    lat: 12.9116,
    lon: 77.6389,
    freeFlowSpeed: 45,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'JAY',
    shortLabel: 'Jayanagar',
    name: 'Jayanagar, Bengaluru',
    address: '4th Block & South End Circle Arterial, Bengaluru (Trained Node: JAY)',
    lat: 12.9308,
    lon: 77.5838,
    freeFlowSpeed: 42,
    source: 'ST-GNN Trained Node',
  },
  {
    code: 'KRP',
    shortLabel: 'KR Puram',
    name: 'KR Puram, Bengaluru',
    address: 'Cable Bridge & Old Madras Rd Junction, Bengaluru (Trained Node: KRP)',
    lat: 13.0031,
    lon: 77.6950,
    freeFlowSpeed: 52,
    source: 'ST-GNN Trained Node',
  },
];

export function filterTrainedLocations(query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return TRAINED_LOCATIONS;
  if ('bengaluru'.includes(q) || 'bangalore'.includes(q)) {
    return TRAINED_LOCATIONS;
  }
  return TRAINED_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(q) ||
      loc.shortLabel.toLowerCase().includes(q) ||
      loc.code.toLowerCase().includes(q) ||
      loc.address.toLowerCase().includes(q)
  );
}
