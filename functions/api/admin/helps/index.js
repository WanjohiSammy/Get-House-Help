import {
  json, bad, readJson, getStaff, newId, now, normalizePhone, cleanText, cleanList,
  KINDS, TASKS
} from '../../../../lib/util.js';
import { findArea, cleanPoint } from '../../../../lib/areas.js';
import { staffView } from '../../../../lib/helps.js';

const STATUSES = ['pending', 'approved', 'rejected', 'unavailable'];
const ADMIN_ONLY_STATUSES = ['approved', 'rejected'];

// GET /api/admin/helps?status=pending&q=grace — list for staff.
export async function onRequestGet({ request, env }) {
  if (!getStaff(request, env)) return bad('Not allowed.', 401);
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const q = cleanText(url.searchParams.get('q'), 40).toLowerCase();
  const where = [], args = [];
  if (STATUSES.includes(status)) { where.push('status = ?'); args.push(status); }
  if (q) {
    where.push('(lower(name) LIKE ? OR phone LIKE ? OR lower(area) LIKE ?)');
    const digits = q.replace(/\D/g, '').replace(/^0/, '');
    args.push(`%${q}%`, `%${digits || q}%`, `%${q}%`);
  }
  const sql = `SELECT * FROM helps ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC LIMIT 500`;
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json({ helps: results.map(staffView) });
}

// POST /api/admin/helps — with `id`: update that help. Without `id`: add a help you met in person or on WhatsApp.
// Badges are not editable here: they come from recorded vetting steps (POST /api/admin/vetting).
export async function onRequestPost({ request, env }) {
  const staff = getStaff(request, env);
  if (!staff) return bad('Not allowed.', 401);
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
  if ('lat' in b || 'lng' in b) {
    if (b.lat == null && b.lng == null) { fields.lat = null; fields.lng = null; }
    else {
      const p = cleanPoint(b.lat, b.lng);
      if (!p) return bad('That map point is outside Kenya.');
      Object.assign(fields, p);
    }
  }
  if ('kinds' in b) fields.kinds = cleanList(b.kinds, KINDS).join(',');
  if ('tasks' in b) fields.tasks = cleanList(b.tasks, TASKS).join(',');
  if ('years' in b) fields.years = Math.max(0, Math.min(50, parseInt(b.years, 10) || 0));
  if ('salary' in b) fields.salary = parseInt(b.salary, 10) || null;
  if ('languages' in b) fields.languages = cleanText(b.languages, 80);
  if ('about' in b) fields.about = cleanText(b.about, 800);
  if ('admin_notes' in b) fields.admin_notes = cleanText(b.admin_notes, 2000);
  for (const k of ['ref1_name', 'ref2_name']) if (k in b) fields[k] = cleanText(b[k], 80) || null;
  for (const k of ['ref1_phone', 'ref2_phone']) if (k in b) fields[k] = normalizePhone(b[k]);
  if ('status' in b) {
    if (!STATUSES.includes(b.status)) return bad('Unknown status.');
    if (b.id && ADMIN_ONLY_STATUSES.includes(b.status) && staff.role !== 'admin') {
      return bad('Only the admin can approve or reject a help.', 403);
    }
    fields.status = b.status;
  }
  fields.updated_at = now();

  try {
    if (b.id) {
      const current = await env.DB.prepare('SELECT * FROM helps WHERE id = ?').bind(b.id).first();
      if (!current) return bad('Help not found.', 404);
      if (fields.status === 'approved' && !current.id_verified) {
        return bad('Record a passed ID check before approving.');
      }
      const cols = Object.keys(fields);
      await env.DB.prepare(
        `UPDATE helps SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`
      ).bind(...cols.map(c => fields[c]), b.id).run();
      const updated = await env.DB.prepare('SELECT * FROM helps WHERE id = ?').bind(b.id).first();
      return json({ ok: true, help: staffView(updated) });
    }

    if (!fields.name || !fields.phone || !fields.area || !fields.kinds) {
      return bad('Name, phone, area and type of work are required.');
    }
    if (fields.status && fields.status !== 'pending') fields.status = 'pending'; // new helps always start unvetted
    const id = newId(10);
    const row = { status: 'pending', created_at: fields.updated_at, added_by: staff.name, ...fields, id };
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
