import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Wand2 } from 'lucide-react';
import { EXAM, buildVal, examFor, getVal, isFinding, parseVal, setVal, type ExamItem } from '../data/exam';
import { cx } from '../lib/util';
import type { Clinical } from '../lib/types';


function Editor({ x, value, onChange, onClose }: { x: ExamItem; value: string; onChange: (v: string) => void; onClose: () => void }) {
  const v = getVal(value, x); const { opt, extra } = parseVal(x, v);
  const [t, setT] = useState(extra);
  const set = (o: string, e: string) => onChange(setVal(value, x, buildVal(x, o, e)));
  const need = x.note && x.note.when.includes(opt);
  return (
    <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <div className="mb-1.5 text-xs font-extrabold text-slate-600">{x.label}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {x.opts.map((o) => (
          <button key={o} type="button" onClick={() => { if (o !== opt) setT(''); set(o, o === opt ? t : ''); }}
            className={cx('rounded-lg border px-3 py-1.5 text-sm font-bold', opt === o ? (o === x.normal ? 'border-teal bg-teal text-white' : 'border-amber-500 bg-amber-500 text-white') : 'border-slate-300 bg-white text-slate-700')}>{o}</button>
        ))}
        {v && <button type="button" className="ml-auto text-xs font-bold text-slate-500 underline" onClick={() => { onChange(setVal(value, x, '')); onClose(); }}>Clear</button>}
      </div>
      {need && x.note && (
        <div className="mt-2 flex items-center gap-1.5">
          <input autoFocus className="field !py-1.5 text-sm" inputMode={x.note.number ? 'decimal' : 'text'} placeholder={x.note.ph} value={t}
            onChange={(e) => { const n = x.note!.number ? e.target.value.replace(/[^\d.]/g, '') : e.target.value; setT(n); set(opt, n); }} />
          {x.note.number && x.note.unit && <span className="text-sm font-bold text-slate-500">{x.note.unit.trim()}</span>}
        </div>
      )}
    </div>
  );
}

/** Under the Examination box. Tap a finding, tap its answer (Positive / Negative, a grade, Full / Restricted...). A number or a few words
 *  can be added where it makes sense (SLRT at 60°). The text box above stays the source of truth, so it can still be typed in freely. */
export default function ExamPicker({ clin, value, onChange }: { clin: Clinical; value: string; onChange: (v: string) => void }) {
  const { groups, red } = useMemo(() => examFor(clin), [clin.diagnosis, clin.complaint, clin.bodyParts, clin.injury]); // eslint-disable-line
  const [tab, setTab] = useState(0); const [open, setOpen] = useState<string>('');
  const g = groups[Math.min(tab, groups.length - 1)];
  const flagged = red.filter((r) => parseVal(r, getVal(value, r)).opt === 'Present');
  const all = [...red, ...g.items];
  const it = all.find((x) => x.id === open);

  const set = (item: ExamItem, opt: string, extra = '') => onChange(setVal(value, item, buildVal(item, opt, extra)));
  const missing = g.items.filter((x) => !getVal(value, x));
  const fillNormal = () => { let v = value; for (const x of missing) v = setVal(v, x, x.normal); onChange(v.split('\n').filter((l) => !/^[^:]+:\s*$/.test(l)).join('\n')); }; // unfilled template lines are dropped once the rest is marked normal

  const chip = (x: ExamItem, key: string) => {
    const v = getVal(value, x); const f = v ? isFinding(x, v) : false;
    return (
      <button key={key} type="button" onClick={() => setOpen(open === x.id ? '' : x.id)}
        className={cx('rounded-full border px-2.5 py-1 text-xs font-bold', open === x.id && 'ring-2 ring-brand/40',
          !v ? (x.flag ? 'border-red-200 bg-white text-red-700' : 'border-slate-300 bg-white text-slate-700')
            : f ? (x.flag ? 'border-red-400 bg-red-100 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900') : 'border-teal/40 bg-teal-50 text-teal-800')}>
        {v ? <>{x.label}: <span className="font-extrabold">{v}</span></> : x.label}
      </button>
    );
  }
  return (
    <div className="mt-1.5 space-y-1.5">
      {red.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-red-700"><AlertTriangle size={13} /> Do not miss</div>
          <div className="flex flex-wrap gap-1.5">{red.map((x) => chip(x, x.id))}</div>
          {flagged.length > 0 && <div className="mt-1.5 text-xs font-bold text-red-800">Red flag present: {flagged.map((x) => x.label.replace(/ \(.*\)/, '')).join('; ')}. Think of urgent imaging or referral.</div>}
          {open && red.some((x) => x.id === open) && it && <Editor key={it.id} x={it} value={value} onChange={onChange} onClose={() => setOpen('')} />}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {groups.length > 1 && groups.map((x, i) => <button key={x.key} type="button" onClick={() => { setTab(i); setOpen(''); }} className={cx('rounded-lg px-2.5 py-1 text-xs font-extrabold', i === tab ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600')}>{x.title}</button>)}
        {groups.length === 1 && <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{g.title}</span>}
        {missing.length > 0 && <button type="button" onClick={fillNormal} className="ml-auto flex items-center gap-1 rounded-lg border border-teal/40 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800"><Wand2 size={13} /> Rest normal ({missing.length})</button>}
        {missing.length === 0 && <span className="ml-auto flex items-center gap-1 text-xs font-bold text-teal-700"><Check size={13} /> All checked</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">{g.items.map((x) => chip(x, x.id))}</div>
      {open && g.items.some((x) => x.id === open) && it && <Editor key={it.id} x={it} value={value} onChange={onChange} onClose={() => setOpen('')} />}
    </div>
  );
}
