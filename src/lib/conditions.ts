import type { Patient } from './types';
import { affirmed } from './negation';

/** one-tap conditions under Comorbidities. The chip writes plain words into the same box the safety rules read. */
export interface CondChip { label: string; re: RegExp; women?: boolean }
export const COND_CHIPS: CondChip[] = [
  { label: 'Diabetes', re: /\b(diabet\w*|dm|t2dm|t1dm)\b/i },
  { label: 'Hypertension', re: /\b(hypertension|htn|high bp)\b/i },
  { label: 'Kidney disease', re: /\b(kidney|ckd|renal|nephro\w*|dialysis)\b/i },
  { label: 'Ulcer / acidity', re: /\b(ulcer|gastritis|gerd|reflux|acidity|dyspepsia)\b/i },
  { label: 'Asthma', re: /\b(asthma|copd)\b/i },
  { label: 'Liver disease', re: /\b(liver|cirrhosis|hepatitis|jaundice)\b/i },
  { label: 'Pregnant', re: /\b(pregnan\w*|expecting)\b/i, women: true },
  { label: 'Breastfeeding', re: /\b(breast ?feed\w*|lactati\w*|nursing mother)\b/i, women: true },
];
const split = (v: string) => (v || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Pregnant / Breastfeeding only make sense for a woman of child-bearing age (age unknown: still shown). */
export function showWomenChips(p: Pick<Patient, 'sex' | 'age' | 'ageUnit'>): boolean {
  if (p.sex !== 'Female') return false;
  const a = p.age ? (p.ageUnit === 'M' ? parseFloat(p.age) / 12 : parseFloat(p.age)) : NaN;
  return isNaN(a) || (a >= 12 && a <= 50);
}
export const chipActive = (value: string, c: CondChip) => c.re.test(affirmed(value || ''));
/** adds the chip's words, or removes them again - only when the chip itself wrote them */
export function toggleChip(value: string, c: CondChip): string {
  const parts = split(value);
  if (!chipActive(value, c)) return [...parts, c.label].join(', ');
  return parts.filter((x) => !same(x, c.label)).join(', ');
}
/** pregnancy and breastfeeding belong to one visit: they are not copied into the next one */
export function dropWomenStatus(value: string): string {
  const women = COND_CHIPS.filter((c) => c.women);
  return split(value).filter((x) => !women.some((c) => c.re.test(x))).join(', ');
}
