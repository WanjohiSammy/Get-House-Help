import { json, readJson, now } from '../../../lib/util.js';
import { parseCallback } from '../../../lib/mpesa.js';

// POST /api/mpesa/callback?t=<MPESA_CALLBACK_SECRET> — called by Safaricom after the PIN prompt.
export async function onRequestPost({ request, env }) {
  const ack = json({ ResultCode: 0, ResultDesc: 'Accepted' });
  const t = new URL(request.url).searchParams.get('t');
  if (!env.MPESA_CALLBACK_SECRET || t !== env.MPESA_CALLBACK_SECRET) return ack;

  const cb = parseCallback(await readJson(request));
  if (!cb?.checkoutId) return ack;

  const r = await env.DB.prepare(
    "SELECT id, status FROM requests WHERE checkout_id = ? AND status = 'awaiting_payment'"
  ).bind(cb.checkoutId).first();
  if (!r) return ack;

  if (cb.ok) {
    await env.DB.prepare(
      "UPDATE requests SET status = 'paid', receipt = ?, mpesa_code = ?, amount = ?, paid_at = ? WHERE id = ?"
    ).bind(cb.receipt, cb.receipt, cb.amount, now(), r.id).run();
  } else {
    // Cancelled, wrong PIN or timed out: let them try again.
    await env.DB.prepare("UPDATE requests SET status = 'open', checkout_id = NULL WHERE id = ?").bind(r.id).run();
  }
  return ack;
}
