import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, updateSettings, useSettings } from '../lib/db';
import { deskDay, deskDirSync, newDeskKey, profRow, type DirRow } from '../lib/desk';

/** the clinic logo shrunk to a small square-ish JPEG so it fits the encrypted directory */
async function tinyLogo(src: string): Promise<string> {
  if (!src || !src.startsWith('data:image')) return '';
  try {
    const img = new Image(); img.src = src; await img.decode();
    const k = Math.min(1, 96 / Math.max(img.width, img.height, 1)); const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext('2d'); if (!g) return ''; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    const o = c.toDataURL('image/jpeg', 0.8); return o.length < 40000 ? o : '';
  } catch { return ''; }
}
/** every saved patient the reception may look up: name, mobile, age, sex and the day of the last finished visit (else the day added) */
export async function deskRows(): Promise<DirRow[]> {
  const last = new Map<string, string>();
  (await db.prescriptions.toArray()).forEach((r) => { if (r.status !== 'final') return; const d = deskDay(new Date(r.authorizedAt || r.updatedAt)); if (d > (last.get(r.patientId) || '')) last.set(r.patientId, d); });
  const st = await getSettings(); const cl = st.clinics.find((c) => c.id === st.defaultClinicId) || st.clinics[0];
  const dr = st.doctor; const name = (dr?.fullName || '').trim();
  const prof = name || cl?.name ? [profRow({ n: name, q: [dr?.qualifications, dr?.specialty].filter(Boolean).join(' · '), c: cl?.name || '', l: await tinyLogo(cl?.logo || '') })] : [];
  const pts = (await db.patients.toArray()).map((p) => ({ n: p.name.trim(), p: (p.phone || '').replace(/\D/g, '').slice(-10), a: p.age || '', u: p.ageUnit || 'Y', s: p.sex || '', d: last.get(p.id) || deskDay(new Date(p.createdAt || Date.now())) }))
    .filter((r) => r.n).sort((x, y) => x.n.localeCompare(y.n));
  return [...prof, ...pts];
}
/** Keeps the reception desk's encrypted patient directory in step with the saved patients, wherever the doctor is in the app. */
export default function DeskSync() {
  const s = useSettings(); const id = s?.deskId || ''; const key = s?.deskKey || '';
  const rows = useLiveQuery(deskRows, []);
  useEffect(() => { if (id && !key) updateSettings((x) => { x.deskKey = newDeskKey(); }).catch(() => {}); }, [id, key]);
  useEffect(() => { if (!id || !key || !rows) return; const t = setTimeout(() => { deskDirSync(id, key, rows).catch(() => {}); }, 1500); return () => clearTimeout(t); }, [id, key, rows]);
  return null;
}
