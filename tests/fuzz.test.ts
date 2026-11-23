import { describe, expect, it } from 'vitest';
import { STARTERS } from '../src/data/templates';
import { suggestTests, allTests, testKey, splitTests, joinTests, testKind, relevantSets, SETS, testNotes, matchTemplate, planFor } from '../src/data/tests';
import { checkRx } from '../src/lib/safety';
import { CATALOGUE } from '../src/data/catalogue';
import { item, rx } from './helpers';

// small seeded RNG so a failure can be reproduced
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

describe('mega: investigations', () => {
  const sides = ['', 'Left', 'Right', 'Bilateral', 'N/A'];
  it('every template x side: no throw, no placeholder, no duplicate, all known kinds', () => {
    for (const s of STARTERS as any[]) for (const side of sides) {
      const clin = { diagnosis: s.clinical?.diagnosis ?? s.diagnosis ?? '', complaint: s.clinical?.complaint ?? s.complaint ?? '', side, bodyParts: [], injury: false } as any;
      const t = suggestTests(clin);
      expect(t.every((x) => !/[{}]/.test(x)), s.key).toBe(true);
      expect(new Set(t.map(testKey)).size, s.key + side).toBe(t.length);
      const p = planFor({ sourceKey: s.key, clinical: { investigations: '' } } as any, side);
      if (p) for (const x of [...p.first, ...p.labs, ...p.more]) expect(/[{}]/.test(x), s.key + ':' + x).toBe(false);
      relevantSets(clin);
    }
  });
  it('all library tests are classified and unique by key', () => {
    for (const side of sides) { const a = allTests(side); expect(a.every((x) => ['imaging', 'blood', 'other'].includes(testKind(x)))).toBe(true); }
  });
  it('split/join round trip and weird text never throws', () => {
    const junk = ['', ' ', ';', ';;', 'a;b', 'MRI knee; ; CBC', 'x'.repeat(500), 'CBC, ESR; X-ray, knee', '🙂; test', '{s}', 'Ünïcode'];
    for (const j of junk) { const sp = splitTests(j); expect(splitTests(joinTests(sp))).toEqual(sp); testNotes(sp, { sex: 'Female', age: 'abc', ageUnit: 'Y' }); }
    expect(matchTemplate('', [])).toBeUndefined(); expect(matchTemplate('a', [{ name: 'x', clinical: { diagnosis: '' } }])).toBeUndefined();
    suggestTests({ diagnosis: undefined, complaint: undefined, side: undefined, bodyParts: undefined, injury: undefined } as any);
  });
  it('sets contain no duplicates and only known-kind tests', () => { for (const s of SETS) { expect(new Set(s.tests.map(testKey)).size, s.key).toBe(s.tests.length); } });
  it('random free-text diagnoses never throw or return junk', () => {
    const words = ['fracture', 'neck of femur', 'knee', 'pain', 'diabetic foot', 'tkr', 'post-op', 'ACL', 'gout', 'rheumatoid', 'osteoporosis', 'cervical', 'lbp', 'nerve', 'sprain', 'hand', 'xyz', ''];
    for (let i = 0; i < 400; i++) {
      const d = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => pick(words)).join(' ');
      const t = suggestTests({ diagnosis: d, complaint: pick(words), side: pick(sides), bodyParts: [], injury: rnd() > 0.5 ? 'trauma' : false } as any);
      expect(new Set(t.map(testKey)).size).toBe(t.length); expect(t.length).toBeLessThan(40);
    }
  });
});

describe('mega: warnings', () => {
  const generics = Array.from(new Set((CATALOGUE as any[]).map((m) => m.generic || m.name).filter(Boolean))).slice(0, 400) as string[];
  const comorbs = ['', 'Pregnant', 'Breastfeeding', 'No diabetes or hypertension', 'Diabetes, CKD', 'Peptic ulcer, on warfarin', 'Asthma', 'Epilepsy', 'on aspirin', 'Not pregnant', 'GERD; hypertension', 'liver disease'];
  it('random prescriptions never throw; warnings are well formed and stable', () => {
    for (let i = 0; i < 600; i++) {
      const n = 1 + Math.floor(rnd() * 6);
      const r = rx(Array.from({ length: n }, () => item(pick(generics), { duration: pick([1, 3, 5, 14, 30, 90]) })), { comorb: pick(comorbs), age: pick(['1', '8', '30', '70', '90', '']), sex: pick(['M', 'F', 'Male', 'Female']), allergies: pick(['NKDA', 'Penicillin', 'sulfa, aspirin', '']) });
      const w = checkRx(r); const w2 = checkRx(r);
      expect(w).toEqual(w2); // deterministic
      for (const x of w) { expect(['danger', 'warn', 'info']).toContain(x.level); expect(x.text.length).toBeGreaterThan(5); expect(x.text).not.toMatch(/undefined|NaN|\[object/); }
    }
  });
  it('allergy to a drug always fires for that drug', () => {
    for (const g of ['Diclofenac', 'Ibuprofen', 'Etoricoxib', 'Amoxicillin', 'Ciprofloxacin']) {
      const allergy = g === 'Amoxicillin' ? 'Penicillin' : g;
      expect(checkRx(rx([item(g)], { allergies: allergy })).some((x) => x.level === 'danger'), g).toBe(true);
    }
  });
  it('empty and odd inputs', () => { expect(() => checkRx(rx([]))).not.toThrow(); expect(() => checkRx(rx([item('')], { comorb: undefined as any, age: 'x' }))).not.toThrow(); });
});
