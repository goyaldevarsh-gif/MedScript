import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, Check, ChevronDown, Droplet, Layers, Plus, ScanLine, Search } from 'lucide-react';
import { Chip } from './ui';
import { KIND_LABEL, allTests, joinTests, matchTemplate, planFor, relevantSets, splitTests, suggestTests, testKey, testKind, testNotes, SETS, type TestKind } from '../data/tests';
import { db, useSettings } from '../lib/db';
import { isOrtho } from '../lib/defaults';
import { cx, norm } from '../lib/util';
import type { Clinical, Patient } from '../lib/types';

type Menu = TestKind | 'sets' | null;
const ICON: Record<TestKind, JSX.Element> = { imaging: <ScanLine size={14} />, blood: <Droplet size={14} />, other: <Activity size={14} /> };

/** Under the Investigations box. Suggestions follow the diagnosis (and the matching template), the three drop-downs
 *  hold every Imaging / Blood / Other test, Sets add a whole work-up in one tap, and the search box finds anything.
 *  The text box above stays the source of truth, so the doctor can still type freely. */
export default function TestPicker({ clin, value, onChange, usual = [], patient }: { clin: Clinical; value: string; onChange: (v: string) => void; usual?: string[]; patient?: Pick<Patient, 'sex' | 'age' | 'ageUnit'> }) {
  const st = useSettings();
  const tpls = (useLiveQuery(() => db.templates.toArray(), []) || []).filter((t) => isOrtho(st) || !t.builtIn);
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [menu, setMenu] = useState<Menu>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!menu) return; const h = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setMenu(null); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [menu]);

  const cur = splitTests(value);
  const have = new Set(cur.map(testKey));
  const isIn = (t: string) => have.has(testKey(t));
  const add = (t: string) => { const x = t.trim(); if (!x || isIn(x)) return; onChange(joinTests([...cur, x])); setQ(''); };
  const addMany = (ts: string[]) => { const next = [...cur]; const k = new Set(have); for (const t of ts) { if (!k.has(testKey(t))) { k.add(testKey(t)); next.push(t); } } if (next.length !== cur.length) onChange(joinTests(next)); };
  const toggle = (t: string) => (isIn(t) ? onChange(joinTests(cur.filter((x) => testKey(x) !== testKey(t)))) : add(t));

  const tpl = useMemo(() => matchTemplate(clin.diagnosis, tpls), [clin.diagnosis, tpls]);
  const plan = useMemo(() => planFor(tpl, clin.side), [tpl, clin.side]);
  const sugg = useMemo(() => suggestTests(clin), [clin.diagnosis, clin.complaint, clin.side, clin.bodyParts, clin.injury]); // eslint-disable-line
  const all = useMemo(() => allTests(clin.side), [clin.side]);
  const sets = useMemo(() => relevantSets(clin), [clin.diagnosis, clin.complaint]); // eslint-disable-line
  const notes = testNotes(cur, patient);

  // the chips on top: the doctor's usual tests, then the template's first-line tests, else the best fit for the diagnosis (a mix of imaging and blood)
  const mix = (l: string[]) => { const by = (k: TestKind) => l.filter((t) => testKind(t) === k); return [...by('imaging').slice(0, 3), ...by('blood').slice(0, 2), ...by('other').slice(0, 1)]; };
  const usualShow = usual.filter((t) => !isIn(t)).slice(0, 3);
  const base = plan ? [...plan.first, ...plan.labs.slice(0, 2)] : mix(sugg);
  const picks = base.filter((t) => !isIn(t) && !usualShow.some((u) => testKey(u) === testKey(t))).slice(0, 6);
  const firstLeft = plan ? plan.first.filter((t) => !isIn(t)) : [];
  const matches = q.trim() ? all.filter((t) => norm(t).includes(norm(q)) && !isIn(t)).slice(0, 7) : [];

  function Row({ t, tag }: { t: string; tag?: string }) {
    const on = isIn(t);
    return (
      <button type="button" onClick={() => toggle(t)} className={cx('flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50', on && 'bg-brand-50/60')}>
        <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-brand bg-brand text-white' : 'border-slate-300')}>{on && <Check size={12} />}</span>
        <span className={cx('min-w-0 flex-1', on && 'font-bold')}>{t}</span>{tag && <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">{tag}</span>}
      </button>
    );
  }
  const Head = ({ children }: { children: string }) => <div className="bg-slate-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{children}</div>;

  function KindMenu({ k }: { k: TestKind }) {
    const fromPlan = plan ? [...plan.first.map((t) => [t, ''] as const), ...plan.labs.map((t) => [t, ''] as const), ...plan.more.map((t) => [t, 'if needed'] as const)].filter(([t]) => testKind(t) === k) : [];
    const used = new Set(fromPlan.map(([t]) => testKey(t)));
    const sg = sugg.filter((t) => testKind(t) === k && !used.has(testKey(t)));
    sg.forEach((t) => used.add(testKey(t)));
    const rest = all.filter((t) => testKind(t) === k && !used.has(testKey(t)));
    return (
      <div className="max-h-80 overflow-y-auto py-1">
        {fromPlan.length > 0 && <><Head>{`From template: ${tpl?.name}`}</Head>{fromPlan.map(([t, tag]) => <Row key={'p' + t} t={t} tag={tag} />)}</>}
        {sg.length > 0 && <><Head>Fits this problem</Head>{sg.map((t) => <Row key={'s' + t} t={t} />)}</>}
        <Head>{`All ${KIND_LABEL[k].toLowerCase()} tests`}</Head>{rest.map((t) => <Row key={t} t={t} />)}
      </div>
    );
  }
  function SetMenu() {
    const fit = new Set(sets.map((s) => s.key)); const ordered = [...SETS].sort((a, b) => Number(fit.has(b.key)) - Number(fit.has(a.key)));
    return (
      <div className="max-h-80 overflow-y-auto py-1">
        {ordered.map((s) => { const got = s.tests.filter(isIn).length; return (
          <button key={s.key} type="button" onClick={() => addMany(s.tests)} className="block w-full px-3 py-2 text-left hover:bg-slate-50">
            <div className="flex items-center gap-2 text-sm font-bold">{s.name}{fit.has(s.key) && <span className="rounded bg-teal-50 px-1.5 text-[10px] font-extrabold uppercase text-teal-700">fits</span>}<span className="ml-auto text-xs font-semibold text-slate-500">{got === s.tests.length ? 'all added' : `${got}/${s.tests.length} added · tap to add rest`}</span></div>
            <div className="mt-0.5 text-xs text-slate-500">{s.tests.join(', ')}</div>
          </button>); })}
      </div>
    );
  }
  const count = (k: TestKind) => cur.filter((t) => testKind(t) === k).length;

  return (
    <div ref={root} className="mt-1.5 space-y-1.5">
      {plan && (firstLeft.length > 0 || plan.note) && (
        <div className="rounded-lg border border-teal/30 bg-teal-50 px-2.5 py-1.5 text-xs text-teal-800">
          <span className="font-extrabold">{tpl?.name}: {plan.fromYours ? 'tests saved in this template' : 'usual first-line'}</span>
          {firstLeft.length > 0 && <> {firstLeft.join('; ')} <button type="button" className="ml-1 rounded bg-teal px-2 py-0.5 font-bold text-white" onClick={() => addMany(firstLeft)}>Add {firstLeft.length > 1 ? 'all' : ''}</button></>}
          {plan.note && <div className="mt-0.5 font-semibold text-teal-700">{plan.note}</div>}
        </div>
      )}
      {(usualShow.length > 0 || picks.length > 0) && <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{usualShow.length ? 'Tap to add' : 'Suggested'}</span>
        {usualShow.map((t) => <Chip key={'u' + t} tone="teal" onClick={() => add(t)}>+ {t}</Chip>)}
        {picks.map((t) => <Chip key={t} onClick={() => add(t)}>+ {t}</Chip>)}
      </div>}
      <div className="flex flex-wrap items-start gap-1.5">
        {(['imaging', 'blood', 'other'] as TestKind[]).map((k) => (
          <div key={k} className="relative">
            <button type="button" onClick={() => setMenu(menu === k ? null : k)} className={cx('flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold', menu === k ? 'border-brand bg-brand-50 text-brand' : 'border-slate-300 bg-white text-slate-700 hover:border-brand')}>
              {ICON[k]} {KIND_LABEL[k]}{count(k) > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] text-white">{count(k)}</span>}<ChevronDown size={13} />
            </button>
            {menu === k && <div className="absolute left-0 z-30 mt-1 w-[min(22rem,90vw)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"><KindMenu k={k} /></div>}
          </div>
        ))}
        <div className="relative">
          <button type="button" onClick={() => setMenu(menu === 'sets' ? null : 'sets')} className={cx('flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold', menu === 'sets' ? 'border-brand bg-brand-50 text-brand' : 'border-slate-300 bg-white text-slate-700 hover:border-brand')}>
            <Layers size={14} /> Sets{sets.length > 0 && <span className="rounded-full bg-teal px-1.5 text-[10px] text-white">{sets.length}</span>}<ChevronDown size={13} />
          </button>
          {menu === 'sets' && <div className="absolute left-0 z-30 mt-1 w-[min(24rem,92vw)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"><SetMenu /></div>}
        </div>
        <div className="relative min-w-[11rem] flex-1">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input className="field !py-1.5 !pl-8 text-sm" placeholder="Search any test or type + Enter" value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(matches[0] && norm(matches[0]) === norm(q) ? matches[0] : q); } }} />
          {open && q.trim() && (
            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {matches.map((t) => <button key={t} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(t)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{t}</button>)}
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(q)} className="flex w-full items-center gap-1 border-t border-slate-100 px-3 py-2 text-left text-sm font-bold text-brand hover:bg-slate-50"><Plus size={14} /> Add “{q.trim()}”</button>
            </div>
          )}
        </div>
      </div>
      {notes.length > 0 && <ul className="space-y-0.5 text-[11px] font-semibold text-slate-500">{notes.map((n) => <li key={n}>• {n}</li>)}</ul>}
    </div>
  );
}
