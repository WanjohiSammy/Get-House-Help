import { distanceKm, commuteMinutes, pointOf } from './areas.js';
import { splitList, shortName, displayPhone } from './util.js';

export function badgeOf(h) {
  const checked = h.id_verified && h.good_conduct && h.refs_called && h.interviewed;
  if (checked && h.certified) return 'Certified';
  if (checked) return 'Checked';
  if (h.id_verified) return 'ID verified';
  return 'New';
}

// What a household sees. `from` is the household's request row (its pin or area).
// Contact details only when `unlocked` is true. A help's own map point is never sent.
export function publicHelp(h, { from = null, unlocked = false } = {}) {
  const home = pointOf(h);
  const there = from ? pointOf(from) : null;
  const km = home && there ? distanceKm(home, there) : null;
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

// Everything staff see about a help (never sent to households).
export const staffView = h => ({
  ...h,
  phone_display: displayPhone(h.phone),
  badge: badgeOf(h),
  checks_done: h.id_verified + h.good_conduct + h.refs_called + h.interviewed + h.certified
});

const checkCount = h => h.id_verified + h.good_conduct + h.refs_called + h.interviewed + h.certified;

// Up to `limit` approved helps who do this kind of work and live within `maxKm`, closest first.
// `request` needs kind, tasks (array) and area, plus lat/lng if the household shared a location.
export async function findMatches(db, request, { limit = 3, maxKm = 15 } = {}) {
  const { results } = await db.prepare("SELECT * FROM helps WHERE status = 'approved'").all();
  const target = pointOf(request);
  const wanted = new Set(request.tasks);
  return results
    .filter(h => splitList(h.kinds).includes(request.kind))
    .map(h => {
      const home = pointOf(h);
      const km = home && target ? distanceKm(home, target) : 999;
      const overlap = splitList(h.tasks).filter(t => wanted.has(t)).length;
      return { h, km, overlap };
    })
    .filter(x => x.km <= maxKm)
    // Within 2 km counts as "equally close"; then best task fit, then most checks.
    .sort((a, b) =>
      Math.floor(a.km / 2) - Math.floor(b.km / 2) ||
      b.overlap - a.overlap ||
      checkCount(b.h) - checkCount(a.h) ||
      a.km - b.km)
    .slice(0, limit)
    .map(x => x.h);
}
