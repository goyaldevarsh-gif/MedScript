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
