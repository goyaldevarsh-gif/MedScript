import type { Prescription, RxItem } from '../src/lib/types';
export const item = (generic: string, o: Partial<RxItem> = {}): RxItem => ({
  id: generic + Math.random(), brand: '', generic, ingredients: [{ name: generic, strength: '' }], strength: '', form: 'Tablet', route: 'Oral', manufacturer: '', verified: true,
  doseQty: 1, doseText: '', doseUnit: 'tablet', freq: 'BD', freqCustom: '', timesPerDay: 2, odSlot: 'morning', timing: '', duration: 5, durationUnit: 'days', sosMax: null, useTaper: false, taper: [],
  qtyOverride: '', instructionOverride: '', notes: '', ...o,
} as RxItem);
export const rx = (items: RxItem[], o: { comorb?: string; age?: string; allergies?: string; dx?: string; sex?: string } = {}): Prescription => ({
  patient: { name: 'Test', age: o.age ?? '40', ageUnit: 'Y', sex: o.sex ?? 'M', phone: '9876543210', allergies: o.allergies ?? 'NKDA', weight: '' },
  clinical: { diagnosis: o.dx ?? 'Test', complaint: '', comorbidities: o.comorb ?? '', side: 'N/A', examination: '', investigations: '', advice: [] },
  items, lang: 'en',
} as unknown as Prescription);
