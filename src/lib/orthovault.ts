import type { Prescription } from './types';
import { doseLabel, dosePattern, durationLabel, freqLabel, timingMeta } from './dosage';

/* Hand-off with the OrthoVault app (same GitHub Pages domain). Data travels in the URL hash; nothing goes through a server. */
const enc = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = (s: string) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));

export interface OvIn { id?: string; name: string; age?: string; ageUnit?: 'Y' | 'M'; sex?: string; phone?: string; weight?: string; dx?: string; cc?: string; side?: string; back?: string }
export function decodeOvIn(s: string): OvIn | null {
  try { const o = dec(s); return o && typeof o.name === 'string' && o.name.trim() ? (o as OvIn) : null; } catch { return null; }
}
export const ovSex = (s?: string) => (/^m/i.test(s || '') ? 'Male' : /^f/i.test(s || '') ? 'Female' : s ? 'Other' : '');
export const ovSide = (s?: string) => (/^l/i.test(s || '') ? 'Left' : /^r/i.test(s || '') ? 'Right' : /^b/i.test(s || '') ? 'Bilateral' : 'N/A');
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function ovSaveUrl(base: string, rx: Prescription): string {
  const when = new Date(rx.authorizedAt || rx.createdAt);
  const fu = rx.followUpDays > 0 ? ymd(new Date(when.getTime() + rx.followUpDays * 86400000)) : '';
  const payload = {
    v: 1, ovId: rx.patient.ovId || rx.ovId || '', rxNo: rx.rxNo, date: ymd(when), followUpDate: fu,
    patient: { name: rx.patient.name, age: rx.patient.age, ageUnit: rx.patient.ageUnit, sex: rx.patient.sex, phone: rx.patient.phone, weight: rx.patient.weight },
    dx: rx.clinical.diagnosis, cc: rx.clinical.complaint, advice: rx.clinical.advice.map((a) => a.trim()).filter(Boolean).join('\n'),
    medicines: rx.items.map((it) => ({
      name: ((n, s) => (s && !n.toLowerCase().includes((s.match(/[\d.]+/) || [s])[0].toLowerCase()) ? `${n} ${s}` : n))((it.brand ? it.brand.toUpperCase() : it.generic).trim(), (it.strength || '').trim()),
      dose: doseLabel(it) || '',
      frequency: freqLabel(it) + (dosePattern(it) ? ` (${dosePattern(it)})` : ''),
      duration: durationLabel(it),
      instructions: [timingMeta(it.timing)?.label, it.notes].filter(Boolean).join(', '),
    })),
  };
  return `${base.replace(/#.*$/, '').replace(/\/?$/, '/')}#mvrx=${enc(payload)}`;
}
