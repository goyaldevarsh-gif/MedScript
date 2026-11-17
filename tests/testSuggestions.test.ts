import { describe, expect, it } from 'vitest';
import { suggestTests, splitTests, testKey, allTests } from '../src/data/tests';

const c = (diagnosis: string, side: any = 'N/A', o: any = {}) => ({ diagnosis, complaint: '', side, bodyParts: [], injury: '' as any, ...o });

describe('test suggestions', () => {
  it('puts the side into the test name', () => {
    expect(suggestTests(c('Osteoarthritis knee', 'Right'))[0]).toBe('X-ray right knee standing AP and lateral');
  });
  it('shows plain X-rays before MRI/CT for a fracture, and CT before MRI', () => {
    const s = suggestTests(c('Scaphoid fracture', 'Right'));
    const first = (re: RegExp) => s.findIndex((t) => re.test(t));
    expect(first(/^X-ray/)).toBe(0);
    expect(first(/^CT/)).toBeLessThan(first(/^MRI/));
  });
  it('for wear-and-tear it prefers USG/MRI over CT', () => {
    const s = suggestTests(c('Rotator cuff tendinopathy', 'Left'));
    expect(s.findIndex((t) => /^MRI/.test(t))).toBeLessThan(s.findIndex((t) => /^CT/.test(t)));
  });
  it('never lists the standing and plain version of one film together', () => {
    for (const dx of ['Osteoarthritis knee', 'Tibial plateau fracture', 'Knee collateral ligament sprain', 'Plantar fasciitis', 'Ankle fracture']) {
      const keys = suggestTests(c(dx, 'Right')).map(testKey);
      expect(new Set(keys).size, dx).toBe(keys.length);
    }
    expect(suggestTests(c('Tibial plateau fracture', 'Right')).join('|')).not.toMatch(/standing/);
  });
  it('a treated fracture gets films only, no MRI or USG', () => {
    const s = suggestTests(c('Intertrochanteric fracture femur - post-operative', 'Left'));
    expect(s.some((t) => /^(MRI|USG)/.test(t))).toBe(false);
  });
  it('lab sets follow the problem', () => {
    expect(suggestTests(c('Gout'))).toContain('Serum uric acid');
    expect(suggestTests(c('Osteoporosis'))).toContain('DEXA scan (spine and hip)');
  });
  it('is empty when nothing is entered; the search list always has the common tests', () => {
    expect(suggestTests(c(''))).toEqual([]);
    expect(allTests('Right')).toEqual(expect.arrayContaining(['CBC', 'MRI right knee']));
  });
  it('splits and matches typed tests loosely', () => {
    expect(splitTests('CBC; ESR\nCRP')).toEqual(['CBC', 'ESR', 'CRP']);
    expect(testKey('X-ray knee standing AP and lateral')).toBe(testKey('X-ray right knee AP and lateral'));
  });
});
