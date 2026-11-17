import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { AppSettings, AuditEntry, DoctorSnapshot, MedMeta, Medicine, Patient, Prescription, RxItem, Template } from './types';
import { defaultSettings } from './defaults';
import { STARTERS } from '../data/templates';
import { CATALOGUE } from '../data/catalogue';
import { sha256, uid } from './util';
import { itemFromMedicine } from './defaults';

class MedDB extends Dexie {
  patients!: Table<Patient, string>;
  prescriptions!: Table<Prescription, string>;
  medicines!: Table<Medicine, string>;
  meta!: Table<MedMeta, string>;
  templates!: Table<Template, string>;
  settings!: Table<{ key: string; value: any }, string>;
  audit!: Table<AuditEntry, string>;
  constructor() {
    super('medscript');
    this.version(1).stores({
      patients: 'id,pid,name,phone,updatedAt',
      prescriptions: 'id,rxNo,patientId,status,updatedAt,createdAt',
      medicines: 'id,generic,brand',
      meta: 'id,favourite,lastUsedAt',
      templates: 'id,name,favourite',
      settings: 'key',
      audit: 'id,ts,rxId',
    });
  }
}
export const db = new MedDB();

/* ---------- Settings ---------- */
function merge<T>(base: T, over: any): T {
  if (over == null) return base;
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return over as T;
  const out: any = { ...base };
  for (const k of Object.keys(over)) out[k] = k in (base as any) ? merge((base as any)[k], over[k]) : over[k];
  return out;
}
export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get('main');
  const out: AppSettings = merge(defaultSettings(), row?.value);
  if (!row?.value?.layout?.nameV2) { out.layout.nameDisplay = 'brand'; out.layout.nameV2 = true; }
  return out;
}
export async function updateSettings(fn: (s: AppSettings) => AppSettings | void): Promise<AppSettings> {
  return db.transaction('rw', db.settings, async () => {
    const cur = await getSettings();
    const next = (fn(cur) as AppSettings) || cur;
    await db.settings.put({ key: 'main', value: next });
    return next;
  });
}
export function useSettings(): AppSettings | undefined {
  return useLiveQuery(() => getSettings(), []);
}

/* ---------- Seed ---------- */
export async function seedIfNeeded() {
  const s = await getSettings();
  const now = Date.now();
  const have = new Set((await db.templates.toArray()).map((t) => t.id));
  const fresh = !s.seeded;
  const add = STARTERS.filter((st) => !have.has('tpl-' + st.key));
  if (add.length) {
    await db.templates.bulkPut(
      add.map((st) => ({
        id: 'tpl-' + st.key, name: st.name, builtIn: true, sourceKey: st.key, icon: st.icon, favourite: fresh && ['knee-oa', 'lbp', 'cervical', 'frozen-shoulder', 'plantar-fasciitis', 'ankle-sprain', 'fracture-fu'].includes(st.key),
        clinical: st.clinical, followUpDays: st.followUpDays, items: [], createdAt: now, updatedAt: now,
      }))
    );
  }
  /* refresh built-in templates the user never edited, so content fixes reach existing installs */
  for (const t of await db.templates.toArray()) {
    const st = t.builtIn ? STARTERS.find((x) => x.key === t.sourceKey) : undefined;
    if (st && t.updatedAt === t.createdAt && JSON.stringify(t.clinical) !== JSON.stringify(st.clinical)) await db.templates.put({ ...t, name: st.name, clinical: st.clinical, followUpDays: st.followUpDays });
  }
  if (fresh) await updateSettings((x) => { x.seeded = true; });
}
export async function resetBuiltInTemplate(id: string) {
  const t = await db.templates.get(id);
  const st = STARTERS.find((s) => s.key === t?.sourceKey);
  if (t && st) await db.templates.put({ ...t, name: st.name, clinical: st.clinical, followUpDays: st.followUpDays, items: [], updatedAt: Date.now() });
}

/* ---------- Patients ---------- */
const pad = (n: number, l: number) => String(n).padStart(l, '0');
export async function peekPatientId(): Promise<string> {
  const s = await getSettings();
  return 'P-' + pad(s.patientCounter + 1, 5);
}
export async function upsertPatient(p: Patient): Promise<Patient> {
  return db.transaction('rw', db.patients, db.settings, async () => {
    const existing = await db.patients.get(p.id);
    let pid = p.pid || existing?.pid || '';
    if (!pid) {
      const s = await getSettings();
      const n = s.patientCounter + 1;
      pid = 'P-' + pad(n, 5);
      await db.settings.put({ key: 'main', value: { ...s, patientCounter: n } });
    }
    const out = { ...p, pid, updatedAt: Date.now(), createdAt: existing?.createdAt || p.createdAt || Date.now() };
    await db.patients.put(out);
    return out;
  });
}

/* ---------- Prescriptions ---------- */
export async function saveDraft(rx: Prescription): Promise<Prescription> {
  const existing = await db.prescriptions.get(rx.id);
  if (existing?.status === 'final') throw new Error('Finalized prescriptions cannot be modified. Duplicate it as a new draft instead.');
  let patient = rx.patient;
  if (patient.name.trim()) patient = await upsertPatient(patient);
  const out: Prescription = { ...rx, patient, patientId: patient.name.trim() ? patient.id : '', updatedAt: Date.now() };
  await db.prescriptions.put(out);
  return out;
}
export async function deleteDraft(id: string) {
  const ex = await db.prescriptions.get(id);
  if (ex && ex.status === 'draft') await db.prescriptions.delete(id);
}
export async function finalizeRx(rx: Prescription, snapshot: DoctorSnapshot, warnings: string[]): Promise<Prescription> {
  const existing = await db.prescriptions.get(rx.id);
  if (existing?.status === 'final') throw new Error('Already finalized.');
  const patient = await upsertPatient(rx.patient);
  return db.transaction('rw', [db.prescriptions, db.settings, db.audit, db.patients, db.meta, db.medicines], async () => {
    const s = await getSettings();
    const n = s.rxCounter + 1;
    const year = new Date().getFullYear();
    const rxNo = `RX-${year}-${pad(n, 5)}`;
    const authorizedAt = Date.now();
    const body = { ...rx, patient, rxNo, status: 'final' as const, authorizedAt, doctorSnapshot: snapshot, warningsAtAuth: warnings, hash: undefined };
    const hash = await sha256(JSON.stringify(body));
    const out: Prescription = { ...body, hash, patientId: patient.id, updatedAt: authorizedAt };
    await db.prescriptions.put(out);
    await db.settings.put({ key: 'main', value: { ...s, rxCounter: n } });
    await db.audit.add({ id: uid(), ts: authorizedAt, event: 'FINALIZED', rxId: out.id, rxNo, hash, details: `Authorised by ${snapshot.doctor.fullName} (Reg. ${snapshot.doctor.regNo}). Patient ${patient.name} (${patient.pid}). Signature:${rx.toggles.signature ? 'on' : 'off'} Stamp:${rx.toggles.stamp ? 'on' : 'off'}.${warnings.length ? ' Warnings acknowledged: ' + warnings.length : ''}` });
    await touchMedicines(out.items, true);
    return out;
  });
}
export async function duplicateRx(id: string, amend = false): Promise<Prescription> {
  const src = await db.prescriptions.get(id);
  if (!src) throw new Error('Not found');
  const now = Date.now();
  const copy: Prescription = {
    ...JSON.parse(JSON.stringify(src)), id: uid(), rxNo: '', status: 'draft', createdAt: now, updatedAt: now,
    authorizedAt: undefined, hash: undefined, doctorSnapshot: undefined, warningsAtAuth: undefined, followUpDate: '', procedures: undefined,
    version: amend ? src.version + 1 : 1, parentId: amend ? src.id : undefined,
  };
  copy.items = copy.items.map((i: RxItem) => ({ ...i, id: uid() }));
  await db.prescriptions.put(copy);
  await db.audit.add({ id: uid(), ts: now, event: amend ? 'AMEND_DRAFT_CREATED' : 'DUPLICATED_AS_DRAFT', rxId: copy.id, rxNo: src.rxNo, details: `Created from ${src.rxNo}` });
  return copy;
}

/* ---------- Medicines ---------- */
const REG_KEYS = ['doseQty', 'doseText', 'doseUnit', 'freq', 'freqCustom', 'timesPerDay', 'odSlot', 'timing', 'duration', 'durationUnit', 'sosMax'] as const;
export async function touchMedicines(items: RxItem[], saveReg = false) {
  const now = Date.now();
  for (const it of items) {
    const id = it.medId || 'custom-' + (it.brand || it.generic).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + it.strength.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const cur = await db.meta.get(id);
    let reg = cur?.reg;
    if (saveReg && !it.useTaper) { reg = {}; for (const k of REG_KEYS) (reg as any)[k] = (it as any)[k]; }
    await db.meta.put({ id, favourite: cur?.favourite || false, lastUsedAt: now, useCount: (cur?.useCount || 0) + 1, reg });
    if (!it.medId && it.generic.trim()) {
      await db.medicines.put({ id, brand: it.brand, generic: it.generic, ingredients: it.ingredients, strength: it.strength, form: it.form, route: it.route, manufacturer: it.manufacturer, verified: false, source: 'custom' });
    }
  }
}
export async function toggleFavourite(id: string) {
  const cur = await db.meta.get(id);
  await db.meta.put({ id, favourite: !cur?.favourite, lastUsedAt: cur?.lastUsedAt || 0, useCount: cur?.useCount || 0, reg: cur?.reg });
}
export async function saveCustomMedicine(m: Omit<Medicine, 'id' | 'verified' | 'source'> & { id?: string }): Promise<Medicine> {
  const med: Medicine = { ...m, id: m.id || 'cust-' + uid(), verified: false, source: 'custom' };
  await db.medicines.put(med);
  return med;
}
export async function deleteCustomMedicine(id: string) { await db.medicines.delete(id); await db.meta.delete(id); }

export function useMedicineIndex() {
  return useLiveQuery(async () => {
    const custom = await db.medicines.toArray();
    const meta = await db.meta.toArray();
    const mm = new Map(meta.map((m) => [m.id, m]));
    const all = [...custom, ...CATALOGUE];
    return { all, meta: mm };
  }, []);
}
export function medicineToItem(m: Medicine): RxItem { return itemFromMedicine(m); }

/* ---------- Backup ---------- */
export async function exportAll() {
  const [patients, prescriptions, medicines, meta, templates, settings, audit] = await Promise.all([
    db.patients.toArray(), db.prescriptions.toArray(), db.medicines.toArray(), db.meta.toArray(), db.templates.toArray(), db.settings.toArray(), db.audit.toArray(),
  ]);
  await updateSettings((s) => { s.lastBackupAt = Date.now(); });
  return { app: 'MedScript', version: 1, exportedAt: new Date().toISOString(), data: { patients, prescriptions, medicines, meta, templates, settings, audit } };
}
export async function importAll(json: any, mode: 'replace' | 'merge') {
  if (!json || json.app !== 'MedScript' || !json.data) throw new Error('This is not a MedScript backup file.');
  const d = json.data;
  const tables: [Table<any, any>, any[]][] = [
    [db.patients, d.patients], [db.prescriptions, d.prescriptions], [db.medicines, d.medicines], [db.meta, d.meta], [db.templates, d.templates], [db.audit, d.audit],
  ];
  await db.transaction('rw', [db.patients, db.prescriptions, db.medicines, db.meta, db.templates, db.settings, db.audit], async () => {
    if (mode === 'replace') { for (const [t] of tables) await t.clear(); await db.settings.clear(); }
    for (const [t, rows] of tables) {
      if (!Array.isArray(rows)) continue;
      if (mode === 'merge' && t === db.prescriptions) {
        for (const r of rows) { const ex = await db.prescriptions.get(r.id); if (!ex || (ex.status === 'draft' && r.updatedAt > ex.updatedAt)) await db.prescriptions.put(r); }
      } else await t.bulkPut(rows);
    }
    if (mode === 'replace' && Array.isArray(d.settings)) await db.settings.bulkPut(d.settings);
  });
}
export async function wipeAll() {
  await Promise.all([db.patients.clear(), db.prescriptions.clear(), db.medicines.clear(), db.meta.clear(), db.templates.clear(), db.settings.clear(), db.audit.clear()]);
}
