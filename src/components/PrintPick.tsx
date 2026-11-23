import { Check, EyeOff } from 'lucide-react';
import { cx } from '../lib/util';
import { toggleKey, type PickLine } from '../data/printpick';

/** "On the prescription": one chip per finding / test. Tap to leave it off the printed Rx (it stays in the record), tap again to bring it back. */
export default function PrintPick({ lines, hide, onChange }: { lines: PickLine[]; hide?: string[]; onChange: (h: string[]) => void }) {
  if (!lines.length) return null;
  const off = lines.filter((l) => hide?.includes(l.key)).length;
  return (
    <div className="mt-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        <span>Print on prescription <span className="font-semibold normal-case tracking-normal text-slate-400">(tap to leave one out, it stays in the record)</span></span>
        {off > 0 && <button type="button" className="font-bold normal-case tracking-normal text-brand underline" onClick={() => onChange([])}>Print all</button>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {lines.map((l) => { const out = !!hide?.includes(l.key); return (
          <button key={l.key} type="button" aria-pressed={!out} onClick={() => onChange(toggleKey(hide, l.key))}
            className={cx('flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-left text-xs font-bold', out ? 'border-slate-200 bg-slate-50 text-slate-400 line-through' : 'border-brand/40 bg-brand-50 text-brand')}>
            {out ? <EyeOff size={12} className="shrink-0" /> : <Check size={12} className="shrink-0" />}<span className="truncate">{l.text}</span>
          </button>); })}
      </div>
    </div>
  );
}
