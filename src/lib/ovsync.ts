import { db } from './db';
import type { Prescription } from './types';
import { markSent, sendRx, wasSent } from './ovcloud';

let running = false;
/** Sends authorised prescriptions that came from OrthoVault back to it. Safe to call often; retries whatever failed earlier. */
export async function flushOv(email: string | undefined, also?: Prescription) {
  if (!email || running) return;
  running = true;
  try {
    const recent = await db.prescriptions.orderBy('updatedAt').reverse().limit(400).toArray();
    // a patient who has gone to OrthoVault once lives there from then on: every later authorised Rx follows automatically
    const moved = new Set(recent.filter((r) => wasSent(r.id)).map((r) => r.patientId));
    const goes = (r: Prescription) => r.status === 'final' && r.items.length > 0 && !wasSent(r.id) && !!(r.patient.ovId || r.ovId || r.sendToOv || moved.has(r.patientId));
    const list = recent.filter(goes).sort((a, b) => (a.authorizedAt || a.updatedAt) - (b.authorizedAt || b.updatedAt));
    if (also && goes(also) && !list.some((r) => r.id === also.id)) list.push(also);
    for (const r of list) { try { await sendRx(r, email); markSent(r.id); } catch { break; } }
  } finally { running = false; }
}
