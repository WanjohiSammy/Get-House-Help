import { json, bad, readJson, newId, now, normalizePhone, cleanText, cleanList, KINDS, TASKS } from '../../lib/util.js';
import { findArea, cleanPoint } from '../../lib/areas.js';

// POST /api/join — a house help signs up. Free, always. They start as 'pending' until you vet them.
export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (!b) return bad('Send JSON.');

  const name = cleanText(b.name, 80);
  const phone = normalizePhone(b.phone);
  const area = findArea(b.area);
  const kinds = cleanList(b.kinds, KINDS);
  if (name.split(/\s+/).length < 2) return bad('Please write your first and last name.');
  if (!phone) return bad('Please write a valid Safaricom or Airtel number.');
  if (!area) return bad('Choose where you live from the list.');
  if (!kinds.length) return bad('Choose at least one type of work.');
  if (b.consent !== true) return bad('Please confirm you are 18 or older and agree to the checks.');

  const ref1 = normalizePhone(b.ref1_phone), ref2 = normalizePhone(b.ref2_phone);
  const exists = await env.DB.prepare('SELECT id FROM helps WHERE phone = ?').bind(phone).first();
  if (exists) return bad('This number is already registered. We will call you.', 409);

  const point = b.lat != null ? cleanPoint(b.lat, b.lng) : null;
  const t = now();
  await env.DB.prepare(
    `INSERT INTO helps (id, name, phone, area, lat, lng, kinds, tasks, years, languages, salary, about,
       ref1_name, ref1_phone, ref2_name, ref2_phone, status, added_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'self', ?, ?)`
  ).bind(
    newId(10), name, phone, area.name, point?.lat ?? null, point?.lng ?? null, kinds.join(','), cleanList(b.tasks, TASKS).join(','),
    Math.max(0, Math.min(50, parseInt(b.years, 10) || 0)), cleanText(b.languages, 80),
    parseInt(b.salary, 10) || null, cleanText(b.about, 800),
    cleanText(b.ref1_name, 80) || null, ref1, cleanText(b.ref2_name, 80) || null, ref2, t, t
  ).run();

  return json({ ok: true }, 201);
}
