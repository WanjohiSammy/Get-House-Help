import { findArea, distanceKm, commuteMinutes } from './areas.js';
import { splitList, shortName, displayPhone } from './util.js';

export function badgeOf(h) {
  const checked = h.id_verified && h.good_conduct && h.refs_called && h.interviewed;
  if (checked && h.certified) return 'Certified';
  if (checked) return 'Checked';
  if (h.id_verified) return 'ID verified';
  return 'New';
}

// What a household sees. Contact details only when `unlocked` is true.
export function publicHelp(h, { fromArea = null, unlocked = false } = {}) {
  const home = findArea(h.area);
  const from = fromArea ? findArea(fromArea) : null;
  const km = home && from ? distanceKm(home, from) : null;
  return {
    id: h.id,
    name: unlocked ? h.name : shortName(h.name),
    area: h.area,
    kinds: splitList(h.kinds),
    tasks: splitList(h.tasks),
    years: h.years,
    languages: h.languages,
    salary: h.salary,
    about: h.about,
    badge: badgeOf(h),
    checks: {
      id_verified: !!h.id_verified,
      good_conduct: !!h.good_conduct,
      refs_called: !!h.refs_called,
      interviewed: !!h.interviewed,
      certified: !!h.certified
    },
    commuteMin: km == null ? null : commuteMinutes(km),
    phone: unlocked ? displayPhone(h.phone) : undefined,
    phoneIntl: unlocked ? h.phone : undefined
  };
}

const checkCount = h => h.id_verified + h.good_conduct + h.refs_called + h.interviewed + h.certified;

// Up to `limit` approved helps who do this kind of work, closest first.
export async function findMatches(db, { kind, tasks, area }, limit = 3) {
  const { results } = await db.prepare("SELECT * FROM helps WHERE status = 'approved'").all();
  const target = findArea(area);
  const wanted = new Set(tasks);
  return results
    .filter(h => splitList(h.kinds).includes(kind))
    .map(h => {
      const home = findArea(h.area);
      const km = home && target ? distanceKm(home, target) : 999;
      const overlap = splitList(h.tasks).filter(t => wanted.has(t)).length;
      return { h, km, overlap };
    })
    // Within 2 km counts as "equally close"; then best task fit, then most checks.
    .sort((a, b) =>
      Math.floor(a.km / 2) - Math.floor(b.km / 2) ||
      b.overlap - a.overlap ||
      checkCount(b.h) - checkCount(a.h) ||
      a.km - b.km)
    .slice(0, limit)
    .map(x => x.h);
}
