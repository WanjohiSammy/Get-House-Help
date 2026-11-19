import { json, bad, readJson, getStaff, now, cleanText } from '../../../lib/util.js';
import { STEPS, RESULTS, cleanStep, flagsFrom, eventsFor } from '../../../lib/vetting.js';
import { staffView } from '../../../lib/helps.js';

// POST /api/admin/vetting — record one vetting step for a help.
// { helpId, step, slot?, result, notes?, data? }  → updated help + full history.
export async function onRequestPost({ request, env }) {
  const staff = getStaff(request, env);
  if (!staff) return bad('Not allowed.', 401);
  const b = await readJson(request);
  if (!b) return bad('Send JSON.');

  const help = await env.DB.prepare('SELECT * FROM helps WHERE id = ?').bind(String(b.helpId || '')).first();
  if (!help) return bad('Help not found.', 404);
  if (!STEPS.includes(b.step)) return bad('Unknown step.');
  if (b.step !== 'note' && !RESULTS.includes(b.result)) return bad('Choose a result.');
  const slot = b.step === 'reference' ? (Number(b.slot) === 2 ? 2 : 1) : 0;
  const notes = cleanText(b.notes, 1000);
  if (b.step === 'note' && !notes) return bad('Write the note.');
  if (b.result === 'fail' && !notes) return bad('Write a short reason for the fail.');

  const cleaned = cleanStep(b.step, b.data || {}, b.result);
  if (cleaned.error) return bad(cleaned.error);

  const t = now();
  await env.DB.prepare(
    `INSERT INTO vetting_events (help_id, step, slot, result, notes, data, by_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(help.id, b.step, slot, cleaned.result, notes, JSON.stringify(cleaned.data), staff.name, t).run();

  // Recompute badges from the full history.
  const events = await eventsFor(env.DB, help.id);
  const flags = flagsFrom(events);
  const cols = Object.keys(flags);
  // A help who loses their ID check can't stay approved.
  const demote = help.status === 'approved' && !flags.id_verified;
  await env.DB.prepare(
    `UPDATE helps SET ${cols.map(c => `${c} = ?`).join(', ')}, updated_at = ?${demote ? ", status = 'pending'" : ''} WHERE id = ?`
  ).bind(...cols.map(c => flags[c]), t, help.id).run();

  const updated = await env.DB.prepare('SELECT * FROM helps WHERE id = ?').bind(help.id).first();
  return json({ ok: true, help: staffView(updated), events });
}
