import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useSettings } from '../lib/db';
import { matchPatient, deskCleanup, deskMark, deskMsg, deskRemove, deskWatch, type DeskItem } from '../lib/desk';
import { enc } from '../lib/orthovault';
import { cx } from '../lib/util';
import { Card } from './ui';

/** Patients added at the reception desk today, waiting to be seen. Shown only while the desk is switched on. */
export default function DeskQueue() {
  const s = useSettings(); const nav = useNavigate(); const id = s?.deskId || '';
  const pats = useLiveQuery(() => db.patients.toArray(), []) || [];
  const [items, setItems] = useState<DeskItem[]>([]); const [err, setErr] = useState('');
  useEffect(() => {
    if (!id) { setItems([]); return; }
    let off: (() => void) | undefined; let dead = false;
    deskCleanup(id);
    deskWatch(id, (x) => { if (!dead) { setItems(x); setErr(''); } }, (e) => !dead && setErr(deskMsg(e))).then((u) => { if (dead) u(); else off = u; }).catch((e) => setErr(deskMsg(e)));
    return () => { dead = true; off?.(); };
  }, [id]);
  if (!id) return null;
  if (err) return <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">Reception desk: {err}</div>;
  const waiting = items.filter((i) => i.status === 'waiting');
  const known = (i: DeskItem) => matchPatient(pats, i);
  const seen = items.filter((i) => i.status === 'seen');
  async function start(i: DeskItem) { await deskMark(id, i.id, 'seen').catch(() => {}); nav(`/new?desk=${enc(i)}`, { state: { t: Date.now() } }); }
  return (
    <Card className="border-teal/40 bg-teal-50/50 p-3">
      <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">Waiting at reception ({waiting.length})</div>
      {!waiting.length && <div className="text-sm text-slate-500">No one waiting.</div>}
      <div className="space-y-2">
        {waiting.map((i) => { const k = known(i); return (
          <div key={i.id} className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button onClick={() => start(i)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left active:bg-brand-50">
              <span className="w-8 shrink-0 text-center text-xl font-extrabold text-teal">{i.token}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5"><span className="truncate text-sm font-extrabold">{i.name}</span>{(k || i.followUp) && <span className={cx('shrink-0 rounded px-1.5 text-[10px] font-extrabold uppercase', k ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800')}>{k ? `Follow-up · ${k.pid || 'saved'}` : 'Follow-up · record not found'}</span>}</span>
                <span className="block truncate text-[11px] font-medium text-slate-500">{[i.age && `${i.age}${i.ageUnit === 'M' ? 'm' : 'y'}`, i.sex, i.reason, i.bp && `BP ${i.bp}`, i.sugar && `Sugar ${i.sugar}`].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
            <button aria-label="Remove" onClick={() => deskRemove(id, i.id).catch(() => {})} className={cx('border-l border-slate-100 px-2 text-slate-400 hover:text-red-600')}><X size={14} /></button>
          </div>); })}
      </div>
      {seen.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">Seen today:{seen.map((i) => <button key={i.id} className="rounded-full border border-slate-200 bg-white px-2 py-0.5" title="Put back in the waiting list" onClick={() => deskMark(id, i.id, 'waiting').catch(() => {})}>{i.token} {i.name.split(' ')[0]} ↩</button>)}</div>}
    </Card>
  );
}
