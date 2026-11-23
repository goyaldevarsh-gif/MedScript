import { describe, it, expect } from 'vitest';
import { STARTERS } from '../src/data/templates';
import { TEMPLATE_TESTS, SETS, testKind, testKey, suggestTests, matchTemplate, planFor, relevantSets, testNotes, splitTests } from '../src/data/tests';

const c = (diagnosis: string, extra: any = {}) => ({ diagnosis, complaint: '', side: '', bodyParts: [], injury: false, ...extra } as any);

describe('investigations', () => {
  it('classifies tests', () => {
    expect(testKind('MRI lumbosacral spine')).toBe('imaging');
    expect(testKind('X-ray knee')).toBe('imaging');
    expect(testKind('CBC')).toBe('blood');
    expect(testKind('Nerve conduction study')).toBe('other');
    expect(testKind('ECG')).toBe('other');
  });
  it('NCS and EMG are one test', () => { expect(testKey('NCS / EMG of the lower limb')).toBe(testKey('Nerve conduction study')); });
  it('every curated plan points to a real built-in template', () => {
    const keys = new Set(STARTERS.map((s) => s.key));
    for (const k of Object.keys(TEMPLATE_TESTS)) expect(keys.has(k), k).toBe(true);
  });
  it('sets have tests and a trigger', () => { for (const s of SETS) { expect(s.tests.length).toBeGreaterThan(2); } expect(relevantSets(c('Gout')).map((s) => s.key)).toContain('gout'); });
  it('acute femur shaft fracture gets no MRI/USG', () => {
    const t = suggestTests(c('Fracture shaft femur', { injury: true }));
    expect(t.some((x) => /^(mri|usg)/i.test(x))).toBe(false);
  });
  it('matches template by diagnosis', () => {
    const list = STARTERS.map((s) => ({ name: s.name, clinical: { diagnosis: s.clinical?.diagnosis ?? (s as any).diagnosis ?? '' }, sourceKey: s.key }));
    const m = matchTemplate('Knee osteoarthritis', list as any);
    expect(m).toBeTruthy();
  });
  it('planFor uses curated plan, substitutes side, falls back to own template', () => {
    const p = planFor({ sourceKey: 'knee-oa', clinical: {} } as any, 'Right')!;
    expect(p.first[0]).toMatch(/knee/i); expect(p.fromYours).toBe(false);
    const own = planFor({ clinical: { investigations: 'MRI knee; CBC' } } as any)!;
    expect(own.fromYours).toBe(true); expect(own.first).toEqual(splitTests('MRI knee; CBC'));
    expect(planFor(undefined)).toBeUndefined();
  });
  it('test notes', () => {
    expect(testNotes(['MRI knee']).join()).toMatch(/pacemaker/);
    expect(testNotes(['CT pelvis'], { sex: 'Female', age: '30', ageUnit: 'Y' }).join()).toMatch(/pregnan/);
    expect(testNotes(['CT pelvis'], { sex: 'Male', age: '30', ageUnit: 'Y' }).join()).not.toMatch(/pregnan/);
  });
});
