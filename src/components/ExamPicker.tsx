import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Undo2, Wand2 } from 'lucide-react';
import { EXAM, buildVal, examFor, getVal, isFinding, parseVal, setVal, type ExamItem } from '../data/exam';
import { cx } from '../lib/util';
import type { Clinical } from '../lib/types';


/** One finding at a time, as a bottom sheet right where the thumb is. Tap an answer to set it, tap the same answer again to remove it. */
function Sheet({ x, value, onChange, onClose }: { x: ExamItem; value: string; onChange: (v: string) => void; onClose: () => void }) {
  const v = getVal(value, x); const { opt, extra } = parseVal(x, v);
  const [t, setT] = useState(extra);
  const set = (o: string, e: string) => onChange(setVal(value, x, buildVal(x, o, e)));
  const need = !!(x.note && x.note.when.includes(opt));
  const pick = (o: string) => {
    if (o === opt) { onChange(setVal(value, x, '')); setT(''); onClose(); return; } // same answer again = take it off
    setT(''); set(o, ''); if (!(x.note && x.note.when.includes(o))) onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2"><div className="mr-auto text-base font-extrabold">{x.label}</div>
          {v && <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-600" onClick={() => { onChange(setVal(value, x, '')); onClose(); }}>Remove</button>}
          <button type="button" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700" onClick={onClose}>Done</button></div>
        <div className="flex flex-wrap gap-2">
          {x.opts.map((o) => (
            <button key={o} type="button" onClick={() => pick(o)}
              className={cx('min-w-[4.5rem] rounded-xl border px-4 py-2.5 text-base font-bold', opt === o ? (o === x.normal ? 'border-teal bg-teal text-white' : 'border-amber-500 bg-amber-500 text-white') : 'border-slate-300 bg-white text-slate-700')}>{o}</button>
          ))}
        </div>
        {need && x.note && (
          <div className="mt-3 flex items-center gap-2">
            <input autoFocus className="field text-base" inputMode={x.note.number ? 'decimal' : 'text'} placeholder={x.note.ph} value={t}
              onChange={(e) => { const n = x.note!.number ? e.target.value.replace(/[^\d.]/g, '') : e.target.value; setT(n); set(opt, n); }} onKeyDown={(e) => e.key === 'Enter' && onClose()} />
            {x.note.number && x.note.unit && <span className="text-sm font-bold text-slate-500">{x.note.unit.trim()}</span>}
          </div>
        )}
        <div className="mt-3 text-xs font-medium text-slate-500">Tap the selected answer again to remove it. You can also edit the text box directly.</div>
      </div>
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
  const [undo, setUndo] = useState<string | null>(null);
  const anySet = g.items.some((x) => !!getVal(value, x));
  const clearGroup = () => { let v = value; for (const x of g.items) v = setVal(v, x, ''); setUndo(value); onChange(v); };
  const fillNormal = () => { setUndo(value); let v = value; for (const x of missing) v = setVal(v, x, x.normal); onChange(v.split('\n').filter((l) => !/^[^:]+:\s*$/.test(l)).join('\n')); }; // unfilled template lines are dropped once the rest is marked normal

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
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {groups.length > 1 && groups.map((x, i) => <button key={x.key} type="button" onClick={() => { setTab(i); setOpen(''); setUndo(null); }} className={cx('rounded-lg px-2.5 py-1 text-xs font-extrabold', i === tab ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600')}>{x.title}</button>)}
        {groups.length === 1 && <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{g.title}</span>}
        {undo !== null && <button type="button" onClick={() => { onChange(undo); setUndo(null); }} className="ml-auto flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700"><Undo2 size={13} /> Undo</button>}
        {anySet && <button type="button" onClick={clearGroup} className={cx('flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-600', undo === null && 'ml-auto')}>Clear all</button>}
        {missing.length > 0 && <button type="button" onClick={fillNormal} className="flex items-center gap-1 rounded-lg border border-teal/40 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800"><Wand2 size={13} /> Rest normal ({missing.length})</button>}
        {missing.length === 0 && <span className="flex items-center gap-1 text-xs font-bold text-teal-700"><Check size={13} /> All checked</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">{g.items.map((x) => chip(x, x.id))}</div>
      {it && <Sheet key={it.id} x={it} value={value} onChange={onChange} onClose={() => setOpen('')} />}
    </div>
  );
}
