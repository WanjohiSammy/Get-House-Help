import { json, bad, readJson, newId, now, cleanText, cleanList, normalizePhone, settings, KINDS, TASKS } from '../../../lib/util.js';
import { findArea, cleanPoint } from '../../../lib/areas.js';
import { findMatches } from '../../../lib/helps.js';

// POST /api/requests — a household says what it needs; we save it and freeze a shortlist.
// Optional lat/lng from "Use my location" gives a more accurate distance than the area alone.
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return bad('Send JSON.');

  const kind = KINDS.includes(body.kind) ? body.kind : null;
  const tasks = cleanList(body.tasks, TASKS);
  const area = findArea(body.area);
  if (!kind) return bad('Choose live-in, live-out or day help.');
  if (!area) return bad('Choose your area from the list.');
  const phone = normalizePhone(body.phone);
  if (!phone) return bad('Add your WhatsApp number so we can send you your matches, e.g. 0712 345 678.');
  const point = body.lat != null ? cleanPoint(body.lat, body.lng) : null;

  const matches = await findMatches(env.DB, { kind, tasks, area: area.name, lat: point?.lat, lng: point?.lng }, { maxKm: settings(env).maxKm });
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO requests (id, kind, tasks, area, lat, lng, phone, start, notes, shortlist, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`
  ).bind(
    id, kind, tasks.join(','), area.name, point?.lat ?? null, point?.lng ?? null, phone,
    cleanText(body.start, 40), cleanText(body.notes, 500),
    JSON.stringify(matches.map(h => h.id)), now()
  ).run();

  return json({ id, matches: matches.length }, 201);
}
