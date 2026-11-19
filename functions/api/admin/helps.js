import {
  json, bad, readJson, isAdmin, newId, now, normalizePhone, cleanText, cleanList,
  KINDS, TASKS, CHECKS, displayPhone
} from '../../../lib/util.js';
import { findArea } from '../../../lib/areas.js';
import { badgeOf } from '../../../lib/helps.js';

const STATUSES = ['pending', 'approved', 'rejected', 'unavailable'];

const view = h => ({ ...h, phone_display: displayPhone(h.phone), badge: badgeOf(h) });

// GET /api/admin/helps?status=pending — everything about each help, for vetting.
export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return bad('Not allowed.', 401);
  const status = new URL(request.url).searchParams.get('status');
  const stmt = STATUSES.includes(status)
    ? env.DB.prepare('SELECT * FROM helps WHERE status = ? ORDER BY created_at DESC').bind(status)
    : env.DB.prepare('SELECT * FROM helps ORDER BY created_at DESC LIMIT 500');
  const { results } = await stmt.all();
  return json({ helps: results.map(view) });
}

// POST /api/admin/helps — with `id`: update that help. Without `id`: add a help you met on WhatsApp.
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return bad('Not allowed.', 401);
  const b = await readJson(request);
  if (!b) return bad('Send JSON.');

  const fields = {};
  if ('name' in b) fields.name = cleanText(b.name, 80);
  if ('phone' in b) {
    const p = normalizePhone(b.phone);
    if (!p) return bad('Invalid phone number.');
    fields.phone = p;
  }
  if ('area' in b) {
    const a = findArea(b.area);
    if (!a) return bad('Unknown area.');
    fields.area = a.name;
  }
  if ('kinds' in b) fields.kinds = cleanList(b.kinds, KINDS).join(',');
  if ('tasks' in b) fields.tasks = cleanList(b.tasks, TASKS).join(',');
  if ('years' in b) fields.years = Math.max(0, Math.min(50, parseInt(b.years, 10) || 0));
  if ('salary' in b) fields.salary = parseInt(b.salary, 10) || null;
  if ('languages' in b) fields.languages = cleanText(b.languages, 80);
  if ('about' in b) fields.about = cleanText(b.about, 800);
  if ('admin_notes' in b) fields.admin_notes = cleanText(b.admin_notes, 2000);
  if ('status' in b) {
    if (!STATUSES.includes(b.status)) return bad('Unknown status.');
    fields.status = b.status;
  }
  for (const c of CHECKS) if (c in b) fields[c] = b[c] ? 1 : 0;
  fields.updated_at = now();

  try {
    if (b.id) {
      const cols = Object.keys(fields);
      const res = await env.DB.prepare(
        `UPDATE helps SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`
      ).bind(...cols.map(c => fields[c]), b.id).run();
      if (!res.meta?.changes) return bad('Help not found.', 404);
      return json({ ok: true, id: b.id });
    }

    if (!fields.name || !fields.phone || !fields.area || !fields.kinds) {
      return bad('Name, phone, area and type of work are required.');
    }
    const id = newId(10);
    const row = { status: 'pending', created_at: fields.updated_at, ...fields, id };
    const cols = Object.keys(row);
    await env.DB.prepare(
      `INSERT INTO helps (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
    ).bind(...cols.map(c => row[c])).run();
    return json({ ok: true, id }, 201);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return bad('That phone number is already registered.', 409);
    throw e;
  }
}
