import { Link } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import type { Prescription } from '../lib/types';
import { Badge } from './ui';
import { fmtDate, isToday } from '../lib/util';

export default function RxRow({ rx, showPatient = true }: { rx: Prescription; showPatient?: boolean }) {
  const t = rx.authorizedAt || rx.updatedAt;
  return (
    <Link to={`/rx/${rx.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand hover:bg-brand-50/50">
      <div className={`rounded-lg p-2 ${rx.status === 'final' ? 'bg-teal-50 text-teal' : 'bg-amber-100 text-amber-700'}`}><FileText size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="truncate text-[15px] font-extrabold">{showPatient ? rx.patient.name || 'Unnamed patient' : rx.clinical.diagnosis || 'No diagnosis'}</span>
          {rx.status === 'draft' ? <Badge tone="amber">Draft</Badge> : <Badge tone="green">{rx.rxNo}</Badge>}{rx.version > 1 && <Badge tone="blue">v{rx.version}</Badge>}</div>
        <div className="truncate text-xs text-slate-500">{showPatient && (rx.clinical.diagnosis || 'No diagnosis') + ' · '}{rx.items.length} medicine{rx.items.length === 1 ? '' : 's'}{rx.procedures?.length ? ` · ${rx.procedures.map((x) => x.kind).join(', ')}` : ''} · {isToday(t) ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : fmtDate(t)}</div>
      </div>
      <ChevronRight size={18} className="text-slate-400" />
    </Link>
  );
}
