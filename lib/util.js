export const KINDS = ['live-in', 'live-out', 'day'];
export const TASKS = ['cleaning', 'cooking', 'laundry', 'children', 'baby', 'elderly'];
export const CHECKS = ['id_verified', 'good_conduct', 'refs_called', 'interviewed', 'certified'];

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export const bad = (message, status = 400) => json({ error: message }, status);

export async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

export const now = () => new Date().toISOString();

// URL-safe random id; 16 chars is unguessable enough to use as a link token.
export function newId(len = 16) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

// Accepts 07.., 01.., 7.., +2547.., 2547.. → 2547XXXXXXXX. Returns null if invalid.
export function normalizePhone(input) {
  let p = String(input || '').replace(/[\s\-()]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (/^0[17]\d{8}$/.test(p)) p = '254' + p.slice(1);
  else if (/^[17]\d{8}$/.test(p)) p = '254' + p;
  return /^254[17]\d{8}$/.test(p) ? p : null;
}

export const displayPhone = p => p ? '0' + p.slice(3, 6) + ' ' + p.slice(6, 9) + ' ' + p.slice(9) : '';

export const cleanText = (v, max = 500) => String(v ?? '').trim().slice(0, max);

export function cleanList(value, allowed) {
  const arr = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(arr.map(s => String(s).trim()).filter(s => allowed.includes(s)))];
}

export const splitList = s => String(s || '').split(',').filter(Boolean);

// "Grace Akinyi" → "Grace A." so full names stay private until a household pays.
export function shortName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || '';
}

function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Who is calling the staff API?
//   ADMIN_TOKEN               → { name: 'Admin', role: 'admin' }  (everything)
//   STAFF_TOKENS="Jane:tok1,Peter:tok2" → { name: 'Jane', role: 'staff' }  (add and vet helps only)
// Tokens shorter than 12 characters are ignored.
export function getStaff(request, env) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (token.length < 12) return null;
  if (env.ADMIN_TOKEN && env.ADMIN_TOKEN.length >= 12 && sameSecret(token, env.ADMIN_TOKEN)) {
    return { name: cleanText(env.ADMIN_NAME, 40) || 'Admin', role: 'admin' };
  }
  for (const pair of String(env.STAFF_TOKENS || '').split(',')) {
    const i = pair.indexOf(':');
    if (i < 1) continue;
    const name = pair.slice(0, i).trim(), secret = pair.slice(i + 1).trim();
    if (secret.length >= 12 && sameSecret(token, secret)) return { name: cleanText(name, 40), role: 'staff' };
  }
  return null;
}

export const isAdmin = (request, env) => getStaff(request, env)?.role === 'admin';

function effectiveMode(env) {
  const mode = ['free', 'manual', 'sandbox', 'live'].includes(env.PAYMENT_MODE) ? env.PAYMENT_MODE : 'free';
  // Manual payments need somewhere to pay. Without a number, stay free rather than show a broken page.
  if (mode === 'manual' && !String(env.PAY_TO_NUMBER || env.TILL_NUMBER || '').trim()) return 'free';
  return mode;
}

export function settings(env) {
  return {
    // free: no fees, you share contacts from /admin (best for a pilot)
    // manual: household pays your Till / Pochi / phone and types the M-Pesa code; you confirm in /admin
    // sandbox / live: automatic M-Pesa PIN prompt (needs Daraja keys)
    paymentMode: effectiveMode(env),
    payToType: ['till', 'pochi', 'phone'].includes(env.PAY_TO_TYPE) ? env.PAY_TO_TYPE : (env.TILL_NUMBER ? 'till' : 'pochi'),
    payToNumber: String(env.PAY_TO_NUMBER || env.TILL_NUMBER || '').trim(),
    matchFee: Number(env.MATCH_FEE || 500),
    successFee: Number(env.SUCCESS_FEE || 2500),
    payToName: env.PAY_TO_NAME || env.TILL_NAME || 'MtaaCare',
    whatsapp: (env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
    minWage: Number(env.MIN_WAGE || 18047),
    // Helps further than this (straight line) are never suggested: a long commute is the problem we solve.
    maxKm: Number(env.MAX_DISTANCE_KM || 15),
    // Free OpenStreetMap tiles by default. Swap for another provider without code changes.
    mapTiles: env.MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    mapAttribution: env.MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  };
}
