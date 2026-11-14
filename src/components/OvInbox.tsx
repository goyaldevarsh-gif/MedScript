import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSettings, db } from '../lib/db';
import { dropInbox, ovMsg, watchInbox, type InboxItem } from '../lib/ovcloud';
import { enc } from '../lib/orthovault';
import { Card } from './ui';

/** Patients sent from the doctor's own OrthoVault. Shown only while this device is linked to that account. */
export default function OvInbox({ compact }: { compact?: boolean }) {
  const s = useSettings();
  const nav = useNavigate();
  const email = s?.ovEmail || '';
  const [items, setItems] = useState<InboxItem[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!email) { setItems([]); return; }
    let off: (() => void) | undefined; let dead = false;
    watchInbox(email, (x) => { if (!dead) { setItems(x); setErr(''); } }, (e) => !dead && setErr(ovMsg(e))).then((u) => { if (dead) u(); else off = u; }).catch(() => {});
    return () => { dead = true; off?.(); };
  }, [email]);
  if (email && err) return <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">OrthoVault: {err}</div>;
  if (!email || !items.length) return null;
  async function start(it: InboxItem) {
    const known = (await db.patients.toArray()).find((p) => p.ovId === it.id);
    nav(`/new?ov=${enc({ ...it, id: it.id })}`, { state: { t: Date.now(), known: !!known } });
  }
  return (
    <Card className="border-brand/40 bg-brand-50/50 p-3">
      <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">From OrthoVault ({items.length})</div>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, compact ? 6 : 12).map((it) => (
          <span key={it.id} className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button onClick={() => start(it)} className="px-3 py-2 text-left active:bg-brand-50">
              <span className="block text-sm font-extrabold">{it.name}</span>
              <span className="block text-[11px] font-medium text-slate-500">{[it.age && `${it.age}${it.ageUnit === 'M' ? 'm' : 'y'}`, it.sex, it.dx].filter(Boolean).join(' · ')}</span>
            </button>
            <button aria-label="Remove" onClick={() => dropInbox(it.id, email).catch(() => {})} className="self-stretch border-l border-slate-100 px-2 text-slate-400 hover:text-red-600"><X size={14} /></button>
          </span>
        ))}
      </div>
    </Card>
  );
}
