// Places people know, with approximate centre points (lat, lng), the town they belong to,
// and other spellings people type. Used only to rank helpers by how close they live.
// Points are approximate: check the ones you serve first and adjust if a place looks off.
// Format: [name, town, lat, lng, 'other spelling|another']
const RAW = [
  // Nairobi: west and Westlands side
  ['Westlands', 'Nairobi', -1.2676, 36.8108], ['Parklands', 'Nairobi', -1.2630, 36.8180, 'Highridge'],
  ['Spring Valley', 'Nairobi', -1.2520, 36.7920], ['Loresho', 'Nairobi', -1.2560, 36.7600],
  ['Kitisuru', 'Nairobi', -1.2350, 36.7780], ['Muthaiga', 'Nairobi', -1.2470, 36.8340],
  ['Gigiri', 'Nairobi', -1.2330, 36.8020, 'UN Gigiri|Village Market'], ['Runda', 'Nairobi', -1.2180, 36.8070],
  ['Rosslyn', 'Nairobi', -1.2150, 36.7860], ['Mountain View', 'Nairobi', -1.2610, 36.7430],
  ['Kangemi', 'Nairobi', -1.2660, 36.7460], ['Uthiru', 'Nairobi', -1.2630, 36.7180],
  ['Lavington', 'Nairobi', -1.2790, 36.7700, 'Valley Arcade'], ['Kileleshwa', 'Nairobi', -1.2806, 36.7830],
  ['Kilimani', 'Nairobi', -1.2915, 36.7865, 'Yaya Centre|Yaya|Argwings Kodhek'], ['Hurlingham', 'Nairobi', -1.2960, 36.7990],
  ['Upper Hill', 'Nairobi', -1.2975, 36.8150, 'Upperhill'], ['Kawangware', 'Nairobi', -1.2850, 36.7480, 'Kawangware 46|Congo'],
  ['Riruta', 'Nairobi', -1.2930, 36.7400, 'Riruta Satellite|Satellite'], ['Waithaka', 'Nairobi', -1.2830, 36.7230],
  ['Dagoretti Corner', 'Nairobi', -1.2990, 36.7560, 'Dagoretti'], ['Jamhuri', 'Nairobi', -1.2990, 36.7690, 'Jamhuri Estate'],
  // Nairobi: south and Karen side
  ['Karen', 'Nairobi', -1.3190, 36.7070], ['Hardy', 'Nairobi', -1.3350, 36.7330],
  ['Langata', 'Nairobi', -1.3460, 36.7660, "Lang'ata|Otiende|Southlands"], ['Kibera', 'Nairobi', -1.3130, 36.7870, 'Kibra|Olympic|Lindi'],
  ['Madaraka', 'Nairobi', -1.3080, 36.8110, 'Strathmore'], ['Nairobi West', 'Nairobi', -1.3070, 36.8230],
  ['South C', 'Nairobi', -1.3190, 36.8270], ['South B', 'Nairobi', -1.3100, 36.8350],
  ['Nairobi CBD', 'Nairobi', -1.2864, 36.8172, 'Town|City Centre|CBD'],
  // Nairobi: east
  ['Industrial Area', 'Nairobi', -1.3080, 36.8550], ['Imara Daima', 'Nairobi', -1.3290, 36.8820],
  ['Nyayo Estate', 'Nairobi', -1.3230, 36.9010, 'Nyayo Embakasi'], ['Embakasi', 'Nairobi', -1.3140, 36.9050, 'Embakasi Village'],
  ['Pipeline', 'Nairobi', -1.3165, 36.8940], ['Fedha', 'Nairobi', -1.3200, 36.8960, 'Fedha Estate'],
  ['Utawala', 'Nairobi', -1.2860, 36.9600], ['Donholm', 'Nairobi', -1.2950, 36.8880, 'Savannah'],
  ['Buruburu', 'Nairobi', -1.2850, 36.8780, 'Buru Buru|Buru'], ['Umoja', 'Nairobi', -1.2830, 36.8990, 'Umoja Innercore'],
  ['Kayole', 'Nairobi', -1.2750, 36.9150], ['Komarock', 'Nairobi', -1.2690, 36.9060, 'Komarocks'],
  ['Tassia', 'Nairobi', -1.3080, 36.9030], ['Dandora', 'Nairobi', -1.2560, 36.8990],
  ['Kariobangi', 'Nairobi', -1.2500, 36.8840], ['Mathare', 'Nairobi', -1.2600, 36.8590],
  ['Huruma', 'Nairobi', -1.2560, 36.8730], ['Eastleigh', 'Nairobi', -1.2730, 36.8500],
  ['Pangani', 'Nairobi', -1.2680, 36.8370], ['Ngara', 'Nairobi', -1.2750, 36.8250],
  ['Makadara', 'Nairobi', -1.2960, 36.8620], ['Jericho', 'Nairobi', -1.2900, 36.8700],
  // Nairobi: north and Thika Road
  ['Kasarani', 'Nairobi', -1.2210, 36.8970], ['Mwiki', 'Nairobi', -1.2200, 36.9310],
  ['Roysambu', 'Nairobi', -1.2190, 36.8870, 'TRM|Thika Road Mall'], ['Zimmerman', 'Nairobi', -1.2130, 36.8890],
  ['Garden Estate', 'Nairobi', -1.2290, 36.8460], ['Thome', 'Nairobi', -1.2170, 36.8610],
  ['Lucky Summer', 'Nairobi', -1.2350, 36.8960], ['Baba Dogo', 'Nairobi', -1.2380, 36.8850],
  ['Kahawa West', 'Nairobi', -1.1840, 36.8960], ['Kahawa Wendani', 'Kiambu', -1.1820, 36.9300],
  ['Kahawa Sukari', 'Kiambu', -1.1930, 36.9440, 'Sukari'], ['Githurai', 'Nairobi', -1.2000, 36.9100, 'Githurai 44|Githurai 45'],
  // Kiambu side
  ['Ruaka', 'Kiambu', -1.2050, 36.7790], ['Banana', 'Kiambu', -1.1820, 36.7680, 'Banana Hill'],
  ['Kiambu Town', 'Kiambu', -1.1714, 36.8356, 'Kiambu'], ['Ruiru', 'Kiambu', -1.1460, 36.9600],
  ['Juja', 'Kiambu', -1.1030, 37.0140], ['Thika', 'Kiambu', -1.0333, 37.0693],
  ['Kikuyu', 'Kiambu', -1.2460, 36.6630], ['Kinoo', 'Kiambu', -1.2560, 36.6930],
  ['Wangige', 'Kiambu', -1.2190, 36.7110], ['Lower Kabete', 'Kiambu', -1.2400, 36.7400, 'Kabete'],
  ['Limuru', 'Kiambu', -1.1100, 36.6420],
  // Machakos and Kajiado side
  ['Syokimau', 'Machakos', -1.3630, 36.9390], ['Mlolongo', 'Machakos', -1.3940, 36.9400],
  ['Athi River', 'Machakos', -1.4560, 36.9780, 'Mavoko'], ['Kitengela', 'Kajiado', -1.4740, 36.9600],
  ['Rongai', 'Kajiado', -1.3960, 36.7440, 'Ongata Rongai'], ['Ngong', 'Kajiado', -1.3540, 36.6560, 'Ngong Town'],
  ['Kiserian', 'Kajiado', -1.4290, 36.6880], ['Machakos Town', 'Machakos', -1.5177, 37.2634, 'Machakos'],
  // Coast
  ['Mombasa CBD', 'Mombasa', -4.0435, 39.6682, 'Mombasa|Mombasa Town'], ['Nyali', 'Mombasa', -4.0230, 39.7080],
  ['Bamburi', 'Mombasa', -3.9970, 39.7230], ['Kizingo', 'Mombasa', -4.0640, 39.6720],
  ['Likoni', 'Mombasa', -4.0800, 39.6600], ['Kisauni', 'Mombasa', -4.0100, 39.7000],
  ['Changamwe', 'Mombasa', -4.0260, 39.6290], ['Shanzu', 'Mombasa', -3.9720, 39.7460],
  ['Mtwapa', 'Kilifi', -3.9420, 39.7470], ['Diani', 'Kwale', -4.2800, 39.5800, 'Ukunda'],
  ['Kilifi Town', 'Kilifi', -3.6305, 39.8499, 'Kilifi'], ['Malindi', 'Kilifi', -3.2192, 40.1169],
  ['Watamu', 'Kilifi', -3.3540, 40.0190],
  // Western and Nyanza
  ['Kisumu CBD', 'Kisumu', -0.0917, 34.7680, 'Kisumu'], ['Milimani (Kisumu)', 'Kisumu', -0.0980, 34.7570],
  ['Kondele', 'Kisumu', -0.0880, 34.7710], ['Nyalenda', 'Kisumu', -0.1050, 34.7680],
  ['Kakamega', 'Kakamega', 0.2827, 34.7519], ['Bungoma', 'Bungoma', 0.5635, 34.5606],
  ['Busia', 'Busia', 0.4600, 34.1110], ['Kisii', 'Kisii', -0.6817, 34.7667],
  ['Kericho', 'Kericho', -0.3689, 35.2863],
  // Rift Valley
  ['Nakuru CBD', 'Nakuru', -0.3031, 36.0800, 'Nakuru'], ['Milimani (Nakuru)', 'Nakuru', -0.2900, 36.0700],
  ['Section 58', 'Nakuru', -0.2880, 36.0880], ['Lanet', 'Nakuru', -0.2900, 36.1350],
  ['Naivasha', 'Nakuru', -0.7167, 36.4333], ['Eldoret CBD', 'Uasin Gishu', -0.5143, 35.2698, 'Eldoret'],
  ['Elgon View', 'Uasin Gishu', -0.5250, 35.2850], ['Langas', 'Uasin Gishu', -0.5440, 35.2780],
  ['Kapsoya', 'Uasin Gishu', -0.5170, 35.2970], ['Kitale', 'Trans Nzoia', 1.0157, 35.0062],
  ['Nyahururu', 'Laikipia', 0.0380, 36.3630], ['Nanyuki', 'Laikipia', 0.0167, 37.0667],
  ['Narok', 'Narok', -1.0833, 35.8667], ['Kajiado Town', 'Kajiado', -1.8520, 36.7820],
  // Central and Eastern
  ['Nyeri', 'Nyeri', -0.4201, 36.9476], ["Murang'a", "Murang'a", -0.7210, 37.1520, 'Muranga'],
  ['Embu', 'Embu', -0.5310, 37.4500], ['Meru', 'Meru', 0.0470, 37.6490],
  ['Isiolo', 'Isiolo', 0.3540, 37.5820], ['Kitui', 'Kitui', -1.3667, 38.0167],
  ['Garissa', 'Garissa', -0.4532, 39.6461]
];

export const AREAS = RAW.map(([name, town, lat, lng, aka]) => ({ name, town, lat, lng, aka: aka ? aka.split('|') : [] }));

const byName = new Map();
for (const a of AREAS) {
  byName.set(a.name.toLowerCase(), a);
  for (const other of a.aka) if (!byName.has(other.toLowerCase())) byName.set(other.toLowerCase(), a);
}
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
