import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateSettings, useSettings } from '../lib/db';
import { deskDay, deskDirSync, newDeskKey, type DirRow } from '../lib/desk';

/** every saved patient the reception may look up: name, mobile, age, sex and the day of the last finished visit (else the day added) */
export async function deskRows(): Promise<DirRow[]> {
  const last = new Map<string, string>();
  (await db.prescriptions.toArray()).forEach((r) => { if (r.status !== 'final') return; const d = deskDay(new Date(r.authorizedAt || r.updatedAt)); if (d > (last.get(r.patientId) || '')) last.set(r.patientId, d); });
  return (await db.patients.toArray()).map((p) => ({ n: p.name.trim(), p: (p.phone || '').replace(/\D/g, '').slice(-10), a: p.age || '', u: p.ageUnit || 'Y', s: p.sex || '', d: last.get(p.id) || deskDay(new Date(p.createdAt || Date.now())) }))
    .filter((r) => r.n).sort((x, y) => x.n.localeCompare(y.n));
}
/** Keeps the reception desk's encrypted patient directory in step with the saved patients, wherever the doctor is in the app. */
export default function DeskSync() {
  const s = useSettings(); const id = s?.deskId || ''; const key = s?.deskKey || '';
  const rows = useLiveQuery(deskRows, []);
  useEffect(() => { if (id && !key) updateSettings((x) => { x.deskKey = newDeskKey(); }).catch(() => {}); }, [id, key]);
  useEffect(() => { if (!id || !key || !rows) return; const t = setTimeout(() => { deskDirSync(id, key, rows).catch(() => {}); }, 1500); return () => clearTimeout(t); }, [id, key, rows]);
  return null;
}
