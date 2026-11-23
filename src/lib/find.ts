import { norm } from './util';

interface P { name: string; phone: string; pid?: string }
const digitsOf = (s: string) => { const d = (s || '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };

/** Finds saved patients from whatever the clinic knows: part of the name (any word order), part of the mobile (spaces, +91 and dashes ignored), or the patient ID.
    Best matches first: the exact mobile, then names that start with the typed text. */
export function findPatients<T extends P>(pats: T[], q: string): T[] {
  const s = norm(q); if (!s) return [];
  const words = s.split(' ').filter((w) => /[a-z]/.test(w) && !/^p$/.test(w));
  const dg = digitsOf(q);
  const score = (p: T): number => {
    const name = norm(p.name), ph = digitsOf(p.phone), pid = norm(p.pid || '');
    if (pid && pid.includes(s)) return 3;
    const nameOk = words.length === 0 || words.every((w) => name.split(' ').some((t) => t.startsWith(w)) || name.includes(w));
    const phoneOk = dg.length < 3 || (ph.length > 0 && (dg.length === 10 ? ph === dg : ph.includes(dg)));
    if (!(nameOk && phoneOk) || (words.length === 0 && dg.length < 3)) return 0;
    return (dg.length === 10 && ph === dg ? 4 : 1) + (words.length && name.startsWith(words[0]) ? 1 : 0);
  };
  return pats.map((p) => [p, score(p)] as const).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p);
}
