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
