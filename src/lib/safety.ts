import { ageYears } from './age';
import type { IxCustom, Prescription, RxItem } from './types';
import { AGE_RULES, CLASSES, COURSE_RULES, CTX_RULES, NSAID_GI, PREG_ASK, RULES } from '../data/interactions';
import { affirmed } from './negation';
import { ALLERGY_CLASSES, MAX_DAILY_MG } from '../data/rules';
import { timesPerDay } from './dosage';
import { norm } from './util';

export interface Warning { level: 'danger' | 'warn' | 'info'; text: string; itemId?: string; ruleId?: string; /** missing details the prescription needs: cannot be hidden */ req?: boolean }
/** a stable id for one alert, so the doctor can hide it for this prescription */
export const warnKey = (w: Warning) => `${w.ruleId || w.level}|${w.text}`;
export const isHidden = (w: Warning, hidden?: string[]) => !w.req && !!hidden?.includes(warnKey(w));
export interface IxOpts { muted?: string[]; custom?: IxCustom[] }

const baseName = (s: string) => norm(s.replace(/\(.*?\)/g, ''));
const keyOf = (s: string) => baseName(s).split(' ')[0];

/** mg of an ingredient per administered unit (tablet) or per mL, if parsable. */
function mgPer(strength: string, liquid: boolean): number | null {
  const s = strength.toLowerCase().replace(/,/g, '');
  const per = s.match(/([\d.]+)\s*(mg|g)\s*\/\s*([\d.]*)\s*ml/);
  if (per) {
    const mg = parseFloat(per[1]) * (per[2] === 'g' ? 1000 : 1);
    const ml = per[3] ? parseFloat(per[3]) : 1;
    return liquid ? mg / ml : null;
  }
  if (liquid) return null;
  const m = s.match(/([\d.]+)\s*(mg|g)\b/);
  if (!m) return null;
  return parseFloat(m[1]) * (m[2] === 'g' ? 1000 : 1);
}

function dailyDoses(it: RxItem): number | null {
  if (it.doseQty == null) return null;
  if (it.useTaper) {
    if (!it.taper.length) return null;
    return Math.max(...it.taper.map((t) => t.dose * t.timesPerDay));
  }
  if (it.freq === 'SOS') return it.sosMax ? it.sosMax * it.doseQty : null;
  if (it.freq === 'WEEKLY') return null;
  return it.doseQty * timesPerDay(it);
}

export function checkRx(rx: Prescription, opts: IxOpts = {}): Warning[] {
  const w: Warning[] = [];
  const p = rx.patient;
  const items = rx.items;
  const ageYr = ageYears(p.age, p.ageUnit);
  const adult = !isNaN(ageYr) && ageYr >= 18;

  // --- Patient completeness
  if (!p.name.trim()) w.push({ level: 'danger', req: true, text: 'Patient name is missing.' });
  if (!p.age) w.push({ level: 'warn', req: true, text: 'Patient age is missing.' });
  if (!p.sex) w.push({ level: 'warn', req: true, text: 'Patient sex is missing.' });
  if (!p.phone) w.push({ level: 'info', text: 'Phone number not entered (needed for WhatsApp sharing).' });
  if (!p.allergies.trim()) w.push({ level: 'info', text: 'Allergy status not recorded. Tap "No known allergies" if applicable.' });
  if (!isNaN(ageYr) && ageYr < 12 && !p.weight) w.push({ level: 'warn', text: 'Child patient: weight not entered. Verify weight-based dosing.' });
  if (!isNaN(ageYr) && ageYr < 18) w.push({ level: 'info', text: 'Patient is under 18: automatic maximum-dose checks are skipped. Verify paediatric doses yourself.' });
  if (!rx.clinical.diagnosis.trim()) w.push({ level: 'warn', req: true, text: 'Diagnosis is empty.' });

  // --- Allergies
  const allergyText = norm(p.allergies);
  if (allergyText && !/^(no known|nkda|none|nil|no allerg)/.test(allergyText)) {
    const tokens = p.allergies.split(/[,;/\n]|\band\b/i).map((x) => norm(x)).filter((x) => x.length >= 3);
    for (const it of items) {
      const names = [it.generic, it.brand, ...it.ingredients.map((i) => i.name)].filter(Boolean).map(baseName);
      const hits = new Set<string>();
      for (const tk of tokens) {
        for (const cls of ALLERGY_CLASSES) {
          const clsHit = cls.keys.some((k) => tk === k || tk.split(' ').includes(k));
          if (clsHit && names.some((n) => cls.members.some((m) => n.includes(m)))) hits.add(`${cls.label} (recorded: "${tk}")`);
        }
        if (names.some((n) => n.includes(tk) || tk.includes(keyOf(n)) && keyOf(n).length >= 4)) hits.add(`"${tk}"`);
      }
      hits.forEach((h) =>
        w.push({ level: 'danger', itemId: it.id, text: `ALLERGY: ${it.generic || it.brand} may conflict with recorded allergy ${h}.` }));
    }
  }

  // --- Duplicates
  const seen = new Map<string, RxItem>();
  for (const it of items) {
    const k = `${baseName(it.generic)}|${norm(it.strength)}|${norm(it.form)}`;
    if (seen.has(k)) w.push({ level: 'danger', itemId: it.id, text: `Duplicate medicine: ${it.generic} ${it.strength} (${it.form}) is added more than once.` });
    else seen.set(k, it);
  }
  const ing = new Map<string, RxItem[]>();
  items.forEach((it) => {
    const keys = new Set(it.ingredients.map((i) => baseName(i.name)).filter(Boolean));
    keys.forEach((k) => ing.set(k, [...(ing.get(k) || []), it]));
  });
  ing.forEach((list, k) => {
    const distinct = list.filter((x, i) => list.findIndex((y) => y.id === x.id) === i);
    const dupSame = distinct.length > 1 && distinct.every((x) => `${baseName(x.generic)}|${norm(x.strength)}|${norm(x.form)}` === `${baseName(distinct[0].generic)}|${norm(distinct[0].strength)}|${norm(distinct[0].form)}`);
    if (distinct.length > 1 && !dupSame)
      w.push({ level: 'warn', text: `Duplicate active ingredient: ${k.replace(/\b\w/g, (c) => c.toUpperCase())} is present in ${distinct.length} medicines (${distinct.map((d) => d.generic).join(' / ')}).` });
  });

  // --- Dose validation (adult, oral, where a reference limit exists)
  if (adult) {
    const totals = new Map<string, { mg: number; its: RxItem[] }>();
    for (const it of items) {
      if (it.route !== 'Oral') continue;
      const d = dailyDoses(it);
      if (d == null) continue;
      const liquid = it.doseUnit === 'mL';
      for (const g of it.ingredients) {
        const rule = Object.keys(MAX_DAILY_MG).find((r) => baseName(g.name).startsWith(r));
        const per = mgPer(g.strength, liquid);
        if (!rule || per == null) continue;
        const cur = totals.get(rule) || { mg: 0, its: [] };
        cur.mg += per * d; cur.its.push(it);
        totals.set(rule, cur);
      }
    }
    totals.forEach((v, rule) => {
      const max = MAX_DAILY_MG[rule];
      if (v.mg > max)
        w.push({ level: 'danger', itemId: v.its[0].id, text: `Dose check: total ${rule} = ${Math.round(v.mg)} mg/day exceeds the usual adult maximum of ${max} mg/day. Please verify.` });
    });
  }
  items.forEach((it) => {
    if (it.freq === 'SOS' && !it.sosMax) w.push({ level: 'warn', itemId: it.id, text: `${it.generic}: SOS without a maximum daily limit. Set "max per day".` });
    if (it.src === 'brand') w.push({ level: 'info', itemId: it.id, text: `${it.brand}: brand entry from the reference list. Confirm composition and strength on the pack.` });
    else if (it.src === 'import' && !it.generic.trim()) w.push({ level: 'warn', itemId: it.id, text: `${it.brand}: composition not known (shop stock list), so allergy, duplicate and interaction checks cannot run for it. Add the composition (edit it in the Drug Library) or confirm from the pack.` });
    else if (!it.verified) w.push({ level: 'info', itemId: it.id, text: `${it.brand || it.generic}: doctor-entered (unverified) medicine. Confirm composition and strength from the pack.` });
  });
  w.push(...interactionWarnings(rx, opts));
  return w;
}
export const disclaimer = 'Allergy, duplicate, dose and interaction alerts cover common orthopaedic medicines only and are aids, not a complete check. The prescribing doctor remains responsible for every prescription.';

/* ---------- interactions ---------- */
const SYSTEMIC_NO = /topical|external|transdermal|ophthalmic|eye|ear|nasal|inhal|vaginal|gel|cream|ointment|spray|patch|lotion|drops?/i;
const nameText = (it: RxItem) => norm([it.generic, it.brand, ...it.ingredients.map((i) => i.name)].filter(Boolean).join(' '));
const shown = (it: RxItem) => (it.generic || it.brand || '').replace(/\s*\(.*?\)/g, '').trim();
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** a medicine "belongs" to a class by name; NSAID / steroid / FQ topicals are ignored */
function inClass(it: RxItem, cls: string, custom?: string): boolean {
  const t = nameText(it); if (!t) return false;
  const c = CLASSES[cls];
  if (custom !== undefined) { const k = norm(custom); if (CLASSES[k]) return inClass(it, k); return k.length >= 3 && t.includes(k); }
  if (!c || !c.re.test(t)) return false;
  if (['nsaid', 'steroid', 'fq'].includes(cls) && (SYSTEMIC_NO.test(it.route || '') || SYSTEMIC_NO.test(it.form || ''))) return false;
  return true;
}
/** things the patient already takes, read from the Comorbidities box (e.g. "on warfarin, telmisartan") */
function ongoing(rx: Prescription): Set<string> {
  // "iron deficiency" / "calcium deficiency" are conditions, not tablets the patient takes
  const t = norm(affirmed(rx.clinical.comorbidities || '')).replace(/\b(iron|calcium|zinc|magnesium) (deficiency|deficient|def)\b/g, ''); const out = new Set<string>();
  if (!t) return out;
  for (const [k, c] of Object.entries(CLASSES)) if (c.re.test(t)) out.add(k);
  if (/\b(blood thinner|anticoag|on thinners|blood thinners)\b/.test(t)) out.add('anticoag');
  if (/\b(stent|ecosprin|aspirin|clopidogrel)\b/.test(t)) out.add('antiplatelet');
  return out;
}
function interactionWarnings(rx: Prescription, opts: IxOpts): Warning[] {
  const out: Warning[] = []; const muted = new Set(opts.muted || []);
  const items = rx.items; if (!items.length) return out;
  const on = ongoing(rx);
  const members = (cls: string) => items.filter((i) => inClass(i, cls));
  const has = (cls: string) => members(cls).length > 0 || on.has(cls);
  const list = (its: RxItem[]) => [...new Set(its.map(shown))].filter(Boolean).join(' + ');
  for (const r of RULES) {
    if (muted.has(r.id)) continue;
    const A = members(r.a);
    if (!A.length) {
      // the patient already takes the first medicine (from Comorbidities) and this prescription adds the second
      if (r.a !== r.b && on.has(r.a) && !(r.unless && has(r.unless))) {
        const B2 = members(r.b);
        if (B2.length) out.push({ level: r.level, ruleId: r.id, text: `Interaction: ${list(B2)} with ${CLASSES[r.a].label} the patient already takes (from Comorbidities): ${r.text}` });
      }
      continue;
    }
    if (r.unless && has(r.unless)) continue;
    if (r.a === r.b) {
      const gen = [...new Map(A.map((i) => [baseName(i.generic || i.brand), i])).values()];
      if (gen.length < 2) continue;
      out.push({ level: r.level, ruleId: r.id, itemId: undefined, text: `Interaction: ${list(gen)}: ${r.text}` });
      continue;
    }
    const B = members(r.b);
    // same tablet carrying both classes (e.g. aceclofenac + paracetamol) never pairs with itself
    const Bx = B.filter((b) => !A.some((a) => a.id === b.id));
    if (Bx.length) out.push({ level: r.level, ruleId: r.id, text: `Interaction: ${list(A)} + ${list(Bx)}: ${r.text}` });
    else if (!B.length && on.has(r.b)) out.push({ level: r.level, ruleId: r.id, text: `Interaction: ${list(A)} with ${CLASSES[r.b].label} the patient already takes (from Comorbidities): ${r.text}` });
  }
  const text = norm(affirmed(rx.clinical.comorbidities || ''));
  for (const r of CTX_RULES) {
    if (muted.has(r.id) || !text || !r.cond.test(text)) continue;
    const A = members(r.cls); if (!A.length) continue;
    out.push({ level: r.level, ruleId: r.id, text: `${r.lead || 'Patient has ' + r.condLabel}: ${list(A)}: ${r.text}` });
  }
  const age = ageYears(rx.patient.age, rx.patient.ageUnit);
  if (!isNaN(age)) for (const r of AGE_RULES) {
    if (muted.has(r.id) || (r.min !== undefined && age < r.min) || (r.max !== undefined && age >= r.max)) continue;
    const A = members(r.cls); if (!A.length) continue;
    out.push({ level: r.level, ruleId: r.id, text: `${age < 1 ? Math.round(age * 12) + ' months' : 'Age ' + Math.round(age)}: ${list(A)}: ${r.text}` });
  }
  // --- woman of child-bearing age, pregnancy not recorded
  if (!muted.has(PREG_ASK.id) && rx.patient.sex === 'Female' && (isNaN(age) || (age >= 12 && age <= 50)) && !/pregnan|breast ?feed|lactat|\blmp\b|contracept|expecting/i.test(rx.clinical.comorbidities || '')) {
    const R = PREG_ASK.classes.flatMap((c) => members(c));
    if (R.length) out.push({ level: PREG_ASK.level, ruleId: PREG_ASK.id, text: `${list(R)}: ${PREG_ASK.text}` });
  }
  // --- course length (oral medicines only; as-needed and tapered courses are skipped)
  const days = (i: RxItem) => (i.duration || 0) * (i.durationUnit === 'weeks' ? 7 : i.durationUnit === 'months' ? 30 : 1);
  const longest = (its: RxItem[]) => Math.max(0, ...its.filter((i) => i.route === 'Oral' && i.freq !== 'SOS' && !i.useTaper).map(days));
  for (const r of COURSE_RULES) {
    if (muted.has(r.id)) continue;
    const A = members(r.cls).filter((i) => i.route === 'Oral' && i.freq !== 'SOS' && !i.useTaper && days(i) > r.maxDays); if (!A.length) continue;
    out.push({ level: r.level, ruleId: r.id, text: `Course: ${list(A)} for ${longest(A)} days: ${r.text}` });
  }
  // --- NSAID by mouth with no stomach cover
  if (!muted.has(NSAID_GI.id)) {
    const N = members('nsaid').filter((i) => i.route === 'Oral'); const nd = longest(N);
    const covered = members('gprot').length > 0 || on.has('gprot') || on.has('ppi');
    const stomachNote = out.some((w) => w.ruleId === 'ctx-nsaid-gi' || w.ruleId === 'age-nsaid' && nd < 7);
    if (N.length && !covered && !stomachNote && (nd >= 7 || (!isNaN(age) && age >= 60))) out.push({ level: NSAID_GI.level, ruleId: NSAID_GI.id, text: `${list(N)}: ${NSAID_GI.text}` });
  }
  for (const c of opts.custom || []) {
    if (!c.a.trim() || !c.b.trim()) continue;
    const A = items.filter((i) => inClass(i, '', c.a)); const B = items.filter((i) => inClass(i, '', c.b) && !A.some((a) => a.id === i.id));
    if (A.length && B.length) out.push({ level: c.level, ruleId: c.id, text: `Your rule: ${list(A)} + ${list(B)}${c.note.trim() ? ': ' + cap(c.note.trim()) : ': avoid this combination.'}` });
  }
  return out;
}
