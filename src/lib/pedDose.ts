import type { RxItem } from './types';
import { timesPerDay } from './dosage';

/** Usual paediatric oral doses (per kg). Standard references; the doctor confirms before use. */
interface Rule { re: RegExp; label: string; perDose: number; doses: number; maxDayPerKg?: number; maxDose?: number; range: string }
const RULES: Rule[] = [
  { re: /paracetamol|acetaminophen/, label: 'Paracetamol', perDose: 15, doses: 4, maxDayPerKg: 60, maxDose: 1000, range: '10-15 mg/kg every 6 hours, up to 4 doses a day' },
  { re: /ibuprofen/, label: 'Ibuprofen', perDose: 10, doses: 3, maxDayPerKg: 40, maxDose: 400, range: '5-10 mg/kg every 6-8 hours; not under 6 months' },
  { re: /diclofenac/, label: 'Diclofenac', perDose: 1, doses: 3, maxDayPerKg: 3, maxDose: 50, range: '1 mg/kg per dose, 2-3 times a day; not under 1 year' },
  { re: /amoxicillin|amoxycillin/, label: 'Amoxicillin', perDose: 20, doses: 2, maxDayPerKg: 90, maxDose: 1000, range: '25-50 mg/kg/day of the amoxicillin part, in 2-3 doses' },
  { re: /cefixime/, label: 'Cefixime', perDose: 4, doses: 2, maxDayPerKg: 8, maxDose: 200, range: '8 mg/kg/day in 1-2 doses' },
  { re: /cephalexin|cefalexin/, label: 'Cephalexin', perDose: 10, doses: 4, maxDayPerKg: 100, maxDose: 1000, range: '25-50 mg/kg/day in 3-4 doses' },
  { re: /cefuroxime/, label: 'Cefuroxime', perDose: 12.5, doses: 2, maxDayPerKg: 30, maxDose: 500, range: '20-30 mg/kg/day in 2 doses' },
  { re: /cloxacillin|flucloxacillin/, label: 'Cloxacillin', perDose: 12.5, doses: 4, maxDayPerKg: 100, maxDose: 500, range: '50-100 mg/kg/day in 4 doses' },
  { re: /azithromycin/, label: 'Azithromycin', perDose: 10, doses: 1, maxDayPerKg: 12, maxDose: 500, range: '10 mg/kg once a day' },
  { re: /metronidazole/, label: 'Metronidazole', perDose: 10, doses: 3, maxDayPerKg: 30, maxDose: 400, range: '30 mg/kg/day in 3 doses' },
  { re: /prednisolone/, label: 'Prednisolone', perDose: 1, doses: 1, maxDayPerKg: 2, maxDose: 40, range: '0.5-2 mg/kg/day (usually once in the morning)' },
  { re: /ondansetron/, label: 'Ondansetron', perDose: 0.15, doses: 3, maxDayPerKg: 0.6, maxDose: 8, range: '0.15 mg/kg per dose' },
];
const num = (s: string) => parseFloat(s.replace(/,/g, ''));
/** mg per mL (liquids) or mg per tablet from a strength string, for the named ingredient */
function perUnit(it: RxItem, rule: Rule): { mg: number; basis: string } | null {
  const ing = it.ingredients.find((i) => rule.re.test(i.name.toLowerCase()));
  const str = (ing?.strength || (it.ingredients.length <= 1 ? it.strength : '') || '').toLowerCase();
  const m = str.match(/([\d.,]+)\s*(mg|g)\s*(?:\/|per)\s*([\d.]*)\s*ml/);
  if (m) { const mg = num(m[1]) * (m[2] === 'g' ? 1000 : 1); const ml = m[3] ? num(m[3]) : 1; return { mg: mg / ml, basis: `${num(m[1])} ${m[2]}/${m[3] || '1'} mL` }; }
  const t = str.match(/([\d.,]+)\s*(mg|g)\b/);
  if (t) return { mg: num(t[1]) * (t[2] === 'g' ? 1000 : 1), basis: `${num(t[1])} ${t[2]}` };
  return null;
}
export interface PedHint { text: string; use?: { qty: number; unit: string; freqDoses: number }; status: 'ok' | 'high' | 'low' | 'none' }
export function pedDose(it: RxItem, kg: number): PedHint | null {
  if (!kg || kg <= 0 || kg > 60) return null;
  const names = `${it.generic} ${it.ingredients.map((i) => i.name).join(' ')}`.toLowerCase();
  const rule = RULES.find((r) => r.re.test(names)); if (!rule) return null;
  if (it.ingredients.length > 2) return null;
  const mgDose = Math.min(rule.perDose * kg, rule.maxDose ?? Infinity);
  const unit = perUnit(it, rule);
  const kgS = `${Math.round(kg * 10) / 10} kg`;
  const mgS = `${Math.round(mgDose * 10) / 10} mg`;
  let text = `${rule.label}, ${kgS}: about ${mgS} per dose, ${rule.doses === 1 ? 'once' : rule.doses + ' times'} a day (${rule.range}).`;
  let use: PedHint['use'];
  const liquid = it.doseUnit === 'mL';
  if (unit) {
    const raw = mgDose / unit.mg; const step = liquid ? 0.5 : 0.5;
    const q = Math.max(step, Math.round(raw / step) * step);
    const u = liquid ? 'mL' : it.doseUnit === 'drop' ? 'drop' : (it.doseUnit || 'tablet');
    if (it.doseUnit !== 'drop' && it.doseUnit !== 'application') { text += ` With ${unit.basis}: ${q} ${u}${q !== 1 && !liquid ? 's' : ''}.`; use = { qty: q, unit: u, freqDoses: rule.doses }; }
  }
  // how the current dose compares
  let status: PedHint['status'] = 'none';
  if (it.doseQty != null && unit && it.doseUnit !== 'drop') {
    const cur = it.doseQty * unit.mg; const perKg = cur / kg; const daily = it.freq === 'SOS' ? (it.sosMax ? it.sosMax * cur : 0) : cur * timesPerDay(it);
    if (rule.maxDayPerKg && daily / kg > rule.maxDayPerKg * 1.05) { status = 'high'; text += ` Current: ${Math.round(daily / kg)} mg/kg/day, above the usual maximum of ${rule.maxDayPerKg}.`; }
    else if (perKg < rule.perDose * 0.5) { status = 'low'; text += ` Current: ${Math.round(perKg * 10) / 10} mg/kg per dose, which is low.`; }
    else status = 'ok';
  }
  return { text, use, status };
}
