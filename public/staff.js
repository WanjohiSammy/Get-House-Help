// Shared by the staff pages (admin.html, admin-help.html).
import { api } from '/app.js';

const KEY = 'mtaacare.staff';
export const getToken = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
export const setToken = t => { try { localStorage.setItem(KEY, t); } catch {} };
export const logout = () => { try { localStorage.removeItem(KEY); } catch {} location.href = '/staff'; };

export function staffApi(path, opts = {}) {
  return api(path, { ...opts, token: getToken() }).catch(e => {
    if (e.status === 401) logout();
    throw e;
  });
}

export const STATUS_PILL = {
  pending: 'pill gold', approved: 'pill strong', rejected: 'pill grey', unavailable: 'pill grey',
  open: 'pill grey', awaiting_payment: 'pill gold', pending_review: 'pill gold', paid: 'pill strong', hired: 'pill strong', closed: 'pill grey'
};

export const RESULT_TEXT = { pass: 'Passed', fail: 'Failed', pending: 'In progress', no_answer: 'No answer' };

// The vetting checklist. `key` identifies the card; reference cards carry a slot.
export const STEP_CARDS = [
  {
    key: 'id_check', step: 'id_check', title: 'National ID', badge: 'id_verified',
    hint: 'See the original ID in person or on a video call. Do not write down or photograph the ID number.',
    results: ['pass', 'fail', 'pending'],
    fields: [
      { name: 'sawOriginal', type: 'check', label: 'I saw the original ID' },
      { name: 'nameMatches', type: 'check', label: 'Name matches the ID' },
      { name: 'over18', type: 'check', label: 'ID shows she or he is 18 or older' }
    ]
  },
  {
    key: 'good_conduct', step: 'good_conduct', title: 'Certificate of Good Conduct', badge: 'good_conduct',
    hint: 'From DCI through eCitizen. Check that the name matches and it is less than a year old.',
    results: ['pass', 'fail', 'pending'],
    fields: [
      { name: 'certRef', type: 'text', label: 'Certificate reference' },
      { name: 'issued', type: 'date', label: 'Date issued' }
    ]
  },
  ...[1, 2].map(slot => ({
    key: `reference:${slot}`, step: 'reference', slot, title: `Reference ${slot}`, badge: 'refs_called',
    hint: 'Call a past employer. Ask how long she worked for them, why she left, and whether they would hire her again.',
    results: ['pass', 'fail', 'no_answer', 'pending'],
    fields: [
      { name: 'name', type: 'text', label: 'Employer name', prefill: `ref${slot}_name` },
      { name: 'phone', type: 'tel', label: 'Employer phone', prefill: `ref${slot}_phone` },
      { name: 'relation', type: 'text', label: 'What she did for them', placeholder: 'e.g. nanny for 2 children' },
      { name: 'duration', type: 'text', label: 'How long', placeholder: 'e.g. 3 years' },
      { name: 'rehire', type: 'select', label: 'Would they hire her again?', options: [['', 'Choose'], ['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'No']] }
    ]
  })),
  {
    key: 'interview', step: 'interview', title: 'Meet in person', badge: 'interviewed',
    hint: 'Meet at your hub, a church or a café. Score 1 (poor) to 5 (excellent).',
    results: ['pass', 'fail', 'pending'],
    fields: [
      { name: 'date', type: 'date', label: 'Date' },
      { name: 'place', type: 'text', label: 'Where you met' },
      { name: 'punctuality', type: 'score', label: 'Came on time' },
      { name: 'communication', type: 'score', label: 'Communication' },
      { name: 'skills', type: 'score', label: 'Skills shown' },
      { name: 'hygiene', type: 'score', label: 'Neat and clean' }
    ]
  },
  {
    key: 'training', step: 'training', title: 'Training (optional)', badge: 'certified',
    hint: 'Record a course she finished, e.g. first aid or childcare. One passed course earns the Certified badge.',
    results: ['pass', 'fail', 'pending'],
    fields: [
      { name: 'course', type: 'text', label: 'Course' },
      { name: 'provider', type: 'text', label: 'Trainer or school' },
      { name: 'date', type: 'date', label: 'Date finished' }
    ]
  }
];

export const stepTitle = e => e.step === 'note' ? 'Note'
  : e.step === 'reference' ? `Reference ${e.slot}` : (STEP_CARDS.find(c => c.step === e.step)?.title || e.step);

export const shortDate = iso => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
