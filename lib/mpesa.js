// M-Pesa Daraja STK push ("Lipa na M-Pesa Online").
// Docs and keys: https://developer.safaricom.co.ke

const baseUrl = env => env.PAYMENT_MODE === 'live'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// Timestamp in Kenya time, YYYYMMDDHHmmss.
export function darajaTimestamp(date = new Date()) {
  return new Date(date.getTime() + 3 * 3600 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

async function accessToken(env) {
  const auth = btoa(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`);
  const res = await fetch(`${baseUrl(env)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { authorization: `Basic ${auth}` }
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed (${res.status})`);
  const data = await res.json();
  return data.access_token;
}

// Sends the PIN prompt to `phone` (2547XXXXXXXX). Returns the CheckoutRequestID.
export async function stkPush(env, { phone, amount, origin, reference }) {
  for (const k of ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_SECRET']) {
    if (!env[k]) throw new Error(`Missing setting ${k}`);
  }
  const timestamp = darajaTimestamp();
  const token = await accessToken(env);
  const body = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: btoa(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`),
    Timestamp: timestamp,
    TransactionType: env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: env.MPESA_PARTY_B || env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: `${origin}/api/mpesa/callback?t=${encodeURIComponent(env.MPESA_CALLBACK_SECRET)}`,
    AccountReference: reference.slice(0, 12),
    TransactionDesc: 'Interviews'
  };
  const res = await fetch(`${baseUrl(env)}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ResponseCode !== '0') {
    throw new Error(data.errorMessage || data.ResponseDescription || `STK push failed (${res.status})`);
  }
  return data.CheckoutRequestID;
}

// Pulls the fields we need out of Safaricom's callback body.
export function parseCallback(body) {
  const cb = body?.Body?.stkCallback;
  if (!cb) return null;
  const items = Object.fromEntries((cb.CallbackMetadata?.Item || []).map(i => [i.Name, i.Value]));
  return {
    checkoutId: cb.CheckoutRequestID,
    ok: Number(cb.ResultCode) === 0,
    resultDesc: cb.ResultDesc,
    receipt: items.MpesaReceiptNumber || null,
    amount: items.Amount != null ? Number(items.Amount) : null
  };
}
