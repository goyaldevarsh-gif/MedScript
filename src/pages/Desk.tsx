import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Hourglass, ListChecks, Repeat, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { deskDirWatch, deskMsg, deskRemove, deskSubmit, deskWatch, suggest, validKey, type DeskIn, type DeskItem, type DirRow } from '../lib/desk';
import { cx } from '../lib/util';

const REASONS = ['Knee pain', 'Back pain', 'Neck pain', 'Shoulder pain', 'Hip pain', 'Fall / injury', 'Fracture follow-up', 'Post-op follow-up', 'Report show'];
const blank = (): DeskIn => ({ name: '', age: '', ageUnit: 'Y', sex: '', phone: '', weight: '', allergies: '', reason: '', bp: '', sugar: '', followUp: false, toOv: false });
const fmt = (d?: string) => (d && d.length === 10 ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const mins = (t: number, now: number) => Math.max(0, Math.round((now - t) / 60000));
const hue = (m: number) => (m >= 45 ? 'bg-red-50 text-red-700' : m >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700');
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
  const [open, setOpen] = useState(false); const [tab, setTab] = useState<'w' | 'a'>('w');
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
  function pick(r: DirRow) { setOpen(true); setPicked(r); setQ(''); set({ name: r.n, phone: r.p, age: r.a, ageUnit: r.u === 'M' ? 'M' : 'Y', sex: ['Male', 'Female', 'Other'].includes(r.s) ? r.s : '', followUp: true }); }

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
      setDone({ n, name: f.name.trim() }); setOpen(false); setF(blank()); setPicked(null); setQ('');
    } catch (x) { setErr(deskMsg(x)); }
    setBusy(false);
  }
  if (!/^[a-z0-9]{20,40}$/.test(id) || !validKey(key)) return <div className="flex min-h-full items-center justify-center p-8 text-center text-lg font-bold text-slate-600">Invalid link</div>;

  const waiting = list.filter((i) => i.status === 'waiting'); const seenList = list.filter((i) => i.status === 'seen');
  const fuCount = list.filter((i) => i.followUp).length; const rows = tab === 'w' ? waiting : list;
  const clock = new Date(now).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const stats: [string, number, typeof Users, string, string][] = [
    ['Total today', list.length, Users, 'bg-slate-50 border-slate-200', 'bg-slate-200 text-slate-700'],
    ['Seen', seenList.length, ListChecks, 'bg-emerald-50 border-emerald-200', 'bg-emerald-100 text-emerald-700'],
    ['Waiting', waiting.length, Hourglass, 'bg-sky-50 border-sky-200', 'bg-sky-100 text-sky-700'],
    ['Follow-ups', fuCount, Repeat, 'bg-violet-50 border-violet-200', 'bg-violet-100 text-violet-700'],
  ];
  const sub = (r: DirRow) => [r.a && `${r.a}${r.u === 'M' ? 'm' : 'y'}`, r.s, r.p && `•••• ${r.p.slice(-4)}`].filter(Boolean).join(' · ');
  return (
    <div className="flex min-h-full bg-slate-100">
      {/* ---------- dark rail ---------- */}
      <aside className="hidden w-60 shrink-0 flex-col bg-navy p-5 text-white lg:flex">
        <div className="mt-2 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xl font-extrabold">Rx</div>
          <div className="mt-3 text-lg font-extrabold">Reception</div><div className="text-xs font-semibold text-white/60">Check-in desk</div></div>
                <button type="button" onClick={() => { setOpen(true); setPicked(null); }} className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 text-base font-extrabold shadow hover:brightness-110"><UserPlus size={19} /> New patient</button>
        <div className="mt-6 space-y-1 text-sm font-bold">
          <button type="button" onClick={() => setTab('w')} className={cx('flex w-full items-center justify-between rounded-lg px-3 py-2.5', tab === 'w' ? 'bg-white/15' : 'text-white/70 hover:bg-white/10')}>Waiting <span>{waiting.length}</span></button>
          <button type="button" onClick={() => setTab('a')} className={cx('flex w-full items-center justify-between rounded-lg px-3 py-2.5', tab === 'a' ? 'bg-white/15' : 'text-white/70 hover:bg-white/10')}>All today <span>{list.length}</span></button>
        </div>
        <div className="mt-auto rounded-xl bg-white/10 p-3 text-sm"><div className="flex items-center gap-2 font-extrabold"><Clock size={16} /> {clock}</div><div className="mt-1 flex items-center gap-2 text-xs font-semibold text-white/70"><span className={cx('h-2 w-2 rounded-full', lerr ? 'bg-amber-400' : 'bg-emerald-400')} /> {lerr ? 'Offline' : 'Live'}</div></div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-end gap-3">
          <div className="mr-auto"><h1 className="text-2xl font-extrabold text-navy sm:text-3xl">Today's queue</h1>
            <div className="text-sm font-semibold text-slate-500">{new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
          <button type="button" onClick={() => { setOpen(true); setPicked(null); }} className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 font-extrabold text-white shadow lg:hidden"><UserPlus size={18} /> New patient</button>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([l, v, Ic, box, ic]) => <div key={l} className={cx('flex items-center gap-3 rounded-2xl border p-3.5', box)}><span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', ic)}><Ic size={21} /></span><div><div className="text-xs font-bold text-slate-600">{l}</div><div className="text-3xl font-extrabold leading-none text-navy">{v}</div></div></div>)}
        </div>

        {done && (
          <div className="mb-4 flex animate-[pop_.25s_ease-out] items-center gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
            <CheckCircle2 className="shrink-0 text-emerald-600" size={36} />
            <div className="min-w-0 flex-1"><div className="text-sm font-bold text-emerald-800">Sent · {done.name}</div><div className="text-4xl font-extrabold leading-tight text-emerald-900">Token {done.n}</div></div>
            <button className="text-sm font-bold text-emerald-800 underline" onClick={() => setDone(null)}>OK</button>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-12">
          {/* ---------- queue ---------- */}
          <section className="card overflow-hidden xl:col-span-8">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
              {([['w', `Waiting (${waiting.length})`], ['a', `All today (${list.length})`]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={cx('rounded-xl px-4 py-2 text-sm font-extrabold', tab === k ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{l}</button>)}
            </div>
            {lerr && <div className="m-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">{lerr}</div>}
            {!lerr && !rows.length && <div className="p-12 text-center"><div className="text-4xl">☕</div><div className="mt-2 text-lg font-extrabold text-slate-700">All clear</div><div className="text-sm text-slate-500">New check-ins show up here</div></div>}
            {rows.length > 0 && <div className="hidden grid-cols-[3.5rem_1fr_6rem_6.5rem_5.5rem_6rem_2.5rem] gap-2 bg-slate-50 px-4 py-2 text-xs font-extrabold uppercase text-slate-500 md:grid"><span>Token</span><span>Patient</span><span>Age / Sex</span><span>Visit</span><span>Time</span><span>Status</span><span /></div>}
            <div className="divide-y divide-slate-100">
              {rows.map((it, ix) => { const m = mins(it.createdAt, now); const seen = it.status === 'seen'; return (
                <div key={it.id} className={cx('grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 px-4 py-3 md:grid-cols-[3.5rem_1fr_6rem_6.5rem_5.5rem_6rem_2.5rem]', !seen && ix === 0 && tab === 'w' && 'bg-teal-50/60')}>
                  <span className="flex h-9 w-12 items-center justify-center rounded-lg border border-teal/40 bg-teal-50 text-lg font-extrabold text-teal-700">{it.token}</span>
                  <div className="min-w-0"><div className="flex items-center gap-2"><span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-extrabold text-navy sm:flex">{initials(it.name)}</span><span className="truncate text-base font-extrabold">{it.name}</span>{it.toOv && <span className="rounded bg-violet-50 px-1.5 text-[10px] font-extrabold uppercase text-violet-700">OrthoVault</span>}</div>
                    <div className="truncate text-xs text-slate-500 md:pl-10">{it.reason || '-'}</div></div>
                  <span className="hidden text-sm font-semibold text-slate-700 md:block">{[it.age && `${it.age}${it.ageUnit === 'M' ? 'm' : 'y'}`, it.sex && it.sex[0]].filter(Boolean).join(' / ') || '-'}</span>
                  <span className="hidden md:block">{it.followUp ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-extrabold text-violet-700"><Repeat size={12} /> Follow-up</span> : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700"><UserPlus size={12} /> New</span>}</span>
                  <span className="hidden text-sm font-semibold text-slate-600 md:block">{new Date(it.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                  <span className={cx('justify-self-end rounded-full px-2.5 py-1 text-xs font-extrabold md:justify-self-start', seen ? 'bg-slate-100 text-slate-500' : hue(m))}>{seen ? 'Seen' : ago(it.createdAt, now)}</span>
                  <button aria-label="Remove" title="Remove" className="hidden justify-self-end rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 md:block" onClick={() => deskRemove(id, it.id).catch((e) => setLerr(deskMsg(e)))}><Trash2 size={17} /></button>
                </div>); })}
            </div>
          </section>

          {/* ---------- find patient ---------- */}
          <section className="space-y-4 xl:col-span-4">
            <div className="card p-4">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><Search size={19} /> Find patient</h2>
              <input className="field !py-3 !text-base" autoComplete="off" placeholder="Name or mobile" value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} />
              {derr && <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 font-bold text-amber-900">{derr}</div>}
              {sug.length > 0 && (
                <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
                  {sug.map((r) => <button key={r.n + r.p + r.d} type="button" onClick={() => pick(r)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-50">
                    <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-extrabold text-navy sm:flex">{initials(r.n)}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{r.n}</span><span className="block truncate text-xs font-medium text-slate-500">{sub(r)}</span></span>
                    <span className="shrink-0 text-xs font-bold text-slate-500">{fmt(r.d)}</span></button>)}
                </div>)}
              {dir && !derr && q.trim().length >= 2 && !sug.length && <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-600">Not found <button type="button" className="rounded-lg bg-teal px-3 py-1 text-sm text-white" onClick={() => { setOpen(true); setPicked(null); set({ name: q.replace(/\d/g, '').trim(), phone: q.replace(/\D/g, '') }); setQ(''); }}>Add as new</button></div>}
              {dir && !derr && !dir.length && <div className="mt-2 text-xs font-semibold text-slate-500">No saved patients yet.</div>}
              {!dir && !derr && <div className="mt-2 text-xs font-semibold text-slate-500">Loading…</div>}
            </div>
          </section>
        </div>
      </main>

      {/* ---------- check-in drawer ---------- */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setOpen(false)}>
          <div className="h-full w-full max-w-xl animate-[pop_.2s_ease-out] overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center border-b border-slate-100 bg-white px-4 py-2"><span className="mr-auto text-xs font-bold text-slate-500">{picked ? `Found · ${fmt(picked.d)}` : ''}</span><button type="button" aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)}><X size={20} /></button></div>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="mr-auto flex items-center gap-2 text-xl font-extrabold"><UserPlus size={20} /> Check-in</h2>
              <div className="flex rounded-full bg-slate-100 p-1">{([['New', false], ['Follow-up', true]] as const).map(([l, v]) => <button key={l} type="button" onClick={() => set({ followUp: v })} className={cx('rounded-full px-5 py-2 text-sm font-extrabold', !!f.followUp === v ? 'bg-teal text-white shadow' : 'text-slate-600')}>{l}</button>)}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="lbl">Name *</span><input className="field" autoComplete="off" value={f.name} onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="block"><span className="lbl">Mobile</span><input className="field" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
                {known && <span className="mt-1 block text-xs font-bold text-blue-700">✓ Found · {fmt(known.d)}</span>}</label>
            </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block"><span className="lbl">Age</span><div className="flex gap-1"><input className="field min-w-0" type="number" inputMode="numeric" value={f.age} onChange={(e) => set({ age: e.target.value })} /><select className="field !w-14 shrink-0 !px-1" value={f.ageUnit} onChange={(e) => set({ ageUnit: e.target.value as 'Y' | 'M' })}><option value="Y">Y</option><option value="M">M</option></select></div></label>
                <label className="block"><span className="lbl">Weight (kg)</span><input className="field" type="number" inputMode="decimal" value={f.weight} onChange={(e) => set({ weight: e.target.value })} /></label>
                <div className="col-span-2"><span className="lbl">Sex</span><div className="flex gap-1.5">{['Male', 'Female', 'Other'].map((s) => <button key={s} type="button" onClick={() => set({ sex: f.sex === s ? '' : s })} className={cx('flex-1 rounded-lg border px-2 py-2.5 text-sm font-bold', f.sex === s ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700')}>{s}</button>)}</div></div>
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
            <button type="button" disabled={busy} onClick={save} className="w-full rounded-xl bg-teal py-3.5 text-lg font-extrabold text-white shadow disabled:opacity-60">{busy ? 'Sending…' : 'Send'}</button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
