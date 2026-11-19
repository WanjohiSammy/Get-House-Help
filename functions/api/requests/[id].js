import { json, bad, splitList, displayPhone } from '../../../lib/util.js';
import { publicHelp } from '../../../lib/helps.js';

const UNLOCKED = ['paid', 'hired'];

// GET /api/requests/:id — the household's shortlist. Contacts appear once paid.
export async function onRequestGet({ env, params }) {
  const r = await env.DB.prepare('SELECT * FROM requests WHERE id = ?').bind(params.id).first();
  if (!r) return bad('We could not find that request.', 404);

  const ids = JSON.parse(r.shortlist || '[]');
  let helps = [];
  if (ids.length) {
    const marks = ids.map(() => '?').join(',');
    const { results } = await env.DB.prepare(`SELECT * FROM helps WHERE id IN (${marks})`).bind(...ids).all();
    const byId = new Map(results.map(h => [h.id, h]));
    const unlocked = UNLOCKED.includes(r.status);
    helps = ids.map(id => byId.get(id)).filter(Boolean)
      .map(h => publicHelp(h, { from: r, unlocked }));
  }

  return json({
    request: {
      id: r.id, kind: r.kind, tasks: splitList(r.tasks), area: r.area, start: r.start,
      status: r.status, phone: displayPhone(r.phone)
    },
    unlocked: UNLOCKED.includes(r.status),
    helps
  });
}
