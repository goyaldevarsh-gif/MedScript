import { describe, expect, it } from 'vitest';
import { checkRx } from '../src/lib/safety';
import { COND_CHIPS, dropWomenStatus, showWomenChips, toggleChip } from '../src/lib/conditions';
import { item, rx } from './helpers';

const ids = (r: ReturnType<typeof rx>, opts = {}) => checkRx(r, opts).map((w) => w.ruleId).filter(Boolean) as string[];
const chip = (l: string) => COND_CHIPS.find((c) => c.label === l)!;

describe('pregnancy and breastfeeding', () => {
  it('flags the medicines that matter in pregnancy', () => {
    const r = rx([item('Etoricoxib'), item('Thiocolchicoside'), item('Doxycycline'), item('Ciprofloxacin'), item('Methotrexate')], { comorb: 'Pregnant' });
    const got = ids(r);
    for (const id of ['ctx-preg-nsaid', 'ctx-preg-thiocol', 'ctx-preg-tetra', 'ctx-preg-fq', 'ctx-preg-teratogen']) expect(got).toContain(id);
    expect(checkRx(r).find((w) => w.ruleId === 'ctx-preg-thiocol')?.level).toBe('danger');
    expect(checkRx(r).find((w) => w.ruleId === 'ctx-preg-thiocol')?.text).toMatch(/^Pregnant: Thiocolchicoside/);
  });
  it('stays quiet when she is not marked pregnant or breastfeeding', () => {
    expect(ids(rx([item('Etoricoxib'), item('Thiocolchicoside')], { comorb: 'Diabetes' })).filter((x) => /preg|bf/.test(x))).toEqual([]);
  });
  it('breastfeeding has its own rules, and NSAIDs are not flagged', () => {
    const got = ids(rx([item('Etoricoxib'), item('Thiocolchicoside'), item('Tramadol')], { comorb: 'Breastfeeding' }));
    expect(got).toContain('ctx-bf-thiocol'); expect(got).toContain('ctx-bf-opioid'); expect(got).not.toContain('ctx-preg-nsaid');
  });
  it('a muted rule does not fire', () => {
    expect(ids(rx([item('Thiocolchicoside')], { comorb: 'Pregnant' }), { muted: ['ctx-preg-thiocol'] })).not.toContain('ctx-preg-thiocol');
  });
  it('topical NSAID gel is ignored in pregnancy', () => {
    expect(ids(rx([item('Diclofenac', { form: 'Gel', route: 'Topical' })], { comorb: 'Pregnant' }))).not.toContain('ctx-preg-nsaid');
  });
});

describe('course length', () => {
  it('thiocolchicoside over 7 days warns, 7 days does not', () => {
    expect(ids(rx([item('Thiocolchicoside', { duration: 10 })]))).toContain('course-thiocol');
    expect(ids(rx([item('Thiocolchicoside', { duration: 7 })]))).not.toContain('course-thiocol');
  });
  it('weeks are converted to days', () => {
    expect(ids(rx([item('Etoricoxib', { duration: 3, durationUnit: 'weeks' })]))).toContain('course-nsaid');
  });
  it('as-needed, tapered and injected courses are skipped', () => {
    expect(ids(rx([item('Prednisolone', { duration: 30, useTaper: true })]))).not.toContain('course-steroid');
    expect(ids(rx([item('Etoricoxib', { duration: 30, freq: 'SOS' })]))).not.toContain('course-nsaid');
    expect(ids(rx([item('Diclofenac', { duration: 30, form: 'Injection', route: 'IM' })]))).not.toContain('course-nsaid');
  });
});

describe('NSAID without stomach protection', () => {
  const gi = (items: any[], o = {}) => ids(rx(items, o)).includes('nsaid-no-gi');
  it('fires for a week or more, or an older patient', () => {
    expect(gi([item('Etoricoxib', { duration: 7 })])).toBe(true);
    expect(gi([item('Etoricoxib', { duration: 3 })], { age: '62' })).toBe(true);
  });
  it('stays quiet for a short course in a younger patient', () => {
    expect(gi([item('Etoricoxib', { duration: 5 })])).toBe(false);
  });
  it('PPI, vonoprazan or famotidine count as cover; an NSAID+PPI tablet too', () => {
    for (const p of ['Pantoprazole', 'Vonoprazan', 'Famotidine']) expect(gi([item('Etoricoxib', { duration: 14 }), item(p)])).toBe(false);
    expect(gi([item('Naproxen + Esomeprazole', { duration: 14, ingredients: [{ name: 'Naproxen', strength: '' }, { name: 'Esomeprazole', strength: '' }] })])).toBe(false);
  });
  it('does not repeat itself when a stomach problem is already recorded', () => {
    const got = ids(rx([item('Etoricoxib', { duration: 14 })], { comorb: 'Gastritis' }));
    expect(got).toContain('ctx-nsaid-gi'); expect(got).not.toContain('nsaid-no-gi');
  });
  it('topical NSAID and muted rule are ignored', () => {
    expect(gi([item('Diclofenac', { form: 'Gel', route: 'Topical', duration: 14 })])).toBe(false);
    expect(ids(rx([item('Etoricoxib', { duration: 14 })]), { muted: ['nsaid-no-gi'] })).not.toContain('nsaid-no-gi');
  });
});

describe('condition chips', () => {
  it('toggle on and off without touching other words', () => {
    let v = 'Hypertension on telmisartan';
    v = toggleChip(v, chip('Diabetes')); expect(v).toBe('Hypertension on telmisartan, Diabetes');
    v = toggleChip(v, chip('Diabetes')); expect(v).toBe('Hypertension on telmisartan');
    expect(toggleChip(v, chip('Hypertension'))).toBe(v); // typed by hand: left alone
  });
  it('a chip feeds the existing safety rules', () => {
    expect(ids(rx([item('Etoricoxib')], { comorb: toggleChip('', chip('Kidney disease')) }))).toContain('ctx-nsaid-kidney');
    expect(ids(rx([item('Prednisolone')], { comorb: toggleChip('', chip('Diabetes')) }))).toContain('ctx-steroid-dm');
  });
  it('pregnancy chips only for women of child-bearing age', () => {
    expect(showWomenChips({ sex: 'Female', age: '22', ageUnit: 'Y' })).toBe(true);
    expect(showWomenChips({ sex: 'Female', age: '', ageUnit: 'Y' })).toBe(true);
    expect(showWomenChips({ sex: 'Male', age: '22', ageUnit: 'Y' })).toBe(false);
    expect(showWomenChips({ sex: 'Female', age: '60', ageUnit: 'Y' })).toBe(false);
    expect(showWomenChips({ sex: 'Female', age: '8', ageUnit: 'Y' })).toBe(false);
  });
  it('pregnancy is not carried into the next visit, other conditions are', () => {
    expect(dropWomenStatus('Diabetes, Pregnant, Asthma')).toBe('Diabetes, Asthma');
    expect(dropWomenStatus('Breastfeeding')).toBe('');
  });
});

describe('condition words are matched however they are written', () => {
  it.each([
    ['Etoricoxib', 'Chronic kidney disease', 'ctx-nsaid-kidney'], ['Etoricoxib', 'Diabetic nephropathy', 'ctx-nsaid-kidney'],
    ['Prednisolone', 'Diabetes mellitus', 'ctx-steroid-dm'], ['Prednisolone', 'diabetic', 'ctx-steroid-dm'], ['Prednisolone', 'Infected nonunion', 'ctx-steroid-inf'],
    ['Tramadol', 'Epilepsy', 'ctx-tramadol-seizure'], ['Ciprofloxacin', 'Epilepsy', 'ctx-fq-seizure'], ['Alendronate', 'Oesophagitis', 'ctx-bisphos-gi'],
  ])('%s with "%s" fires %s', (drug, comorb, id) => { expect(ids(rx([item(drug)], { comorb }))).toContain(id); });
});

import { isHidden, warnKey } from '../src/lib/safety';
describe('hiding an alert as not relevant', () => {
  it('hides one alert for this prescription only, never a missing-detail alert', () => {
    const r = rx([item('Thiocolchicoside')], { comorb: 'Pregnant' });
    const ws = checkRx(r); const w = ws.find((x) => x.ruleId === 'ctx-preg-thiocol')!;
    expect(isHidden(w, [warnKey(w)])).toBe(true);
    expect(isHidden(w, [])).toBe(false); expect(isHidden(w, undefined)).toBe(false);
    const other = ws.find((x) => x.ruleId && x.ruleId !== 'ctx-preg-thiocol');
    if (other) expect(isHidden(other, [warnKey(w)])).toBe(false);
    const miss = checkRx(rx([item('Etoricoxib')], { age: '' })).find((x) => x.req)!;
    expect(isHidden(miss, [warnKey(miss)])).toBe(false);
  });
  it('a changed alert (different medicine) is a new alert', () => {
    const a = checkRx(rx([item('Thiocolchicoside')], { comorb: 'Pregnant' })).find((x) => x.ruleId === 'ctx-preg-thiocol')!;
    const b = checkRx(rx([item('Thiocolchicoside'), item('Etoricoxib')], { comorb: 'Pregnant' })).find((x) => x.ruleId === 'ctx-preg-nsaid')!;
    expect(isHidden(b, [warnKey(a)])).toBe(false);
  });
});

describe('audit: negated words do not switch a condition on', () => {
  it.each([
    ['Etoricoxib', 'Not pregnant', 'ctx-preg-nsaid'], ['Etoricoxib', 'Non-pregnant', 'ctx-preg-nsaid'], ['Doxycycline', 'Pregnancy test negative', 'ctx-preg-tetra'],
    ['Prednisolone', 'No diabetes, no hypertension', 'ctx-steroid-dm'], ['Prednisolone', 'Non-diabetic', 'ctx-steroid-dm'], ['Etoricoxib', 'No h/o kidney disease', 'ctx-nsaid-kidney'],
    ['Etoricoxib', 'Not on warfarin', 'nsaid-anticoag'],
  ])('%s with "%s" does not fire %s', (drug, comorb, id) => { expect(ids(rx([item(drug)], { comorb, sex: 'Female', age: '30' }))).not.toContain(id); });
  it.each([
    ['Prednisolone', 'Diabetes not controlled', 'ctx-steroid-dm'], ['Prednisolone', 'Non-insulin dependent diabetes', 'ctx-steroid-dm'], ['Etoricoxib', 'Non-healing gastric ulcer', 'ctx-nsaid-gi'],
    ['Prednisolone', 'No hypertension, diabetes', 'ctx-steroid-dm'], ['Etoricoxib', 'Not well controlled hypertension', 'ctx-nsaid-cvs'],
  ])('%s with "%s" still fires %s', (drug, comorb, id) => { expect(ids(rx([item(drug)], { comorb }))).toContain(id); });
});

describe('audit: interaction rules', () => {
  it('omeprazole only matters with clopidogrel, not aspirin', () => {
    expect(ids(rx([item('Aspirin'), item('Omeprazole')]))).not.toContain('clopidogrel-ppi');
    expect(ids(rx([item('Clopidogrel'), item('Omeprazole')]))).toContain('clopidogrel-ppi');
  });
  it('omeprazole added for a patient who already takes clopidogrel (from Comorbidities)', () => {
    expect(ids(rx([item('Omeprazole')], { comorb: 'on clopidogrel' }))).toContain('clopidogrel-ppi');
  });
  it('the second medicine alone is caught when the first is ongoing: calcium for a patient on levothyroxine', () => {
    expect(ids(rx([item('Calcium carbonate')], { comorb: 'Hypothyroid on levothyroxine' }))).toContain('levo-cation');
  });
  it('tizanidine danger is for ciprofloxacin, not every fluoroquinolone', () => {
    expect(ids(rx([item('Ciprofloxacin'), item('Tizanidine')]))).toContain('fq-tizanidine');
    expect(ids(rx([item('Levofloxacin'), item('Tizanidine')]))).not.toContain('fq-tizanidine');
  });
  it('"iron deficiency" is a condition, not a tablet the patient takes', () => {
    expect(ids(rx([item('Ciprofloxacin')], { comorb: 'Anaemia (iron deficiency)' }))).not.toContain('fq-cation');
    expect(ids(rx([item('Ciprofloxacin')], { comorb: 'on iron tablets' }))).toContain('fq-cation');
  });
});

describe('audit: pregnancy not recorded', () => {
  const ask = (items: any[], o: any) => ids(rx(items, o)).includes('preg-ask');
  it('asks for a woman of child-bearing age given thiocolchicoside, doxycycline or methotrexate', () => {
    for (const d of ['Thiocolchicoside', 'Doxycycline', 'Methotrexate']) expect(ask([item(d)], { sex: 'Female', age: '22' })).toBe(true);
  });
  it('stays quiet for men, children, older women and a recorded answer', () => {
    expect(ask([item('Thiocolchicoside')], { sex: 'Male', age: '22' })).toBe(false);
    expect(ask([item('Thiocolchicoside')], { sex: 'Female', age: '9' })).toBe(false);
    expect(ask([item('Thiocolchicoside')], { sex: 'Female', age: '58' })).toBe(false);
    expect(ask([item('Thiocolchicoside')], { sex: 'Female', age: '22', comorb: 'Not pregnant' })).toBe(false);
    expect(ask([item('Thiocolchicoside')], { sex: 'Female', age: '22', comorb: 'Pregnant' })).toBe(false);
    expect(ask([item('Etoricoxib')], { sex: 'Female', age: '22' })).toBe(false);
  });
  it('can be muted', () => {
    expect(ids(rx([item('Thiocolchicoside')], { sex: 'Female', age: '22' }), { muted: ['preg-ask'] })).not.toContain('preg-ask');
  });
});
