import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Chip } from './ui';
import { allTests, joinTests, splitTests, suggestTests, testKey } from '../data/tests';
import { norm } from '../lib/util';
import type { Clinical } from '../lib/types';

/** Tap-to-add tests under the Investigations box. Suggestions follow the diagnosis, body site and side;
 *  the search box covers every test. The text box above stays the source of truth, so you can still type freely. */
export default function TestPicker({ clin, value, onChange, usual = [] }: { clin: Clinical; value: string; onChange: (v: string) => void; usual?: string[] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const cur = splitTests(value);
  const have = new Set(cur.map(testKey));
  const sugg = useMemo(() => suggestTests(clin), [clin.diagnosis, clin.complaint, clin.side, clin.bodyParts]); // eslint-disable-line
  const all = useMemo(() => allTests(clin.side), [clin.side]);
  const add = (t: string) => { const x = t.trim(); if (!x || have.has(testKey(x))) return; onChange(joinTests([...cur, x])); setQ(''); };
  const usualShow = usual.filter((t) => !have.has(testKey(t))).slice(0, 4);
  const shown = sugg.filter((t) => !have.has(testKey(t))).slice(0, 8);
  const matches = q.trim() ? all.filter((t) => norm(t).includes(norm(q)) && !have.has(testKey(t))).slice(0, 7) : [];
  return (
    <div className="mt-1.5 space-y-1.5">
      {(usualShow.length > 0 || shown.length > 0) && <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{usualShow.length ? 'Tap to add' : 'Suggested'}</span>
        {usualShow.map((t) => <Chip key={'u' + t} tone="teal" onClick={() => add(t)}>+ {t}</Chip>)}
        {shown.filter((t) => !usualShow.some((u) => testKey(u) === testKey(t))).map((t) => <Chip key={t} onClick={() => add(t)}>+ {t}</Chip>)}
      </div>}
      <div className="relative">
        <input className="field !py-1.5 text-sm" placeholder="Search a test (MRI knee, uric acid, vit D…) or type and press Enter" value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(matches[0] && norm(matches[0]) === norm(q) ? matches[0] : q); } }} />
        {open && q.trim() && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {matches.map((t) => <button key={t} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(t)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{t}</button>)}
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(q)} className="flex w-full items-center gap-1 border-t border-slate-100 px-3 py-2 text-left text-sm font-bold text-brand hover:bg-slate-50"><Plus size={14} /> Add “{q.trim()}”</button>
          </div>
        )}
      </div>
    </div>
  );
}
