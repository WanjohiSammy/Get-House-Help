import { cleanText, normalizePhone } from './util.js';

// The vetting steps, in the order staff do them.
export const STEPS = ['id_check', 'good_conduct', 'reference', 'interview', 'training', 'note'];
export const RESULTS = ['pass', 'fail', 'pending', 'no_answer'];

const bool = v => v === true || v === 'true' || v === 'on' || v === 1;
const date = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const score = v => { const n = parseInt(v, 10); return n >= 1 && n <= 5 ? n : null; };

// Keeps only the fields each step allows, so nothing unexpected (like a full ID number) is stored.
// Returns { data, result } — the result may be forced to 'fail' when the answers rule a pass out.
export function cleanStep(step, input = {}, result) {
  switch (step) {
    case 'id_check': {
      const data = { sawOriginal: bool(input.sawOriginal), nameMatches: bool(input.nameMatches), over18: bool(input.over18) };
      if (result === 'pass' && !(data.sawOriginal && data.nameMatches && data.over18)) {
        return { error: 'To pass, tick: saw the original ID, name matches, and 18 or older.' };
      }
      return { data, result };
    }
    case 'good_conduct':
      return { data: { certRef: cleanText(input.certRef, 40), issued: date(input.issued) }, result };
    case 'reference': {
      const rehire = ['yes', 'no', 'unsure'].includes(input.rehire) ? input.rehire : '';
      return {
        data: {
          name: cleanText(input.name, 80), phone: normalizePhone(input.phone) || '',
          relation: cleanText(input.relation, 60), duration: cleanText(input.duration, 40), rehire
        },
        result
      };
    }
    case 'interview': {
      const s = input.scores || {};
      const scores = {
        punctuality: score(s.punctuality), communication: score(s.communication),
        skills: score(s.skills), hygiene: score(s.hygiene)
      };
      return { data: { date: date(input.date), place: cleanText(input.place, 80), scores }, result };
    }
    case 'training':
      return { data: { course: cleanText(input.course, 80), provider: cleanText(input.provider, 80), date: date(input.date) }, result };
    case 'note':
      return { data: {}, result: 'pending' };
    default:
      return { error: 'Unknown step.' };
  }
}

// Badges come only from the latest recorded result of each step (oldest → newest list).
export function flagsFrom(events) {
  const latest = new Map();
  for (const e of events) {
    if (e.step === 'note') continue;
    const key = e.step === 'reference' ? `reference:${e.slot}` : e.step === 'training' ? `training:${e.id}` : e.step;
    latest.set(key, e.result);
  }
  const pass = k => latest.get(k) === 'pass';
  const passedRefs = [1, 2].filter(slot => pass(`reference:${slot}`)).length;
  const trained = [...latest.entries()].some(([k, v]) => k.startsWith('training:') && v === 'pass');
  return {
    id_verified: pass('id_check') ? 1 : 0,
    good_conduct: pass('good_conduct') ? 1 : 0,
    refs_called: passedRefs >= 2 ? 1 : 0,
    interviewed: pass('interview') ? 1 : 0,
    certified: trained ? 1 : 0
  };
}

export async function eventsFor(db, helpId) {
  const { results } = await db.prepare(
    'SELECT * FROM vetting_events WHERE help_id = ? ORDER BY created_at, id'
  ).bind(helpId).all();
  return results.map(e => ({ ...e, data: JSON.parse(e.data || '{}') }));
}
