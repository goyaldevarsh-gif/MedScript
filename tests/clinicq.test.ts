import { describe, expect, it } from 'vitest';
import { liveRows, seenSync, toDeskIn, waLink, type CqAppt } from '../src/lib/clinicqLogic';
import { DESK_RULES } from '../src/lib/desk';

const base: CqAppt = { id: 'a1', clinicId: 'c', doctorId: 'dg', date: '2026-12-01', time: '16:15', type: 'OPD', name: '  Amit Sharma ', age: '34', phone: '+91 98290 12345', token: 3, status: 'waiting' };

describe('ClinicQ booking → desk entry', () => {
  it('maps only the fields the desk knows and nothing else', () => {
    const e = toDeskIn(base);
    const allowed = (/hasOnly\(\[([^\]]+)\]/.exec(DESK_RULES)![1]).replace(/['\s]/g, '').split(',');
    for (const k of Object.keys(e)) expect(allowed).toContain(k);
    expect(e.name).toBe('Amit Sharma'); expect(e.phone).toBe('9829012345'); expect(e.sex).toBe(''); expect(e.allergies).toBe('');
    expect(e.reason).toBe('ClinicQ 4:15 PM · OPD');
  });
  it('keeps the patient\'s reason and marks known patients as follow-up', () => {
    const e = toDeskIn({ ...base, reason: 'knee pain' }, [{ n: 'Amit', p: '9829012345', a: '34', u: 'Y', s: 'Male', d: '2026-10-01' }]);
    expect(e.reason).toBe('ClinicQ 4:15 PM · OPD — knee pain'); expect(e.followUp).toBe(true);
    expect(toDeskIn(base, []).followUp).toBe(false);
  });
  it('walk-ins are tagged as walk-in', () => { expect(toDeskIn({ ...base, walkIn: true }).reason).toContain('walk-in'); });
  it('long names are cut to the desk limit', () => { expect(toDeskIn({ ...base, name: 'x'.repeat(300) }).name.length).toBeLessThan(100); });
});

describe('live list for patients\' phones', () => {
  it('lists only arrived + waiting, in time then token order, per doctor-day', () => {
    const r = liveRows([
      { ...base, id: '1', token: 2, time: '16:30', arrivedAt: 1 }, { ...base, id: '2', token: 1, time: '16:00', arrivedAt: 1 },
      { ...base, id: '3', token: 3, time: '16:15' }, { ...base, id: '4', token: 4, time: '16:45', arrivedAt: 1, status: 'seen' },
    ]);
    expect(r['dg_2026-12-01']).toEqual([{ t: 1, time: '16:00' }, { t: 2, time: '16:30' }]);
  });
  it('keeps an empty list when everyone has been seen, so old data is cleared', () => {
    expect(liveRows([{ ...base, arrivedAt: 1, status: 'seen' }])['dg_2026-12-01']).toEqual([]);
  });
});

describe('status follows the doctor\'s waiting list', () => {
  const linked = { ...base, deskDocId: 'q1', arrivedAt: 1 };
  it('Seen on the desk entry → booking becomes seen', () => { expect(seenSync([linked], [{ id: 'q1', status: 'seen' }])).toEqual([{ id: 'a1', status: 'seen' }]); });
  it('put back on the list → booking becomes waiting again', () => { expect(seenSync([{ ...linked, status: 'seen' }], [{ id: 'q1', status: 'waiting' }])).toEqual([{ id: 'a1', status: 'waiting' }]); });
  it('no change, unlinked or cancelled bookings are left alone', () => {
    expect(seenSync([linked], [{ id: 'q1', status: 'waiting' }])).toEqual([]);
    expect(seenSync([base], [{ id: 'q1', status: 'seen' }])).toEqual([]);
    expect(seenSync([{ ...linked, status: 'cancelled' }], [{ id: 'q1', status: 'seen' }])).toEqual([]);
    expect(seenSync([linked], [])).toEqual([]);
  });
});

describe('WhatsApp reminder', () => {
  it('builds a wa.me link with the last 10 digits', () => { expect(waLink(base, 'My Clinic', 'Dr G')).toMatch(/^https:\/\/wa\.me\/919829012345\?text=/); });
});
