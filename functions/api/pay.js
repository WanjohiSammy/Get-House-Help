import { json, bad, readJson, normalizePhone, settings } from '../../lib/util.js';
import { stkPush } from '../../lib/mpesa.js';

// POST /api/pay — { requestId, phone, code? }
// manual mode: household pays your Till/Pochi, sends the M-Pesa code, you confirm in /admin.
// sandbox/live: we send an STK push and Safaricom calls /api/mpesa/callback.
export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (!b) return bad('Send JSON.');
  const s = settings(env);

  const r = await env.DB.prepare('SELECT * FROM requests WHERE id = ?').bind(String(b.requestId || '')).first();
  if (!r) return bad('We could not find that request.', 404);
  if (['paid', 'hired'].includes(r.status)) return json({ status: r.status });
  if (r.shortlist === '[]') return bad('No matches yet. We will SMS you when we have some.');

  const phone = normalizePhone(b.phone);
  if (!phone) return bad('Please write a valid M-Pesa number, like 0712 345 678.');

  if (s.paymentMode === 'manual') {
    const code = String(b.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(code)) return bad('The M-Pesa code is 10 letters and numbers, like SKL3XY12AB.');
    const dup = await env.DB.prepare('SELECT id FROM requests WHERE mpesa_code = ? AND id != ?').bind(code, r.id).first();
    if (dup) return bad('That M-Pesa code was already used.');
    await env.DB.prepare(
      "UPDATE requests SET phone = ?, mpesa_code = ?, amount = ?, status = 'pending_review' WHERE id = ?"
    ).bind(phone, code, s.matchFee, r.id).run();
    return json({ status: 'pending_review' });
  }

  try {
    const checkoutId = await stkPush(env, {
      phone, amount: s.matchFee, origin: new URL(request.url).origin, reference: 'JIRANI'
    });
    await env.DB.prepare(
      "UPDATE requests SET phone = ?, checkout_id = ?, status = 'awaiting_payment' WHERE id = ?"
    ).bind(phone, checkoutId, r.id).run();
    return json({ status: 'awaiting_payment' });
  } catch (e) {
    return bad(`M-Pesa did not accept the request: ${e.message}`, 502);
  }
}
