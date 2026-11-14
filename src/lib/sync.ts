import { db, getSettings } from './db';
import type { AppSettings } from './types';
import { cloud } from './ovcloud';

/* Cross-device sync for the doctor's OWN account (same login as OrthoVault).
   Every record is one small doc at users/{uid}/msSync/{key}: { t, id, v (JSON), u (time), del? }.
   Newest edit wins. Big images inside finalised Rx snapshots are not uploaded (they are re-attached from settings). */
type Tbl = 'p' | 'r' | 't' | 'm' | 'c' | 's';
const TABLES = { p: db.patients, r: db.prescriptions, t: db.templates, m: db.meta, c: db.medicines } as const;
const SKIP_SETTINGS = new Set(['ovEmail', 'orthovaultUrl', 'lastBackupAt', 'seeded']);
const syncable = (t: Tbl, row: any) => t === 't' ? !row.builtIn : t === 'c' ? row.source === 'custom' || row.source === 'import' : true;

let applying = false, started = false, stop: (() => void) | null = null, status = 'Sync is off';
const listeners = new Set<(s: string) => void>();
const setStatus = (s: string) => { status = s; listeners.forEach((f) => f(s)); };
export const syncStatus = () => status;
export const onSyncStatus = (f: (s: string) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

const UK = 'ms-sync-u', HK = 'ms-sync-h';
const lget = (k: string): Record<string, any> => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } };
const lset = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return s.length + ':' + h; };

function slim(row: any): any {
  const r = JSON.parse(JSON.stringify(row));
  const ds = r.doctorSnapshot;
  if (ds) { if (ds.clinic) ds.clinic.logo = ''; if (ds.signature) ds.signature.dataUrl = ''; ds.sealDataUrl = ''; if (ds.seal) ds.seal.uploaded = ''; }
  return r;
}
async function refill(r: any) {
  const ds = r?.doctorSnapshot; if (!ds) return r;
  const s = await getSettings();
  const cl = s.clinics.find((c) => c.id === (ds.clinic?.id)) || s.clinics.find((c) => c.id === r.clinicId);
  if (ds.clinic && !ds.clinic.logo && cl) ds.clinic.logo = cl.logo;
  if (ds.signature && !ds.signature.dataUrl) ds.signature.dataUrl = s.signature.dataUrl;
  if (!ds.sealDataUrl) ds.sealDataUrl = (s as any).sealDataUrl || '';
  if (ds.seal && !ds.seal.uploaded) ds.seal.uploaded = s.seal.uploaded;
  return r;
}

const queue = new Set<string>(); let timer: any = null;
export function touch(key: string) { if (applying || !started) return; queue.add(key); clearTimeout(timer); timer = setTimeout(flush, 900); }

async function docFor(key: string): Promise<{ t: string; id: string; v: string } | null> {
  const t = key[0] as Tbl, id = key.slice(2);
  if (t === 's') { const s: any = await getSettings(); return id in s ? { t, id, v: JSON.stringify(s[id]) } : null; }
  const row: any = await (TABLES as any)[t].get(id);
  if (!row || !syncable(t, row)) return null;
  return { t, id, v: JSON.stringify(t === 'r' ? slim(row) : row) };
}
async function push(key: string, force = false) {
  const c = await cloud(); if (!c) return;
  const d = await docFor(key);
  const hs = lget(HK), us = lget(UK);
  if (!d) { if (!us[key]) return; const u = Date.now(); await c.F.setDoc(c.F.doc(c.fs, 'users', c.uid, 'msSync', key.replace('/', '_')), { t: key[0], id: key.slice(2), del: true, u }); us[key] = u; delete hs[key]; lset(UK, us); lset(HK, hs); return; }
  const h = hash(d.v); if (!force && hs[key] === h) return;
  if (d.v.length > 900000) { console.warn('sync: too large', key); return; }
  const u = Date.now();
  await c.F.setDoc(c.F.doc(c.fs, 'users', c.uid, 'msSync', key.replace('/', '_')), { ...d, u });
  us[key] = u; hs[key] = h; lset(UK, us); lset(HK, hs);
}
async function flush() {
  const keys = [...queue]; queue.clear();
  if (!navigator.onLine) { keys.forEach((k) => queue.add(k)); return; }
  try {
    // settings changes: queue every settings key, push only those that changed
    const sk = Object.keys(await getSettings()).filter((x) => !SKIP_SETTINGS.has(x)).map((x) => 's:' + x);
    const all = keys.flatMap((k) => k === 's:*' ? sk : [k]);
    for (const k of new Set(all)) await push(k);
    setStatus('Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  } catch (e) { keys.forEach((k) => queue.add(k)); setStatus('Waiting for internet…'); clearTimeout(timer); timer = setTimeout(flush, 15000); }
}

async function applyDoc(d: any) {
  const key = d.t + ':' + d.id;
  if (d.t === 's') {
    if (SKIP_SETTINGS.has(d.id)) return;
    const row = await db.settings.get('main'); const cur: any = await getSettings();
    if (d.del) return;
    let val = JSON.parse(d.v);
    if (d.id === 'rxCounter' || d.id === 'patientCounter') val = Math.max(Number(cur[d.id]) || 0, Number(val) || 0);
    await db.settings.put({ key: 'main', value: { ...(row?.value || cur), [d.id]: val } });
  } else {
    const tb: any = (TABLES as any)[d.t]; if (!tb) return;
    if (d.del) await tb.delete(d.id); else await tb.put(d.t === 'r' ? await refill(JSON.parse(d.v)) : JSON.parse(d.v));
  }
  const us = lget(UK), hs = lget(HK); us[key] = d.u; if (!d.del) hs[key] = hash(d.v); lset(UK, us); lset(HK, hs);
}

let first = true;
async function onRemote(docs: any[]) {
  applying = true;
  try {
    const us = lget(UK);
    const sorted = [...docs].sort((a, b) => (a.t === 's' ? 0 : 1) - (b.t === 's' ? 0 : 1));
    const remoteKeys = new Set<string>();
    for (const d of sorted) {
      const key = d.t + ':' + d.id; remoteKeys.add(key);
      if ((us[key] || 0) >= d.u) continue;
      if (!us[key] && !d.del && d.t !== 's') { // first meeting: keep the newer of local vs cloud
        const local: any = await (TABLES as any)[d.t]?.get(d.id);
        if (local?.updatedAt && local.updatedAt > d.u) { queue.add(key); continue; }
      }
      await applyDoc(d);
    }
    if (first) { // push everything the cloud has never seen
      first = false;
      const us2 = lget(UK);
      for (const t of ['p', 'r', 't', 'm', 'c'] as const) for (const row of await (TABLES as any)[t].toArray()) if (syncable(t, row) && !remoteKeys.has(t + ':' + row.id)) queue.add(t + ':' + row.id);
      for (const k of Object.keys(await getSettings())) if (!SKIP_SETTINGS.has(k) && !remoteKeys.has('s:' + k) && !us2['s:' + k]) queue.add('s:' + k);
    }
  } finally { applying = false; }
  if (queue.size) { clearTimeout(timer); timer = setTimeout(flush, 300); } else setStatus('Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
}

let hooked = false;
function hook() {
  if (hooked) return; hooked = true;
  for (const t of ['p', 'r', 't', 'm', 'c'] as const) {
    const tb: any = (TABLES as any)[t];
    tb.hook('creating', (pk: any, obj: any) => { touch(t + ':' + (pk ?? obj.id)); });
    tb.hook('updating', (_m: any, pk: any) => { touch(t + ':' + pk); });
    tb.hook('deleting', (pk: any) => { touch(t + ':' + pk); });
  }
  const onS = () => touch('s:*');
  db.settings.hook('creating', onS); db.settings.hook('updating', onS);
}

/** Starts live two-way sync for the signed-in account. Safe to call repeatedly. */
export async function startSync(email: string) {
  if (started || !email) return;
  hook();
  const c = await cloud();
  if (!c || (c.email || '').toLowerCase() !== email.toLowerCase()) { setStatus('Sign in again to sync'); return; }
  started = true; first = true; setStatus('Syncing…');
  stop = c.F.onSnapshot(c.F.collection(c.fs, 'users', c.uid, 'msSync'), (snap) => {
    const docs = snap.docChanges().filter((ch) => ch.type !== 'removed' && !ch.doc.metadata.hasPendingWrites).map((ch) => ch.doc.data());
    onRemote(docs).catch(() => setStatus('Sync error'));
  }, (e: any) => { setStatus((e?.code || '').includes('permission') ? 'Sync needs the updated Firestore rules' : 'Waiting for internet…'); });
  window.addEventListener('online', () => touch('s:*'));
}
export function stopSync() { stop?.(); stop = null; started = false; setStatus('Sync is off'); }
export async function syncNow() { if (!started) return; queue.add('s:*'); await flush(); }
export type { AppSettings };
