import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { deskDirWatch, deskMsg, deskRemove, deskSubmit, deskWatch, suggest, validKey, type DeskIn, type DeskItem, type DirRow } from '../lib/desk';
import { cx } from '../lib/util';

const REASONS = ['Knee pain', 'Back pain', 'Neck pain', 'Shoulder pain', 'Hip pain', 'Fall / injury', 'Fracture follow-up', 'Post-op follow-up', 'Report show'];
const blank = (): DeskIn => ({ name: '', age: '', ageUnit: 'Y', sex: '', phone: '', weight: '', allergies: '', reason: '', bp: '', sugar: '', followUp: false, toOv: false });
const fmt = (d?: string) => (d && d.length === 10 ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const mins = (t: number, now: number) => Math.max(0, Math.round((now - t) / 60000));
const hue = (m: number) => (m >= 45 ? 'bg-red-50 text-red-700' : m >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700');
const hello = (now: number) => { const h = new Date(now).getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';
const ago = (t: number, now: number) => { const m = Math.max(0, Math.round((now - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

/** The reception desk. Opened from the doctor's secret link, it has no menu and holds no patient history: it checks patients in to the doctor's waiting list. */
export default function Desk() {
  const [sp] = useSearchParams(); const id = sp.get('d') || ''; const key = sp.get('k') || '';
  const [f, setF] = useState<DeskIn>(blank()); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ n: number; name: string } | null>(null);
  const [list, setList] = useState<DeskItem[]>([]); const [lerr, setLerr] = useState('');
  const [now, setNow] = useState(Date.now());
  const [dir, setDir] = useState<DirRow[] | null>(null); const [derr, setDerr] = useState('');
  const [q, setQ] = useState(''); const [picked, setPicked] = useState<DirRow | null>(null);
  const sug = useMemo(() => (dir && q.trim().length >= 2 ? suggest(dir, q) : []), [dir, q]);
  const set = (x: Partial<DeskIn>) => setF((c) => ({ ...c, ...x }));

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    let off: (() => void) | undefined; let dead = false;
    deskWatch(id, (x) => { if (!dead) { setList(x); setLerr(''); } }, (e) => !dead && setLerr(deskMsg(e))).then((u) => { if (dead) u(); else off = u; }).catch((e) => setLerr(deskMsg(e)));
    return () => { dead = true; off?.(); };
  }, [id]);
  useEffect(() => {
    let off: (() => void) | undefined; let dead = false;
    deskDirWatch(id, key, (r) => { if (!dead) { setDir(r); setDerr(''); } }, (e) => !dead && setDerr(deskMsg(e))).then((u) => { if (dead) u(); else off = u; }).catch((e) => setDerr(deskMsg(e)));
    return () => { dead = true; off?.(); };
  }, [id, key]);
  // a full 10-digit mobile typed in the form that matches a saved patient marks the visit as a follow-up
  const known = useMemo(() => { const ph = f.phone.replace(/\D/g, '').slice(-10); return ph.length === 10 && dir ? dir.find((r) => r.p === ph) || null : null; }, [f.phone, dir]);
  useEffect(() => { if (known) setF((c) => (c.followUp ? c : { ...c, followUp: true })); }, [known]);
  function pick(r: DirRow) { setPicked(r); setQ(''); set({ name: r.n, phone: r.p, age: r.a, ageUnit: r.u === 'M' ? 'M' : 'Y', sex: ['Male', 'Female', 'Other'].includes(r.s) ? r.s : '', followUp: true }); }

  async function save() {
    const e: string[] = [];
    if (!f.name.trim()) e.push('Name needed');
    if (f.age && (isNaN(Number(f.age)) || Number(f.age) < 0 || Number(f.age) > 120)) e.push('Check age');
    if (f.phone && f.phone.replace(/\D/g, '').length < 10) e.push('Mobile: 10 digits');
    if (f.weight && (isNaN(Number(f.weight)) || Number(f.weight) <= 0)) e.push('Check weight');
    if (e.length) { setErr(e.join('. ')); return; }
    setBusy(true); setErr('');
    try {
      const n = await deskSubmit(id, { ...f, name: f.name.trim(), phone: f.phone.replace(/\D/g, '').slice(-10), reason: f.reason.trim() });
      setDone({ n, name: f.name.trim() }); setF(blank()); setPicked(null); setQ('');
    } catch (x) { setErr(deskMsg(x)); }
    setBusy(false);
  }
  if (!/^[a-z0-9]{20,40}$/.test(id) || !validKey(key)) return <div className="flex min-h-full items-center justify-center p-8 text-center text-lg font-bold text-slate-600">Invalid link</div>;

  const waiting = list.filter((i) => i.status === 'waiting'); const seenList = list.filter((i) => i.status === 'seen');
  return (
    <div className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap px-4 sm:px-8 items-center gap-x-6 gap-y-2">
          <div className="mr-auto"><div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{hello(now)}</div><h1 className="text-2xl font-extrabold text-navy">{new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h1></div>
          {[['Waiting', waiting.length, 'text-teal'], ['Seen', seenList.length, 'text-slate-600'], ['Total', list.length, 'text-navy']].map(([l, v, c]) => <div key={String(l)} className="text-center"><div className={cx('text-3xl font-extrabold leading-none', c as string)}>{v}</div><div className="text-[11px] font-bold uppercase text-slate-500">{l}</div></div>)}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-4 sm:px-8 sm:py-6 lg:grid-cols-12">
        {/* ---------- left: who is waiting ---------- */}
        <section className="lg:col-span-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><Users size={19} /> Waiting <span className="rounded-full bg-teal px-2.5 py-0.5 text-sm text-white">{waiting.length}</span></h2>
          {lerr && <div className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">{lerr}</div>}
          {!lerr && !waiting.length && <div className="card p-10 text-center"><div className="text-4xl">☕</div><div className="mt-2 text-lg font-extrabold text-slate-700">All clear</div><div className="text-sm text-slate-500">New check-ins show up here</div></div>}
          <div className="space-y-2.5">
            {waiting.map((it, ix) => (
              <div key={it.id} className={cx('card flex items-center gap-3 border-l-4 p-3.5 transition-shadow hover:shadow-md', ix === 0 ? 'border-l-teal ring-1 ring-teal/30' : 'border-l-slate-300')}>
                <div className="w-11 shrink-0 text-center"><div className="text-[10px] font-bold uppercase text-slate-500">{ix === 0 ? 'Next' : 'Token'}</div><div className="text-3xl font-extrabold leading-none text-teal">{it.token}</div></div>
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy/10 text-sm font-extrabold text-navy sm:flex">{initials(it.name)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5"><span className="truncate text-base font-extrabold">{it.name}</span>
                    {it.followUp ? <span className="rounded bg-blue-50 px-1.5 text-[10px] font-extrabold uppercase text-blue-700">Follow-up</span> : <span className="rounded bg-emerald-50 px-1.5 text-[10px] font-extrabold uppercase text-emerald-700">New</span>}
                    {it.toOv && <span className="rounded bg-violet-50 px-1.5 text-[10px] font-extrabold uppercase text-violet-700">OrthoVault</span>}</div>
                  <div className="truncate text-sm text-slate-600">{[it.age && `${it.age}${it.ageUnit === 'M' ? 'm' : 'y'}`, it.sex, it.reason || '-'].filter(Boolean).join(' · ')}</div>
                </div>
                <div className={cx('shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold', hue(mins(it.createdAt, now)))}>{ago(it.createdAt, now)}</div>
                <button aria-label="Remove" title="Remove" className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => deskRemove(id, it.id).catch((e) => setLerr(deskMsg(e)))}><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          {seenList.length > 0 && (
            <div className="mt-5"><div className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">Seen</div>
              <div className="space-y-1">{seenList.map((it) => <div key={it.id} className="flex items-center gap-3 rounded-lg bg-white/60 px-3 py-1.5 text-sm text-slate-500"><span className="w-7 text-center font-extrabold">{it.token}</span><span className="truncate">{it.name}</span></div>)}</div></div>
          )}
        </section>

        {/* ---------- right: find a patient, check in ---------- */}
        <section className="space-y-3 lg:col-span-7">
          {done && (
            <div className="flex animate-[pop_.25s_ease-out] items-center gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
              <CheckCircle2 className="shrink-0 text-emerald-600" size={36} />
              <div className="min-w-0 flex-1"><div className="text-sm font-bold text-emerald-800">Sent · {done.name}</div><div className="text-4xl font-extrabold leading-tight text-emerald-900">Token {done.n}</div></div>
              <button className="text-sm font-bold text-emerald-800 underline" onClick={() => setDone(null)}>OK</button>
            </div>
          )}

          <div className="card p-4 sm:p-5">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><Search size={19} /> Find patient</h2>
            <input className="field !py-3 !text-base" autoComplete="off" placeholder="Name or mobile" value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} />
            {derr && <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 font-bold text-amber-900">{derr}</div>}
            {sug.length > 0 && (
              <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
                {sug.map((r) => <button key={r.n + r.p + r.d} type="button" onClick={() => pick(r)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-50">
                  <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{r.n}</span><span className="block truncate text-xs font-medium text-slate-500">{[r.a && `${r.a}${r.u === 'M' ? 'm' : 'y'}`, r.s, r.p && `•••• ${r.p.slice(-4)}`].filter(Boolean).join(' · ')}</span></span>
                  <span className="shrink-0 text-xs font-bold text-slate-500">{fmt(r.d)}</span></button>)}
              </div>)}
            {dir && !derr && q.trim().length >= 2 && !sug.length && <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-600">Not found · New</div>}
            {dir && !derr && !dir.length && <div className="mt-2 text-xs font-semibold text-slate-500">No saved patients yet.</div>}
            {!dir && !derr && <div className="mt-2 text-xs font-semibold text-slate-500">Loading…</div>}
            {picked && <div className="mt-2 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2.5 font-bold text-blue-900">Found · {fmt(picked.d)} · Follow-up</div>}
          </div>

          <div className="card space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="mr-auto flex items-center gap-2 text-lg font-extrabold"><UserPlus size={19} /> Details</h2>
              <div className="flex rounded-full bg-slate-100 p-1">{([['New', false], ['Follow-up', true]] as const).map(([l, v]) => <button key={l} type="button" onClick={() => set({ followUp: v })} className={cx('rounded-full px-5 py-2 text-sm font-extrabold', !!f.followUp === v ? 'bg-brand text-white shadow' : 'text-slate-600')}>{l}</button>)}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="lbl">Name *</span><input className="field" autoComplete="off" value={f.name} onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="block"><span className="lbl">Mobile</span><input className="field" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
                {known && <span className="mt-1 block text-xs font-bold text-blue-700">✓ Found · {fmt(known.d)}</span>}</label>
            </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block"><span className="lbl">Age</span><div className="flex gap-1"><input className="field min-w-0" type="number" inputMode="numeric" value={f.age} onChange={(e) => set({ age: e.target.value })} /><select className="field !w-14 shrink-0 !px-1" value={f.ageUnit} onChange={(e) => set({ ageUnit: e.target.value as 'Y' | 'M' })}><option value="Y">Y</option><option value="M">M</option></select></div></label>
                <label className="block"><span className="lbl">Weight (kg)</span><input className="field" type="number" inputMode="decimal" value={f.weight} onChange={(e) => set({ weight: e.target.value })} /></label>
                <div className="col-span-2"><span className="lbl">Sex</span><div className="flex gap-1.5">{['Male', 'Female', 'Other'].map((s) => <button key={s} type="button" onClick={() => set({ sex: f.sex === s ? '' : s })} className={cx('flex-1 rounded-lg border px-2 py-2.5 text-sm font-bold', f.sex === s ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}>{s}</button>)}</div></div>
              </div>
            <div>
              <span className="lbl">Reason</span>
              <input className="field" placeholder="e.g. knee pain" value={f.reason} onChange={(e) => set({ reason: e.target.value })} />
              <div className="mt-2 flex flex-wrap gap-1.5">{REASONS.map((r) => <button key={r} type="button" onClick={() => set({ reason: f.reason ? (f.reason.includes(r) ? f.reason : f.reason + ', ' + r) : r })} className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[13px] font-bold text-slate-700 hover:border-brand">{r}</button>)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="col-span-2 block"><span className="lbl">Allergies</span><input className="field" placeholder="None" value={f.allergies} onChange={(e) => set({ allergies: e.target.value })} /></label>
              <label className="block"><span className="lbl">BP</span><input className="field" placeholder="130/80" value={f.bp} onChange={(e) => set({ bp: e.target.value })} /></label>
              <label className="block"><span className="lbl">Sugar</span><input className="field" placeholder="140 RBS" value={f.sugar} onChange={(e) => set({ sugar: e.target.value })} /></label>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5"><input type="checkbox" className="h-5 w-5" checked={!!f.toOv} onChange={(e) => set({ toOv: e.target.checked })} /><span className="text-sm font-bold text-violet-900">Add to OrthoVault</span></label>
            {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{err}</div>}
            <button type="button" disabled={busy} onClick={save} className="w-full rounded-xl bg-brand py-3.5 text-lg font-extrabold text-white shadow disabled:opacity-60">{busy ? 'Sending…' : 'Send'}</button>
          </div>
        </section>
      </div>
    </div>
  );
}
