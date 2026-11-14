import { shapes, shapeEl, partLabel, sideOf, BODY_H } from '../lib/body';
import { Chip } from './ui';
import type { Clinical } from '../lib/types';

/** Tap the body to mark where the problem is. Marked regions print on the prescription. */
export default function BodyPicker({ clin, set, readOnly }: { clin: Clinical; set: (c: Partial<Clinical>) => void; readOnly?: boolean }) {
  const sel = clin.bodyParts || [];
  const S = new Set(sel);
  const toggle = (id: string) => {
    if (readOnly) return;
    const next = S.has(id) ? sel.filter((x) => x !== id) : [...sel, id];
    const side = sideOf(next);
    set({ bodyParts: next, ...(side ? { side } : {}) });
  };
  const fig = (view: 'front' | 'back') => (
    <div className="text-center">
      <svg viewBox={`0 0 120 ${BODY_H}`} className="mx-auto h-60 w-auto select-none" role="group" aria-label={view === 'front' ? 'Front of body' : 'Back of body'}>
        {shapes(view).map((s) => (
          <g key={s.id} onClick={() => toggle(s.id)} className={readOnly ? '' : 'cursor-pointer'} role="button" aria-label={partLabel(s.id)} aria-pressed={S.has(s.id)}>
            <title>{partLabel(s.id)}</title>
            <g dangerouslySetInnerHTML={{ __html: shapeEl(s, S.has(s.id)) }} />
          </g>
        ))}
      </svg>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{view}</div>
    </div>
  );
  return (
    <div className="space-y-3">
      <div>
        <span className="lbl">Type</span>
        <div className="flex gap-2">
          {([['trauma', 'Trauma'], ['nontrauma', 'Non-trauma']] as const).map(([v, l]) => (
            <Chip key={v} active={clin.injury === v} onClick={() => !readOnly && set({ injury: clin.injury === v ? '' : v })}>{l}</Chip>
          ))}
        </div>
      </div>
      <div>
        <span className="lbl">Where is the problem? Tap on the body</span>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">{fig('front')}{fig('back')}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-700">
          {sel.length ? sel.map((id) => <span key={id} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">{partLabel(id)}</span>) : <span className="text-slate-400">Nothing marked</span>}
          {sel.length > 0 && !readOnly && <button className="ml-1 text-xs font-bold text-brand underline" onClick={() => set({ bodyParts: [] })}>Clear</button>}
        </div>
      </div>
    </div>
  );
}
