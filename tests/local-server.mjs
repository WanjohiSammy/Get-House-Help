// Run with: node tests/local-server.mjs  — no installs needed (Node 22.5+). Serves /public and the API with demo data in memory.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import { extname, join } from 'node:path';

import { fileURLToPath } from 'node:url';
const ROOT_URL = new URL('../', import.meta.url);
const ROOT = fileURLToPath(ROOT_URL).replace(/[\\/]$/, '');
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('schema.sql', ROOT_URL), 'utf8'));
const DB = { prepare(sql) { const make = a => ({ bind: (...x) => make(x), first: async () => sqlite.prepare(sql).get(...a) ?? null, all: async () => ({ results: sqlite.prepare(sql).all(...a) }), run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...a).changes } }) }); return make([]); } };
const env = { DB, ADMIN_TOKEN: 'test-admin-token-123', ADMIN_NAME: 'Admin', STAFF_TOKENS: 'Jane:test-agent-token-456', PAYMENT_MODE: 'manual', TILL_NUMBER: '123456', WHATSAPP_NUMBER: '254700000000' };

// seed
const t = new Date().toISOString();
const seed = [
  ['g1', 'Grace Akinyi', '254712345678', 'Kawangware', 'live-in,live-out', 'cleaning,cooking,children,baby', 7, 'Kiswahili, English, Dholuo', 19000, 'I have looked after children from newborn to school age for seven years. I cook Kenyan and simple continental meals.', 1, 1, 1, 1, 1],
  ['m1', 'Mary Wanjiru', '254722111222', 'Kangemi', 'live-in', 'cleaning,laundry,children', 4, 'Kiswahili, Kikuyu', 18500, 'Hard-working and organised. Four years with one family in Westlands.', 1, 1, 1, 1, 0],
  ['e1', 'Esther Nduta', '254733111222', 'Riruta', 'live-in,live-out', 'cleaning,cooking,elderly', 10, 'Kiswahili, English', 20000, 'Ten years of experience including caring for an elderly grandmother.', 1, 1, 1, 0, 0]
];
for (const s of seed) sqlite.prepare(`INSERT INTO helps (id,name,phone,area,kinds,tasks,years,languages,salary,about,id_verified,good_conduct,refs_called,interviewed,certified,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'approved', ?, ?)`).run(...s, t, t);

sqlite.prepare("UPDATE helps SET lat = -1.284, lng = 36.751 WHERE id = 'g1'").run();
sqlite.prepare("INSERT INTO vetting_events (help_id, step, slot, result, notes, data, by_name, created_at) VALUES ('g1','id_check',0,'pass','','{\"sawOriginal\":true,\"nameMatches\":true,\"over18\":true}','Admin',?)").run(t);
sqlite.prepare(`INSERT INTO helps (id,name,phone,area,kinds,tasks,years,languages,salary,about,ref1_name,ref1_phone,ref2_name,ref2_phone,status,added_by,created_at,updated_at)
  VALUES ('p1','Ruth Atieno','254799888777','Kibera','live-in,live-out','cleaning,cooking,children',3,'Kiswahili, Dholuo',18500,'','Mrs Wambui','254711000001','Mr Otieno','254711000002','pending','self',?,?)`).run(t, t);

const fn = p => import(new URL(`functions/api/${p}`, ROOT_URL).href);
const routes = [
  [/^\/api\/config$/, 'config.js'], [/^\/api\/requests$/, 'requests/index.js'], [/^\/api\/requests\/([^/]+)$/, 'requests/[id].js'],
  [/^\/api\/helps\/([^/]+)$/, 'helps/[id].js'], [/^\/api\/join$/, 'join.js'], [/^\/api\/pay$/, 'pay.js'],
  [/^\/api\/mpesa\/callback$/, 'mpesa/callback.js'], [/^\/api\/admin\/helps$/, 'admin/helps/index.js'],
  [/^\/api\/admin\/helps\/([^/]+)$/, 'admin/helps/[id].js'], [/^\/api\/admin\/vetting$/, 'admin/vetting.js'],
  [/^\/api\/admin\/me$/, 'admin/me.js'], [/^\/api\/admin\/requests$/, 'admin/requests.js']
];
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8788');
  for (const [re, file] of routes) {
    const m = url.pathname.match(re);
    if (!m) continue;
    const mod = await fn(file);
    const handler = req.method === 'POST' ? mod.onRequestPost : mod.onRequestGet;
    if (!handler) { res.writeHead(405).end(); return; }
    const chunks = []; for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
    const out = await handler({ request, env, params: { id: m[1] } });
    res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
    return;
  }
  let p = join(ROOT, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!existsSync(p)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(8788, () => console.log('Jirani running at http://localhost:8788  (admin token: test-admin-token-123, field agent token: test-agent-token-456)'));
