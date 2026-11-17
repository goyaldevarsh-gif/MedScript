import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, exportAll, importAll } from '../src/lib/db';

const pt = (id: string, name: string, updatedAt: number) => ({ id, pid: id, name, age: '30', ageUnit: 'Y', sex: 'Male', phone: '', allergies: '', weight: '', createdAt: 1, updatedAt });
const rxRow = (id: string, status: 'draft' | 'final', updatedAt: number, dx = 'x') => ({ id, rxNo: status === 'final' ? 'RX-' + id : '', status, patientId: 'p1', patient: pt('p1', 'A', 1), clinical: { diagnosis: dx }, items: [], updatedAt, createdAt: 1 });
const backup = (data: any) => ({ app: 'MedScript', version: 1, exportedAt: new Date().toISOString(), data });

beforeEach(async () => { for (const t of db.tables) await t.clear(); });

describe('backup and restore', () => {
  it('round-trips through export and replace', async () => {
    await db.patients.put(pt('p1', 'Asha', 5) as any); await db.prescriptions.put(rxRow('r1', 'final', 5) as any);
    const out = await exportAll();
    await db.patients.clear(); await db.prescriptions.clear();
    await importAll(JSON.parse(JSON.stringify(out)), 'replace');
    expect((await db.patients.get('p1'))?.name).toBe('Asha'); expect((await db.prescriptions.get('r1'))?.status).toBe('final');
  });
  it('replace keeps the doctor profile when the backup has no settings', async () => {
    await db.settings.put({ key: 'main', value: { doctor: { fullName: 'Dr Keep' } } });
    await importAll(backup({ patients: [pt('p1', 'A', 1)], prescriptions: [] }), 'replace');
    expect((await db.settings.get('main'))?.value.doctor.fullName).toBe('Dr Keep');
  });
  it('refuses a backup with nothing in it, and changes nothing', async () => {
    await db.patients.put(pt('p1', 'Asha', 5) as any);
    await expect(importAll(backup({ patients: [], prescriptions: [] }), 'replace')).rejects.toThrow(/Nothing was changed/);
    expect(await db.patients.count()).toBe(1);
  });
  it('skips rows without an id instead of failing', async () => {
    await importAll(backup({ patients: [{ name: 'no id' }, pt('p2', 'OK', 1)], prescriptions: 'junk' }), 'merge');
    expect(await db.patients.count()).toBe(1);
  });
  it('merge never overwrites a final prescription or a newer patient', async () => {
    await db.prescriptions.put(rxRow('r1', 'final', 10, 'original') as any); await db.patients.put(pt('p1', 'New name', 10) as any);
    await importAll(backup({ patients: [pt('p1', 'Old name', 5)], prescriptions: [rxRow('r1', 'draft', 99, 'tampered')] }), 'merge');
    expect((await db.prescriptions.get('r1'))?.clinical.diagnosis).toBe('original');
    expect((await db.patients.get('p1'))?.name).toBe('New name');
  });
  it('merge brings in new records and newer drafts', async () => {
    await db.prescriptions.put(rxRow('d1', 'draft', 5, 'old draft') as any);
    await importAll(backup({ patients: [], prescriptions: [rxRow('d1', 'draft', 9, 'newer draft'), rxRow('r2', 'final', 3)] }), 'merge');
    expect((await db.prescriptions.get('d1'))?.clinical.diagnosis).toBe('newer draft'); expect(await db.prescriptions.get('r2')).toBeTruthy();
  });
  it('rejects a file that is not a MedScript backup', async () => {
    await expect(importAll({ hello: 1 }, 'merge')).rejects.toThrow(/not a MedScript backup/);
  });
});

describe('damaged rows', () => {
  it('drops prescriptions that would break a screen', async () => {
    const bad = { id: 'bad', status: 'draft', patient: null, clinical: null, items: 'oops', updatedAt: 1, createdAt: 1 };
    await importAll(backup({ patients: [pt('p1', 'A', 1)], prescriptions: [bad, rxRow('good', 'draft', 1)] }), 'merge');
    expect(await db.prescriptions.get('bad')).toBeUndefined(); expect(await db.prescriptions.get('good')).toBeTruthy();
  });
});
