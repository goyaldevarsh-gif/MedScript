import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const sentIds = new Set<string>(); const calls: string[] = [];
vi.mock('../src/lib/ovcloud', () => ({ sendRx: async (r: { id: string }) => { calls.push(r.id); }, markSent: (id: string) => sentIds.add(id), wasSent: (id: string) => sentIds.has(id) }));
import { db } from '../src/lib/db';
import { flushOv } from '../src/lib/ovsync';

const rx = (id: string, patientId: string, over: object = {}) => ({ id, patientId, status: 'final', updatedAt: Number(id.slice(1)), authorizedAt: Number(id.slice(1)), items: [{ id: 'm' }], patient: { name: 'X' }, clinical: {}, ...over }) as never;
describe('OrthoVault follow-through', () => {
  beforeEach(async () => { sentIds.clear(); calls.length = 0; await db.prescriptions.clear(); });
  it('a patient already sent to OrthoVault gets later Rx sent automatically, oldest first; others stay in MedScript only', async () => {
    await db.prescriptions.bulkPut([rx('r1', 'A'), rx('r3', 'A'), rx('r2', 'A'), rx('r5', 'B'), rx('r6', 'A', { items: [] }), rx('r7', 'A', { status: 'draft' })]);
    sentIds.add('r1');
    await flushOv('doc@x.com');
    expect(calls).toEqual(['r2', 'r3']);
  });
  it('nothing goes when the patient was never sent', async () => {
    await db.prescriptions.bulkPut([rx('r1', 'B')]); await flushOv('doc@x.com'); expect(calls).toEqual([]);
  });
});

import { ovSendable } from '../src/lib/orthovault';
describe('note-only visit', () => {
  it('sends with advice or diagnosis, not when empty', () => {
    const base = { items: [], clinical: { advice: [], diagnosis: '' } } as never;
    expect(ovSendable(base)).toBe(false);
    expect(ovSendable({ items: [], clinical: { advice: ['Rest'], diagnosis: '' } } as never)).toBe(true);
    expect(ovSendable({ items: [], clinical: { advice: [], diagnosis: 'ACL tear' } } as never)).toBe(true);
    expect(ovSendable({ items: [{ id: 'm' }], clinical: {} } as never)).toBe(true);
  });
});
