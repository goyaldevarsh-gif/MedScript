import { describe, expect, it } from 'vitest';
import { findPatients } from '../src/lib/find';
const P = [
  { name: 'Ram Kumar Sharma', phone: '9876500001', pid: 'P-1' }, { name: 'Sita Devi', phone: '9812345678', pid: 'P-2' },
  { name: 'Ramesh Gupta', phone: '', pid: 'P-3' }, { name: 'Kumar Ram', phone: '9000011111', pid: 'P-12' },
];
const names = (q: string) => findPatients(P, q).map((p) => p.name);
describe('finding a returning patient', () => {
  it('by full mobile, however it is typed', () => {
    for (const q of ['9876500001', '98765 00001', '+91 98765-00001', '091 9876500001']) expect(names(q)).toEqual(['Ram Kumar Sharma']);
  });
  it('by last digits of the mobile', () => { expect(names('5678')).toEqual(['Sita Devi']); expect(names('99')).toEqual([]); });
  it('by part of the name, any word order, start-of-word first', () => {
    expect(names('ram kumar')).toEqual(['Ram Kumar Sharma', 'Kumar Ram']); expect(names('sharma')).toEqual(['Ram Kumar Sharma']); expect(names('ramesh')).toEqual(['Ramesh Gupta']);
    expect(names('ram')).toEqual(['Ram Kumar Sharma', 'Ramesh Gupta', 'Kumar Ram']);
  });
  it('name and mobile together must both agree', () => { expect(names('ram 500001')).toEqual(['Ram Kumar Sharma']); expect(names('sita 500001')).toEqual([]); });
  it('patient ID still works, empty and junk find nothing', () => { expect(names('P-2')).toEqual(['Sita Devi']); expect(names('')).toEqual([]); expect(names('zzz')).toEqual([]); });
});
