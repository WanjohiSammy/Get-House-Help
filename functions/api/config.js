import { json, settings, KINDS, TASKS } from '../../lib/util.js';
import { AREAS } from '../../lib/areas.js';

export function onRequestGet({ env }) {
  const s = settings(env);
  return json({
    paymentMode: s.paymentMode,
    matchFee: s.matchFee,
    successFee: s.successFee,
    till: s.till,
    tillName: s.tillName,
    whatsapp: s.whatsapp,
    minWage: s.minWage,
    areas: AREAS.map(a => a.name),
    kinds: KINDS,
    tasks: TASKS
  });
}
