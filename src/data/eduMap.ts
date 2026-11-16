/** Maps a prescription's diagnosis to a page of the doctor's patient-guide site (slug of /c/<slug>/).
 *  Only used when the doctor has set a guide-site link in Settings; otherwise nothing changes. */
import { STARTERS } from './templates';
import type { Prescription } from '../lib/types';

const UP = '@upper', LOW = '@lower', LIMB = '@limb', POSTOP = 'post-surgery-care';
/** template key -> page slug (or @upper / @lower / @limb = cast-care page chosen by limb) */
const MAP: Record<string, string> = {
  'knee-oa': 'knee-osteoarthritis', lbp: 'low-back-pain', cervical: 'neck-pain', 'ankle-sprain': 'ankle-sprain', 'plantar-fasciitis': 'plantar-fasciitis',
  'frozen-shoulder': 'frozen-shoulder', 'tennis-elbow': 'tennis-elbow', 'shoulder-pain': 'shoulder-impingement', 'rotator-cuff': 'shoulder-impingement',
  'acl-postop': 'acl-injury', 'acl-injury': 'acl-injury', pcl: 'pcl-injury', 'carpal-tunnel': 'carpal-tunnel-syndrome', dequervain: 'de-quervains-tenosynovitis',
  'trigger-finger': 'trigger-finger', achilles: 'achilles-tendinopathy', pivd: 'lumbar-disc-prolapse', 'distal-radius': 'distal-radius-fracture',
  'cerv-radic': 'cervical-radiculopathy', 'avn-hip': 'avn-femoral-head', 'ankle-instability': 'ankle-sprain', 'ia-steroid': 'knee-osteoarthritis', visco: 'knee-osteoarthritis',
  'tkr-postop': POSTOP, 'thr-postop': POSTOP, 'postop-fracture': POSTOP, 'it-fracture': POSTOP, nof: POSTOP, 'acetabular-postop': POSTOP, 'femur-shaft-postop': POSTOP,
  'meniscus-postop': POSTOP, 'rcr-postop': POSTOP, 'bankart-postop': POSTOP, 'discectomy-postop': POSTOP, 'fusion-postop': POSTOP, 'achilles-rupture': POSTOP, 'open-fx': POSTOP,
  'cast-care': LIMB, 'fracture-fu': LIMB, 'both-bone': UP, 'prox-humerus': UP, clavicle: UP, supracondylar: UP, scaphoid: UP, 'humerus-shaft': UP,
  'tibia-fx': LOW, 'ankle-fx': LOW, 'tibial-plateau': LOW, 'distal-femur': LOW,
};
const UPPER = /shoulder|arm|elbow|forearm|wrist|hand|finger|thumb|humerus|clavicle|scapula|radius|ulna/i;
const LOWER = /hip|thigh|femur|knee|leg|tibia|fibula|ankle|foot|toe|heel/i;
const nz = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function eduSlug(rx: Pick<Prescription, 'clinical'>): string | null {
  const dx = nz(rx.clinical?.diagnosis || '');
  if (!dx) return null;
  let best: { key: string; len: number } | null = null;
  for (const t of STARTERS) {
    const td = nz(t.clinical.diagnosis || '');
    if (td && MAP[t.key] && (dx === td || dx.startsWith(td)) && (!best || td.length > best.len)) best = { key: t.key, len: td.length };
  }
  if (!best) return null;
  const v = MAP[best.key];
  if (v[0] !== '@') return v;
  const parts = (rx.clinical.bodyParts || []).join(' ');
  if (v === UP) return 'cast-care-upper-limb';
  if (v === LOW) return 'cast-care-lower-limb';
  if (UPPER.test(parts) && !LOWER.test(parts)) return 'cast-care-upper-limb';
  if (LOWER.test(parts) && !UPPER.test(parts)) return 'cast-care-lower-limb';
  return null;
}

/** QR target for this Rx: the matching page on the doctor's guide site, or null (caller falls back to the doctor's general QR). */
export function eduUrl(rx: Pick<Prescription, 'clinical'>, base?: string): string | null {
  const b = (base || '').trim();
  if (!b) return null;
  const slug = eduSlug(rx);
  return slug ? `${b.replace(/\/+$/, '')}/c/${slug}/` : null;
}
