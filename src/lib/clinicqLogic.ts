import type { DeskIn, DirRow } from './desk';

/** What a ClinicQ appointment looks like to the reception desk (only the fields the desk needs). */
export interface CqAppt {
  id: string; clinicId: string; doctorId: string; date: string; time: string; type: string;
  name: string; age: string; phone: string; reason?: string; token: number;
  status: 'waiting' | 'seen' | 'cancelled'; walkIn?: boolean; memberId?: string; cancelledBy?: string;
  arrivedAt?: number; deskDocId?: string; deskToken?: number; deskErr?: string;
}
export const fmtQ = (n: number) => `Q-${String(n).padStart(2, '0')}`;
export const fmt12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

/** ClinicQ booking → desk entry. The same shape the desk's own form produces; fields the booking does not have stay empty (nothing is guessed). */
export function toDeskIn(a: CqAppt, dir?: DirRow[] | null): DeskIn {
  const phone = (a.phone || '').replace(/\D/g, '').slice(-10);
  const tag = `ClinicQ ${a.walkIn ? 'walk-in' : fmt12(a.time)} · ${a.type}`;
  return {
    name: a.name.trim().slice(0, 99), age: (a.age || '').trim().slice(0, 20), ageUnit: 'Y', sex: '', phone, weight: '', allergies: '', bp: '', sugar: '',
    reason: a.reason ? `${tag} — ${a.reason}` : tag,
    followUp: !!(phone.length === 10 && dir?.some((r) => r.p === phone)), toOv: false,
  };
}

/** "who is checked in" list that patients' phones read to see how many are ahead of them: waiting + arrived, in time then token order */
export function liveRows(appts: CqAppt[]): Record<string, { t: number; time: string }[]> {
  const out: Record<string, { t: number; time: string }[]> = {};
  for (const a of appts) {
    const k = `${a.doctorId}_${a.date}`; (out[k] ??= []);
    if (a.status === 'waiting' && a.arrivedAt) out[k].push({ t: a.token, time: a.time });
  }
  for (const k of Object.keys(out)) out[k].sort((x, y) => x.time.localeCompare(y.time) || x.t - y.t);
  return out;
}

/** which ClinicQ bookings must change status because the doctor changed the desk entry (desk is the source of truth once a booking is linked) */
export function seenSync(appts: CqAppt[], desk: { id: string; status: 'waiting' | 'seen' }[]): { id: string; status: 'waiting' | 'seen' }[] {
  const byId = new Map(desk.map((d) => [d.id, d.status]));
  const out: { id: string; status: 'waiting' | 'seen' }[] = [];
  for (const a of appts) {
    if (!a.deskDocId || a.status === 'cancelled') continue;
    const s = byId.get(a.deskDocId);
    if (s && s !== a.status) out.push({ id: a.id, status: s });
  }
  return out;
}

export const waLink = (a: CqAppt, clinicName: string, doctorName: string) => {
  const when = `${new Date(a.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}, ${fmt12(a.time)}`;
  const text = `Hello ${a.name}, a reminder of your ${a.type} appointment${doctorName ? ' with ' + doctorName : ''}${clinicName ? ' at ' + clinicName : ''} on ${when}. Token ${fmtQ(a.token)}. Please let us know if you cannot come.`;
  return `https://wa.me/91${(a.phone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(text)}`;
};

/** What the patient sees in ClinicQ → Records for one finished prescription. Plain text only; nothing from OrthoVault, no internal notes. */
export interface CqRecord { id: string; clinicId: string; phone: string; name: string; doctorName: string; date: string; title: string; body: string; createdAt: number }
export function recordFromRx(rx: import('./types').Prescription, clinicId: string): CqRecord | null {
  const phone = (rx.patient.phone || '').replace(/\D/g, '').slice(-10);
  if (rx.status !== 'final' || phone.length !== 10) return null;
  const when = new Date(rx.authorizedAt || rx.createdAt); const p = (n: number) => String(n).padStart(2, '0');
  const date = `${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())}`;
  const c = rx.clinical; const lines: string[] = [];
  if (c.diagnosis?.trim()) lines.push(`Diagnosis: ${c.diagnosis.trim()}`);
  const meds = rx.items.map((it, i) => {
    const n = ((it.brand ? it.brand.toUpperCase() : it.generic) || '').trim();
    return `${i + 1}. ${[n, (it.strength || '').trim()].filter(Boolean).join(' ')}${it.notes ? ` (${it.notes})` : ''}`;
  });
  if (meds.length) lines.push('', 'Medicines:', ...meds);
  const adv = (c.advice || []).map((a) => String(a).trim()).filter(Boolean);
  if (adv.length) lines.push('', 'Advice:', ...adv.map((a) => `• ${a}`));
  if (rx.followUpDays > 0) { const f = new Date(when.getTime() + rx.followUpDays * 86400000); lines.push('', `Follow-up: ${p(f.getDate())}-${p(f.getMonth() + 1)}-${f.getFullYear()}`); }
  return { id: rx.id, clinicId, phone, name: rx.patient.name.trim(), doctorName: rx.doctorSnapshot?.doctor.fullName || '', date, title: `Prescription ${rx.rxNo}`, body: lines.join('\n'), createdAt: Date.now() };
}
