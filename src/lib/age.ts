/** Age can be years, months, days or a mix ("6y 5m", "5m 7d"). It is kept as one short string in `age`.
 *  A plain number ("40") still means years or months, by `ageUnit`, exactly as in older records. */
export interface AgeParts { y: number; m: number; d: number }
const n0 = (v: string | number | undefined) => { const x = Math.floor(Number(v)); return isFinite(x) && x > 0 ? x : 0; };
export function parseAge(age: string | undefined, unit: string | undefined = 'Y'): AgeParts | null {
  const s = String(age ?? '').trim().toLowerCase(); if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) { const v = parseFloat(s); return unit === 'M' ? { y: 0, m: Math.floor(v), d: 0 } : { y: Math.floor(v), m: Math.round((v % 1) * 12), d: 0 }; }
  const re = /(\d+)\s*(y|yr|yrs|year|years|m|mo|mos|month|months|d|day|days)\b/g; const o: AgeParts = { y: 0, m: 0, d: 0 }; let hit = false, mt: RegExpExecArray | null;
  while ((mt = re.exec(s))) { hit = true; const k = mt[2][0] as 'y' | 'm' | 'd'; o[k] += Number(mt[1]); }
  return hit ? o : null;
}
/** age in years as a number (NaN when empty or unreadable) */
export function ageYears(age: string | undefined, unit?: string): number {
  const a = parseAge(age, unit); return a ? a.y + a.m / 12 + a.d / 365 : NaN;
}
/** writes the parts back: years only or months only stay plain numbers (as before), mixed ones become "6y 5m 7d" */
export function composeAge(p: Partial<AgeParts>): { age: string; ageUnit: 'Y' | 'M' } {
  const y = n0(p.y), m = n0(p.m), d = n0(p.d);
  if (!y && !m && !d) return { age: '', ageUnit: 'Y' };
  if (y && !m && !d) return { age: String(y), ageUnit: 'Y' };
  if (!y && m && !d) return { age: String(m), ageUnit: 'M' };
  return { age: [y && `${y}y`, m && `${m}m`, d && `${d}d`].filter(Boolean).join(' '), ageUnit: 'Y' };
}
/** short text for lists: "40y", "5m", "6y 5m", "12d" */
export function fmtAge(age: string | undefined, unit?: string): string {
  const a = parseAge(age, unit); if (!a) return String(age ?? '').trim();
  return [a.y && `${a.y}y`, a.m && `${a.m}m`, a.d && `${a.d}d`].filter(Boolean).join(' ') || '0d';
}
/** for the printed prescription: "40 Y", "6 Y 5 M", "12 D" */
export const fmtAgePdf = (age: string | undefined, unit?: string): string => fmtAge(age, unit).replace(/(\d+)([ymd])/g, (_, n, u) => `${n} ${u.toUpperCase()}`);
/** OrthoVault only knows a number of years or months */
export function ovAge(age: string | undefined, unit?: string): { age: string; ageUnit: 'Y' | 'M' } {
  const a = parseAge(age, unit); if (!a) return { age: String(age ?? ''), ageUnit: unit === 'M' ? 'M' : 'Y' };
  return a.y >= 1 ? { age: String(a.y), ageUnit: 'Y' } : { age: String(a.m), ageUnit: 'M' };
}
