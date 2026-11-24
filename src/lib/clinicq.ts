import { deskMsg, deskSubmitFull, type DirRow } from './desk';
import { toDeskIn, type CqAppt } from './clinicqLogic';

/* ClinicQ (patient booking app). The reception desk can read the clinic's bookings once the receptionist signs in with the clinic staff
   account of ClinicQ. It is a separate Firebase app (project clinic-q-e9460) and never touches MedScript's or OrthoVault's data.
   Staff rules in ClinicQ limit this account to ONE clinic. Sign-in is remembered by the browser. */
const CFG = {
  apiKey: 'AIzaSyDfG_ptDbvdDVuDso31bP4iof2-uENk6tg', authDomain: 'clinic-q-e9460.firebaseapp.com', projectId: 'clinic-q-e9460',
  storageBucket: 'clinic-q-e9460.firebasestorage.app', messagingSenderId: '141296157618', appId: '1:141296157618:web:7cc95546f3fa5c56c39aab',
};
type Boot = { auth: import('firebase/auth').Auth; fs: import('firebase/firestore').Firestore; A: typeof import('firebase/auth'); F: typeof import('firebase/firestore') };
let boot: Promise<Boot> | null = null;
function load() {
  if (!boot) boot = (async () => {
    const [{ initializeApp, getApps, getApp }, A, F] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = getApps().some((a) => a.name === 'clinicq') ? getApp('clinicq') : initializeApp(CFG, 'clinicq');
    let fs: import('firebase/firestore').Firestore;
    try { fs = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); } catch { fs = F.getFirestore(app); }
    return { auth: A.getAuth(app), fs, A, F };
  })();
  return boot;
}
export const cqMsg = (e: unknown) => {
  const c = (e as { code?: string })?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-email')) return 'Email or password is wrong.';
  if (c === 'not-staff') return 'This account is not a ClinicQ staff account.';
  if (c.includes('permission-denied')) return 'ClinicQ refused access (check the staff account).';
  if (c.includes('timeout')) return 'Timed out. Check internet.';
  if (c.includes('unavailable') || c.includes('network')) return 'No internet.';
  return 'ClinicQ: ' + ((e as Error)?.message || 'unknown error');
};
async function clinicOf(b: Boot, uid: string): Promise<string> {
  const s = await b.F.getDoc(b.F.doc(b.fs, 'staff', uid));
  const id = s.exists() ? String(s.data().clinicId || '') : '';
  if (!id) { await b.A.signOut(b.auth); throw Object.assign(new Error('not staff'), { code: 'not-staff' }); }
  return id;
}
/** signed-in ClinicQ clinic (or null) */
export async function cqWho(): Promise<{ clinicId: string; clinicName: string; doctorName: string } | null> {
  const b = await load(); await b.auth.authStateReady();
  if (!b.auth.currentUser) return null;
  const clinicId = await clinicOf(b, b.auth.currentUser.uid);
  const c = await b.F.getDoc(b.F.doc(b.fs, 'clinics', clinicId));
  const d = c.data() as { name?: string; doctors?: { name?: string }[] } | undefined;
  return { clinicId, clinicName: d?.name || '', doctorName: d?.doctors?.[0]?.name || '' };
}
export async function cqSignIn(email: string, password: string) { const b = await load(); const c = await b.A.signInWithEmailAndPassword(b.auth, email.trim(), password); await clinicOf(b, c.user.uid); }
export async function cqSignOut() { const b = await load(); await b.A.signOut(b.auth); }

/** live bookings of one day (a single equality filter: no index needed) */
export async function cqWatch(clinicId: string, date: string, cb: (a: CqAppt[]) => void, onErr: (e: unknown) => void): Promise<() => void> {
  const { fs, F } = await load();
  return F.onSnapshot(F.query(F.collection(fs, 'clinics', clinicId, 'appts'), F.where('date', '==', date)),
    (s) => cb(s.docs.map((d) => d.data() as CqAppt).sort((x, y) => x.time.localeCompare(y.time) || x.token - y.token)), onErr);
}
async function patch(a: CqAppt, p: Record<string, unknown>) { const { fs, F } = await load(); await F.updateDoc(F.doc(fs, 'clinics', a.clinicId, 'appts', a.id), p); }

/** patient is at the clinic: mark Arrived in ClinicQ, add to the waiting list (the same list the doctor works from), remember which entry it is */
export async function cqArrive(a: CqAppt, deskId: string, dir: DirRow[] | null) {
  if (!a.arrivedAt) await patch(a, { arrivedAt: Date.now() });
  await cqSendToDesk(a, deskId, dir);
}
export async function cqSendToDesk(a: CqAppt, deskId: string, dir: DirRow[] | null) {
  if (a.deskDocId) return;
  try {
    const r = await deskSubmitFull(deskId, toDeskIn(a, dir));
    await patch(a, { deskDocId: r.docId, deskToken: r.n, deskErr: null });
  } catch (e) { await patch(a, { deskErr: deskMsg(e) }).catch(() => {}); throw e; }
}
/** doctor's status on the desk entry → the booking (so the patient's phone shows it) */
export const cqSetStatus = (a: CqAppt, status: 'waiting' | 'seen') => patch(a, { status });

/** reception cancels a booking that has not arrived: frees the slot and the person's place, never reuses the token */
export async function cqCancel(a: CqAppt) {
  const { fs, F } = await load();
  const dayRef = F.doc(fs, 'clinics', a.clinicId, 'days', `${a.doctorId}_${a.date}`);
  await F.runTransaction(fs, async (tx) => {
    const snap = a.walkIn ? null : await tx.get(dayRef);
    tx.update(F.doc(fs, 'clinics', a.clinicId, 'appts', a.id), { status: 'cancelled', cancelledBy: 'clinic' });
    if (snap?.exists()) { const d = snap.data() as { last: number; slots: Record<string, number> }; tx.set(dayRef, { last: d.last, slots: { ...d.slots, [a.time]: Math.max(0, (d.slots[a.time] ?? 0) - 1) } }); }
    if (!a.walkIn && a.phone && a.memberId) tx.delete(F.doc(dayRef, 'people', `${a.phone}_${a.memberId}`));
  });
}
/** public "who is checked in" list, so patients see how many are ahead */
export async function cqPublishLive(clinicId: string, rows: Record<string, { t: number; time: string }[]>) {
  const { fs, F } = await load();
  await Promise.all(Object.entries(rows).map(([k, arrived]) => F.setDoc(F.doc(fs, 'clinics', clinicId, 'live', k), { arrived })));
}

/** doctor sends one finished prescription to the patient's ClinicQ Records (the patient sees it only if the clinic has switched sharing on, and only after logging in with this phone) */
export async function cqSendRecord(rec: import('./clinicqLogic').CqRecord) {
  const { fs, F } = await load();
  await F.setDoc(F.doc(fs, 'clinics', rec.clinicId, 'records', rec.id), rec);
}

/** Optional, per device: every newly authorised prescription goes to the patient's Records with no extra tap. Silent and best-effort (does nothing unless ClinicQ is connected on this device). */
const AUTO = 'ms-cq-auto';
export const cqAuto = () => { try { return localStorage.getItem(AUTO) === '1'; } catch { return false; } };
export const setCqAuto = (on: boolean) => { try { on ? localStorage.setItem(AUTO, '1') : localStorage.removeItem(AUTO); } catch { /* ignore */ } };
export async function cqAutoSend(rx: import('./types').Prescription) {
  if (!cqAuto()) return;
  try {
    const { recordFromRx } = await import('./clinicqLogic'); const w = await cqWho(); if (!w) return;
    const rec = recordFromRx(rx, w.clinicId); if (rec) await cqSendRecord(rec);
  } catch { /* the manual button is still there */ }
}
