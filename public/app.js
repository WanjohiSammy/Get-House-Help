// Shared helpers for every page. No framework, no build step.

export const LABELS = {
  'live-in': 'Live-in', 'live-out': 'Live-out', day: 'Day help',
  cleaning: 'Cleaning', cooking: 'Cooking', laundry: 'Laundry',
  children: 'Children', baby: 'Baby', elderly: 'Elderly care'
};
export const label = k => LABELS[k] || k;

export const CHECK_LABELS = {
  id_verified: 'National ID verified',
  good_conduct: 'Certificate of Good Conduct',
  refs_called: 'Past employers called',
  interviewed: 'Met in person by our team',
  certified: 'Completed training'
};

// Escape anything that came from a user before putting it into HTML.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('No connection. Check your data or Wi-Fi and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

let configPromise;
export const getConfig = () => (configPromise ||= api('/api/config'));

export const param = name => new URLSearchParams(location.search).get(name);
export const $ = (sel, root = document) => root.querySelector(sel);
export const money = n => 'KES ' + Number(n || 0).toLocaleString('en-KE');

export function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}
export function avatarClass(id) {
  let n = 0;
  for (const c of String(id)) n = (n + c.charCodeAt(0)) % 4;
  return 'av' + n;
}

export function whatsappLink(number, text = '') {
  return number ? `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '#';
}

// Remember the household's shortlists on this phone so they can come back without an account.
const KEY = 'jirani.requests';
export function rememberRequest(id) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]').filter(x => x !== id);
    localStorage.setItem(KEY, JSON.stringify([id, ...list].slice(0, 5)));
  } catch { /* private mode: fine */ }
}
export function rememberedRequests() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export const icons = {
  back: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  chevron: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  pin: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  bag: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  shield: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  tick: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E7A4C" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4.5 4.5L19 7"/></svg>',
  dash: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9A96A6" stroke-width="2.4" stroke-linecap="round"><path d="M7 12h10"/></svg>',
  phone: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  chat: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  home: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>'
};

// ---------- Location & maps (free: phone GPS + Leaflet + OpenStreetMap tiles) ----------

// Asks the phone for its location. Resolves { lat, lng } or rejects with a friendly message.
export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This phone cannot share its location. Choose your area instead.'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: Math.round(p.coords.latitude * 1000) / 1000, lng: Math.round(p.coords.longitude * 1000) / 1000 }),
      e => reject(new Error(e.code === 1
        ? 'Location is blocked. Allow it in your browser settings, or choose your area instead.'
        : 'Could not get your location. Choose your area instead.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

export function nearestAreaName(point, areaPoints) {
  const rad = d => d * Math.PI / 180;
  let best = null, bestD = Infinity;
  for (const a of areaPoints) {
    const d = (rad(a.lat - point.lat)) ** 2 + (Math.cos(rad(point.lat)) * rad(a.lng - point.lng)) ** 2;
    if (d < bestD) { bestD = d; best = a.name; }
  }
  return best;
}

// "Till 123456 (Jirani)" etc., from /api/config.
export function payToText(cfg) {
  const n = cfg.payToNumber || '—';
  if (cfg.payToType === 'till') return { where: `Till ${n}`, steps: ['Open M-Pesa, choose <b>Lipa na M-Pesa</b> then <b>Buy Goods</b>', `Till number <b style="font-size:17px">${esc(n)}</b> (${esc(cfg.payToName)})`] };
  if (cfg.payToType === 'pochi') return { where: `Pochi la Biashara ${n}`, steps: ['Open M-Pesa, choose <b>Send Money</b> then <b>Pochi la Biashara</b>', `Number <b style="font-size:17px">${esc(n)}</b> (${esc(cfg.payToName)})`] };
  return { where: `M-Pesa ${n}`, steps: ['Open M-Pesa and choose <b>Send Money</b>', `Number <b style="font-size:17px">${esc(n)}</b> (${esc(cfg.payToName)})`] };
}

export const googleMapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

// Loads Leaflet from the unpkg CDN with integrity checks. Resolves to window.L, or null if it can't load.
let leafletPromise;
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return (leafletPromise ||= new Promise(resolve => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.integrity = 'sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w==';
    css.crossOrigin = '';
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.integrity = 'sha512-BwHfrr4c9kmRkLw6iXFdzcdWV/PGkVgiIyIWLLlTSXzWQzxuSg4DiQUCpauz/EWjgk5TYQqX/kvn9pG1NpYfqg==';
    js.crossOrigin = '';
    js.onload = () => resolve(window.L || null);
    js.onerror = () => resolve(null);
    setTimeout(() => resolve(window.L || null), 12000);
    document.head.append(css, js);
  }));
}

// A map in `el`, centred on `center` ({lat,lng}). Returns null if maps could not load.
export async function makeMap(el, cfg, center, zoom = 14) {
  const L = await loadLeaflet();
  if (!L) return null;
  const map = L.map(el, { scrollWheelZoom: false }).setView([center.lat, center.lng], zoom);
  L.tileLayer(cfg.mapTiles, { maxZoom: 19, attribution: cfg.mapAttribution }).addTo(map);
  return { L, map };
}

// A pin drawn with CSS, so no marker images need to load.
export const pinIcon = (L, color = '#2D2A7A') => L.divIcon({
  className: '',
  html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
  iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -20]
});
