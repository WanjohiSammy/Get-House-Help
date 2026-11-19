import { json, bad, getStaff } from '../../../../lib/util.js';
import { eventsFor } from '../../../../lib/vetting.js';
import { staffView } from '../../../../lib/helps.js';

// GET /api/admin/helps/:id — everything about one help, plus the full vetting history.
export async function onRequestGet({ request, env, params }) {
  if (!getStaff(request, env)) return bad('Not allowed.', 401);
  const h = await env.DB.prepare('SELECT * FROM helps WHERE id = ?').bind(params.id).first();
  if (!h) return bad('Help not found.', 404);
  return json({ help: staffView(h), events: await eventsFor(env.DB, h.id) });
}
