import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { deskKnown, deskMsg, deskRemove, deskSubmit, deskWatch, type DeskIn, type DeskItem, type Seen } from '../lib/desk';
import { cx } from '../lib/util';

const REASONS = ['Knee pain', 'Back pain', 'Neck pain', 'Shoulder pain', 'Fall / injury', 'Fracture follow-up', 'Post-op follow-up', 'Report show'];
const blank = (): DeskIn => ({ name: '', age: '', ageUnit: 'Y', sex: '', phone: '', weight: '', allergies: '', reason: '', bp: '', sugar: '', followUp: false });

/** The reception desk screen. Opened from the doctor's secret link. It has no menu and holds no patient history: it only adds today's patients to the doctor's waiting list. */
export default function Desk() {
  const [sp] = useSearchParams(); const id = sp.get('d') || '';
  const [f, setF] = useState<DeskIn>(blank()); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ n: number; name: string } | null>(null);
  const [list, setList] = useState<DeskItem[]>([]); const [lerr, setLerr] = useState('');
  const [more, setMore] = useState(false);
  const [seen, setSeen] = useState<Seen>({}); const [checked, setChecked] = useState(false);
  useEffect(() => {
    const ph = f.phone.replace(/\D/g, ''); if (ph.length < 10 && f.name.trim().length < 4) { setSeen({}); setChecked(false); return; }
    let dead = false; const t = setTimeout(() => {
      deskKnown(id, { phone: f.phone, name: f.name }).then((r) => { if (dead) return; setSeen(r); setChecked(true); if (r.phone) setF((c) => (c.followUp ? c : { ...c, followUp: true })); }).catch(() => { if (!dead) { setSeen({}); setChecked(false); } });
    }, 600);
    return () => { dead = true; clearTimeout(t); };
  }, [f.phone, f.name, id]);
  const set = (x: Partial<DeskIn>) => setF((c) => ({ ...c, ...x }));
  useEffect(() => {
    let off: (() => void) | undefined; let dead = false;
    deskWatch(id, (x) => { if (!dead) { setList(x); setLerr(''); } }, (e) => !dead && setLerr(deskMsg(e))).then((u) => { if (dead) u(); else off = u; }).catch((e) => setLerr(deskMsg(e)));
    return () => { dead = true; off?.(); };
  }, [id]);

  async function save() {
    const e: string[] = [];
    if (!f.name.trim()) e.push('Name is required');
    if (f.age && (isNaN(Number(f.age)) || Number(f.age) < 0 || Number(f.age) > 120)) e.push('Check the age');
    if (f.phone && f.phone.replace(/\D/g, '').length < 10) e.push('Phone should be 10 digits');
    if (f.weight && (isNaN(Number(f.weight)) || Number(f.weight) <= 0)) e.push('Check the weight');
    if (e.length) { setErr(e.join('. ')); return; }
    setBusy(true); setErr('');
    try {
      const n = await deskSubmit(id, { ...f, name: f.name.trim(), phone: f.phone.replace(/\D/g, '').slice(-10), reason: f.reason.trim() });
      setDone({ n, name: f.name.trim() }); setF(blank()); setMore(false);
    } catch (x) { setErr(deskMsg(x)); }
    setBusy(false);
  }
  if (!/^[a-z0-9]{20,40}$/.test(id)) return <div className="flex min-h-full items-center justify-center p-8 text-center text-lg font-bold text-slate-600">This desk link is not valid. Ask the doctor for the link again.</div>;
  return (
    <div className="mx-auto min-h-full max-w-xl space-y-4 p-4 pb-16">
      <div><div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Reception desk</div><h1 className="text-2xl font-extrabold">Register patient</h1></div>
      {done && (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
          <CheckCircle2 className="shrink-0 text-emerald-600" size={30} />
          <div className="min-w-0"><div className="text-sm font-bold text-emerald-800">Sent to the doctor: {done.name}</div><div className="text-3xl font-extrabold text-emerald-900">Token {done.n}</div></div>
        </div>
      )}
      <div className="card space-y-3 p-4">
        <div><span className="lbl">Visit</span><div className="flex gap-1.5">{[['New patient', false], ['Follow-up', true]].map(([l, v]) => <button key={String(l)} type="button" onClick={() => set({ followUp: v as boolean })} className={cx('flex-1 rounded-full border px-2 py-2 text-sm font-bold', !!f.followUp === v ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}>{l}</button>)}</div></div>
        <label className="block"><span className="lbl">Patient name *</span><input className="field" autoComplete="off" value={f.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="lbl">Age</span><div className="flex gap-1"><input className="field" type="number" inputMode="numeric" value={f.age} onChange={(e) => set({ age: e.target.value })} /><select className="field !w-16 !px-1" value={f.ageUnit} onChange={(e) => set({ ageUnit: e.target.value as 'Y' | 'M' })}><option value="Y">Y</option><option value="M">M</option></select></div></label>
          <div><span className="lbl">Sex</span><div className="flex gap-1.5">{['Male', 'Female', 'Other'].map((s) => <button key={s} type="button" onClick={() => set({ sex: f.sex === s ? '' : s })} className={cx('flex-1 rounded-full border px-2 py-2 text-sm font-bold', f.sex === s ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}>{s}</button>)}</div></div>
        </div>
        {(seen.phone || seen.name || (checked && f.phone.replace(/\D/g, '').length >= 10)) && (
          <div className={cx('rounded-xl border px-3 py-2 text-sm font-bold', seen.phone ? 'border-blue-300 bg-blue-50 text-blue-900' : seen.name ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-600')}>
            {seen.phone ? `Seen before${seen.phone.length === 10 ? ' · last visit ' + new Date(seen.phone).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}. Marked as follow-up.`
              : seen.name ? `A patient with this name came before${seen.name.length === 10 ? ' (last visit ' + new Date(seen.name).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ')' : ''}${f.phone.replace(/\D/g, '').length >= 10 ? ', but with a different mobile' : ''}. Please confirm it is the same person.`
              : 'Not found in earlier visits. New patient.'}
          </div>)}
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="lbl">Phone</span><input className="field" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></label>
          <label className="block"><span className="lbl">Weight (kg)</span><input className="field" type="number" inputMode="decimal" value={f.weight} onChange={(e) => set({ weight: e.target.value })} /></label>
        </div>
        <label className="block"><span className="lbl">Known allergies</span><input className="field" placeholder="e.g. Penicillin, leave blank if none" value={f.allergies} onChange={(e) => set({ allergies: e.target.value })} /></label>
        <div>
          <span className="lbl">Why has the patient come today?</span>
          <input className="field" placeholder="e.g. knee pain for 2 months" value={f.reason} onChange={(e) => set({ reason: e.target.value })} />
          <div className="mt-2 flex flex-wrap gap-1.5">{REASONS.map((r) => <button key={r} type="button" onClick={() => set({ reason: f.reason ? (f.reason.includes(r) ? f.reason : f.reason + ', ' + r) : r })} className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">{r}</button>)}</div>
        </div>
        {!more ? <button type="button" className="text-sm font-bold text-brand underline" onClick={() => setMore(true)}>Add BP / sugar (optional)</button> : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="lbl">BP</span><input className="field" placeholder="130/80" value={f.bp} onChange={(e) => set({ bp: e.target.value })} /></label>
            <label className="block"><span className="lbl">Sugar (mg/dl)</span><input className="field" placeholder="e.g. 140 RBS" value={f.sugar} onChange={(e) => set({ sugar: e.target.value })} /></label>
          </div>
        )}
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{err}</div>}
        <button type="button" disabled={busy} onClick={save} className="w-full rounded-xl bg-brand py-3.5 text-lg font-extrabold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send to doctor'}</button>
      </div>
      <div>
        <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Today</div>
        {lerr && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">{lerr}</div>}
        {!lerr && !list.length && <div className="text-sm text-slate-500">No patients yet today.</div>}
        <div className="space-y-1.5">
          {list.map((it) => (
            <div key={it.id} className={cx('flex items-center gap-3 rounded-xl border bg-white px-3 py-2', it.status === 'seen' ? 'border-slate-100 opacity-50' : 'border-slate-200')}>
              <span className="w-9 shrink-0 text-center text-xl font-extrabold text-brand">{it.token}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{it.name}{it.followUp && <span className="ml-1.5 rounded bg-blue-50 px-1.5 text-[10px] font-extrabold uppercase text-blue-700">Follow-up</span>}</span><span className="block truncate text-xs text-slate-500">{it.reason || '—'}</span></span>
              {it.status === 'seen' ? <span className="text-xs font-bold text-slate-500">Seen</span> : <button aria-label="Remove" className="p-1 text-slate-400 hover:text-red-600" onClick={() => deskRemove(id, it.id).catch((e) => setLerr(deskMsg(e)))}><Trash2 size={16} /></button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
