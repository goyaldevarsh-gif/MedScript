import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useSettings } from '../lib/db';
import { deskDay, deskSyncKnown } from '../lib/desk';

/** every saved patient, with the date of the last finished visit (else the day the patient was added) */
export async function deskRows() {
  const last = new Map<string, string>();
  (await db.prescriptions.toArray()).forEach((r) => { if (r.status !== 'final') return; const d = deskDay(new Date(r.authorizedAt || r.updatedAt)); if (d > (last.get(r.patientId) || '')) last.set(r.patientId, d); });
  return (await db.patients.toArray()).map((p) => ({ name: p.name, phone: p.phone, at: last.get(p.id) || deskDay(new Date(p.createdAt || Date.now())) }));
}
/** Keeps the reception desk's "has this patient come before?" index in step with the saved patients, wherever the doctor is in the app.
    Every saved patient counts (not only ones with a finished prescription): the date is the last finished visit, else the day the patient was added. */
export default function DeskSync() {
  const id = useSettings()?.deskId || '';
  const rows = useLiveQuery(deskRows, []);
  useEffect(() => { if (id && rows) deskSyncKnown(id, rows).catch(() => {}); }, [id, rows]);
  return null;
}
