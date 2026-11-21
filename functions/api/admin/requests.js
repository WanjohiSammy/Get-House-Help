import { json, bad, readJson, getStaff, now, displayPhone, splitList, settings } from '../../../lib/util.js';
import { findMatches } from '../../../lib/helps.js';

// Payments and household requests: admin only.
function guard(request, env) {
  const s = getStaff(request, env);
  if (!s) return bad('Not allowed.', 401);
  if (s.role !== 'admin') return bad('Only the admin can see requests and payments.', 403);
  return null;
}

// GET /api/admin/requests — latest household requests with payment status.
export async function onRequestGet({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  const { results } = await env.DB.prepare('SELECT * FROM requests ORDER BY created_at DESC LIMIT 200').all();
  return json({
    requests: results.map(r => ({ ...r, shortlist: JSON.parse(r.shortlist || '[]'), phone_display: displayPhone(r.phone) }))
  });
}

// POST /api/admin/requests — { id, action, helpId? }
//   refresh_shortlist  look for matches again (after you approve new helps)
//   unlock             share the helps' numbers with the household (free pilot, cash, or paid elsewhere)
//   confirm_payment / reject_payment   check an M-Pesa code they typed (manual mode)
//   mark_hired, close
export async function onRequestPost({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  const b = await readJson(request);
  const r = b && await env.DB.prepare('SELECT * FROM requests WHERE id = ?').bind(String(b.id || '')).first();
  if (!r) return bad('Request not found.', 404);

  const run = (sql, ...args) => env.DB.prepare(sql).bind(...args, r.id).run();
  switch (b.action) {
    case 'refresh_shortlist': {
      if (['hired', 'closed'].includes(r.status)) return bad('This request is finished.');
      if (['paid'].includes(r.status)) return bad('Contacts were already shared for this shortlist.');
      const matches = await findMatches(env.DB, { kind: r.kind, tasks: splitList(r.tasks), area: r.area, lat: r.lat, lng: r.lng }, { maxKm: settings(env).maxKm });
      await run('UPDATE requests SET shortlist = ? WHERE id = ?', JSON.stringify(matches.map(h => h.id)));
      return json({ ok: true, matches: matches.length });
    }
    case 'unlock':
      if (!['open', 'pending_review', 'awaiting_payment'].includes(r.status)) return bad('Contacts are already shared or the request is closed.');
      if (r.shortlist === '[]') return bad('Find matches first: the shortlist is empty.');
      await run("UPDATE requests SET status = 'paid', amount = COALESCE(amount, 0), paid_at = ? WHERE id = ?", now());
      break;
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
