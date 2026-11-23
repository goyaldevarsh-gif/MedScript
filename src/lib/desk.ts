import { CFG } from './ovcloud';

/* Reception desk. The receptionist opens a secret link, fills patient details and a one-line reason, and the entry shows up in the
   doctor's MedScript as a waiting list. The desk device never signs in and holds no MedScript data: it can only add to, and read, the
   small "queue" list under desks/{secret id}. Nothing else in the cloud is reachable from it. */
export interface DeskIn { name: string; age: string; ageUnit: 'Y' | 'M'; sex: string; phone: string; weight: string; allergies: string; reason: string; bp: string; sugar: string; followUp?: boolean; toOv?: boolean }
export interface DeskItem extends DeskIn { id: string; token: number; day: string; createdAt: number; status: 'waiting' | 'seen' }

/** paste this inside `match /databases/{database}/documents { ... }` in Firebase console, Firestore, Rules. Keep your existing rules. */
export const DESK_RULES = `match /desks/{deskId}/queue/{doc} {
  allow read, delete: if deskId.size() >= 20;
  allow create: if deskId.size() >= 20
    && request.resource.data.keys().hasOnly(['name','age','ageUnit','sex','phone','weight','allergies','reason','bp','sugar','followUp','toOv','token','day','createdAt','status'])
    && request.resource.data.keys().hasAll(['name','token','day','createdAt','status'])
    && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() < 100
    && request.resource.data.status == 'waiting'
    && request.resource.data.token is int && request.resource.data.token < 10000;
  allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])
    && request.resource.data.status in ['waiting','seen'];
}
match /desks/{deskId}/directory/{part} {
  allow read, delete: if deskId.size() >= 20;
  allow create, update: if deskId.size() >= 20
    && request.resource.data.keys().hasOnly(['c'])
    && request.resource.data.c is string && request.resource.data.c.size() < 900000;
}
match /desks/{deskId}/counters/{day} {
  allow read: if deskId.size() >= 20;
  allow write: if deskId.size() >= 20
    && request.resource.data.keys().hasOnly(['n'])
    && request.resource.data.n is int && request.resource.data.n < 10000;
}`;

export const newDeskId = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return Array.from(a, (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 28); };
export const deskLink = (id: string, k = '') => `${location.origin}${location.pathname}#/desk?d=${id}${k ? '&k=' + k : ''}`;
const d10 = (x?: string) => (x || '').replace(/\D/g, '').slice(-10);
const nm = (x?: string) => (x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
interface Who { name: string; phone?: string; age?: string; sex?: string }
/** Finds the SAME patient among saved ones. A full 10-digit phone is decisive (a different phone is a different person even if the name is the same).
    Without a phone on either side, the name must match exactly, with a compatible age and sex, and only one patient may fit. Otherwise: no match, a new patient. */
export function matchPatient<T extends Who>(pats: T[], w: Who): T | undefined {
  const ph = d10(w.phone);
  if (ph.length === 10) { const hit = pats.find((p) => d10(p.phone) === ph); if (hit) return hit; }
  const cand = pats.filter((p) => nm(p.name) === nm(w.name) && nm(w.name) && (ph.length !== 10 || d10(p.phone).length !== 10)
    && (!w.age || !p.age || Math.abs(Number(w.age) - Number(p.age)) <= 1) && (!w.sex || !p.sex || w.sex === p.sex));
  return cand.length === 1 ? cand[0] : undefined;
}
/** keeps every allergy ever recorded: a recorded allergy is never wiped by a later "none" or a shorter answer */
export function mergeAllergy(old?: string, fresh?: string): string {
  const o = (old || '').trim(), f = (fresh || '').trim();
  if (!f || /^(no|nil|none|na|n\/a|no allergy|no known allergy|nka|nkda|-)\.?$/i.test(f)) return o;
  if (!o) return f;
  const no = nm(o), nf = nm(f);
  return no.includes(nf) ? o : nf.includes(no) ? f : `${o}; ${f}`;
}
export const deskDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const deskMsg = (e: unknown) => {
  const c = (e as { code?: string })?.code || '';
  if (c.includes('permission-denied')) return 'Desk not set up. Cloud rules missing.';
  if (c.includes('timeout')) return 'Timed out. Check internet.';
  if (c.includes('unavailable') || c.includes('network') || c.includes('failed-precondition')) return 'No internet.';
  return 'Could not reach the desk: ' + ((e as Error)?.message || 'unknown error');
};

let boot: Promise<{ fs: import('firebase/firestore').Firestore; F: typeof import('firebase/firestore') }> | null = null;
function load() {
  if (!boot) boot = (async () => {
    const [{ initializeApp, getApps, getApp }, F] = await Promise.all([import('firebase/app'), import('firebase/firestore')]);
    const app = getApps().some((a) => a.name === 'desk') ? getApp('desk') : initializeApp(CFG, 'desk');
    let fs: import('firebase/firestore').Firestore;
    try { fs = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); } catch { fs = F.getFirestore(app); }
    return { fs, F };
  })();
  return boot;
}
/* Patient directory for the reception desk, so that typing 2-3 letters or digits shows suggestions.
   The doctor's app encrypts it (AES-256-GCM) with a key that lives only in the desk link's "#..." part, which browsers never send to any server.
   The cloud stores unreadable text; the desk opens it in the browser and searches locally. Only name, mobile, age, sex and last visit day are in it:
   no allergies, diagnosis, prescriptions or notes. */
export interface DirRow { n: string; p: string; a: string; u: string; s: string; d: string }
/** the doctor's name, clinic and a tiny logo travel inside the same encrypted directory, as one marked row */
export interface DeskProf { n: string; q: string; c: string; l: string }
export const PROF_TAG = '__prof';
export const profRow = (p: DeskProf): DirRow => ({ n: JSON.stringify(p), p: '', a: '', u: '', s: '', d: PROF_TAG });
export function splitProf(rows: DirRow[]): { rows: DirRow[]; prof: DeskProf | null } {
  let prof: DeskProf | null = null;
  const out = rows.filter((r) => { if (r.d !== PROF_TAG) return true; try { prof = JSON.parse(r.n) as DeskProf; } catch { /* ignore */ } return false; });
  return { rows: out, prof };
}
const toB64 = (u: Uint8Array) => { let t = ''; for (let i = 0; i < u.length; i += 8192) t += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
export const newDeskKey = () => toB64(crypto.getRandomValues(new Uint8Array(32)));
export const validKey = (k: string) => /^[A-Za-z0-9_-]{43}$/.test(k);
const aes = (k: string) => crypto.subtle.importKey('raw', fromB64(k), 'AES-GCM', false, ['encrypt', 'decrypt']);
const PART = 1500;
export async function sealDir(k: string, rows: DirRow[]): Promise<string[]> {
  const key = await aes(k); const out: string[] = [];
  for (let i = 0; i < Math.max(rows.length, 1); i += PART) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(rows.slice(i, i + PART)))));
    const all = new Uint8Array(12 + ct.length); all.set(iv); all.set(ct, 12); out.push(toB64(all));
  }
  return out;
}
export async function openDir(k: string, parts: string[]): Promise<DirRow[]> {
  const key = await aes(k); const rows: DirRow[] = [];
  for (const p of parts) { const b = fromB64(p); rows.push(...(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12)))) as DirRow[])); }
  return rows;
}
/** typing part of a name (any word) or part of a mobile number gives suggestions; 2 characters are enough. Best matches first. */
export function suggest(rows: DirRow[], q: string, max = 8): DirRow[] {
  const words = nm(q).split(' ').filter((w) => /[a-z]/.test(w)); const dg = (q.match(/\d/g) || []).join('');
  if (words.join('').length < 2 && dg.length < 2) return [];
  const sc = (r: DirRow) => {
    const n = nm(r.n), toks = n.split(' ');
    if (words.length && !words.every((w) => toks.some((t) => t.startsWith(w)))) return 0;
    if (dg.length >= 2 && !r.p.includes(dg)) return 0;
    return 1 + (words.length && n.startsWith(words[0]) ? 2 : 0) + (dg.length >= 2 && r.p.startsWith(dg) ? 2 : 0) + (dg.length === 10 ? 4 : 0);
  };
  return rows.map((r) => [r, sc(r)] as const).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].n.localeCompare(b[0].n)).slice(0, max).map(([r]) => r);
}
/** the desk: live, decrypted list of the doctor's patients (read only) */
export async function deskDirWatch(id: string, k: string, cb: (r: DirRow[], prof?: DeskProf | null) => void, onErr?: (e: unknown) => void): Promise<() => void> {
  if (!ok(id) || !validKey(k)) { onErr?.(new Error('This desk link is not valid.')); return () => {}; }
  const { fs, F } = await load();
  return F.onSnapshot(F.collection(fs, 'desks', id, 'directory'), async (snap) => {
    try { const parts = snap.docs.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))).map((d) => String(d.data().c || '')).filter(Boolean); const sp = splitProf(parts.length ? await openDir(k, parts) : []); cb(sp.rows, sp.prof); }
    catch (e) { onErr?.(e); }
  }, (e) => onErr?.(e));
}
/** the doctor's app: publishes the directory (only when it changed) */
export async function deskDirSync(id: string, k: string, rows: DirRow[]): Promise<{ total: number; written: boolean }> {
  if (!ok(id) || !validKey(k)) return { total: 0, written: false };
  const sig = toB64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rows))))); const KEY = `ms-desk-dir:${id}`;
  if (localStorage.getItem(KEY) === sig) return { total: rows.filter((r) => r.d !== PROF_TAG).length, written: false };
  const parts = await sealDir(k, rows); const { fs, F } = await load();
  const b = F.writeBatch(fs); parts.forEach((c, i) => b.set(F.doc(fs, 'desks', id, 'directory', 'p' + i), { c }));
  (await F.getDocs(F.collection(fs, 'desks', id, 'directory'))).docs.forEach((d) => { if (Number(d.id.slice(1)) >= parts.length) b.delete(d.ref); });
  await b.commit(); try { localStorage.setItem(KEY, sig); } catch { /* ignore */ }
  return { total: rows.filter((r) => r.d !== PROF_TAG).length, written: true };
}
/** removes the published directory (new link / desk turned off) */
export async function deskWipe(id: string) { try { if (!ok(id)) return; const { fs, F } = await load(); await Promise.all((await F.getDocs(F.collection(fs, 'desks', id, 'directory'))).docs.map((d) => F.deleteDoc(d.ref))); localStorage.removeItem(`ms-desk-dir:${id}`); } catch { /* best effort */ } }
const ok = (id: string) => /^[a-z0-9]{20,40}$/.test(id);

/** adds the patient to today's list and returns the token number (1, 2, 3... restarting each day) */
export async function deskSubmit(id: string, e: DeskIn): Promise<number> {
  if (!ok(id)) throw new Error('This desk link is not valid.');
  const { fs, F } = await load(); const d = deskDay();
  const cref = F.doc(fs, 'desks', id, 'counters', d); const qref = F.doc(F.collection(fs, 'desks', id, 'queue'));
  const run = F.runTransaction(fs, async (tx) => {
    const s = await tx.get(cref); const n = (s.exists() ? Number(s.data().n) || 0 : 0) + 1;
    tx.set(cref, { n }); tx.set(qref, { ...e, token: n, day: d, createdAt: Date.now(), status: 'waiting' });
    return n;
  });
  // offline, Firestore keeps retrying quietly: give the receptionist a clear answer instead of a spinner that never ends
  return Promise.race([run, new Promise<number>((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 15000))]);
}
/** live list of today's entries, in token order */
export async function deskWatch(id: string, cb: (x: DeskItem[]) => void, onErr?: (e: unknown) => void): Promise<() => void> {
  if (!ok(id)) { onErr?.(new Error('This desk link is not valid.')); return () => {}; }
  const { fs, F } = await load();
  return F.onSnapshot(F.query(F.collection(fs, 'desks', id, 'queue'), F.where('day', '==', deskDay())),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<DeskItem, 'id'>), id: d.id })).sort((a, b) => a.token - b.token)), (e) => onErr?.(e));
}
export async function deskMark(id: string, docId: string, status: 'waiting' | 'seen') { const { fs, F } = await load(); await F.updateDoc(F.doc(fs, 'desks', id, 'queue', docId), { status }); }
export async function deskRemove(id: string, docId: string) { const { fs, F } = await load(); await F.deleteDoc(F.doc(fs, 'desks', id, 'queue', docId)); }
/** removes entries from earlier days (best effort, run by the doctor's app) */
export async function deskCleanup(id: string) {
  try {
    const { fs, F } = await load();
    const old = await F.getDocs(F.query(F.collection(fs, 'desks', id, 'queue'), F.where('day', '<', deskDay())));
    await Promise.all(old.docs.map((d) => F.deleteDoc(d.ref)));
  } catch { /* not important */ }
}
