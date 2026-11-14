import type { Prescription } from './types';
import { ovPayload, type OvIn } from './orthovault';

/* Private link to the doctor's OWN OrthoVault account (Firebase project orthovault02).
   Everything lives under users/{uid}/..., where uid is the signed-in doctor, and Firestore rules
   restrict that path to its owner. Firebase is loaded only after the doctor links an account. */
const CFG = {
  apiKey: 'AIzaSyAehCjdYB6sHZN5Hdw7kTiy2L5dtOPfqWA', authDomain: 'orthovault02.firebaseapp.com', projectId: 'orthovault02',
  storageBucket: 'orthovault02.firebasestorage.app', messagingSenderId: '251974181391', appId: '1:251974181391:web:348e0e07d0e53ec672f97a',
};
export interface InboxItem extends OvIn { id: string; createdAt: number }

let boot: Promise<{ auth: import('firebase/auth').Auth; fs: import('firebase/firestore').Firestore; A: typeof import('firebase/auth'); F: typeof import('firebase/firestore') }> | null = null;
function load() {
  if (!boot) boot = (async () => {
    const [{ initializeApp, getApps, getApp }, A, F] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = getApps().some((a) => a.name === 'ov') ? getApp('ov') : initializeApp(CFG, 'ov');
    let fs: import('firebase/firestore').Firestore;
    try { fs = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); } catch { fs = F.getFirestore(app); }
    return { auth: A.getAuth(app), fs, A, F };
  })();
  return boot;
}
async function me() {
  const b = await load();
  await b.auth.authStateReady();
  return { ...b, user: b.auth.currentUser };
}
export const ovMsg = (e: unknown) => {
  const c = (e as { code?: string })?.code || '';
  if (c.includes('permission-denied')) return 'OrthoVault cloud refused access (Firestore rules need a small update).';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-email')) return 'Email or password is wrong.';
  if (c.includes('network') || c.includes('unavailable')) return 'No internet right now.';
  if (c.includes('timeout')) return 'Could not reach OrthoVault cloud (timed out).';
  return 'Could not reach OrthoVault: ' + ((e as Error)?.message || 'unknown error');
};
export async function ovSignIn(email: string, password: string): Promise<string> {
  const b = await load();
  const cred = await b.A.signInWithEmailAndPassword(b.auth, email.trim(), password);
  return cred.user.email || email.trim();
}
export async function ovSignOut() {
  try { const b = await load(); await b.A.signOut(b.auth); } catch { /* ignore */ }
}
/** Live list of patients sent from OrthoVault. Returns an unsubscribe function. Only fires for the linked account. */
export async function watchInbox(email: string, cb: (items: InboxItem[]) => void, onErr?: (e: unknown) => void): Promise<() => void> {
  const { fs, F, user } = await me();
  if (!user || (user.email || '').toLowerCase() !== email.toLowerCase()) { cb([]); return () => {}; }
  return F.onSnapshot(F.collection(fs, 'users', user.uid, 'mvOutbox'),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as OvIn), id: d.id, createdAt: Number(d.data().createdAt) || 0 })).sort((a, b) => b.createdAt - a.createdAt)),
    (e) => { cb([]); onErr?.(e); });
}
export async function dropInbox(id: string, email: string) {
  const { fs, F, user } = await me();
  if (!user || (user.email || '').toLowerCase() !== email.toLowerCase()) return;
  await F.deleteDoc(F.doc(fs, 'users', user.uid, 'mvOutbox', id));
}
/** Sends an authorised prescription to the linked OrthoVault account; clears the inbox entry for that patient. */
export async function sendRx(rx: Prescription, email: string): Promise<void> {
  const { fs, F, user } = await me();
  if (!user || (user.email || '').toLowerCase() !== email.toLowerCase()) throw Object.assign(new Error('Not linked'), { code: 'not-linked' });
  await F.setDoc(F.doc(fs, 'users', user.uid, 'mvReturn', rx.id), { ...ovPayload(rx), sentAt: Date.now() });
  if (rx.patient.ovId || rx.ovId) { try { await F.deleteDoc(F.doc(fs, 'users', user.uid, 'mvOutbox', (rx.patient.ovId || rx.ovId) as string)); } catch { /* ignore */ } }
}
const KEY = 'ms-ov-sent';
const sent = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const markSent = (id: string) => { try { localStorage.setItem(KEY, JSON.stringify([...new Set([...sent(), id])].slice(-500))); } catch { /* ignore */ } };
export const wasSent = (id: string) => sent().includes(id);

/** One-shot connection check used by Settings: signed in? can it read the inbox? how many patients are waiting? */
export async function ovCheck(email: string): Promise<string> {
  const { fs, F, user } = await me();
  if (!user) return 'Not signed in on this device. Unlink and link again.';
  if ((user.email || '').toLowerCase() !== email.toLowerCase()) return `Signed in as ${user.email}, but linked as ${email}.`;
  const snap = await Promise.race([
    F.getDocs(F.collection(fs, 'users', user.uid, 'mvOutbox')),
    new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error('Timed out reaching OrthoVault cloud'), { code: 'timeout' })), 15000)),
  ]);
  return `Connected as ${user.email} (id …${user.uid.slice(-6)}). ${snap.size} patient${snap.size === 1 ? '' : 's'} waiting from OrthoVault.`;
}

/** Raw handle to the signed-in account (used by cross-device sync). */
export async function cloud() {
  const { fs, F, user } = await me();
  return user ? { fs, F, uid: user.uid, email: user.email } : null;
}
