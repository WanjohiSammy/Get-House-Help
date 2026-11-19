// Run with: node tests/api.test.mjs  (Node 22.5+). Tests the whole API against an in-memory SQLite copy of the database.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

import { fileURLToPath } from 'node:url';
const ROOT_URL = new URL('../', import.meta.url);
const ROOT = fileURLToPath(ROOT_URL).replace(/[\\/]$/, '');
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('schema.sql', ROOT_URL), 'utf8'));

// Minimal D1 shim
const DB = {
  prepare(sql) {
    const make = (args) => ({
      bind: (...a) => make(a),
      first: async () => sqlite.prepare(sql).get(...args) ?? null,
      all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
      run: async () => { const r = sqlite.prepare(sql).run(...args); return { meta: { changes: r.changes } }; }
    });
    return make([]);
  }
};

const env = { DB, ADMIN_TOKEN: 'test-admin-token-123', PAYMENT_MODE: 'manual', TILL_NUMBER: '123456', WHATSAPP_NUMBER: '254700000000' };
const load = p => import(new URL(`functions/api/${p}`, ROOT_URL).href);
const config = await load('config.js');
const reqIndex = await load('requests/index.js');
const reqId = await load('requests/[id].js');
const helpId = await load('helps/[id].js');
const join = await load('join.js');
const pay = await load('pay.js');
const callback = await load('mpesa/callback.js');
const aHelps = await load('admin/helps.js');
const aReqs = await load('admin/requests.js');

const BASE = 'https://jirani.pages.dev';
const mk = (path, { method = 'GET', body, token } = {}) => new Request(BASE + path, {
  method, body: body ? JSON.stringify(body) : undefined,
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }
});
async function call(fn, path, opts = {}, params = {}, e = env) {
  const res = await fn({ request: mk(path, opts), env: e, params });
  return { status: res.status, data: await res.json() };
}
const admin = { token: env.ADMIN_TOKEN };
let n = 0; const ok = msg => console.log(`  ✓ ${++n}. ${msg}`);

// 1. Config
let r = await call(config.onRequestGet, '/api/config');
assert.equal(r.data.paymentMode, 'manual'); assert.ok(r.data.areas.includes('Kileleshwa'));
ok('config returns areas and payment mode');

// 2. Join
const helpPayload = (name, phone, area, extra = {}) => ({ name, phone, area, kinds: ['live-in', 'live-out'], tasks: ['cleaning', 'cooking', 'children'], years: 5, salary: 19000, consent: true, ...extra });
r = await call(join.onRequestPost, '/api/join', { method: 'POST', body: helpPayload('Grace Akinyi', '0712 345 678', 'Kawangware') });
assert.equal(r.status, 201); ok('help can join');
r = await call(join.onRequestPost, '/api/join', { method: 'POST', body: helpPayload('Grace Akinyi', '+254712345678', 'Kawangware') });
assert.equal(r.status, 409); ok('duplicate phone (different format) is rejected');
r = await call(join.onRequestPost, '/api/join', { method: 'POST', body: helpPayload('Grace', '0712345679', 'Kawangware') });
assert.equal(r.status, 400); ok('single name rejected');
r = await call(join.onRequestPost, '/api/join', { method: 'POST', body: helpPayload('Mary Wanjiru', '0722111222', 'Kangemi', { consent: false }) });
assert.equal(r.status, 400); ok('consent required');
r = await call(join.onRequestPost, '/api/join', { method: 'POST', body: helpPayload('Mary Wanjiru', '0722111222', 'Atlantis') });
assert.equal(r.status, 400); ok('unknown area rejected');
await call(join.onRequestPost, '/api/join', { method: 'POST', body: helpPayload('Mary Wanjiru', '0722111222', 'Kangemi') });
await call(join.onRequestPost, '/api/join', { method: 'POST', body: helpPayload('Esther Nduta', '0733111222', 'Riruta', { tasks: ['cleaning'] }) });
await call(join.onRequestPost, '/api/join', { method: 'POST', body: helpPayload('Far Away', '0744111222', 'Kitengela') });
await call(join.onRequestPost, '/api/join', { method: 'POST', body: helpPayload('Day Only', '0755111222', 'Lavington', { kinds: ['day'] }) });

// 3. Admin auth
r = await call(aHelps.onRequestGet, '/api/admin/helps?status=pending');
assert.equal(r.status, 401); ok('admin needs token');
r = await call(aHelps.onRequestGet, '/api/admin/helps?status=pending', { token: 'wrong-token-xxxxx' });
assert.equal(r.status, 401); ok('wrong token refused');
r = await call(aHelps.onRequestGet, '/api/admin/helps?status=pending', admin);
assert.equal(r.data.helps.length, 5); ok('admin sees 5 pending helps');
const byName = Object.fromEntries(r.data.helps.map(h => [h.name, h.id]));

// 4. Vet + approve; add one via admin
r = await call(aHelps.onRequestPost, '/api/admin/helps', { method: 'POST', token: env.ADMIN_TOKEN, body: { id: byName['Grace Akinyi'], status: 'approved', id_verified: true, good_conduct: true, refs_called: true, interviewed: true, certified: true, about: 'Seven years with children.' } });
assert.equal(r.status, 200);
for (const nm of ['Mary Wanjiru', 'Esther Nduta', 'Far Away', 'Day Only']) {
  await call(aHelps.onRequestPost, '/api/admin/helps', { method: 'POST', token: env.ADMIN_TOKEN, body: { id: byName[nm], status: 'approved', id_verified: true } });
}
r = await call(aHelps.onRequestPost, '/api/admin/helps', { method: 'POST', token: env.ADMIN_TOKEN, body: { name: 'Jane Moraa', phone: '0766111222', area: 'Kileleshwa', kinds: ['live-in'], tasks: ['cooking'] } });
assert.equal(r.status, 201);
await call(aHelps.onRequestPost, '/api/admin/helps', { method: 'POST', token: env.ADMIN_TOKEN, body: { id: r.data.id, status: 'approved' } });
r = await call(aHelps.onRequestPost, '/api/admin/helps', { method: 'POST', token: env.ADMIN_TOKEN, body: { name: 'Dup', phone: '0766111222', area: 'Kileleshwa', kinds: ['live-in'] } });
assert.equal(r.status, 409);
ok('admin approves helps, adds one by hand, duplicate add refused');

// 5. Household request
r = await call(reqIndex.onRequestPost, '/api/requests', { method: 'POST', body: { kind: 'live-in', tasks: ['cleaning', 'cooking', 'children'], area: 'Kileleshwa', start: 'Next week' } });
assert.equal(r.status, 201); assert.equal(r.data.matches, 3);
const rid = r.data.id;
ok('request created with 3 matches');

r = await call(reqId.onRequestGet, `/api/requests/${rid}`, {}, { id: rid });
const names = r.data.helps.map(h => h.name);
console.log('     shortlist:', r.data.helps.map(h => `${h.name} (${h.area}, ${h.commuteMin} min, ${h.badge})`).join(' | '));
assert.ok(!names.includes('Far A.'), 'far help excluded'); assert.ok(!names.includes('Day O.'), 'day-only excluded');
assert.ok(r.data.helps.every(h => h.phone === undefined), 'no phones before payment');
assert.ok(names.every(nm => /^\S+ \S\.$/.test(nm)), 'names shortened');
assert.equal(r.data.unlocked, false);
ok('shortlist is close-first, private until paid');

// 6. Profile
const firstHelp = r.data.helps[0].id;
r = await call(helpId.onRequestGet, `/api/helps/${firstHelp}?r=${rid}`, {}, { id: firstHelp });
assert.equal(r.data.help.phone, undefined); assert.ok(r.data.help.commuteMin > 0);
ok('profile hides phone before payment');

// 7. Manual payment
r = await call(pay.onRequestPost, '/api/pay', { method: 'POST', body: { requestId: rid, phone: '0700123456', code: 'bad' } });
assert.equal(r.status, 400); ok('bad M-Pesa code rejected');
r = await call(pay.onRequestPost, '/api/pay', { method: 'POST', body: { requestId: rid, phone: '12345', code: 'SKL3XY12AB' } });
assert.equal(r.status, 400); ok('bad phone rejected');
r = await call(pay.onRequestPost, '/api/pay', { method: 'POST', body: { requestId: rid, phone: '0700123456', code: 'skl3xy12ab' } });
assert.equal(r.data.status, 'pending_review'); ok('valid code → pending review');
r = await call(reqId.onRequestGet, `/api/requests/${rid}`, {}, { id: rid });
assert.equal(r.data.unlocked, false); ok('still locked while pending');

// second request trying to reuse the same code
r = await call(reqIndex.onRequestPost, '/api/requests', { method: 'POST', body: { kind: 'live-in', tasks: [], area: 'Kilimani' } });
const rid2 = r.data.id;
r = await call(pay.onRequestPost, '/api/pay', { method: 'POST', body: { requestId: rid2, phone: '0700123456', code: 'SKL3XY12AB' } });
assert.equal(r.status, 400); ok('M-Pesa code cannot be reused');

// 8. Admin confirms
r = await call(aReqs.onRequestPost, '/api/admin/requests', { method: 'POST', token: env.ADMIN_TOKEN, body: { id: rid, action: 'confirm_payment' } });
assert.equal(r.status, 200);
r = await call(reqId.onRequestGet, `/api/requests/${rid}`, {}, { id: rid });
assert.equal(r.data.unlocked, true); assert.ok(r.data.helps.every(h => /^0\d{3} \d{3} \d{3}$/.test(h.phone)));
assert.ok(r.data.helps.some(h => h.name === 'Grace Akinyi'));
ok('after confirmation: full names and phones visible');
r = await call(helpId.onRequestGet, `/api/helps/${firstHelp}?r=${rid}`, {}, { id: firstHelp });
assert.ok(r.data.help.phone); ok('profile shows phone after payment');
r = await call(helpId.onRequestGet, `/api/helps/${firstHelp}?r=${rid2}`, {}, { id: firstHelp });
assert.equal(r.data.help.phone, undefined); ok('other unpaid request cannot see phone');

// 9. Hired
r = await call(aReqs.onRequestPost, '/api/admin/requests', { method: 'POST', token: env.ADMIN_TOKEN, body: { id: rid, action: 'mark_hired', helpId: firstHelp } });
assert.equal(r.status, 200);
r = await call(aReqs.onRequestPost, '/api/admin/requests', { method: 'POST', token: env.ADMIN_TOKEN, body: { id: rid, action: 'mark_hired', helpId: 'nope' } });
assert.equal(r.status, 400);
ok('mark hired (only from the shortlist)');

// 10. STK push mode with mocked Safaricom
const stkEnv = { ...env, PAYMENT_MODE: 'sandbox', MPESA_CONSUMER_KEY: 'k', MPESA_CONSUMER_SECRET: 's', MPESA_SHORTCODE: '174379', MPESA_PASSKEY: 'p', MPESA_CALLBACK_SECRET: 'cb-secret' };
let sent;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('/oauth/')) return new Response(JSON.stringify({ access_token: 'tok' }));
  sent = JSON.parse(opts.body);
  return new Response(JSON.stringify({ ResponseCode: '0', CheckoutRequestID: 'ws_CO_123' }));
};
r = await call(pay.onRequestPost, '/api/pay', { method: 'POST', body: { requestId: rid2, phone: '0711222333' } }, {}, stkEnv);
assert.equal(r.data.status, 'awaiting_payment');
assert.equal(sent.PhoneNumber, '254711222333'); assert.equal(sent.Amount, 500);
assert.ok(sent.CallBackURL.startsWith(`${BASE}/api/mpesa/callback?t=cb-secret`));
assert.match(sent.Timestamp, /^\d{14}$/);
ok('STK push sent with correct phone, amount, callback');

const cbBody = (ok) => ({ Body: { stkCallback: { MerchantRequestID: 'm', CheckoutRequestID: 'ws_CO_123', ResultCode: ok ? 0 : 1032, ResultDesc: ok ? 'Success' : 'Cancelled',
  CallbackMetadata: ok ? { Item: [{ Name: 'Amount', Value: 500 }, { Name: 'MpesaReceiptNumber', Value: 'TKA1B2C3D4' }, { Name: 'PhoneNumber', Value: 254711222333 }] } : undefined } } });
await call(callback.onRequestPost, '/api/mpesa/callback?t=WRONG', { method: 'POST', body: cbBody(true) }, {}, stkEnv);
r = await call(reqId.onRequestGet, `/api/requests/${rid2}`, {}, { id: rid2 });
assert.equal(r.data.request.status, 'awaiting_payment'); ok('callback with wrong secret ignored');
await call(callback.onRequestPost, '/api/mpesa/callback?t=cb-secret', { method: 'POST', body: cbBody(false) }, {}, stkEnv);
r = await call(reqId.onRequestGet, `/api/requests/${rid2}`, {}, { id: rid2 });
assert.equal(r.data.request.status, 'open'); ok('cancelled payment reopens request');
await call(pay.onRequestPost, '/api/pay', { method: 'POST', body: { requestId: rid2, phone: '0711222333' } }, {}, stkEnv);
r = await call(callback.onRequestPost, '/api/mpesa/callback?t=cb-secret', { method: 'POST', body: cbBody(true) }, {}, stkEnv);
assert.equal(r.data.ResultCode, 0);
r = await call(reqId.onRequestGet, `/api/requests/${rid2}`, {}, { id: rid2 });
assert.equal(r.data.request.status, 'paid'); assert.equal(r.data.unlocked, true);
ok('successful callback unlocks contacts');

// 11. No matches case
r = await call(reqIndex.onRequestPost, '/api/requests', { method: 'POST', body: { kind: 'day', tasks: [], area: 'Ruiru' } });
const r3 = r.data.id;
r = await call(reqId.onRequestGet, `/api/requests/${r3}`, {}, { id: r3 });
assert.equal(r.data.helps.length, 1); // Day Only in Lavington is still the only day help
r = await call(reqIndex.onRequestPost, '/api/requests', { method: 'POST', body: { kind: 'bogus', area: 'Ruiru' } });
assert.equal(r.status, 400);
ok('day-help request matches day helps; invalid kind rejected');

// 12. Admin list requests
r = await call(aReqs.onRequestGet, '/api/admin/requests', admin);
assert.ok(r.data.requests.length >= 3); ok('admin lists requests');

console.log(`\nAll ${n} checks passed.`);
