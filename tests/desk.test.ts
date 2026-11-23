import { describe, expect, it } from 'vitest';
import { DESK_RULES, deskDay, deskMsg, newDeskId } from '../src/lib/desk';
import { enc, decodeDesk } from '../src/lib/orthovault';

describe('reception desk', () => {
  it('desk ids are long, random and url-safe', () => {
    const a = newDeskId(), b = newDeskId();
    expect(a).toMatch(/^[a-z0-9]{20,40}$/); expect(a).not.toBe(b);
  });
  it('day key is local yyyy-mm-dd, so tokens restart each day', () => {
    expect(deskDay(new Date(2026, 10, 3))).toBe('2026-11-03'); expect(deskDay(new Date(2026, 0, 31))).toBe('2026-01-31');
  });
  it('desk entries survive the hand-off to the builder', () => {
    const e = { name: 'Sita Devi', reason: 'Knee pain', weight: '68' };
    expect(decodeDesk(enc(e))).toMatchObject(e); expect(decodeDesk('garbage')).toBeNull(); expect(decodeDesk(enc({ name: ' ' }))).toBeNull();
  });
  it('errors are written for the receptionist, rules never touch other data', () => {
    expect(deskMsg({ code: 'permission-denied' })).toMatch(/not switched on/); expect(deskMsg({ code: 'timeout' })).toMatch(/timed out/);
    const paths = [...DESK_RULES.matchAll(/match (\S+)/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(0); for (const p of paths) expect(p.startsWith('/desks/')).toBe(true);
    expect(DESK_RULES).not.toMatch(/users\//);
  });
});

import { matchPatient, mergeAllergy } from '../src/lib/desk';
describe('desk safety', () => {
  const P = (name: string, phone: string, age = '', sex = '') => ({ name, phone, age, sex });
  it('same name but different phone is a different person', () => {
    expect(matchPatient([P('Ram Kumar', '9876500001', '40', 'Male')], { name: 'Ram Kumar', phone: '9999900002' })).toBeUndefined();
  });
  it('phone matches regardless of spelling of the name', () => {
    const a = P('Ram Kumar', '9876500001'); expect(matchPatient([a], { name: 'Ramkumar', phone: '+91 98765 00001' })).toBe(a);
  });
  it('no phone: needs same name, compatible age/sex and only one candidate', () => {
    const a = P('Sita Devi', '', '60', 'Female');
    expect(matchPatient([a], { name: 'sita devi', age: '60', sex: 'Female' })).toBe(a);
    expect(matchPatient([a], { name: 'Sita Devi', age: '25' })).toBeUndefined();
    expect(matchPatient([a, P('Sita Devi', '', '61', 'Female')], { name: 'Sita Devi', age: '60' })).toBeUndefined();
    expect(matchPatient([a], { name: '', phone: '' })).toBeUndefined();
  });
  it('a recorded allergy is never wiped', () => {
    expect(mergeAllergy('Penicillin', 'none')).toBe('Penicillin'); expect(mergeAllergy('Penicillin', '')).toBe('Penicillin');
    expect(mergeAllergy('', 'Sulfa')).toBe('Sulfa'); expect(mergeAllergy('Penicillin', 'Sulfa')).toBe('Penicillin; Sulfa');
    expect(mergeAllergy('Penicillin, Sulfa', 'penicillin')).toBe('Penicillin, Sulfa');
  });
  it('rules only allow the desk fields and never reach users/', () => {
    expect(DESK_RULES).toMatch(/hasOnly\(\['name'/); expect(DESK_RULES).not.toMatch(/if true/); expect(DESK_RULES).not.toMatch(/users/);
  });
});

import { ccText } from '../src/lib/orthovault';
describe('what OrthoVault receives', () => {
  const rx = (o: object) => ({ patient: { allergies: 'Penicillin' }, clinical: { complaint: 'Knee pain', examination: 'ROM 0-110\nLachman +', investigations: 'MRI knee' }, ...o }) as never;
  it('extra clinical lines ride only in the complaint text', () => {
    expect(ccText(rx({}))).toBe('Knee pain\nAllergy: Penicillin\nExamination: ROM 0-110; Lachman +\nInvestigations advised: MRI knee');
  });
  it('nothing extra when nothing was filled', () => {
    expect(ccText({ patient: { allergies: '' }, clinical: { complaint: 'Back pain', examination: '', investigations: '' } } as never)).toBe('Back pain');
  });
});
