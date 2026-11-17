import { describe, expect, it } from 'vitest';
import { checkRx } from '../src/lib/safety';
import { item, rx } from './helpers';

const ix = (p: ReturnType<typeof rx>, o = {}) => checkRx(p, o).filter((w) => w.ruleId);
const ids = (p: ReturnType<typeof rx>, o = {}) => ix(p, o).map((w) => w.ruleId);

describe('interaction checker', () => {
  it('flags two NSAIDs as danger', () => {
    const w = ix(rx([item('Diclofenac'), item('Etoricoxib')]));
    expect(w.map((x) => x.ruleId)).toContain('nsaid-nsaid');
    expect(w.find((x) => x.ruleId === 'nsaid-nsaid')!.level).toBe('danger');
  });
  it('reads ongoing warfarin from Comorbidities', () => {
    expect(ids(rx([item('Diclofenac')], { comorb: 'on warfarin' }))).toContain('nsaid-anticoag');
  });
  it('NSAID + steroid is quiet when a PPI is already there', () => {
    expect(ids(rx([item('Diclofenac'), item('Prednisolone')]))).toContain('nsaid-steroid');
    expect(ids(rx([item('Diclofenac'), item('Prednisolone'), item('Pantoprazole')]))).not.toContain('nsaid-steroid');
  });
  it('fluoroquinolone with steroid and with calcium', () => {
    const r = ids(rx([item('Ciprofloxacin'), item('Prednisolone'), item('Calcium carbonate')]));
    expect(r).toContain('fq-steroid'); expect(r).toContain('fq-cation');
  });
  it('tramadol + benzodiazepine is danger; age 70 adds caution', () => {
    const w = ix(rx([item('Tramadol'), item('Clonazepam')], { age: '70' }));
    expect(w.find((x) => x.ruleId === 'opioid-benzo')!.level).toBe('danger');
    expect(w.map((x) => x.ruleId)).toContain('age-benzo');
  });
  it('kidney disease with an NSAID is danger', () => {
    const w = ix(rx([item('Aceclofenac')], { comorb: 'CKD, hypertension' }));
    expect(w.find((x) => x.ruleId === 'ctx-nsaid-kidney')!.level).toBe('danger');
    expect(w.map((x) => x.ruleId)).toContain('ctx-nsaid-cvs');
  });
  it('ignores topical NSAIDs and a single tablet carrying two ingredients', () => {
    expect(ids(rx([item('Diclofenac', { route: 'Topical', form: 'Gel' }), item('Warfarin')]))).not.toContain('nsaid-anticoag');
    const combo = item('Aceclofenac', { ingredients: [{ name: 'Aceclofenac', strength: '' }, { name: 'Paracetamol', strength: '' }] });
    expect(ids(rx([combo]))).toEqual([]);
  });
  it('a muted rule stays quiet and a custom rule fires', () => {
    expect(ids(rx([item('Diclofenac'), item('Etoricoxib')]), { muted: ['nsaid-nsaid'] })).not.toContain('nsaid-nsaid');
    const w = checkRx(rx([item('Pregabalin'), item('Duloxetine')]), { custom: [{ id: 'c1', a: 'pregabalin', b: 'duloxetine', level: 'warn', note: 'dizziness' }] });
    expect(w.some((x) => x.ruleId === 'c1' && /Dizziness/.test(x.text))).toBe(true);
  });
  it('every built-in rule id is unique and points at real classes', async () => {
    const { RULES, CTX_RULES, AGE_RULES, CLASSES } = await import('../src/data/interactions');
    const all = [...RULES, ...CTX_RULES, ...AGE_RULES].map((r) => r.id);
    expect(new Set(all).size).toBe(all.length);
    for (const r of RULES) { expect(CLASSES[r.a]).toBeTruthy(); expect(CLASSES[r.b]).toBeTruthy(); }
    for (const r of [...CTX_RULES, ...AGE_RULES]) expect(CLASSES[r.cls]).toBeTruthy();
  });
});
