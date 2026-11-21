// Run with: node tests/api.test.mjs  (or: npm test). Needs Node.js 22.5+.
// Tests the whole API against an in-memory SQLite copy of the database.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { loadSqlite, d1 } from './_sqlite.mjs';

const DatabaseSync = await loadSqlite(import.meta.url);
const ROOT_URL = new URL('../', import.meta.url);
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('schema.sql', ROOT_URL), 'utf8'));
const DB = d1(sqlite);

const ADMIN = 'test-admin-token-123', AGENT = 'agent-jane-token-456';
const env = {
  DB, ADMIN_TOKEN: ADMIN, ADMIN_NAME: 'Samuel', STAFF_TOKENS: `Jane:${AGENT}, Shorty:short`,
  PAYMENT_MODE: 'manual', TILL_NUMBER: '123456', WHATSAPP_NUMBER: '254700000000'
};
const load = p => import(new URL(`functions/api/${p}`, ROOT_URL).href);
const config = await load('config.js');
const reqIndex = await load('requests/index.js');
const reqId = await load('requests/[id].js');
const helpId = await load('helps/[id].js');
const join = await load('join.js');
const pay = await load('pay.js');
const callback = await load('mpesa/callback.js');
const aHelps = await load('admin/helps/index.js');
const aHelp = await load('admin/helps/[id].js');
const aVet = await load('admin/vetting.js');
const aMe = await load('admin/me.js');
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
const post = (fn, path, body, token) => call(fn, path, { method: 'POST', body, token });
let n = 0; const ok = msg => console.log(`  ✓ ${++n}. ${msg}`);

// Records the vetting steps that make a help fully "Checked" (and optionally certified).
async function vetFully(id, token = ADMIN, { certified = false } = {}) {
  const steps = [
    { step: 'id_check', result: 'pass', data: { sawOriginal: true, nameMatches: true, over18: true } },
    { step: 'good_conduct', result: 'pass', data: { certRef: 'GC-001', issued: '2026-10-01' } },
    { step: 'reference', slot: 1, result: 'pass', data: { name: 'Mrs K', phone: '0711000001', rehire: 'yes' } },
    { step: 'reference', slot: 2, result: 'pass', data: { name: 'Mr O', phone: '0711000002', rehire: 'yes' } },
    { step: 'interview', result: 'pass', data: { date: '2026-11-10', place: 'Hub', scores: { punctuality: 5, communication: 4, skills: 4, hygiene: 5 } } }
  ];
  if (certified) steps.push({ step: 'training', result: 'pass', data: { course: 'First aid', provider: 'Red Cross', date: '2026-11-12' } });
  let last;
  for (const s of steps) last = await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: id, ...s }, token);
  return last;
}

// 1. Config
let r = await call(config.onRequestGet, '/api/config');
assert.equal(r.data.paymentMode, 'manual'); assert.ok(r.data.areas.includes('Kileleshwa'));
assert.ok(r.data.areaPoints.length > 10 && r.data.mapTiles.includes('openstreetmap'));
ok('config returns areas, area points and free map tiles');

// 2. Join
const helpPayload = (name, phone, area, extra = {}) => ({ name, phone, area, kinds: ['live-in', 'live-out'], tasks: ['cleaning', 'cooking', 'children'], years: 5, salary: 19000, consent: true, ...extra });
r = await post(join.onRequestPost, '/api/join', helpPayload('Grace Akinyi', '0712 345 678', 'Kawangware', { lat: -1.28512345, lng: 36.74856789 }));
assert.equal(r.status, 201); ok('help can join (with a location)');
r = await post(join.onRequestPost, '/api/join', helpPayload('Grace Akinyi', '+254712345678', 'Kawangware'));
assert.equal(r.status, 409); ok('duplicate phone (different format) is rejected');
r = await post(join.onRequestPost, '/api/join', helpPayload('Grace', '0712345679', 'Kawangware'));
assert.equal(r.status, 400); ok('single name rejected');
r = await post(join.onRequestPost, '/api/join', helpPayload('Mary Wanjiru', '0722111222', 'Kangemi', { consent: false }));
assert.equal(r.status, 400); ok('consent required');
await post(join.onRequestPost, '/api/join', helpPayload('Mary Wanjiru', '0722111222', 'Kangemi'));
await post(join.onRequestPost, '/api/join', helpPayload('Esther Nduta', '0733111222', 'Riruta', { tasks: ['cleaning'] }));
await post(join.onRequestPost, '/api/join', helpPayload('Far Away', '0744111222', 'Kitengela'));
await post(join.onRequestPost, '/api/join', helpPayload('Day Only', '0755111222', 'Lavington', { kinds: ['day'] }));
await post(join.onRequestPost, '/api/join', helpPayload('Out Of Kenya', '0755111333', 'Lavington', { lat: 51.5, lng: -0.12 }));

// 3. Staff auth and roles
r = await call(aHelps.onRequestGet, '/api/admin/helps?status=pending');
assert.equal(r.status, 401); ok('staff API needs a token');
r = await call(aMe.onRequestGet, '/api/admin/me', { token: 'short' });
assert.equal(r.status, 401); ok('tokens shorter than 12 characters never work');
r = await call(aMe.onRequestGet, '/api/admin/me', { token: AGENT });
assert.deepEqual(r.data, { name: 'Jane', role: 'staff' });
r = await call(aMe.onRequestGet, '/api/admin/me', { token: ADMIN });
assert.deepEqual(r.data, { name: 'Samuel', role: 'admin' }); ok('admin and field agent are recognised by name');
r = await call(aHelps.onRequestGet, '/api/admin/helps?status=pending', { token: AGENT });
assert.equal(r.data.helps.length, 6); ok('agent sees 6 pending helps');
const byName = Object.fromEntries(r.data.helps.map(h => [h.name, h.id]));
const graceRow = r.data.helps.find(h => h.name === 'Grace Akinyi');
assert.equal(graceRow.lat, -1.285); assert.equal(graceRow.lng, 36.749);
assert.equal(r.data.helps.find(h => h.name === 'Out Of Kenya').lat, null);
ok('locations rounded to ~100 m; points outside Kenya dropped');
r = await call(aHelps.onRequestGet, '/api/admin/helps?q=0722', { token: AGENT });
assert.equal(r.data.helps.length, 1); assert.equal(r.data.helps[0].name, 'Mary Wanjiru');
r = await call(aHelps.onRequestGet, '/api/admin/helps?q=kangemi', { token: AGENT });
assert.equal(r.data.helps.length, 1); ok('search by phone or area');

// 4. Vetting rules
const grace = byName['Grace Akinyi'];
r = await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: grace, step: 'id_check', result: 'pass', data: { sawOriginal: true, nameMatches: true, over18: false } }, AGENT);
assert.equal(r.status, 400); ok('ID check cannot pass unless all three boxes are ticked');
r = await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: grace, step: 'good_conduct', result: 'fail', data: {} }, AGENT);
assert.equal(r.status, 400); ok('a fail needs a reason');
r = await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: grace, step: 'id_check', result: 'pass', data: { sawOriginal: true, nameMatches: true, over18: true, idNumber: '12345678' } }, AGENT);
assert.equal(r.status, 200); assert.equal(r.data.help.id_verified, 1); assert.equal(r.data.help.badge, 'ID verified');
assert.equal(r.data.events[0].by_name, 'Jane'); assert.equal(r.data.events[0].data.idNumber, undefined);
ok('agent records ID check: badge updates, name recorded, no ID number stored');
r = await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: grace, step: 'reference', slot: 1, result: 'pass', data: { rehire: 'yes' } }, AGENT);
assert.equal(r.data.help.refs_called, 0); ok('one good reference is not enough');
r = await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: grace, step: 'reference', slot: 2, result: 'no_answer' }, AGENT);
r = await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: grace, step: 'reference', slot: 2, result: 'pass', data: { rehire: 'yes' } }, AGENT);
assert.equal(r.data.help.refs_called, 1); ok('second reference (after a no-answer) completes references');
r = await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: grace, step: 'note', notes: 'Prefers families near Kawangware.' }, AGENT);
assert.equal(r.data.events.at(-1).step, 'note'); ok('free notes are kept in the history');

// 5. Approval rules
r = await post(aHelps.onRequestPost, '/api/admin/helps', { id: grace, status: 'approved' }, AGENT);
assert.equal(r.status, 403); ok('agent cannot approve');
r = await post(aHelps.onRequestPost, '/api/admin/helps', { id: byName['Mary Wanjiru'], status: 'approved' }, ADMIN);
assert.equal(r.status, 400); ok('admin cannot approve before a passed ID check');
r = await post(aHelps.onRequestPost, '/api/admin/helps', { id: grace, id_verified: 0, certified: 1 }, ADMIN);
r = await call(aHelp.onRequestGet, `/api/admin/helps/${grace}`, { token: ADMIN }, { id: grace });
assert.equal(r.data.help.id_verified, 1); assert.equal(r.data.help.certified, 0); ok('badges cannot be edited by hand');
assert.ok(r.data.events.length >= 5); ok('help detail returns the full vetting history');

await vetFully(grace, AGENT, { certified: true });
r = await post(aHelps.onRequestPost, '/api/admin/helps', { id: grace, status: 'approved', about: 'Seven years with children.' }, ADMIN);
assert.equal(r.data.help.status, 'approved'); assert.equal(r.data.help.badge, 'Certified');
for (const nm of ['Mary Wanjiru', 'Esther Nduta', 'Far Away', 'Day Only']) {
  await vetFully(byName[nm]);
  await post(aHelps.onRequestPost, '/api/admin/helps', { id: byName[nm], status: 'approved' }, ADMIN);
}
r = await post(aHelps.onRequestPost, '/api/admin/helps', { name: 'Jane Moraa', phone: '0766111222', area: 'Kileleshwa', kinds: ['live-in'], tasks: ['cooking'], status: 'approved', lat: -1.281, lng: 36.783 }, AGENT);
assert.equal(r.status, 201);
const jane = r.data.id;
r = await call(aHelp.onRequestGet, `/api/admin/helps/${jane}`, { token: AGENT }, { id: jane });
assert.equal(r.data.help.status, 'pending'); assert.equal(r.data.help.added_by, 'Jane'); assert.equal(r.data.help.lat, -1.281);
ok('agent adds a help in person: starts pending, records who added her and her pin');
await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: jane, step: 'id_check', result: 'pass', data: { sawOriginal: true, nameMatches: true, over18: true } }, AGENT);
await post(aHelps.onRequestPost, '/api/admin/helps', { id: jane, status: 'approved' }, ADMIN);
r = await post(aHelps.onRequestPost, '/api/admin/helps', { name: 'Dup', phone: '0766111222', area: 'Kileleshwa', kinds: ['live-in'] }, ADMIN);
assert.equal(r.status, 409); ok('duplicate phone refused');

// Failing a later ID check demotes an approved help
const esther = byName['Esther Nduta'];
r = await post(aVet.onRequestPost, '/api/admin/vetting', { helpId: esther, step: 'id_check', result: 'fail', notes: 'ID turned out to be someone else’s.' }, ADMIN);
assert.equal(r.data.help.status, 'pending'); assert.equal(r.data.help.id_verified, 0);
ok('a failed ID check takes an approved help off the list');

// 6. Household request (with a location)
r = await post(reqIndex.onRequestPost, '/api/requests', { kind: 'live-in', tasks: ['cleaning', 'cooking', 'children'], area: 'Kileleshwa', start: 'Next week', lat: -1.2806, lng: 36.783 });
assert.equal(r.status, 201); assert.equal(r.data.matches, 3);
const rid = r.data.id;
r = await call(reqId.onRequestGet, `/api/requests/${rid}`, {}, { id: rid });
console.log('     shortlist:', r.data.helps.map(h => `${h.name} (${h.area}, ${h.commuteMin} min, ${h.badge})`).join(' | '));
const names = r.data.helps.map(h => h.name);
assert.ok(!names.includes('Far A.') && !names.includes('Day O.') && !names.includes('Esther N.'));
assert.ok(r.data.helps.every(h => h.phone === undefined && h.lat === undefined), 'no phones or pins');
assert.ok(names.every(nm => /^\S+ \S\.$/.test(nm)), 'names shortened');
ok('shortlist: close-first, demoted help excluded, no phones or map pins exposed');

// 7. Profile
const firstHelp = r.data.helps[0].id;
r = await call(helpId.onRequestGet, `/api/helps/${firstHelp}?r=${rid}`, {}, { id: firstHelp });
assert.equal(r.data.help.phone, undefined); assert.ok(r.data.help.commuteMin > 0);
ok('profile hides phone before payment');

// 8. Manual payment
r = await post(pay.onRequestPost, '/api/pay', { requestId: rid, phone: '0700123456', code: 'bad' });
assert.equal(r.status, 400); ok('bad M-Pesa code rejected');
r = await post(pay.onRequestPost, '/api/pay', { requestId: rid, phone: '0700123456', code: 'skl3xy12ab' });
assert.equal(r.data.status, 'pending_review'); ok('valid code → pending review');
r = await post(reqIndex.onRequestPost, '/api/requests', { kind: 'live-in', tasks: [], area: 'Kilimani' });
const rid2 = r.data.id;
r = await post(pay.onRequestPost, '/api/pay', { requestId: rid2, phone: '0700123456', code: 'SKL3XY12AB' });
assert.equal(r.status, 400); ok('M-Pesa code cannot be reused');

// 9. Payments are admin-only
r = await call(aReqs.onRequestGet, '/api/admin/requests', { token: AGENT });
assert.equal(r.status, 403);
r = await post(aReqs.onRequestPost, '/api/admin/requests', { id: rid, action: 'confirm_payment' }, AGENT);
assert.equal(r.status, 403); ok('agent cannot see requests or confirm payments');
r = await post(aReqs.onRequestPost, '/api/admin/requests', { id: rid, action: 'confirm_payment' }, ADMIN);
assert.equal(r.status, 200);
r = await call(reqId.onRequestGet, `/api/requests/${rid}`, {}, { id: rid });
assert.equal(r.data.unlocked, true); assert.ok(r.data.helps.every(h => /^0\d{3} \d{3} \d{3}$/.test(h.phone)));
ok('after admin confirms: full names and phones visible');
r = await call(helpId.onRequestGet, `/api/helps/${firstHelp}?r=${rid2}`, {}, { id: firstHelp });
assert.equal(r.data.help.phone, undefined); ok('other unpaid request cannot see phone');
r = await post(aReqs.onRequestPost, '/api/admin/requests', { id: rid, action: 'mark_hired', helpId: firstHelp }, ADMIN);
assert.equal(r.status, 200); ok('mark hired');

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
ok('STK push sent with correct phone, amount, callback');
const cbBody = (good) => ({ Body: { stkCallback: { CheckoutRequestID: 'ws_CO_123', ResultCode: good ? 0 : 1032, ResultDesc: good ? 'Success' : 'Cancelled',
  CallbackMetadata: good ? { Item: [{ Name: 'Amount', Value: 500 }, { Name: 'MpesaReceiptNumber', Value: 'TKA1B2C3D4' }] } : undefined } } });
await call(callback.onRequestPost, '/api/mpesa/callback?t=WRONG', { method: 'POST', body: cbBody(true) }, {}, stkEnv);
r = await call(reqId.onRequestGet, `/api/requests/${rid2}`, {}, { id: rid2 });
assert.equal(r.data.request.status, 'awaiting_payment'); ok('callback with wrong secret ignored');
await call(callback.onRequestPost, '/api/mpesa/callback?t=cb-secret', { method: 'POST', body: cbBody(true) }, {}, stkEnv);
r = await call(reqId.onRequestGet, `/api/requests/${rid2}`, {}, { id: rid2 });
assert.equal(r.data.unlocked, true); ok('successful callback unlocks contacts');

console.log(`\nAll ${n} checks passed.`);
