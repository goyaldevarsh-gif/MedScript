/** Auto condition page for the "Know Your Condition" patient-education site.
 *  If the saved QR link is that site's home, the QR opens the page for the Rx diagnosis (falls back to the home link). */
const SITE = /goyaldevarsh-gif\.github\.io\/know-your-condition/i;
const RULES: [RegExp, string][] = [
  [/post[- ]?op|post[- ]?operative/, 'post-surgery-care'],
  [/pes anserine/, 'pes-anserine-bursitis'],
  [/\bpcl\b/, 'pcl-injury'],
  [/\bacl\b/, 'acl-injury'],
  [/\bavn\b|avascular/, 'avn-femoral-head'],
  [/frozen shoulder|adhesive capsulitis/, 'frozen-shoulder'],
  [/rotator cuff/, 'rotator-cuff'],
  [/impingement/, 'shoulder-impingement'],
  [/tennis elbow|lateral epicondyl/, 'tennis-elbow'],
  [/cervical radiculopathy/, 'cervical-radiculopathy'],
  [/cervical spondylosis|neck pain/, 'neck-pain'],
  [/lumbar disc|disc prolapse|\bpivd\b/, 'lumbar-disc-prolapse'],
  [/sciatica/, 'sciatica'],
  [/coccyd|coccyx|tailbone/, 'coccydynia'],
  [/upper back/, 'upper-back-pain'],
  [/low back|lumbago|\blbp\b/, 'low-back-pain'],
  [/retrocalcaneal/, 'retrocalcaneal-heel-pain'],
  [/plantar fasc|heel pain/, 'plantar-fasciitis'],
  [/ankle sprain/, 'ankle-sprain'],
  [/achilles/, 'achilles-tendinopathy'],
  [/flat ?foot|pes planus/, 'flat-foot'],
  [/de ?quervain/, 'de-quervains-tenosynovitis'],
  [/trigger finger/, 'trigger-finger'],
  [/carpal tunnel/, 'carpal-tunnel-syndrome'],
  [/distal radius|colles/, 'distal-radius-fracture'],
  [/osteoarthritis.*knee|knee.*osteoarthritis|knee oa|\boa knee\b/, 'knee-osteoarthritis'],
];
export function resolveQr(base: string, diagnosis: string, lang: string): string {
  const b = (base || '').trim();
  if (!b || !SITE.test(b)) return b;
  const dx = (diagnosis || '').toLowerCase();
  const hit = RULES.find(([re]) => re.test(dx));
  if (!hit) return b;
  const root = b.replace(/\/(hi|en)\/?.*$/i, '').replace(/\/+$/, '');
  return `${root}/${lang === 'en' ? 'en' : 'hi'}/${hit[1]}/`;
}
