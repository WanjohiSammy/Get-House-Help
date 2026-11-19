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

export function isAdmin(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 12) return false;
  if (token.length !== env.ADMIN_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ env.ADMIN_TOKEN.charCodeAt(i);
  return diff === 0;
}

export function settings(env) {
  return {
    paymentMode: ['manual', 'sandbox', 'live'].includes(env.PAYMENT_MODE) ? env.PAYMENT_MODE : 'manual',
    matchFee: Number(env.MATCH_FEE || 500),
    successFee: Number(env.SUCCESS_FEE || 2500),
    till: env.TILL_NUMBER || '',
    tillName: env.TILL_NAME || 'Jirani',
    whatsapp: (env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
    minWage: Number(env.MIN_WAGE || 18047)
  };
}
