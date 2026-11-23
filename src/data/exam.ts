import type { Clinical } from '../lib/types';
import { regionKeys } from './tests';
import { norm } from '../lib/util';

/** One thing to look for. The answer is a tap on one of `opts`; `normal` is the healthy answer (everything else counts as a finding).
 *  `note` adds a small box for a number or a few words once the answer needs it: "SLRT: Positive at 60°", "ROM: Restricted - flexion 0-90°". */
export interface ExamItem { id: string; label: string; aliases?: string[]; opts: string[]; normal: string; note?: { when: string[]; ph: string; unit?: string; sep: string; number?: boolean }; flag?: boolean }
export interface ExamGroup { key: string; title: string; items: ExamItem[] }

const PN = ['Negative', 'Positive'];
const PA = ['Absent', 'Present'];
const pn = (label: string, aliases: string[] = []): ExamItem => ({ id: norm(label), label, aliases, opts: PN, normal: 'Negative' });
const pnv = (label: string, aliases: string[] = [], unit = '°', ph = 'angle'): ExamItem => ({ id: norm(label), label, aliases, opts: PN, normal: 'Negative', note: { when: ['Positive'], ph, unit, sep: ' at ', number: true } });
const pa = (label: string, aliases: string[] = []): ExamItem => ({ id: norm(label), label, aliases, opts: PA, normal: 'Absent' });
const flag = (label: string, aliases: string[] = []): ExamItem => ({ ...pa(label, aliases), flag: true });
const grade = (label: string, aliases: string[] = []): ExamItem => ({ id: norm(label), label, aliases, opts: ['5/5', '4/5', '3/5', '2/5', '1/5', '0/5'], normal: '5/5' });
const refl = (label: string, aliases: string[] = []): ExamItem => ({ id: norm(label), label, aliases, opts: ['Normal', 'Brisk', 'Diminished', 'Absent'], normal: 'Normal' });
const sens = (label: string, aliases: string[] = []): ExamItem => ({ id: norm(label), label, aliases, opts: ['Normal', 'Reduced', 'Absent'], normal: 'Normal', note: { when: ['Reduced', 'Absent'], ph: 'where / which dermatome', sep: ' - ' } });
const rom = (label: string, aliases: string[] = []): ExamItem => ({ id: norm(label), label, aliases, opts: ['Full', 'Painful', 'Restricted'], normal: 'Full', note: { when: ['Painful', 'Restricted'], ph: 'e.g. flexion 0-90°', sep: ' - ' } });
const ch = (label: string, opts: string[], normal: string, aliases: string[] = [], note?: ExamItem['note']): ExamItem => ({ id: norm(label), label, aliases, opts, normal, note });
const sev = (label: string, aliases: string[] = []): ExamItem => ch(label, ['None', 'Mild', 'Moderate', 'Marked'], 'None', aliases);
const tender = (label: string, ph = 'site'): ExamItem => ch(label, ['Absent', 'Present'], 'Absent', [], { when: ['Present'], ph, sep: ' - ' });

const GAIT = ch('Gait', ['Normal', 'Antalgic', 'Trendelenburg', 'Stiff', 'Unable to walk'], 'Normal');
const LL = ch('Limb length', ['Equal', 'Short'], 'Equal', ['leg length', 'limb length discrepancy', 'lld'], { when: ['Short'], ph: 'cm', unit: ' cm', sep: ' - ', number: true });

export const EXAM: Record<string, ExamGroup> = {
  shoulder: { key: 'shoulder', title: 'Shoulder', items: [
    tender('Tenderness', 'site'), sev('Wasting', ['muscle wasting']), pn('Cervical spine screen', ['cervical spine']), rom('Active ROM', ['active and passive rom', 'rom']), rom('Passive ROM'), pa('Painful arc', ['painful arc']),
    pn('Neer test', ['neer']), pn('Hawkins-Kennedy test', ['hawkins', 'hawkins kennedy', 'neer hawkins']), pn('Jobe (empty can) test', ['jobe', 'empty can']), pn('Drop arm test', ['drop arm']), pn('External rotation lag', ['er lag']),
    pn('Belly press test', ['belly press']), pn("Speed's test", ['speed', 'speeds']), pn("O'Brien test", ['obrien', 'o brien']), pn('Apprehension test', ['apprehension']), pn('Sulcus sign', ['sulcus']), grade('Cuff power', ['cuff strength', 'power']),
  ] },
  elbow: { key: 'elbow', title: 'Elbow', items: [
    sev('Swelling'), tender('Tenderness', 'lateral / medial epicondyle'), grade('Grip strength', ['grip strength']), rom('ROM', ['flexion extension']), pn("Cozen's test", ['cozen', 'cozens', 'resisted wrist extension']), pn("Mill's test", ['mill', 'mills']), pn("Golfer's elbow test", ['golfers elbow', 'resisted wrist flexion']),
    pn('Tinel sign at cubital tunnel', ['tinel cubital', 'tinel']), pn('Elbow flexion test', ['cubital tunnel']), pn('Valgus stress test', ['valgus stress']), pn('Varus stress test', ['varus stress']), sens('Ulnar nerve sensation', ['ulnar sensation']), grade('Grip power', ['grip']),
  ] },
  wrist: { key: 'wrist', title: 'Wrist / forearm', items: [
    sev('Swelling'), ch('Deformity', ['None', 'Dinner-fork', 'Other'], 'None', ['deformity'], { when: ['Other'], ph: 'describe', sep: ' - ' }), tender('Tenderness', 'snuffbox / radial styloid / ulnar fovea'), rom('ROM', ['wrist rom']),
    pn('Phalen test', ['phalen']), pn('Tinel sign (median nerve)', ['tinel', 'tinel median']), pn('Finkelstein test', ['finkelstein']), pa('Thenar wasting', ['thenar wasting']), grade('APB power', ['apb']), sens('Sensation (median nerve)', ['median nerve sensation', 'median sensation']),
    pn('Scaphoid compression test', ['scaphoid']), pn('Watson test', ['watson']), pn('Froment sign', ['froment']), grade('Grip power', ['grip']),
  ] },
  hand: { key: 'hand', title: 'Hand / fingers', items: [
    sev('Swelling'), tender('Tenderness', 'site'), pa('Triggering / clicking', ['trigger', 'triggering']), pa('Nodule / mass', ['nodule']), pa('Rotational deformity', ['rotation', 'scissoring']), rom('Finger ROM', ['rom']),
    ch('Tendon function', ['Intact', 'Deficit'], 'Intact', ['fdp fds', 'tendon'], { when: ['Deficit'], ph: 'which finger / tendon', sep: ' - ' }), sens('Digital sensation', ['sensation']), pa('Flexion contracture', ['contracture']), grade('Grip power', ['grip']),
  ] },
  cervical: { key: 'cervical', title: 'Neck', items: [
    tender('Tenderness', 'paraspinal / spinous process'), pa('Muscle spasm', ['spasm']), rom('Neck ROM', ['rom']), pn("Spurling's test", ['spurling', 'spurlings']), pn('Distraction test', ['distraction']), pn("Lhermitte's sign", ['lhermitte']),
    pn("Hoffmann's sign", ['hoffmann', 'hoffmanns']), grade('Upper limb power', ['power']), refl('Biceps / triceps reflex', ['reflexes', 'reflex']), sens('Sensation (dermatomal)', ['sensation', 'dermatome']), ch('Tandem walk', ['Normal', 'Unsteady'], 'Normal', ['tandem']),
  ] },
  lumbar: { key: 'lumbar', title: 'Back', items: [
    GAIT, ch('Posture', ['Normal', 'Loss of lordosis', 'Antalgic list', 'Kyphosis', 'Scoliosis'], 'Normal', ['posture']), pa('Paraspinal spasm', ['paraspinal spasm tenderness', 'spasm']), tender('Spinal tenderness', 'level'), rom('Lumbar ROM', ['rom']),
    pnv('SLRT', ['slr', 'slrt angle', 'straight leg raise', 'straight leg raising']), pn('Crossed SLRT', ['crossed slr', 'crossed straight leg raise']), pn('Femoral stretch test', ['femoral stretch']), pn('SI joint tests', ['si joint', 'faber', 'patrick']),
    grade('EHL power', ['ehl', 'power ehl']), grade('Ankle dorsiflexion power', ['dorsiflexion', 'ankle dorsiflexion']), grade('Plantar flexion power', ['plantar flexion']), refl('Knee jerk', ['knee reflex']), refl('Ankle jerk', ['ankle reflex']),
    sens('Sensation (dermatomal)', ['sensation', 'dermatome', 'sensation dermatome']),
  ] },
  hip: { key: 'hip', title: 'Hip / pelvis', items: [
    GAIT, pn('Trendelenburg test', ['trendelenburg', 'trendelenburg sign', 'abductor function']), tender('Groin / trochanteric tenderness', 'site'), rom('Hip ROM', ['rom']), pn('FABER test', ['faber', 'patrick']), pn('FADIR (impingement) test', ['fadir', 'impingement']), pnv('Thomas test (fixed flexion)', ['thomas', 'thomas test'], '°', 'degrees'),
    pn('Log roll test', ['log roll']), pn('Stinchfield test', ['stinchfield']), pn('Piriformis test', ['piriformis']), LL, sev('Thigh wasting', ['wasting']),
  ] },
  knee: { key: 'knee', title: 'Knee', items: [
    GAIT, ch('Deformity (varus/valgus)', ['None', 'Varus', 'Valgus', 'Flexion deformity'], 'None', ['deformity varus valgus', 'deformity', 'alignment']), ch('Effusion', ['Absent', 'Mild', 'Moderate', 'Tense'], 'Absent'), ch('Joint line tenderness', ['Absent', 'Medial', 'Lateral', 'Both'], 'Absent'),
    pa('Crepitus', ['crepitus']), rom('ROM', ['knee rom']), ch('Extensor lag', ['None', 'Present'], 'None', [], { when: ['Present'], ph: 'degrees', unit: '°', sep: ' - ', number: true }),
    ch('Lachman test', ['Negative', 'Positive - grade 1', 'Positive - grade 2', 'Positive - grade 3'], 'Negative', ['lachman']), pn('Anterior drawer test', ['anterior drawer', 'lachman posterior drawer']), pn('Posterior drawer test', ['posterior drawer']), pn('Pivot shift test', ['pivot shift']),
    pn('McMurray test', ['mcmurray', 'meniscal signs', 'meniscal']), pn('Apley grind test', ['apley']), ch('Valgus stress (MCL)', ['Stable', 'Lax - grade 1', 'Lax - grade 2', 'Lax - grade 3'], 'Stable', ['collateral ligaments', 'valgus stress', 'ligament stability']), ch('Varus stress (LCL)', ['Stable', 'Lax - grade 1', 'Lax - grade 2', 'Lax - grade 3'], 'Stable', ['varus stress']),
    pn('Patellar grind test', ['patellar grind', 'patella grind']), pn('Patellar apprehension test', ['patellar apprehension']), sev('Quadriceps wasting', ['quadriceps wasting', 'quads wasting']),
  ] },
  ankle: { key: 'ankle', title: 'Ankle / leg', items: [
    GAIT, sev('Swelling'), tender('Tenderness', 'ATFL / malleolus / Achilles'), rom('ROM', ['ankle rom']), pn('Anterior drawer test (ankle)', ['anterior drawer']), pn('Talar tilt test', ['talar tilt']), pn('Squeeze test (syndesmosis)', ['squeeze']),
    pn('Thompson test', ['thompson']), pa('Achilles gap', ['achilles gap']), pn('Ottawa ankle rules positive', ['ottawa']), pa('Calf tenderness', ['calf tenderness']), pn('Single heel raise', ['heel raise']),
  ] },
  foot: { key: 'foot', title: 'Foot / heel', items: [
    GAIT, ch('Arch', ['Normal', 'Flat', 'High'], 'Normal', ['arch']), tender('Heel tenderness', 'plantar / posterior'), pn('Windlass test', ['windlass']), pn("Mulder's click", ['mulder']), ch('Hallux', ['Normal', 'Valgus', 'Rigidus'], 'Normal', ['hallux']), sev('Swelling'),
    tender('Metatarsal tenderness', 'which'), ch('Hindfoot alignment', ['Neutral', 'Valgus', 'Varus'], 'Neutral', ['hindfoot']), rom('Ankle / subtalar ROM', ['rom']),
  ] },
  general: { key: 'general', title: 'General', items: [
    GAIT, sev('Swelling'), tender('Tenderness', 'site'), rom('ROM', ['range of motion']), grade('Power', ['muscle power']), sens('Sensation'),
  ] },
  trauma: { key: 'trauma', title: 'Injury', items: [
    sev('Swelling'), ch('Deformity', ['None', 'Present'], 'None', [], { when: ['Present'], ph: 'describe', sep: ' - ' }), ch('Skin / wound', ['Intact', 'Abrasion', 'Open wound'], 'Intact', ['skin wound', 'skin', 'wound', 'skin condition', 'skin tenting']), tender('Bony tenderness', 'site'),
    ch('Distal pulses', ['Palpable', 'Weak', 'Absent'], 'Palpable', ['pulses', 'distal pulse']), ch('Capillary refill', ['Normal', 'Delayed'], 'Normal', ['cap refill', 'capillary refill and sensation']), sens('Distal sensation', ['sensation']), ch('Distal movements', ['Normal', 'Weak', 'Absent'], 'Normal', ['finger movements', 'toe movements', 'distal motor']),
    ch('Cast / splint', ['Intact', 'Loose', 'Tight', 'Soiled'], 'Intact', ['cast splint status', 'cast status', 'cast fit', 'cast splint condition', 'cast brace fit', 'skin around the cast']),
    ch('Distal neurovascular status', ['Intact', 'Compromised'], 'Intact', ['neurovascular status', 'distal neurovascular', 'neurovascular status of upper limb'], { when: ['Compromised'], ph: 'what is missing', sep: ' - ' }), sev('Bruising', ['swelling bruising', 'bruising']), ch('Weight-bearing', ['Full', 'Partial', 'Unable'], 'Full', ['weight bearing status', 'weight bearing']), pa('Compartment signs', ['compartment signs']),
  ] },
  neuro: { key: 'neuro', title: 'Neuro', items: [
    grade('Power', ['muscle power']), refl('Reflexes', ['reflex']), sens('Sensation', ['sensation']), pn('Tinel sign', ['tinel']), ch('Tone', ['Normal', 'Increased', 'Reduced'], 'Normal', ['tone']), ch('Coordination', ['Normal', 'Abnormal'], 'Normal', ['coordination']),
  ] },
};

/** things that must not be missed. They show as red chips; "Present" raises a note. */
export const RED: Record<string, ExamItem[]> = {
  lumbar: [flag('Bladder / bowel disturbance', ['bladder bowel', 'bladder', 'bowel']), flag('Saddle anaesthesia', ['saddle'])],
  cervical: [flag('Myelopathy signs (clumsy hands, gait)', ['myelopathy'])],
  trauma: [flag('Compartment syndrome signs (pain on passive stretch, tense swelling)', ['compartment']), flag('Absent distal pulse', ['absent pulse']), flag('Open wound', ['open wound'])],
  joint: [flag('Hot, red, swollen joint with fever', ['septic joint', 'hot swollen joint'])],
  hipchild: [flag('Unable to bear weight with fever', ['septic hip'])],
};

const lineLabel = (l: string) => norm(l.split(':')[0].replace(/\(.*?\)/g, ''));
const ids = (it: ExamItem) => [it.id, norm(it.label.replace(/\(.*?\)/g, '')), ...(it.aliases || []).map(norm)];
const findLine = (lines: string[], it: ExamItem) => {
  const set = new Set(ids(it)); const exact = lines.findIndex((l) => l.includes(':') && set.has(lineLabel(l)));
  if (exact >= 0) return exact;
  // an unfilled template line such as "Cozen test:" or "Neer / Hawkins:" is taken by the chip whose name it contains
  const names = [...set].filter((x) => x.length >= 4);
  return lines.findIndex((l) => { if (!l.includes(':') || l.slice(l.indexOf(':') + 1).trim()) return false; const lb = ' ' + lineLabel(l) + ' '; return names.some((n) => lb.includes(' ' + n + ' ')); });
};

/** what is currently written for this item ('' if nothing or only an unfilled skeleton line) */
export function getVal(text: string, it: ExamItem): string {
  const lines = (text || '').split('\n'); const i = findLine(lines, it); if (i < 0) return '';
  return lines[i].slice(lines[i].indexOf(':') + 1).trim();
}
/** write (or clear, when val is empty) one finding; replaces the matching line, even an unfilled template line, otherwise adds a new one */
export function setVal(text: string, it: ExamItem, val: string): string {
  const lines = (text || '').split('\n'); const i = findLine(lines, it);
  if (!val.trim()) { if (i >= 0) lines.splice(i, 1); return lines.join('\n').replace(/\n+$/, ''); }
  const line = `${it.label}: ${val.trim()}`;
  if (i >= 0) lines[i] = line; else { while (lines.length && !lines[lines.length - 1].trim()) lines.pop(); lines.push(line); }
  return lines.join('\n');
}
/** split "Positive at 60°" into the tapped option and the extra text */
export function parseVal(it: ExamItem, val: string): { opt: string; extra: string } {
  const opt = [...it.opts].sort((x, y) => y.length - x.length).find((o) => val.toLowerCase().startsWith(o.toLowerCase())) || '';
  let extra = (opt ? val.slice(opt.length) : '').trim().replace(/^(at|-|–)\s*/i, '');
  const u = it.note?.unit?.trim(); if (u && extra.endsWith(u)) extra = extra.slice(0, -u.length).trim();
  return { opt, extra };
}
export const buildVal = (it: ExamItem, opt: string, extra: string) => {
  const e = extra.trim();
  return it.note && e && it.note.when.includes(opt) ? `${opt}${it.note.sep}${e}${it.note.number && it.note.unit ? it.note.unit : ''}` : opt;
};
export const isFinding = (it: ExamItem, val: string) => !!val && parseVal(it, val).opt !== it.normal;


/** shown for every problem: how much it limits daily life, plus the checks that apply to any bone or joint complaint */
EXAM.flags = { key: 'flags', title: 'Function', items: [
  ch('ADL affected', ['None', 'Mild', 'Moderate', 'Severe'], 'None', ['activities of daily living', 'adl', 'daily activities', 'function'], { when: ['Mild', 'Moderate', 'Severe'], ph: 'e.g. stairs, dressing, toilet, walking, work', sep: ' - ' }),
  ch('Pain score', ['0', '1-3', '4-6', '7-10'], '0', ['pain score', 'vas', 'pain severity', 'pain']),
  ch('Morning stiffness', ['None', 'Under 30 min', 'Over 30 min'], 'None', ['stiffness']),
  ch('Walking aid', ['None', 'Stick', 'Crutches', 'Walker', 'Wheelchair'], 'None', ['walking aid', 'support']),
  ch('Wound', ['Healthy', 'Discharge', 'Redness', 'Gaping'], 'Healthy', ['wound', 'portal wounds', 'incision', 'wound / pin site', 'skin']),
  ch('Distal neurovascular status', ['Intact', 'Impaired'], 'Intact', ['neurovascular status', 'distal neurovascular status', 'neurovascular'], { when: ['Impaired'], ph: 'what is affected', sep: ' - ' }),
  ch('Lower limb neurology', ['Normal', 'Deficit'], 'Normal', ['neurology of lower limbs', 'neurology power sensation reflexes', 'lower limb neurology', 'neurological examination of lower limbs'], { when: ['Deficit'], ph: 'power / sensation / reflex', sep: ' - ' }),
  ch('Upper limb neurology', ['Normal', 'Deficit'], 'Normal', ['neurology of upper limb', 'upper limb neurology', 'upper limb neurological examination', 'neurology of upper limbs'], { when: ['Deficit'], ph: 'power / sensation / reflex', sep: ' - ' }),
] };
const GENERAL_RED: ExamItem[] = [
  flag('Night pain', ['night pain', 'pain at night']), flag('Rest pain', ['rest pain', 'unrelenting pain']), flag('Fever / chills', ['fever', 'fever chills', 'constitutional']),
  flag('Weight loss / loss of appetite', ['weight loss', 'weight loss appetite']), flag('Past cancer / TB / long steroid use', ['cancer', 'tb', 'steroid', 'immunosuppression', 'past cancer']),
  flag('Bladder / bowel disturbance', ['bladder bowel', 'bladder', 'bowel']), flag('New or progressive weakness / numbness', ['progressive weakness', 'weakness', 'numbness', 'neuro deficit']),
];
export const RED_GENERAL = GENERAL_RED;


/** the history and red-flag lines (ADL, night pain, fever...) print on their own line, and only when something is present. "None / absent" answers print nothing. Everything else stays in Examination. */
export function splitHistory(text: string): { hist: string; exam: string } {
  const items = [...EXAM.flags.items.slice(0, 4), ...GENERAL_RED];
  const exam: string[] = []; const pos: string[] = [];
  for (const l of (text || '').split(/\n/)) {
    const i = l.indexOf(':'); const val = i < 0 ? '' : l.slice(i + 1).trim();
    const it = i < 0 ? undefined : items.find((x) => ids(x).includes(lineLabel(l)));
    if (!it) { exam.push(l); continue; }
    if (!val) continue;
    if (parseVal(it, val).opt === it.normal) continue;
    pos.push(it.opts.length === 2 && it.opts[1] === 'Present' ? it.label : `${it.label}: ${val}`);
  }
  return { hist: pos.join('; '), exam: exam.join('\n') };
}

/** the tabs to show for a problem: its regions, injury and nerve tabs where they fit, and the red flags that matter */
export function examFor(c: Pick<Clinical, 'diagnosis' | 'complaint' | 'bodyParts' | 'injury'>): { groups: ExamGroup[]; red: ExamItem[] } {
  const text = `${c.diagnosis || ''} ${c.complaint || ''}`;
  const MAP: Record<string, string> = { shoulder: 'shoulder', clavicle: 'shoulder', arm: 'shoulder', elbow: 'elbow', forearm: 'wrist', wrist: 'wrist', hand: 'hand', cervical: 'cervical', thoracic: 'lumbar', lumbar: 'lumbar', pelvis: 'hip', hip: 'hip', thigh: 'hip', knee: 'knee', leg: 'ankle', ankle: 'ankle', foot: 'foot' };
  const keys = [...new Set(regionKeys(c).map((k) => MAP[k]).filter(Boolean))];
  const groups: ExamGroup[] = keys.map((k) => EXAM[k]);
  const trauma = c.injury === 'trauma' || /fractur|dislocat|injur|trauma|\bfall\b|accident|\brta\b|\bcast\b|sprain|rupture|crush|compartment|post.?op/i.test(text);
  if (trauma) groups.push(EXAM.trauma);
  const nerve = /nerve|neuro|numb|tingl|radicul|sciatica|palsy|myelopath|weakness|paraesth|drop/i.test(text);
  if (nerve && !keys.some((k) => k === 'lumbar' || k === 'cervical')) groups.push(EXAM.neuro);
  if (!groups.length) groups.push(EXAM.general);
  const red: ExamItem[] = [];
  for (const k of keys) { if (RED[k]) red.push(...RED[k]); }
  if (trauma) red.push(...RED.trauma);
  if (/septic|infect|swollen|hot|fever|effusion/i.test(text) && keys.some((k) => ['knee', 'hip', 'ankle', 'shoulder', 'elbow', 'wrist'].includes(k))) red.push(...RED.joint);
  if (/child|paed|ped\b|limp/i.test(text) && keys.includes('hip')) red.push(...RED.hipchild);
  const seen = new Set<string>();
  red.push(...GENERAL_RED);
  return { groups: [...groups.slice(0, 3), EXAM.flags], red: red.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))) };
}
