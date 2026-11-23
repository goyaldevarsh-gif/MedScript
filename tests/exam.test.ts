import { splitHistory } from '../src/data/exam';
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
    const k = examFor(cl('ACL tear', { injury: 'trauma' })); expect(k.groups.map((g) => g.key)).toEqual(['knee', 'trauma', 'flags']); expect(k.red.map((r) => r.label).join()).toMatch(/Compartment/);
    expect(examFor(cl('Fracture neck of femur', { injury: 'trauma' })).groups[0].key).toBe('hip');
    expect(examFor(cl('Septic arthritis knee')).red.map((r) => r.label).join()).toMatch(/Hot, red/);
    expect(examFor(cl('')).groups[0].key).toBe('general');
    expect(examFor(cl('Knee osteoarthritis')).red.map((r) => r.label).join()).toMatch(/Night pain/); // general red flags are asked for every problem
    expect(examFor(cl('Knee osteoarthritis')).groups.at(-1)?.key).toBe('flags');
  });
  it('ids unique inside every tab and every option list has its normal answer', () => {
    for (const g of Object.values(EXAM)) { expect(new Set(g.items.map((i) => i.id)).size, g.key).toBe(g.items.length); for (const i of g.items) { expect(i.opts, i.label).toContain(i.normal); if (i.note) i.note.when.forEach((w) => expect(i.opts, i.label).toContain(w)); } }
    for (const r of Object.values(RED).flat()) expect(r.opts).toContain(r.normal);
  });
  it('history and red-flag lines print on their own line, and only when something is present', () => {
    const r = splitHistory('Gait: Antalgic\nNight pain: Present\nFever / chills: Absent\nWeight loss / loss of appetite: Absent\nADL affected: Moderate - stairs, dressing\nTenderness:\nNeer test: Positive');
    expect(r.hist).toBe('Night pain; ADL affected: Moderate - stairs, dressing');
    expect(r.exam).toBe('Gait: Antalgic\nTenderness:\nNeer test: Positive');
    expect(splitHistory('ADL affected: None\nNight pain: Absent').hist).toBe('');
    expect(splitHistory('Gait: Normal').hist).toBe('');
  });
});
