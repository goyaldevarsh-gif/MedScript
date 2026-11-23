import { CFG } from './ovcloud';

/* Reception desk. The receptionist opens a secret link, fills patient details and a one-line reason, and the entry shows up in the
   doctor's MedScript as a waiting list. The desk device never signs in and holds no MedScript data: it can only add to, and read, the
   small "queue" list under desks/{secret id}. Nothing else in the cloud is reachable from it. */
export interface DeskIn { name: string; age: string; ageUnit: 'Y' | 'M'; sex: string; phone: string; weight: string; allergies: string; reason: string; bp: string; sugar: string }
export interface DeskItem extends DeskIn { id: string; token: number; day: string; createdAt: number; status: 'waiting' | 'seen' }

/** paste this inside `match /databases/{database}/documents { ... }` in Firebase console, Firestore, Rules. Keep your existing rules. */
export const DESK_RULES = `match /desks/{deskId}/queue/{doc} {
  allow read, delete: if true;
  allow create: if request.resource.data.name is string && request.resource.data.name.size() < 100;
  allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']);
}
match /desks/{deskId}/counters/{day} {
  allow read: if true;
  allow write: if request.resource.data.n is int;
}`;

export const newDeskId = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return Array.from(a, (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 28); };
export const deskLink = (id: string) => `${location.origin}${location.pathname}#/desk?d=${id}`;
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
