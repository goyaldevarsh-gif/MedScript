import { CFG } from './ovcloud';

/* Reception desk. The receptionist opens a secret link, fills patient details and a one-line reason, and the entry shows up in the
   doctor's MedScript as a waiting list. The desk device never signs in and holds no MedScript data: it can only add to, and read, the
   small "queue" list under desks/{secret id}. Nothing else in the cloud is reachable from it. */
export interface DeskIn { name: string; age: string; ageUnit: 'Y' | 'M'; sex: string; phone: string; weight: string; allergies: string; reason: string; bp: string; sugar: string; followUp?: boolean }
export interface DeskItem extends DeskIn { id: string; token: number; day: string; createdAt: number; status: 'waiting' | 'seen' }

/** paste this inside `match /databases/{database}/documents { ... }` in Firebase console, Firestore, Rules. Keep your existing rules. */
export const DESK_RULES = `match /desks/{deskId}/queue/{doc} {
  allow read, delete: if deskId.size() >= 20;
  allow create: if deskId.size() >= 20
    && request.resource.data.keys().hasOnly(['name','age','ageUnit','sex','phone','weight','allergies','reason','bp','sugar','followUp','token','day','createdAt','status'])
    && request.resource.data.keys().hasAll(['name','token','day','createdAt','status'])
    && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() < 100
    && request.resource.data.status == 'waiting'
    && request.resource.data.token is int && request.resource.data.token < 10000;
  allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])
    && request.resource.data.status in ['waiting','seen'];
}
match /desks/{deskId}/counters/{day} {
  allow read: if deskId.size() >= 20;
  allow write: if deskId.size() >= 20
    && request.resource.data.keys().hasOnly(['n'])
    && request.resource.data.n is int && request.resource.data.n < 10000;
}`;

export const newDeskId = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return Array.from(a, (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 28); };
export const deskLink = (id: string) => `${location.origin}${location.pathname}#/desk?d=${id}`;
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
  if (c.includes('permission-denied')) return 'The desk is not switched on in your cloud yet. The doctor needs to publish the desk rules once (Settings, Reception desk).';
  if (c.includes('timeout')) return 'Could not reach the desk (timed out). Check the internet and try again.';
  if (c.includes('unavailable') || c.includes('network') || c.includes('failed-precondition')) return 'No internet right now. Try again in a moment.';
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
