import type { Clinical } from '../lib/types';

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
  { key: 'cervical', re: /cervical|neck|whiplash|torticoll|wryneck|cerv/i, parts: ['neck', 'cervical'], tests: [
    'X-ray cervical spine AP and lateral', 'X-ray cervical spine flexion and extension views', 'MRI cervical spine', 'Nerve conduction study / EMG of the upper limb'] },
  { key: 'thoracic', re: /thoracic|dorsal spine|mid.?back|rib\b|ribs|chest wall/i, parts: ['thoracic'], tests: ['X-ray thoracic spine AP and lateral', 'MRI thoracic spine', 'Chest X-ray PA view'] },
  { key: 'lumbar', re: /lumbar|lumbo|back pain|\bLBP\b|disc|sciatica|radicul|canal stenosis|spondyl|coccy|sacro|\bsi joint|spine|vertebr|scolio/i, parts: ['lumbar', 'spine', 'back'], tests: [
    'X-ray LS spine AP and lateral', 'X-ray LS spine flexion and extension views', 'MRI lumbosacral spine', 'Nerve conduction study / EMG of the lower limb', 'CT lumbosacral spine'] },
  { key: 'pelvis', re: /pelvi|acetabul|pubic|\bsi joint|sacroil|coccy/i, parts: ['pelvis'], tests: ['X-ray pelvis AP', 'X-ray pelvis AP, inlet and outlet views', 'CT pelvis'] },
  { key: 'hip', re: /\bhip|femoral neck|femoral head|trochant|groin|avn|perthes|ddh|scfe|thr\b|neck of femur|\bnof\b|impingement|fai\b|piriformis/i, parts: ['hip', 'groin'], tests: [
    'X-ray pelvis with both hips AP', 'X-ray {s}hip lateral view', 'MRI {s}hip', 'MRI both hips', 'USG {s}hip'] },
  { key: 'thigh', re: /femur|femoral shaft|thigh|hamstring|quadric|contusion|meralgia/i, parts: ['thigh'], tests: ['X-ray {s}femur AP and lateral', 'USG {s}thigh', 'MRI {s}thigh'] },
  { key: 'knee', re: /knee|patell|menisc|\bacl\b|\bpcl\b|\bmcl\b|\blcl\b|cruciate|collateral|tibial plateau|distal femur|baker|osgood|chondral|cartilage|genu|\btkr\b|jumper|iliotibial|\bitb\b|cyst/i, parts: ['knee'], tests: [
    'X-ray {s}knee standing AP and lateral', 'X-ray {s}knee AP and lateral', 'X-ray {s}knee skyline view', 'X-ray both knees standing AP', 'MRI {s}knee', 'USG {s}knee', 'X-ray full-length both lower limbs standing (scanogram)'] },
  { key: 'leg', re: /tibia|fibula|shin|leg fracture|calf|compartment/i, parts: ['leg', 'calf', 'shin'], tests: ['X-ray {s}leg with knee and ankle AP and lateral', 'USG {s}calf'] },
  { key: 'ankle', re: /ankle|achilles|malleol|syndesm|peroneal|talus|sprain|tibialis|tarsal tunnel/i, parts: ['ankle'], tests: [
    'X-ray {s}ankle AP, lateral and mortise views', 'X-ray {s}ankle weight-bearing', 'MRI {s}ankle', 'USG {s}ankle', 'CT {s}ankle'] },
  { key: 'foot', re: /foot|heel|plantar|calcane|metatars|toe\b|toes|hallux|bunion|morton|flat ?foot|sever|ctev|clubfoot|lisfranc|navicular/i, parts: ['foot', 'heel', 'toe'], tests: [
    'X-ray {s}foot AP, oblique and lateral', 'X-ray {s}foot weight-bearing AP and lateral', 'X-ray {s}heel lateral and axial view', 'MRI {s}foot', 'USG {s}heel / plantar fascia', 'CT {s}foot'] },
];

/** lab and special tests suggested by the kind of problem */
const L: { re: RegExp; tests: string[] }[] = [
  { re: /gout|uric|hyperuric/i, tests: ['Serum uric acid', 'CBC', 'ESR', 'CRP', 'Serum creatinine'] },
  { re: /rheumat|\bra\b|inflammatory|spondylo.?arthr|ankylosing|psoria|synovitis/i, tests: ['CBC', 'ESR', 'CRP', 'RA factor', 'Anti-CCP', 'HLA-B27', 'Serum uric acid', 'Liver function test', 'Serum creatinine'] },
  { re: /osteopor|osteopen|osteomalac|vitamin d|bone density|low.?trauma|fragility|compression fracture|vcf/i, tests: ['DEXA scan (spine and hip)', 'Serum 25-OH vitamin D', 'Serum calcium', 'Serum phosphorus', 'Serum alkaline phosphatase', 'Serum PTH', 'Serum creatinine', 'TSH'] },
  { re: /infect|septic|osteomyel|abscess|pin site|wound|antibiotic/i, tests: ['CBC', 'ESR', 'CRP', 'Culture and sensitivity (pus / aspirate)', 'Blood sugar fasting and post-prandial', 'HbA1c'] },
  { re: /neuropath|diabet|foot ulcer/i, tests: ['HbA1c', 'Blood sugar fasting and post-prandial', 'Serum vitamin B12', 'CBC', 'Serum creatinine', 'Nerve conduction study'] },
  { re: /radicul|carpal tunnel|cubital|tarsal tunnel|neuropath|nerve|meralgia|sciatica|numb/i, tests: ['HbA1c', 'Serum vitamin B12', 'TSH', 'Nerve conduction study', 'EMG'] },
  { re: /fracture|fx\b|union|post.?op|implant|plating|nail/i, tests: ['Serum 25-OH vitamin D', 'Serum calcium', 'CBC', 'ESR', 'CRP'] },
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
export const testKey = (t: string) => t.toLowerCase().replace(/\b(right|left|bilateral|both|rt|lt)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

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
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => { const f = fill(t, c.side); const k = testKey(f); if (!seen.has(k)) { seen.add(k); out.push(f); } };
  for (const r of regions) r.tests.forEach(push);
  const labs = L.filter((l) => l.re.test(text));
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
