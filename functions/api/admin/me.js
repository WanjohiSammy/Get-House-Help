import { json, bad, getStaff } from '../../../lib/util.js';

// GET /api/admin/me — who is logged in, and what they may do.
export function onRequestGet({ request, env }) {
  const staff = getStaff(request, env);
  return staff ? json(staff) : bad('Not allowed.', 401);
}
