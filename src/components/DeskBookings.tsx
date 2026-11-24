import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, LogIn, LogOut, MessageCircle, Send, X } from 'lucide-react';
import { deskDay } from '../lib/desk';
import { fmt12, fmtQ, waLink } from '../lib/clinicqLogic';
import type { ClinicQ } from '../lib/useClinicQ';
import { cx } from '../lib/util';

const shift = (d: string, n: number) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return deskDay(x); };

/** Bookings made by patients in ClinicQ. Arrived puts the patient in the waiting list below ("Today's queue"). */
export default function DeskBookings({ cq }: { cq: ClinicQ }) {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const today = deskDay(); const isToday = cq.date === today;
  if (cq.who === undefined) return <div className="p-8 text-center text-sm font-semibold text-slate-500">Checking ClinicQ…</div>;
  if (!cq.who) return (
    <div className="mx-auto max-w-sm space-y-3 p-6">
      <h2 className="text-lg font-extrabold">Connect ClinicQ bookings</h2>
      <p className="text-sm text-slate-500">Sign in once with the ClinicQ clinic staff account. This device remembers it.</p>
      <input className="field" type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="field" type="password" autoComplete="current-password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && cq.signIn(email, pw)} />
      {cq.err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{cq.err}</div>}
      <button type="button" disabled={cq.busy === 'in'} onClick={() => cq.signIn(email, pw)} className="w-full rounded-xl bg-teal py-3 font-extrabold text-white shadow disabled:opacity-60">{cq.busy === 'in' ? 'Signing in…' : 'Connect'}</button>
    </div>);
  const rows = cq.appts.filter((a) => a.status !== 'cancelled' || a.cancelledBy === 'patient');
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <button type="button" aria-label="Previous day" className="rounded-lg p-1.5 hover:bg-slate-100" onClick={() => cq.setDate(shift(cq.date, -1))}><ChevronLeft size={18} /></button>
        <div className="flex items-center gap-1.5 text-sm font-extrabold"><CalendarDays size={16} />{isToday ? 'Today' : new Date(cq.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
        <button type="button" aria-label="Next day" className="rounded-lg p-1.5 hover:bg-slate-100" onClick={() => cq.setDate(shift(cq.date, 1))}><ChevronRight size={18} /></button>
        {!isToday && <button type="button" className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold" onClick={() => cq.setDate(today)}>Today</button>}
        <span className="ml-auto text-xs font-semibold text-slate-500">{cq.who.clinicName}</span>
        <button type="button" aria-label="Sign out of ClinicQ" title="Sign out of ClinicQ" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={cq.signOut}><LogOut size={16} /></button>
      </div>
      {cq.err && <div className="m-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">{cq.err}</div>}
      {!rows.length && !cq.err && <div className="p-12 text-center"><div className="text-4xl">📅</div><div className="mt-2 text-lg font-extrabold text-slate-700">No bookings</div><div className="text-sm text-slate-500">Patients book from the ClinicQ link or QR</div></div>}
      <div className="divide-y divide-slate-100">
        {rows.map((a) => { const cancelled = a.status === 'cancelled'; const seen = a.status === 'seen'; const inQueue = !!a.deskDocId; const b = cq.busy === a.id; return (
          <div key={a.id} className={cx('flex flex-wrap items-center gap-3 px-4 py-3', seen && 'bg-emerald-50/50', cancelled && 'opacity-50')}>
            <span className="flex h-9 w-14 items-center justify-center rounded-lg border border-sky-300 bg-sky-50 text-sm font-extrabold text-sky-700">{fmtQ(a.token)}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-extrabold">{a.name}{a.age ? <span className="ml-2 text-sm font-semibold text-slate-500">{a.age}</span> : null}</div>
              <div className="truncate text-xs text-slate-500">{fmt12(a.time)} · {a.type}{a.reason ? ` · ${a.reason}` : ''}{a.phone ? ` · ${a.phone}` : ''}</div>
              {a.deskErr && !inQueue && <div className="text-xs font-bold text-red-700">{a.deskErr}</div>}
            </div>
            {cancelled ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-600">Cancelled by patient</span>
              : seen ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">✓ Seen</span>
              : inQueue ? <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-extrabold text-violet-700">In queue · {a.deskToken}</span>
              : (
                <div className="flex items-center gap-1.5">
                  {a.arrivedAt
                    ? <button type="button" disabled={b} onClick={() => cq.sendToDesk(a)} className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-extrabold text-white disabled:opacity-60"><Send size={15} />Send to queue</button>
                    : <button type="button" disabled={b || !isToday} title={isToday ? '' : 'Arrived works for today only'} onClick={() => cq.arrive(a)} className="flex items-center gap-1 rounded-lg bg-teal px-3 py-2 text-sm font-extrabold text-white disabled:opacity-50"><LogIn size={15} />{b ? '…' : 'Arrived'}</button>}
                  {!a.arrivedAt && a.phone && <a aria-label="Remind on WhatsApp" title="Remind on WhatsApp" className="rounded-lg border border-slate-200 p-2 text-emerald-700 hover:bg-emerald-50" href={waLink(a, cq.who!.clinicName, cq.who!.doctorName)} target="_blank" rel="noreferrer"><MessageCircle size={16} /></a>}
                  {!a.arrivedAt && <button type="button" aria-label="Cancel booking" title="Cancel booking" disabled={b} className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => { if (window.confirm(`Cancel ${a.name}'s booking?`)) cq.cancel(a); }}><X size={16} /></button>}
                </div>)}
          </div>); })}
      </div>
    </div>
  );
}
