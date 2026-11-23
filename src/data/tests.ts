import type { Clinical } from '../lib/types';
import { norm } from '../lib/util';

/** {s} is replaced with "right " / "left " / "bilateral " (or nothing) from the Side chosen on the form. */
type Region = { key: string; re: RegExp; parts: string[]; tests: string[] };
const R: Region[] = [
  { key: 'shoulder', re: /shoulder|rotator|cuff|clavic|acromio|\bac joint|humerus.*prox|prox.*humer|slap|bankart|frozen|capsulitis|supraspin|labr/i, parts: ['shoulder'], tests: [
    'X-ray {s}shoulder AP and axillary view', 'X-ray {s}shoulder AP, Grashey and scapular Y views', 'MRI {s}shoulder', 'USG {s}shoulder', 'CT {s}shoulder'] },
  { key: 'clavicle', re: /clavic|\bac joint|acromioclav/i, parts: [], tests: ['X-ray {s}clavicle AP and cephalic tilt view', 'X-ray both shoulders AP (Zanca view)'] },
  { key: 'elbow', re: /elbow|epicondyl|olecran|radial head|supracond|cubital|tennis|golfer|humerus.*distal|distal.*humer/i, parts: ['elbow'], tests: [
    'X-ray {s}elbow AP and lateral', 'MRI {s}elbow', 'USG {s}elbow', 'Nerve conduction study of the ulnar nerve'] },
  { key: 'arm', re: /humerus|humeral|arm fracture/i, parts: ['arm'], tests: ['X-ray {s}humerus AP and lateral'] },
  { key: 'forearm', re: /forearm|both bone|radius|ulna|monteggia|galeazzi/i, parts: ['forearm'], tests: ['X-ray {s}forearm with elbow and wrist AP and lateral', 'X-ray {s}wrist AP and lateral'] },
  { key: 'wrist', re: /wrist|scaphoid|carpal|dequervain|de quervain|tfcc|distal radius|colles|ganglion|buckle/i, parts: ['wrist'], tests: [
    'X-ray {s}wrist AP and lateral', 'X-ray {s}wrist with scaphoid views', 'MRI {s}wrist', 'USG {s}wrist', 'Nerve conduction study of the median nerve', 'CT {s}wrist'] },
  { key: 'hand', re: /hand|finger|thumb|metacarp|phalan|trigger|mallet|boxer|dupuytren|gamekeeper|tendon repair/i, parts: ['hand', 'finger', 'thumb'], tests: [
    'X-ray {s}hand AP, oblique and lateral', 'X-ray {s}finger AP and lateral', 'X-ray {s}thumb AP and lateral', 'USG {s}hand'] },
  { key: 'cervical', re: /cervical|(?<!femoral )neck(?! of femur)|whiplash|torticoll|wryneck|cerv/i, parts: ['neck', 'cervical'], tests: [
    'X-ray cervical spine AP and lateral', 'X-ray cervical spine flexion and extension views', 'MRI cervical spine', 'Nerve conduction study / EMG of the upper limb'] },
  { key: 'thoracic', re: /thoracic|dorsal spine|mid.?back|rib\b|ribs|chest wall/i, parts: ['thoracic'], tests: ['X-ray thoracic spine AP and lateral', 'MRI thoracic spine', 'Chest X-ray PA view'] },
  { key: 'lumbar', re: /lumbar|lumbo|back pain|\bLBP\b|disc|sciatica|radicul|canal stenosis|spondyl|coccy|sacro|\bsi joint|spine|vertebr|scolio/i, parts: ['lumbar', 'spine', 'back'], tests: [
    'X-ray LS spine AP and lateral', 'X-ray LS spine flexion and extension views', 'MRI lumbosacral spine', 'Nerve conduction study / EMG of the lower limb', 'CT lumbosacral spine'] },
  { key: 'pelvis', re: /pelvi|acetabul|pubic|\bsi joint|sacroil|coccy/i, parts: ['pelvis'], tests: ['X-ray pelvis AP', 'X-ray pelvis AP, inlet and outlet views', 'CT pelvis', 'MRI sacroiliac joints'] },
  { key: 'hip', re: /\bhip|femoral neck|femoral head|trochant|groin|avn|perthes|ddh|scfe|thr\b|neck of femur|\bnof\b|impingement|fai\b|piriformis/i, parts: ['hip', 'groin'], tests: [
    'X-ray pelvis with both hips AP', 'X-ray {s}hip lateral view', 'MRI {s}hip', 'MRI both hips', 'USG {s}hip'] },
  { key: 'thigh', re: /(?<!neck of )femur|femoral shaft|thigh|hamstring|quadric|contusion|meralgia/i, parts: ['thigh'], tests: ['X-ray {s}femur AP and lateral', 'USG {s}thigh', 'MRI {s}thigh'] },
  { key: 'knee', re: /knee|patell|menisc|\bacl\b|\bpcl\b|\bmcl\b|\blcl\b|cruciate|collateral|tibial plateau|distal femur|baker|osgood|chondral|cartilage|genu|\btkr\b|jumper|iliotibial|\bitb\b|cyst/i, parts: ['knee'], tests: [
    'X-ray {s}knee standing AP and lateral', 'X-ray {s}knee AP and lateral', 'X-ray {s}knee skyline view', 'X-ray both knees standing AP', 'MRI {s}knee', 'USG {s}knee', 'CT {s}knee', 'X-ray full-length both lower limbs standing (scanogram)'] },
  { key: 'leg', re: /tibia|fibula|shin|leg fracture|calf|compartment/i, parts: ['leg', 'calf', 'shin'], tests: ['X-ray {s}leg with knee and ankle AP and lateral', 'USG {s}calf'] },
  { key: 'ankle', re: /ankle|achilles|malleol|syndesm|peroneal|talus|sprain|tibialis|tarsal tunnel/i, parts: ['ankle'], tests: [
    'X-ray {s}ankle AP, lateral and mortise views', 'X-ray {s}ankle weight-bearing', 'MRI {s}ankle', 'USG {s}ankle', 'CT {s}ankle'] },
  { key: 'foot', re: /foot|heel|plantar|calcane|metatars|toe\b|toes|hallux|bunion|morton|flat ?foot|sever|ctev|clubfoot|lisfranc|navicular/i, parts: ['foot', 'heel', 'toe'], tests: [
    'X-ray {s}foot AP, oblique and lateral', 'X-ray {s}foot weight-bearing AP and lateral', 'X-ray {s}heel lateral and axial view', 'MRI {s}foot', 'USG {s}heel / plantar fascia', 'CT {s}foot'] },
];

/** lab and special tests suggested by the kind of problem */
const L: { re: RegExp; tests: string[]; fx?: boolean }[] = [
  { re: /gout|uric|hyperuric/i, tests: ['Serum uric acid', 'CBC', 'ESR', 'CRP', 'Serum creatinine'] },
  { re: /rheumat|\bra\b|inflammatory|spondylo.?arthr|ankylosing|psoria|synovitis/i, tests: ['CBC', 'ESR', 'CRP', 'RA factor', 'Anti-CCP', 'HLA-B27', 'Serum uric acid', 'Liver function test', 'Serum creatinine'] },
  { re: /osteopor|osteopen|osteomalac|vitamin d|bone density|low.?trauma|fragility|compression fracture|vcf/i, tests: ['DEXA scan (spine and hip)', 'Serum 25-OH vitamin D', 'Serum calcium', 'Serum phosphorus', 'Serum alkaline phosphatase', 'Serum PTH', 'Serum creatinine', 'TSH'] },
  { re: /infect|septic|osteomyel|abscess|pin site|wound|antibiotic/i, tests: ['CBC', 'ESR', 'CRP', 'Culture and sensitivity (pus / aspirate)', 'Blood sugar fasting and post-prandial', 'HbA1c'] },
  { re: /neuropath|diabet|foot ulcer/i, tests: ['HbA1c', 'Blood sugar fasting and post-prandial', 'Serum vitamin B12', 'CBC', 'Serum creatinine', 'Nerve conduction study'] },
  { re: /radicul|carpal tunnel|cubital|tarsal tunnel|neuropath|nerve|meralgia|sciatica|numb/i, tests: ['HbA1c', 'Serum vitamin B12', 'TSH', 'Nerve conduction study', 'EMG'] },
  { fx: true, re: /fracture|fx\b|union|post.?op|implant|plating|nail/i, tests: ['Serum 25-OH vitamin D', 'Serum calcium', 'CBC', 'ESR', 'CRP'] },
  { re: /arthroplasty|replacement|\btkr\b|\bthr\b|pre.?op/i, tests: ['CBC', 'ESR', 'CRP', 'Blood sugar fasting', 'Serum creatinine', 'HbA1c', 'ECG', 'Chest X-ray PA view'] },
  { re: /pain|arthritis|oa\b|osteoarth|tendin|myalg|myofascial|fibromyalg/i, tests: ['CBC', 'ESR', 'CRP', 'Serum uric acid', 'Serum 25-OH vitamin D', 'Serum calcium'] },
];

/** common tests that are always searchable */
export const COMMON_TESTS = [
  'CBC', 'ESR', 'CRP', 'RA factor', 'Anti-CCP', 'HLA-B27', 'ANA', 'Serum uric acid', 'Serum calcium', 'Serum phosphorus', 'Serum alkaline phosphatase', 'Serum 25-OH vitamin D', 'Serum vitamin B12', 'Serum PTH', 'Serum creatinine', 'Liver function test', 'Kidney function test', 'Lipid profile', 'TSH', 'HbA1c',
  'Blood sugar fasting', 'Blood sugar fasting and post-prandial', 'PT / INR', 'Blood group', 'HIV, HBsAg, HCV', 'Urine routine', 'ECG', 'Chest X-ray PA view', 'Culture and sensitivity (pus / aspirate)', 'Synovial fluid analysis', 'Biopsy',
  'DEXA scan (spine and hip)', 'Bone scan', 'PET-CT', 'Nerve conduction study', 'EMG', 'Doppler of the lower limb', 'X-ray full-length both lower limbs standing (scanogram)', 'X-ray whole spine standing AP and lateral', 'CT scan', 'MRI',
];

const BODY_REGION: Record<string, string> = {};
R.forEach((r) => r.parts.forEach((p) => { BODY_REGION[p] = r.key; }));

export function sideWord(side?: string) { return side === 'Left' ? 'left ' : side === 'Right' ? 'right ' : side === 'Bilateral' ? 'bilateral ' : ''; }
const fill = (t: string, side?: string) => t.replace('{s}', sideWord(side)).replace('bilateral knee standing', 'both knees standing').replace(/\s+/g, ' ').trim();
/** loose key so "X-ray right knee AP/lateral" and "X-ray knee AP and lateral" count as the same test */
export const testKey = (t: string) => {
  const k = t.toLowerCase().replace(/\b(right|left|bilateral|both|rt|lt|standing|weight[- ]bearing|oblique|and|views?)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  if (!/nerve conduction|\bncs\b|\bemg\b/.test(k)) return k;
  return 'ncs emg' + (/median/.test(k) ? ' median' : /ulnar/.test(k) ? ' ulnar' : /upper|radial|arm|hand/.test(k) ? ' upper' : /lower|leg|sciatic|tibial|peroneal|lumbar/.test(k) ? ' lower' : ''); // "NCS", "EMG" and "NCS / EMG of the lower limb" are one request
};

export function splitTests(v: string): string[] { return (v || '').split(/\s*[;\n]\s*/).map((x) => x.trim()).filter(Boolean); }
export const joinTests = (a: string[]) => a.join('; ');

/** Tests that fit this problem, best first. Uses diagnosis, complaint, body-site and side. */
export function suggestTests(c: Pick<Clinical, 'diagnosis' | 'complaint' | 'side' | 'bodyParts' | 'injury'>): string[] {
  const text = `${c.diagnosis || ''} ${c.complaint || ''}`;
  if (!text.trim() && !(c.bodyParts || []).length) return [];
  const hit = new Map<string, number>(); // region -> score
  for (const r of R) {
    if (!r.re.test(text)) continue;
    // a match in the diagnosis counts more than one in the complaint
    hit.set(r.key, (r.re.test(c.diagnosis || '') ? 3 : 1));
  }
  for (const b of c.bodyParts || []) {
    const base = b.replace(/-(L|R)$/, '').toLowerCase();
    const k = BODY_REGION[base] || (base.includes('knee') ? 'knee' : '');
    if (k) hit.set(k, (hit.get(k) || 0) + 2);
  }
  const regions = [...hit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => R.find((r) => r.key === k)!);
  // injuries and fractures: plain films first, then CT, then MRI. Wear-and-tear and soft tissue: X-ray, USG, MRI, CT.
  const trauma = c.injury === 'trauma' || /fractur|dislocat|injur|rupture|tear|post.?op|sprain|ligament|\bacl\b|\bpcl\b|plating|nailing|\bcast\b|follow.?up of/i.test(text);
  // a fracture already treated (post-op / in cast): films only
  const fxFollow = /fractur/i.test(text) && /post.?op|plating|nailing|\bcast\b|follow.?up|union/i.test(text);
  // a fresh fracture: films (and CT / MRI only where the joint, spine or pelvis is involved). No USG, no thigh MRI.
  const fxAcute = /fractur/i.test(text) && !fxFollow && !/stress|pathologic|occult|suspect/i.test(text);
  const fxDeep = /plateau|scaphoid|acetabul|spine|vertebr|pilon|talus|osteochondr|physeal|epiphys|pelvi|intra.?articular|comminuted/i.test(text);
  const rank = (t: string) => { const x = t.toLowerCase();
    if (/^x-ray|^chest x-ray/.test(x)) return 0;
    if (/^ct\b/.test(x)) return trauma ? 1 : 3;
    if (/^mri/.test(x)) return 2;
    if (/^usg/.test(x)) return trauma ? 3 : 1;
    return 4; };
  const nerveText = /nerve|neuro|numb|tingl|carpal|cubital|tarsal tunnel|radicul|sciatica|meralgia|palsy|weakness|drop|paraesth|claudic|myelopath|stenosis|pivd|disc/i.test(text);
  const ctText = /fractur|dislocat|plateau|non.?union|malunion|deformity|pre.?op|arthroplasty|\btkr\b|\bthr\b|tumou?r|avn|osteonecrosis|acetabul|pelvi|listhesis|vertebr|scaphoid|post.?op|calcane|lisfranc|pilon|talus/i.test(text);
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => { const f = fill(t, c.side); const k = testKey(f); if (!seen.has(k)) { seen.add(k); out.push(f); } };
  for (const r of regions) {
    // "standing" and plain versions of one film are the same test: keep the one that suits the problem
    const keep = r.tests.filter((t) => { const std = /standing|weight[- ]bearing/i.test(t); const twin = r.tests.some((o) => o !== t && testKey(o) === testKey(t) && /standing|weight[- ]bearing/i.test(o) !== std); if (trauma) return !std; return !twin || std; });
    keep.filter((t) => (nerveText || !/^(nerve conduction|emg)/i.test(t)) && (ctText || !/^ct\b/i.test(t)) && !(fxFollow && /^(mri|usg)/i.test(t)) && !(fxAcute && (/^usg/i.test(t) || (!fxDeep && /^(mri|ct)\b/i.test(t))))).map((t, i) => ({ t, i })).sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i).forEach((x) => push(x.t));
  }
  let labs = L.filter((l) => l.re.test(text) && !(fxAcute && l.fx));
  if (labs.length > 1) labs = labs.filter((l) => l !== L[L.length - 1]); // the catch-all 'pain / arthritis' set only when nothing specific matched
  labs.slice(0, 2).forEach((l) => l.tests.forEach(push));
  return out;
}

/** every test the search box can offer, with side filled in */
export function allTests(side?: string): string[] {
  const s = new Set<string>(); const out: string[] = [];
  for (const r of R) for (const t of r.tests) { const f = fill(t, side); if (!s.has(f)) { s.add(f); out.push(f); } }
  for (const t of COMMON_TESTS) if (!s.has(t)) { s.add(t); out.push(t); }
  return out;
}

/* ------------------------------------------------------------------ grouping, sets and template plans */

export type TestKind = 'imaging' | 'blood' | 'other';
export const KIND_LABEL: Record<TestKind, string> = { imaging: 'Imaging', blood: 'Blood', other: 'Other' };
/** imaging = films and scans; other = ECG, nerve tests, urine, cultures, fluid and tissue tests; everything else is a blood test */
export function testKind(t: string): TestKind {
  const x = t.trim().toLowerCase();
  if (/^(x-ray|chest x-ray|mri|ct\b|ct scan|usg|doppler|dexa|bone scan|pet)/.test(x)) return 'imaging';
  if (/^(ecg|echo|nerve conduction|emg|biopsy|culture|synovial|urine|pft|arthrocentesis)/.test(x)) return 'other';
  return 'blood';
}

/** a bundle that is added with one tap */
export interface TestSet { key: string; name: string; tests: string[]; when: RegExp }
const PREOP = ['CBC', 'Blood group', 'Serum creatinine', 'Blood sugar fasting', 'HIV, HBsAg, HCV', 'PT / INR', 'Urine routine', 'ECG', 'Chest X-ray PA view'];
export const SETS: TestSet[] = [
  { key: 'preop', name: 'Pre-op work-up', tests: PREOP, when: /fractur|dislocat|arthroplasty|replacement|\btkr\b|\bthr\b|\bnof\b|neck of femur|pre.?op|reconstruction|arthroscop|non.?union|fixation|\borif\b|discectomy|laminectomy|fusion|release|repair/i },
  { key: 'preop-joint', name: 'Joint replacement pre-op', tests: [...PREOP, 'ESR', 'CRP', 'HbA1c', 'Serum 25-OH vitamin D'], when: /arthroplasty|replacement|\btkr\b|\bthr\b|end.?stage|advanced (oa|osteoarth)/i },
  { key: 'inflam', name: 'Inflammatory arthritis', tests: ['CBC', 'ESR', 'CRP', 'RA factor', 'Anti-CCP', 'HLA-B27', 'Serum uric acid'], when: /rheumat|\bra\b|inflammatory|spondyl|ankylosing|psoria|synovitis|polyarthr/i },
  { key: 'gout', name: 'Gout', tests: ['Serum uric acid', 'Serum creatinine', 'CBC', 'ESR', 'CRP'], when: /gout|uric/i },
  { key: 'infection', name: 'Infection work-up', tests: ['CBC', 'ESR', 'CRP', 'Culture and sensitivity (pus / aspirate)', 'Blood sugar fasting and post-prandial', 'HbA1c'], when: /infect|septic|osteomyel|abscess|pin site|discitis/i },
  { key: 'bone', name: 'Bone health', tests: ['DEXA scan (spine and hip)', 'Serum 25-OH vitamin D', 'Serum calcium', 'Serum phosphorus', 'Serum alkaline phosphatase', 'Serum PTH', 'Serum creatinine'], when: /osteopor|osteopen|osteomalac|vitamin d|fragility|compression fracture|\bvcf\b|low.?trauma/i },
  { key: 'neuro', name: 'Nerve / neuropathy', tests: ['HbA1c', 'Serum vitamin B12', 'TSH', 'Nerve conduction study'], when: /neuropath|radicul|carpal tunnel|cubital|tarsal tunnel|meralgia|numb|nerve|sciatica/i },
];
export const relevantSets = (c: Pick<Clinical, 'diagnosis' | 'complaint'>) => { const t = `${c.diagnosis || ''} ${c.complaint || ''}`; return SETS.filter((s) => s.when.test(t)); };

/** What an orthopaedic surgeon usually orders for the common templates. first = order now, labs = blood work, more = only if the picture needs it. */
export interface TestPlan { first: string[]; labs?: string[]; more?: string[]; note?: string }
export const TEMPLATE_TESTS: Record<string, TestPlan> = {
  'knee-oa': { first: ['X-ray {s}knee standing AP and lateral', 'X-ray {s}knee skyline view'], labs: ['CBC', 'ESR', 'CRP', 'Serum uric acid', 'Serum 25-OH vitamin D'], more: ['MRI {s}knee', 'X-ray full-length both lower limbs standing (scanogram)'], note: 'MRI only if a meniscal or ligament injury is suspected.' },
  'hip-oa': { first: ['X-ray pelvis with both hips AP', 'X-ray {s}hip lateral view'], labs: ['CBC', 'ESR', 'CRP', 'Serum 25-OH vitamin D'], more: ['MRI {s}hip'] },
  'avn-hip': { first: ['X-ray pelvis with both hips AP', 'X-ray {s}hip lateral view', 'MRI both hips'], labs: ['CBC', 'Liver function test', 'Serum uric acid'] },
  lbp: { first: ['X-ray LS spine AP and lateral'], labs: ['CBC', 'ESR', 'CRP', 'Serum 25-OH vitamin D', 'Serum calcium'], more: ['MRI lumbosacral spine'], note: 'MRI if there are red flags, a neurological deficit, or no relief after 6 weeks.' },
  pivd: { first: ['X-ray LS spine AP and lateral', 'MRI lumbosacral spine'], labs: ['CBC', 'ESR', 'Serum 25-OH vitamin D'], more: ['Nerve conduction study', 'X-ray LS spine flexion and extension views'], note: 'NCS / EMG if the level or nerve is unclear. Flexion-extension films if instability is suspected.' },
  lcs: { first: ['X-ray LS spine AP and lateral', 'MRI lumbosacral spine'], labs: ['CBC', 'HbA1c', 'Serum 25-OH vitamin D'], more: ['X-ray LS spine flexion and extension views', 'CT lumbosacral spine'] },
  spondylolisthesis: { first: ['X-ray LS spine AP and lateral', 'X-ray LS spine flexion and extension views'], more: ['MRI lumbosacral spine', 'CT lumbosacral spine'] },
  cervical: { first: ['X-ray cervical spine AP and lateral'], labs: ['CBC', 'ESR', 'Serum 25-OH vitamin D'], more: ['X-ray cervical spine flexion and extension views', 'MRI cervical spine'] },
  'cerv-radic': { first: ['X-ray cervical spine AP and lateral', 'MRI cervical spine'], labs: ['HbA1c', 'Serum vitamin B12', 'Serum 25-OH vitamin D'], more: ['Nerve conduction study / EMG of the upper limb'] },
  'frozen-shoulder': { first: ['X-ray {s}shoulder AP and axillary view'], labs: ['HbA1c', 'TSH', 'Blood sugar fasting'], more: ['USG {s}shoulder', 'MRI {s}shoulder'] },
  'rotator-cuff': { first: ['X-ray {s}shoulder AP, Grashey and scapular Y views', 'MRI {s}shoulder'], more: ['USG {s}shoulder'] },
  'shoulder-pain': { first: ['X-ray {s}shoulder AP and axillary view'], more: ['USG {s}shoulder', 'MRI {s}shoulder'] },
  'tennis-elbow': { first: ['X-ray {s}elbow AP and lateral'], more: ['USG {s}elbow', 'MRI {s}elbow'] },
  'golfers-elbow': { first: ['X-ray {s}elbow AP and lateral'], more: ['USG {s}elbow', 'MRI {s}elbow'] },
  'carpal-tunnel': { first: ['Nerve conduction study of the median nerve'], labs: ['HbA1c', 'TSH', 'Serum vitamin B12'], more: ['USG {s}wrist', 'X-ray {s}wrist AP and lateral'] },
  'acl-injury': { first: ['X-ray {s}knee AP and lateral', 'MRI {s}knee'] },
  meniscus: { first: ['X-ray {s}knee standing AP and lateral', 'MRI {s}knee'] },
  pcl: { first: ['X-ray {s}knee AP and lateral', 'MRI {s}knee'] },
  'knee-lig': { first: ['X-ray {s}knee AP and lateral', 'MRI {s}knee'] },
  'tibial-plateau': { first: ['X-ray {s}knee AP and lateral', 'CT {s}knee'], more: ['MRI {s}knee'] },
  gout: { first: ['Serum uric acid', 'CBC', 'ESR', 'Serum creatinine'], labs: ['CRP', 'Liver function test'], more: ['Synovial fluid analysis'] },
  'ra-flare': { first: ['CBC', 'ESR', 'CRP', 'RA factor', 'Anti-CCP'], labs: ['Liver function test', 'Serum creatinine', 'HIV, HBsAg, HCV'], more: ['X-ray {s}hand AP, oblique and lateral', 'USG {s}hand'], note: 'Liver, kidney and hepatitis screen before a DMARD.' },
  ankylosing: { first: ['X-ray pelvis AP', 'HLA-B27', 'ESR', 'CRP'], more: ['MRI sacroiliac joints', 'X-ray LS spine AP and lateral'] },
  osteoporosis: { first: ['DEXA scan (spine and hip)', 'Serum 25-OH vitamin D', 'Serum calcium'], labs: ['Serum phosphorus', 'Serum alkaline phosphatase', 'Serum PTH', 'Serum creatinine', 'CBC'], more: ['X-ray whole spine standing AP and lateral'] },
  'osteopenia-vitd': { first: ['Serum 25-OH vitamin D', 'Serum calcium', 'Serum phosphorus', 'Serum alkaline phosphatase'], labs: ['Serum PTH', 'Serum creatinine'], more: ['DEXA scan (spine and hip)'] },
  osteomalacia: { first: ['Serum 25-OH vitamin D', 'Serum calcium', 'Serum phosphorus', 'Serum alkaline phosphatase'], labs: ['Serum PTH', 'Serum creatinine'], more: ['DEXA scan (spine and hip)'] },
  vcf: { first: ['X-ray thoracic spine AP and lateral', 'X-ray LS spine AP and lateral'], labs: ['DEXA scan (spine and hip)', 'Serum 25-OH vitamin D', 'Serum calcium'], more: ['MRI thoracic spine', 'MRI lumbosacral spine'] },
  nof: { first: ['X-ray pelvis with both hips AP', 'X-ray {s}hip lateral view'], note: 'Use the Pre-op work-up set if surgery is planned.' },
  'it-fracture': { first: ['X-ray pelvis with both hips AP', 'X-ray {s}hip lateral view'], note: 'Use the Pre-op work-up set if surgery is planned.' },
  'tibia-fx': { first: ['X-ray {s}leg with knee and ankle AP and lateral'] },
  'ankle-fx': { first: ['X-ray {s}ankle AP, lateral and mortise views'], more: ['CT {s}ankle'] },
  'distal-radius': { first: ['X-ray {s}wrist AP and lateral'], more: ['CT {s}wrist'] },
  scaphoid: { first: ['X-ray {s}wrist with scaphoid views'], more: ['MRI {s}wrist', 'CT {s}wrist'], note: 'A normal first film does not rule out a scaphoid fracture. Repeat the film or get an MRI.' },
  'septic-arthritis': { first: ['CBC', 'ESR', 'CRP', 'Synovial fluid analysis', 'Culture and sensitivity (pus / aspirate)'], labs: ['Blood sugar fasting and post-prandial', 'HbA1c'] },
  osteomyelitis: { first: ['CBC', 'ESR', 'CRP', 'Culture and sensitivity (pus / aspirate)'], labs: ['Blood sugar fasting and post-prandial', 'HbA1c'] },
  'plantar-fasciitis': { first: ['X-ray {s}heel lateral and axial view'], more: ['USG {s}heel / plantar fascia'] },
  'ankle-sprain': { first: ['X-ray {s}ankle AP, lateral and mortise views'], more: ['MRI {s}ankle', 'USG {s}ankle'], note: 'X-ray only if the Ottawa ankle rules are positive.' },
  'neuropathy-foot': { first: ['HbA1c', 'Serum vitamin B12', 'Nerve conduction study'], labs: ['TSH', 'Serum creatinine', 'CBC'] },
  ddh: { first: ['USG {s}hip', 'X-ray pelvis AP'] },
  perthes: { first: ['X-ray pelvis with both hips AP', 'X-ray {s}hip lateral view'], more: ['MRI both hips'] },
};

/** the template whose diagnosis (or name) best matches what has been typed; the longest match wins */
export function matchTemplate<T extends { name: string; clinical: { diagnosis: string } }>(diagnosis: string, list: T[]): T | undefined {
  const d = norm(diagnosis || ''); if (d.length < 4) return undefined;
  let best: T | undefined; let top = 0;
  for (const t of list) {
    const cands = [norm(t.clinical.diagnosis || ''), norm(t.name || '')].filter((x) => x.length >= 4);
    for (const c of cands) {
      const sc = d === c ? 1000 + c.length : d.includes(c) ? c.length : c.includes(d) && d.length >= 6 ? d.length - 1 : 0;
      if (sc > top) { top = sc; best = t; }
    }
  }
  return best;
}

export interface PlanOut { first: string[]; labs: string[]; more: string[]; note?: string; fromYours: boolean }
/** what to suggest for a matched template: the curated plan for built-in templates, otherwise whatever the doctor saved in their own template */
export function planFor(tpl: { sourceKey?: string; clinical: { investigations?: string } } | undefined, side?: string): PlanOut | undefined {
  if (!tpl) return undefined;
  const f = (a?: string[]) => (a || []).map((t) => fill(t, side));
  const cur = tpl.sourceKey ? TEMPLATE_TESTS[tpl.sourceKey] : undefined;
  if (cur) return { first: f(cur.first), labs: f(cur.labs), more: f(cur.more), note: cur.note, fromYours: false };
  const own = splitTests(tpl.clinical.investigations || '');
  return own.length ? { first: own, labs: [], more: [], fromYours: true } : undefined;
}

/** short, useful reminders about the tests chosen */
export function testNotes(tests: string[], patient?: { sex?: string; age?: string; ageUnit?: string }): string[] {
  const out: string[] = []; const all = tests.join(' | ').toLowerCase();
  if (/\bmri\b/.test(all)) out.push('MRI: ask about a pacemaker, cochlear implant or metal fragments.');
  if (/contrast/.test(all)) out.push('Contrast scan: check serum creatinine and any contrast allergy.');
  const a = patient?.age ? (patient.ageUnit === 'M' ? parseFloat(patient.age) / 12 : parseFloat(patient.age)) : NaN;
  const woman = patient?.sex === 'Female' && (isNaN(a) || (a >= 12 && a <= 50));
  if (woman && /(^|\| )ct\b|x-ray (ls|lumbar|thoracic|pelvis|[a-z ]*hip|abdom)/.test(all)) out.push('Woman of child-bearing age: ask about pregnancy before a CT or an X-ray of the spine / pelvis.');
  if (/fasting/.test(all)) out.push('Fasting blood sugar needs 8 hours without food.');
  return out.slice(0, 3);
}
