import type { Prescription, RxItem } from './types';
import { ALLERGY_CLASSES, MAX_DAILY_MG } from '../data/rules';
import { timesPerDay } from './dosage';
import { norm } from './util';

export interface Warning { level: 'danger' | 'warn' | 'info'; text: string; itemId?: string }

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

export function checkRx(rx: Prescription): Warning[] {
  const w: Warning[] = [];
  const p = rx.patient;
  const items = rx.items;
  const ageYears = p.age ? (p.ageUnit === 'M' ? parseFloat(p.age) / 12 : parseFloat(p.age)) : NaN;
  const adult = !isNaN(ageYears) && ageYears >= 18;

  // --- Patient completeness
  if (!p.name.trim()) w.push({ level: 'danger', text: 'Patient name is missing.' });
  if (!p.age) w.push({ level: 'warn', text: 'Patient age is missing.' });
  if (!p.sex) w.push({ level: 'warn', text: 'Patient sex is missing.' });
  if (!p.phone) w.push({ level: 'info', text: 'Phone number not entered (needed for WhatsApp sharing).' });
  if (!p.allergies.trim()) w.push({ level: 'info', text: 'Allergy status not recorded. Tap "No known allergies" if applicable.' });
  if (!isNaN(ageYears) && ageYears < 12 && !p.weight) w.push({ level: 'warn', text: 'Child patient: weight not entered. Verify weight-based dosing.' });
  if (!isNaN(ageYears) && ageYears < 18) w.push({ level: 'info', text: 'Patient is under 18: automatic maximum-dose checks are skipped. Verify paediatric doses yourself.' });
  if (!rx.clinical.diagnosis.trim()) w.push({ level: 'warn', text: 'Diagnosis is empty.' });

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
  return w;
}
export const disclaimer = 'MedScript does not perform drug-interaction checking. Allergy, duplicate and dose alerts are basic aids only; the prescribing doctor remains responsible for every prescription.';
