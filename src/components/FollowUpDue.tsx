import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BellRing, Check, MessageCircle } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from './ui';
import { followUpOn, hasWaNumber, openWhatsApp, reminderMessage } from '../lib/share';
import { visitTs } from '../lib/followup';
import type { Prescription } from '../lib/types';

const DAY = 86400000;
const sentKey = (id: string) => `ms-fu-sent-${id}`;
const wasSent = (id: string) => { try { return !!localStorage.getItem(sentKey(id)); } catch { return false; } };

/** Patients whose follow-up date is near (3 days ahead) or missed (up to 14 days ago): one tap sends a WhatsApp reminder. */
export default function FollowUpDue() {
  const rxs = useLiveQuery(() => db.prescriptions.orderBy('updatedAt').reverse().limit(500).toArray(), []);
  const [, force] = useState(0);
  if (!rxs) return null;
  const today = new Date().setHours(0, 0, 0, 0);
  const latest = new Map<string, Prescription>();
  for (const r of rxs) {
    if (r.status !== 'final') continue;
    const k = r.patientId || r.patient.phone || r.patient.name.trim().toLowerCase(); if (!k) continue;
    const cur = latest.get(k); if (!cur || visitTs(r) > visitTs(cur)) latest.set(k, r);
  }
  const due = [...latest.values()].map((r) => ({ r, fu: followUpOn(r) })).filter((x): x is { r: Prescription; fu: Date } => !!x.fu && hasWaNumber(x.r.patient.phone))
    .map((x) => ({ ...x, diff: Math.round((x.fu.getTime() - today) / DAY) })).filter((x) => x.diff >= -14 && x.diff <= 3).sort((a, b) => a.diff - b.diff);
  if (!due.length) return null;
  const when = (d: number) => d === 0 ? 'due today' : d === 1 ? 'due tomorrow' : d > 0 ? `due in ${d} days` : `missed ${-d} day${d < -1 ? 's' : ''} ago`;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-500"><BellRing size={16} /> Follow-ups to remind ({due.length})</div>
      <div className="space-y-2">{due.slice(0, 8).map(({ r, diff }) => {
        const sent = wasSent(r.id);
        return (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="min-w-0"><div className="truncate text-[15px] font-extrabold">{r.patient.name}</div>
              <div className={`text-xs font-semibold ${diff < 0 ? 'text-danger' : 'text-slate-500'}`}>{r.clinical.diagnosis ? `${r.clinical.diagnosis} · ` : ''}{when(diff)}</div></div>
            <button className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${sent ? 'bg-slate-100 text-slate-600' : 'bg-teal-600 text-white'}`}
              onClick={() => { openWhatsApp(r.patient.phone, reminderMessage(r, r.doctorSnapshot?.doctor.fullName || '')); try { localStorage.setItem(sentKey(r.id), String(Date.now())); } catch { /* ignore */ } force((n) => n + 1); }}>
              {sent ? <><Check size={13} /> Sent · again</> : <><MessageCircle size={13} /> Remind</>}
            </button>
          </div>);
      })}</div>
    </Card>
  );
}
