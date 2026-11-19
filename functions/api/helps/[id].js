import { json, bad } from '../../../lib/util.js';
import { publicHelp } from '../../../lib/helps.js';

// GET /api/helps/:id?r=<requestId> — public profile; distance from the request's area if given.
export async function onRequestGet({ request, env, params }) {
  const h = await env.DB.prepare("SELECT * FROM helps WHERE id = ? AND status = 'approved'").bind(params.id).first();
  if (!h) return bad('This profile is not available.', 404);

  const rid = new URL(request.url).searchParams.get('r');
  let from = null, unlocked = false;
  if (rid) {
    const r = await env.DB.prepare('SELECT area, lat, lng, status, shortlist FROM requests WHERE id = ?').bind(rid).first();
    if (r) {
      from = r;
      unlocked = ['paid', 'hired'].includes(r.status) && JSON.parse(r.shortlist || '[]').includes(h.id);
    }
  }
  return json({ help: publicHelp(h, { from, unlocked }) });
}
