import { describe, expect, it } from 'vitest';
import { pedDose } from '../src/lib/pedDose';
import { item } from './helpers';

const syrup = (g: string, strength: string, o = {}) => item(g, { strength, form: 'Syrup', doseUnit: 'mL', doseQty: 5, ingredients: [{ name: g, strength }], ...o });

describe('paediatric dose hint', () => {
  it('paracetamol 18 kg on 125 mg/5 mL syrup is about 11 mL', () => {
    const h = pedDose(syrup('Paracetamol', '125 mg/5 mL'), 18)!;
    expect(h.use).toMatchObject({ qty: 11, unit: 'mL' });
    expect(h.text).toMatch(/270 mg/);
  });
  it('flags a dose above the daily maximum', () => {
    const h = pedDose(syrup('Paracetamol', '250 mg/5 mL', { doseQty: 10, freq: 'QID' }), 12)!;
    expect(h.status).toBe('high');
  });
  it('tablets round to half a tablet', () => {
    const h = pedDose(item('Ibuprofen', { strength: '200 mg', ingredients: [{ name: 'Ibuprofen', strength: '200 mg' }] }), 20)!;
    expect(h.use).toMatchObject({ qty: 1, unit: 'tablet' });
  });
  it('caps the dose at the adult maximum', () => {
    const h = pedDose(item('Ibuprofen', { strength: '200 mg', ingredients: [{ name: 'Ibuprofen', strength: '200 mg' }] }), 55)!;
    expect(h.text).toMatch(/about 400 mg/);
  });
  it('stays silent for unknown medicines, missing or absurd weight', () => {
    expect(pedDose(item('Aceclofenac'), 20)).toBeNull();
    expect(pedDose(syrup('Paracetamol', '125 mg/5 mL'), 0)).toBeNull();
    expect(pedDose(syrup('Paracetamol', '125 mg/5 mL'), 120)).toBeNull();
  });
});
