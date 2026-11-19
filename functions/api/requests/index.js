import { json, bad, readJson, newId, now, cleanText, cleanList, KINDS, TASKS } from '../../../lib/util.js';
import { findArea } from '../../../lib/areas.js';
import { findMatches } from '../../../lib/helps.js';

// POST /api/requests — a household says what it needs; we save it and freeze a shortlist.
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return bad('Send JSON.');

  const kind = KINDS.includes(body.kind) ? body.kind : null;
  const tasks = cleanList(body.tasks, TASKS);
  const area = findArea(body.area);
  if (!kind) return bad('Choose live-in, live-out or day help.');
  if (!area) return bad('Choose your area from the list.');

  const matches = await findMatches(env.DB, { kind, tasks, area: area.name });
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO requests (id, kind, tasks, area, start, notes, shortlist, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`
  ).bind(
    id, kind, tasks.join(','), area.name,
    cleanText(body.start, 40), cleanText(body.notes, 500),
    JSON.stringify(matches.map(h => h.id)), now()
  ).run();

  return json({ id, matches: matches.length }, 201);
}
