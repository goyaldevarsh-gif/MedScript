import { describe, expect, it } from 'vitest';
import { ageYears, composeAge, fmtAge, fmtAgePdf, ovAge, parseAge } from '../src/lib/age';
describe('age in years, months and days', () => {
  it('keeps old plain numbers working', () => {
    expect(ageYears('40', 'Y')).toBe(40); expect(ageYears('6', 'M')).toBeCloseTo(0.5); expect(fmtAge('40', 'Y')).toBe('40y'); expect(fmtAge('5', 'M')).toBe('5m');
  });
  it('reads mixed ages', () => {
    expect(parseAge('6y 5m')).toEqual({ y: 6, m: 5, d: 0 }); expect(parseAge('5m 7d')).toEqual({ y: 0, m: 5, d: 7 }); expect(parseAge('12d')).toEqual({ y: 0, m: 0, d: 12 });
    expect(ageYears('6y 5m')).toBeCloseTo(6 + 5 / 12); expect(ageYears('abc')).toBeNaN(); expect(ageYears('')).toBeNaN();
  });
  it('composes and formats', () => {
    expect(composeAge({ y: 40 })).toEqual({ age: '40', ageUnit: 'Y' }); expect(composeAge({ m: 5 })).toEqual({ age: '5', ageUnit: 'M' });
    expect(composeAge({ y: 6, m: 5 })).toEqual({ age: '6y 5m', ageUnit: 'Y' }); expect(composeAge({ m: 5, d: 7 }).age).toBe('5m 7d'); expect(composeAge({ d: 12 }).age).toBe('12d'); expect(composeAge({}).age).toBe('');
    expect(fmtAgePdf('6y 5m')).toBe('6 Y 5 M'); expect(fmtAgePdf('40', 'Y')).toBe('40 Y');
  });
  it('gives OrthoVault a plain number', () => {
    expect(ovAge('6y 5m')).toEqual({ age: '6', ageUnit: 'Y' }); expect(ovAge('5m 7d')).toEqual({ age: '5', ageUnit: 'M' }); expect(ovAge('40', 'Y')).toEqual({ age: '40', ageUnit: 'Y' });
  });
});
