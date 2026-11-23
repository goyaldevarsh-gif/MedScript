import { describe, expect, it } from 'vitest';
import { EXAM, RED, examFor, getVal, setVal, parseVal, buildVal, isFinding } from '../src/data/exam';
import { STARTERS } from '../src/data/templates';

const slr = EXAM.lumbar.items.find((i) => i.label === 'SLRT')!;
const lach = EXAM.knee.items.find((i) => i.label === 'Lachman test')!;
const rom = EXAM.knee.items.find((i) => i.label === 'ROM')!;
const cl = (diagnosis: string, extra: any = {}) => ({ diagnosis, complaint: '', bodyParts: [], injury: '', ...extra }) as any;

describe('examination chips', () => {
  it('yes/no with a number: SLRT positive at 60°', () => {
    const v = buildVal(slr, 'Positive', '60'); expect(v).toBe('Positive at 60°');
    expect(parseVal(slr, v)).toEqual({ opt: 'Positive', extra: '60' });
    expect(buildVal(slr, 'Negative', '60')).toBe('Negative'); // a number means nothing on a negative test
    expect(isFinding(slr, 'Positive at 60°')).toBe(true); expect(isFinding(slr, 'Negative')).toBe(false);
  });
  it('graded and range answers', () => {
    expect(parseVal(lach, 'Positive - grade 2').opt).toBe('Positive - grade 2');
    expect(buildVal(rom, 'Restricted', 'flexion 0-90°')).toBe('Restricted - flexion 0-90°');
    expect(parseVal(rom, 'Restricted - flexion 0-90°')).toEqual({ opt: 'Restricted', extra: 'flexion 0-90°' });
    expect(buildVal(rom, 'Full', 'x')).toBe('Full');
  });
  it('writes, replaces and clears a line', () => {
    let t = ''; t = setVal(t, slr, 'Positive at 60°'); expect(t).toBe('SLRT: Positive at 60°');
    t = setVal(t, lach, 'Negative'); expect(t.split('\n')).toHaveLength(2);
    t = setVal(t, slr, 'Negative'); expect(t).toBe('SLRT: Negative\nLachman test: Negative');
    expect(getVal(t, slr)).toBe('Negative'); t = setVal(t, slr, ''); expect(t).toBe('Lachman test: Negative'); expect(getVal(t, slr)).toBe('');
  });
  it('fills a blank template skeleton line instead of adding a second one', () => {
    const tpl = 'Posture: \nParaspinal spasm/tenderness: \nROM: \nSLRT (angle): \nNeurology (power, sensation, reflexes): ';
    const t = setVal(tpl, slr, 'Positive at 45°');
    expect(t.split('\n')).toHaveLength(5); expect(t).toContain('SLRT: Positive at 45°'); expect(t).not.toContain('SLRT (angle)');
    expect(getVal(tpl, slr)).toBe(''); // an empty skeleton line is "not examined yet"
  });
  it('template skeleton lines are recognised by a chip of the right body region', () => {
    const miss: string[] = []; let total = 0;
    for (const s of STARTERS as any[]) {
      const ex = String(s.clinical?.examination ?? s.examination ?? ''); if (!ex.trim()) continue;
      const { groups } = examFor({ diagnosis: s.clinical?.diagnosis ?? s.diagnosis ?? '', complaint: '', bodyParts: [], injury: '' } as any);
      const items = groups.flatMap((g) => g.items);
      for (const l of ex.split('\n')) { const lab = l.split(':')[0].trim(); if (!lab) continue; total++; if (!items.some((i) => setVal(l, i, 'x') === `${i.label}: x`)) miss.push(`${s.key}: ${lab}`); }
    }
    if (process.env.SHOW_MISS) console.log(total, miss.length, '\n' + miss.join('\n'));
    expect(miss.length).toBeLessThan(total * 0.6);
  });
  it('picks the right tabs and red flags', () => {
    const lbp = examFor(cl('Low back pain with sciatica')); expect(lbp.groups[0].key).toBe('lumbar'); expect(lbp.red.map((r) => r.label).join()).toMatch(/Bladder/);
    const k = examFor(cl('ACL tear', { injury: 'trauma' })); expect(k.groups.map((g) => g.key)).toEqual(['knee', 'trauma']); expect(k.red.map((r) => r.label).join()).toMatch(/Compartment/);
    expect(examFor(cl('Fracture neck of femur', { injury: 'trauma' })).groups[0].key).toBe('hip');
    expect(examFor(cl('Septic arthritis knee')).red.map((r) => r.label).join()).toMatch(/Hot, red/);
    expect(examFor(cl('')).groups[0].key).toBe('general');
    expect(examFor(cl('Knee osteoarthritis')).red).toHaveLength(0);
  });
  it('ids unique inside every tab and every option list has its normal answer', () => {
    for (const g of Object.values(EXAM)) { expect(new Set(g.items.map((i) => i.id)).size, g.key).toBe(g.items.length); for (const i of g.items) { expect(i.opts, i.label).toContain(i.normal); if (i.note) i.note.when.forEach((w) => expect(i.opts, i.label).toContain(w)); } }
    for (const r of Object.values(RED).flat()) expect(r.opts).toContain(r.normal);
  });
});

import { examLines, testLines, printableExam, printableTests, toggleKey } from '../src/data/printpick';
describe('choose what prints', () => {
  const ex = 'SLRT: Positive at 60°\nCrossed SLRT: Negative\nPower (EHL, ankle): \nGait: Normal';
  it('lists only filled lines and prints all by default', () => {
    expect(examLines(ex).map((l) => l.key)).toEqual(['slrt', 'crossed slrt', 'gait']);
    expect(printableExam(ex)).toBe('SLRT: Positive at 60°; Crossed SLRT: Negative; Gait: Normal');
  });
  it('a left-out finding stays in the text but not on the print', () => {
    const hide = toggleKey([], 'gait');
    expect(printableExam(ex, hide)).toBe('SLRT: Positive at 60°; Crossed SLRT: Negative');
    expect(ex).toContain('Gait: Normal'); expect(toggleKey(hide, 'gait')).toEqual([]);
  });
  it('tests: leave one out, grouping still works', () => {
    const t = 'X-ray LS spine AP and lateral; MRI lumbosacral spine; CBC; ECG';
    const hide = testLines(t).filter((l) => /MRI|CBC/.test(l.text)).map((l) => l.key);
    expect(printableTests(t, hide)).toBe('Imaging: X-ray LS spine AP and lateral   |   Other: ECG');
    expect(printableTests(t, testLines(t).map((l) => l.key))).toBe('');
  });
  it('a typed line that is not a chip can be left out too', () => {
    const t = 'Waddling gait; Tenderness: L4-5'; const h = [examLines(t)[0].key];
    expect(printableExam(t, h)).toBe('Tenderness: L4-5');
  });
});
