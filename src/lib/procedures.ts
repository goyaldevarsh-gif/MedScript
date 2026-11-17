import type { Prescription, ProcNote } from './types';

export const KINDS: { k: ProcNote['kind']; l: string; drugs: string[]; doseHint: string; siteHint: string }[] = [
  { k: 'plaster', l: 'Plaster / splint', drugs: ['POP slab', 'POP cast', 'Below-knee cast', 'Above-elbow slab', 'Thumb spica', 'Sling', 'Splint'], doseHint: 'e.g. 6 weeks', siteHint: 'e.g. Forearm' },
  { k: 'injection', l: 'Injection', drugs: ['Triamcinolone', 'Methylprednisolone', 'Betamethasone', 'Hyaluronic acid', 'PRP', 'Lignocaine', 'Vitamin B12', 'Diclofenac'], doseHint: 'e.g. 40 mg, 2 mL', siteHint: 'e.g. Knee joint (intra-articular)' },
  { k: 'dressing', l: 'Dressing', drugs: ['Betadine', 'Saline', 'Soframycin', 'Paraffin gauze', 'Compression bandage'], doseHint: 'e.g. wound clean, no discharge', siteHint: 'e.g. Right leg' },
  { k: 'aspiration', l: 'Aspiration', drugs: ['Joint aspiration', 'Seroma / cyst aspiration', 'Haematoma aspiration'], doseHint: 'e.g. 20 mL straw-coloured fluid', siteHint: 'e.g. Right knee' },
  { k: 'other', l: 'Other', drugs: [], doseHint: '', siteHint: '' },
];
export const kindLabel = (k: ProcNote['kind']) => KINDS.find((x) => x.k === k)?.l || k;
const sd = (s: string) => (s === 'Left' ? 'left ' : s === 'Right' ? 'right ' : s === 'Bilateral' ? 'both sides, ' : '');

/** one short line: "Injection, right knee: triamcinolone 40 mg" (consent is never printed) */
export function procText(p: ProcNote): string {
  const where = `${sd(p.side)}${p.site}`.trim();
  const what = [p.drug, p.dose].filter(Boolean).join(' ');
  return [kindLabel(p.kind), where].filter(Boolean).join(', ') + (what ? `: ${what}` : '') + (p.note ? ` (${p.note})` : '');
}
export function procLine(rx: Prescription): string {
  return (rx.procedures || []).filter((p) => p.print).map(procText).join('; ');
}
