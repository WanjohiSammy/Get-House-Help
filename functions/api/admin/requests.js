import { json, bad, readJson, isAdmin, now, displayPhone } from '../../../lib/util.js';

// GET /api/admin/requests — latest household requests with payment status.
export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return bad('Not allowed.', 401);
  const { results } = await env.DB.prepare('SELECT * FROM requests ORDER BY created_at DESC LIMIT 200').all();
  return json({
    requests: results.map(r => ({ ...r, shortlist: JSON.parse(r.shortlist || '[]'), phone_display: displayPhone(r.phone) }))
  });
}

// POST /api/admin/requests — { id, action: confirm_payment | reject_payment | mark_hired | close, helpId? }
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return bad('Not allowed.', 401);
  const b = await readJson(request);
  const r = b && await env.DB.prepare('SELECT * FROM requests WHERE id = ?').bind(String(b.id || '')).first();
  if (!r) return bad('Request not found.', 404);

  const run = (sql, ...args) => env.DB.prepare(sql).bind(...args, r.id).run();
  switch (b.action) {
    case 'confirm_payment':
      if (r.status !== 'pending_review') return bad('Nothing to confirm.');
      await run("UPDATE requests SET status = 'paid', paid_at = ? WHERE id = ?", now());
      break;
    case 'reject_payment':
      await run("UPDATE requests SET status = 'open', mpesa_code = NULL WHERE id = ?");
      break;
    case 'mark_hired': {
      const list = JSON.parse(r.shortlist || '[]');
      if (!list.includes(b.helpId)) return bad('That help is not on this shortlist.');
      await run("UPDATE requests SET status = 'hired', hired_help_id = ? WHERE id = ?", b.helpId);
      break;
    }
    case 'close':
      await run("UPDATE requests SET status = 'closed' WHERE id = ?");
      break;
    default:
      return bad('Unknown action.');
  }
  return json({ ok: true, phone: displayPhone(r.phone) });
}
