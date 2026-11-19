// Nairobi-area estates with approximate centre points (lat, lng).
// Used only to rank helps by how close they live. Add areas as you grow.
export const AREAS = [
  ['Buruburu', -1.2850, 36.8780], ['Dagoretti Corner', -1.2990, 36.7560],
  ['Donholm', -1.2950, 36.8880], ['Eastleigh', -1.2730, 36.8500],
  ['Embakasi', -1.3140, 36.9050], ['Githurai', -1.2000, 36.9100],
  ['Huruma', -1.2560, 36.8730], ['Kahawa West', -1.1840, 36.8960],
  ['Kangemi', -1.2660, 36.7460], ['Karen', -1.3190, 36.7070],
  ['Kasarani', -1.2210, 36.8970], ['Kawangware', -1.2850, 36.7480],
  ['Kayole', -1.2750, 36.9150], ['Kibera', -1.3130, 36.7870],
  ['Kikuyu', -1.2460, 36.6630], ['Kileleshwa', -1.2806, 36.7830],
  ['Kilimani', -1.2915, 36.7865], ['Kitengela', -1.4740, 36.9600],
  ['Kitisuru', -1.2350, 36.7780], ['Langata', -1.3460, 36.7660],
  ['Lavington', -1.2790, 36.7700], ['Mathare', -1.2600, 36.8590],
  ['Parklands', -1.2630, 36.8180], ['Riruta', -1.2930, 36.7400],
  ['Rongai', -1.3960, 36.7440], ['Roysambu', -1.2190, 36.8870],
  ['Ruaka', -1.2050, 36.7790], ['Ruiru', -1.1460, 36.9600],
  ['Runda', -1.2180, 36.8070], ['South B', -1.3100, 36.8350],
  ['South C', -1.3190, 36.8270], ['Syokimau', -1.3630, 36.9390],
  ['Umoja', -1.2830, 36.8990], ['Uthiru', -1.2630, 36.7180],
  ['Westlands', -1.2676, 36.8108]
].map(([name, lat, lng]) => ({ name, lat, lng }));

const byName = new Map(AREAS.map(a => [a.name.toLowerCase(), a]));
export const findArea = name => byName.get(String(name || '').trim().toLowerCase()) || null;

// Straight-line distance in km.
export function distanceKm(a, b) {
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Accepts a point only if it is in or near Kenya; rounds to 3 decimals (~100 m) so nobody's exact door is stored.
export function cleanPoint(lat, lng) {
  const a = Number(lat), b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -5.5 || a > 5.5 || b < 33 || b > 42.5) return null;
  return { lat: Math.round(a * 1000) / 1000, lng: Math.round(b * 1000) / 1000 };
}

// The best point we know for a help or request: their own pin, else their area's centre.
export function pointOf(row) {
  if (row && row.lat != null && row.lng != null) return { lat: row.lat, lng: row.lng };
  return findArea(row?.area);
}

export function nearestArea(point) {
  let best = null, bestKm = Infinity;
  for (const a of AREAS) {
    const km = distanceKm(a, point);
    if (km < bestKm) { best = a; bestKm = km; }
  }
  return best;
}

// Rough matatu commute: about 4 min per km plus 10 min waiting, rounded to 5.
export function commuteMinutes(km) {
  return Math.max(10, Math.round((km * 4 + 10) / 5) * 5);
}
