import { useEffect, useRef, useState } from 'react';
import { shapes, shapeEl, partLabel, sideOf, BODY_H } from '../lib/body';
import { DETAIL_VIEWS, detailOf, suggestDetail, viewLabel, type DView, type Detail } from '../lib/detail';
import DetailFigure from './DetailFigure';
import { Chip } from './ui';
import type { Clinical } from '../lib/types';

type Tab = 'body' | Detail;
const TABS: [Tab, string][] = [['body', 'Whole body'], ['hand', 'Hand & wrist'], ['foot', 'Foot & ankle']];
/** the most natural first view for what is written */
function bestView(d: Detail, text: string): DView {
  const t = text.toLowerCase();
  if (d === 'hand') return /(carpal tunnel|trigger|dupuytren|palm|flexor)/.test(t) ? 'palmar' : 'dorsal';
  return /(achilles)/.test(t) ? 'back' : /(plantar|heel|sole|fasciitis|spur|ulcer)/.test(t) ? 'plantar' : 'dorsal';
}

/** Tap the body (or the detailed hand / foot figure, which opens by itself when relevant) to mark where the problem is. */
export default function BodyPicker({ clin, set, readOnly }: { clin: Clinical; set: (c: Partial<Clinical>) => void; readOnly?: boolean }) {
  const sel = clin.bodyParts || [];
  const S = new Set(sel);
  const text = `${clin.diagnosis} ${clin.complaint}`;
  const sug = suggestDetail(text, sel);
  const [tab, setTab] = useState<Tab>(sug || 'body');
  const [side, setSide] = useState<'R' | 'L'>(clin.side === 'Left' ? 'L' : 'R');
  const [view, setView] = useState<DView>(sug ? bestView(sug, text) : 'dorsal');
  const touched = useRef({ tab: false, side: false, view: false });
  // open the matching detailed figure on its own, until the doctor chooses something themselves
  useEffect(() => { if (!touched.current.tab) setTab(sug || 'body'); if (sug && !touched.current.view) setView(bestView(sug, text)); }, [sug, text]);
  useEffect(() => { if (!touched.current.side && (clin.side === 'Left' || clin.side === 'Right')) setSide(clin.side === 'Left' ? 'L' : 'R'); }, [clin.side]);

  const toggle = (id: string) => {
    if (readOnly) return;
    const next = S.has(id) ? sel.filter((x) => x !== id) : [...sel, id];
    const sd = sideOf(next);
    set({ bodyParts: next, ...(sd ? { side: sd } : {}) });
  };
  const fig = (v: 'front' | 'back') => (
    <div className="text-center">
      <svg viewBox={`0 0 120 ${BODY_H}`} className="mx-auto h-60 w-auto select-none" role="group" aria-label={v === 'front' ? 'Front of body' : 'Back of body'}>
        {shapes(v).map((s) => (
          <g key={s.id} onClick={() => toggle(s.id)} className={readOnly ? '' : 'cursor-pointer'} role="button" aria-label={partLabel(s.id)} aria-pressed={S.has(s.id)}>
            <title>{partLabel(s.id)}</title>
            <g dangerouslySetInnerHTML={{ __html: shapeEl(s, S.has(s.id)) }} />
          </g>
        ))}
      </svg>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{v}</div>
    </div>
  );
  const pickTab = (t: Tab) => { touched.current.tab = true; setTab(t); if (t !== 'body') { const vs = DETAIL_VIEWS[t]; if (!vs.includes(view)) setView(vs[0]); } };
  const counts: Record<Tab, number> = { body: sel.filter((i) => !detailOf(i)).length, hand: sel.filter((i) => detailOf(i) === 'hand').length, foot: sel.filter((i) => detailOf(i) === 'foot').length };
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
        <span className="lbl">Where is the problem? Tap to mark</span>
        <div className="mb-2 flex flex-wrap gap-2">
          {TABS.map(([k, l]) => <Chip key={k} active={tab === k} onClick={() => pickTab(k)}>{l}{counts[k] ? ` (${counts[k]})` : ''}</Chip>)}
        </div>
        {tab === 'body' ? (
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">{fig('front')}{fig('back')}</div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Chip tone="teal" active={side === 'R'} onClick={() => { touched.current.side = true; setSide('R'); }}>Right</Chip>
              <Chip tone="teal" active={side === 'L'} onClick={() => { touched.current.side = true; setSide('L'); }}>Left</Chip>
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              {DETAIL_VIEWS[tab].map((v) => <Chip key={v} active={view === v} onClick={() => { touched.current.view = true; setView(v); }}>{viewLabel(tab, v)}</Chip>)}
            </div>
            <DetailFigure d={tab} view={DETAIL_VIEWS[tab].includes(view) ? view : DETAIL_VIEWS[tab][0]} side={side} sel={S} onToggle={toggle} readOnly={readOnly} />
            <div className="mt-1 text-center text-xs font-semibold text-slate-500">{tab === 'hand' ? 'Tap the exact finger, joint or area. Some areas show only on the palm side (thenar, carpal tunnel) or the back (metacarpals, snuffbox).' : 'Tap the exact toe, joint or area. Some areas show only on the sole (heel, arch) or the heel view (Achilles).'}</div>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-700">
          {sel.length ? sel.map((id) => <span key={id} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">{partLabel(id)}</span>) : <span className="text-slate-400">Nothing marked</span>}
          {sel.length > 0 && !readOnly && <button className="ml-1 text-xs font-bold text-brand underline" onClick={() => set({ bodyParts: [] })}>Clear</button>}
        </div>
      </div>
    </div>
  );
}
