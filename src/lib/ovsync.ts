import { db } from './db';
import type { Prescription } from './types';
import { markSent, sendRx, wasSent } from './ovcloud';

let running = false;
/** Sends authorised prescriptions that came from OrthoVault back to it. Safe to call often; retries whatever failed earlier. */
export async function flushOv(email: string | undefined, also?: Prescription) {
  if (!email || running) return;
  running = true;
  try {
    const recent = await db.prescriptions.orderBy('updatedAt').reverse().limit(150).toArray();
    const list = recent.filter((r) => r.status === 'final' && (r.patient.ovId || r.ovId) && !wasSent(r.id));
    if (also && also.status === 'final' && (also.patient.ovId || also.ovId) && !list.some((r) => r.id === also.id) && !wasSent(also.id)) list.push(also);
    for (const r of list) { try { await sendRx(r, email); markSent(r.id); } catch { break; } }
  } finally { running = false; }
}
