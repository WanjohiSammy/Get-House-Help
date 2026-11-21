// Run Jirani on your computer with no installs:   node tests/local-server.mjs   (or: npm start)
// Needs Node.js 22.5 or newer. Serves the site and the API with demo data held in memory.
// Everything resets when you stop it (Ctrl+C).
import { readFileSync, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSqlite, d1 } from './_sqlite.mjs';

const DatabaseSync = await loadSqlite(import.meta.url);
const ROOT_URL = new URL('../', import.meta.url);
const PUBLIC = join(fileURLToPath(ROOT_URL), 'public');

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('schema.sql', ROOT_URL), 'utf8'));
sqlite.exec(readFileSync(new URL('seed.sql', ROOT_URL), 'utf8'));

const env = {
  DB: d1(sqlite),
  ADMIN_TOKEN: 'test-admin-token-123', ADMIN_NAME: 'Admin', STAFF_TOKENS: 'Jane:test-agent-token-456',
  PAYMENT_MODE: 'manual', TILL_NUMBER: '123456', WHATSAPP_NUMBER: '254700000000'
};

const routes = [
  [/^\/api\/config$/, 'config.js'],
  [/^\/api\/requests$/, 'requests/index.js'],
  [/^\/api\/requests\/([^/]+)$/, 'requests/[id].js'],
  [/^\/api\/helps\/([^/]+)$/, 'helps/[id].js'],
  [/^\/api\/join$/, 'join.js'],
  [/^\/api\/pay$/, 'pay.js'],
  [/^\/api\/mpesa\/callback$/, 'mpesa/callback.js'],
  [/^\/api\/admin\/me$/, 'admin/me.js'],
  [/^\/api\/admin\/helps$/, 'admin/helps/index.js'],
  [/^\/api\/admin\/helps\/([^/]+)$/, 'admin/helps/[id].js'],
  [/^\/api\/admin\/vetting$/, 'admin/vetting.js'],
  [/^\/api\/admin\/requests$/, 'admin/requests.js']
];
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const SKIP_HEADERS = new Set(['host', 'connection', 'content-length', 'transfer-encoding', 'keep-alive', 'upgrade', 'expect']);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    for (const [re, file] of routes) {
      const m = url.pathname.match(re);
      if (!m) continue;
      const mod = await import(new URL(`functions/api/${file}`, ROOT_URL).href);
      const handler = req.method === 'POST' ? mod.onRequestPost : mod.onRequestGet;
      if (!handler) { res.writeHead(405).end(); return; }
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !SKIP_HEADERS.has(k)));
      const request = new Request(url, { method: req.method, headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
      const out = await handler({ request, env, params: { id: m[1] ? decodeURIComponent(m[1]) : undefined } });
      res.writeHead(out.status, Object.fromEntries(out.headers));
      res.end(Buffer.from(await out.arrayBuffer()));
      return;
    }
    // Static files, never outside /public
    let path = normalize(join(PUBLIC, decodeURIComponent(url.pathname)));
    if (!path.startsWith(PUBLIC)) { res.writeHead(403).end(); return; }
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
    if (!existsSync(path)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(path));
  } catch (e) {
    console.error(`Error on ${req.method} ${url.pathname}:`, e);
    res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'Server error: ' + e.message }));
  }
});

let port = Number(process.env.PORT) || 8788;
server.on('error', e => {
  if (e.code === 'EADDRINUSE' && port < 8800) { port++; server.listen(port); return; }
  console.error('Could not start the server:', e.message);
  process.exit(1);
});
server.on('listening', () => {
  const base = `http://localhost:${port}`;
  console.log(`\n  Jirani is running.\n`);
  console.log(`  Households:  ${base}/`);
  console.log(`  Helps join:  ${base}/join.html`);
  console.log(`  Staff:       ${base}/admin.html`);
  console.log(`               admin token        test-admin-token-123`);
  console.log(`               field agent token  test-agent-token-456  (Jane)\n`);
  console.log(`  Demo data resets when you stop the server (Ctrl+C).\n`);
});
server.listen(port);
