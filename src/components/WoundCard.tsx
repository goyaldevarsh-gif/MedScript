import { useEffect, useRef, useState } from 'react';
import { shapes, shapeEl, pinEl, regionOfPin, partLabel, type Pin } from '../lib/body';
import { DETAIL_VIEWS, suggestDetail, viewLabel, type DView, type Detail } from '../lib/detail';
import DetailFigure from './DetailFigure';
import { Chip } from './ui';
import { W_DRESS, W_STATUS, W_SUTURE, W_TYPES, woundLine } from '../lib/wound';
import type { Prescription, Wound } from '../lib/types';

const ZOOMS: Record<string, { label: string; vb: (v: 'front' | 'back') => string }> = {
  all: { label: 'Whole body', vb: () => '0 0 120 270' },
  trunk: { label: 'Head & trunk', vb: () => '10 0 100 118' },
  armR: { label: 'Right arm', vb: (v) => (v === 'front' ? '8 40 50 125' : '62 40 50 125') },
  armL: { label: 'Left arm', vb: (v) => (v === 'front' ? '62 40 50 125' : '8 40 50 125') },
  legR: { label: 'Right leg', vb: (v) => (v === 'front' ? '22 105 46 165' : '52 105 46 165') },
  legL: { label: 'Left leg', vb: (v) => (v === 'front' ? '52 105 46 165' : '22 105 46 165') },
};

/** Wound yes/no, quick details and tap-to-mark body map. Prints as one line + pins on the body figure. */
export default function WoundCard({ rx, update, readOnly }: { rx: Prescription; update: (fn: (r: Prescription) => Prescription) => void; readOnly?: boolean }) {
  const w: Wound = rx.wound || { on: false };
  const [view, setView] = useState<'front' | 'back'>('front');
  const [zoom, setZoom] = useState('all');
  // hand / foot figure opens by itself when the diagnosis or marked site is about the hand / foot
  const sug = suggestDetail(`${rx.clinical.diagnosis} ${rx.clinical.complaint} ${w.site || ''}`, rx.clinical.bodyParts || []);
  const [fig, setFig] = useState<'body' | Detail>(sug || 'body');
  const [dview, setDview] = useState<DView>('dorsal');
  const [dside, setDside] = useState<'R' | 'L'>(rx.clinical.side === 'Left' ? 'L' : 'R');
  const touched = useRef(false);
  useEffect(() => { if (!touched.current) setFig(sug || 'body'); }, [sug]);
  const dv: DView = fig !== 'body' && DETAIL_VIEWS[fig].includes(dview) ? dview : fig === 'body' ? 'dorsal' : DETAIL_VIEWS[fig][0];
  const svg = useRef<SVGSVGElement>(null);
  const set = (p: Partial<Wound>) => update((r) => ({ ...r, wound: { ...(r.wound || { on: false }), ...p } }));
  const pins = w.pins || [];

  function place(x: number, y: number, base: Pin) {
    const cand: Pin = { ...base, x, y };
    const same = (p: Pin) => (p.f || '') === (cand.f || '') && p.v === cand.v && (p.side || '') === (cand.side || '');
    const hit = pins.findIndex((p) => same(p) && Math.hypot(p.x - x, p.y - y) < (cand.f ? 5 : 6));
    const next: Pin[] = hit >= 0 ? pins.filter((_, i) => i !== hit) : [...pins, cand];
    const auto = [...new Set(next.map(regionOfPin).filter(Boolean))].join(', ');
    // keep the site text in step with the pins unless the doctor typed something else
    const follow = !w.site || w.site === w.autoSite;
    set({ pins: next, autoSite: auto, ...(follow ? { site: auto } : {}) });
  }
  function tap(e: React.PointerEvent<SVGSVGElement>) {
    if (readOnly || !svg.current) return;
    const pt = svg.current.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.current.getScreenCTM(); if (!m) return;
    const q = pt.matrixTransform(m.inverse());
    const x = Math.round(q.x), y = Math.round(q.y);
    if (x < 0 || x > 120 || y < 0 || y > 270) return;
    place(x, y, { v: view, x, y });
  }

  const line = woundLine(rx);
  const days = (d: number) => update((r) => ({ ...r, wound: { ...(r.wound || { on: true }), sutureDays: (r.wound?.sutureDays === d ? undefined : d) }, ...(!r.followUpManual && r.wound?.sutureDays !== d ? { followUpDays: d, followUpManual: true } : {}) }));
  const pick = (k: 'type' | 'status' | 'dressing', v: string) => set({ [k]: w[k] === v ? undefined : v } as Partial<Wound>);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Wound</div>
        <div className="flex flex-wrap gap-2">
          <Chip active={!w.on} onClick={() => !readOnly && set({ on: false })}>No wound</Chip>
          <Chip active={w.on} tone="teal" onClick={() => !readOnly && set({ on: true })}>Wound present</Chip>
        </div>
      </div>
      {w.on && (
        <fieldset disabled={readOnly} className="space-y-3">
          <div><span className="lbl">Type</span><div className="flex flex-wrap gap-2">{W_TYPES.map((t) => <Chip key={t} active={w.type === t} onClick={() => pick('type', t)}>{t}</Chip>)}</div></div>
          <div><span className="lbl">Wound status</span><div className="flex flex-wrap gap-2">{W_STATUS.map((t) => <Chip key={t} active={w.status === t} onClick={() => pick('status', t)}>{t}</Chip>)}</div></div>
          <div><span className="lbl">Dressing</span><div className="flex flex-wrap gap-2">{W_DRESS.map((t) => <Chip key={t} active={w.dressing === t} onClick={() => pick('dressing', t)}>{t}</Chip>)}</div></div>
          <div>
            <span className="lbl">Suture / staple removal after</span>
            <div className="flex flex-wrap gap-2">{W_SUTURE.map((d) => <Chip key={d} tone="teal" active={w.sutureDays === d} onClick={() => days(d)}>{d} days</Chip>)}</div>
            {w.sutureDays ? <p className="mt-1 text-xs font-semibold text-slate-500">Next visit is set to the same day. Change it below if you want.</p> : null}
          </div>
          <div><span className="lbl">Site</span><input className="field" value={w.site || ''} onChange={(e) => set({ site: e.target.value })} placeholder="Tap the body below, or type e.g. Right knee, medial side" /></div>
          <div>
            <span className="lbl">Mark on body (tap to add, tap a dot to remove)</span>
            <div className="mb-2 flex flex-wrap gap-2">
              {([['body', 'Body'], ['hand', 'Hand & wrist'], ['foot', 'Foot & ankle']] as const).map(([k, l]) => <Chip key={k} tone="teal" active={fig === k} onClick={() => { touched.current = true; setFig(k); }}>{l}</Chip>)}
            </div>
            {fig === 'body' ? (<>
              <div className="mb-2 flex flex-wrap gap-2">
                <Chip active={view === 'front'} onClick={() => setView('front')}>Front</Chip>
                <Chip active={view === 'back'} onClick={() => setView('back')}>Back</Chip>
                <span className="mx-1 w-px bg-slate-200" />
                {Object.entries(ZOOMS).map(([k, z]) => <Chip key={k} tone="teal" active={zoom === k} onClick={() => setZoom(k)}>{z.label}</Chip>)}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
                <svg ref={svg} viewBox={ZOOMS[zoom].vb(view)} onPointerDown={tap} className="mx-auto h-72 w-auto max-w-full touch-manipulation select-none" role="img" aria-label={`${view} body, tap to mark the wound`}>
                  {shapes(view).map((s, i) => <g key={i} dangerouslySetInnerHTML={{ __html: shapeEl(s, false) }} />)}
                  <g dangerouslySetInnerHTML={{ __html: pins.filter((p) => !p.f && p.v === view).map((p) => pinEl(p, zoom === 'all' ? 4.2 : 3.4)).join('') }} />
                </svg>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{view === 'front' ? 'Front (patient’s right is on your left)' : 'Back (patient’s right is on your right)'}</div>
              </div>
            </>) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip active={dside === 'R'} onClick={() => setDside('R')}>Right</Chip>
                  <Chip active={dside === 'L'} onClick={() => setDside('L')}>Left</Chip>
                  <span className="mx-1 w-px self-stretch bg-slate-200" />
                  {DETAIL_VIEWS[fig].map((v) => <Chip key={v} tone="teal" active={dv === v} onClick={() => setDview(v)}>{viewLabel(fig, v)}</Chip>)}
                </div>
                <DetailFigure d={fig} view={dv} side={dside} readOnly={readOnly} pins={pins.filter((p) => p.f === fig && p.v === dv && (p.side || 'R') === dside)} onPoint={(x, y) => place(x, y, { v: dv, f: fig, side: dside, x, y })} />
                <div className="mt-1 text-center text-xs font-semibold text-slate-500">Tap to add a dot, tap a dot to remove it.</div>
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">{pins.length} marked{pins.length > 0 && <span className="text-slate-400">· {[...new Set(pins.map(regionOfPin).filter(Boolean))].join(', ')}</span>}{pins.length > 0 && !readOnly && <button className="font-bold text-brand underline" onClick={() => set({ pins: [], autoSite: '', ...(w.site === w.autoSite ? { site: '' } : {}) })}>Clear marks</button>}</div>
          </div>
          <div><span className="lbl">Extra note (optional)</span><input className="field" value={w.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. Keep leg elevated" /></div>
          {line && <div className="rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-900"><span className="text-xs font-extrabold uppercase tracking-wide text-teal-700">Prints as: </span>{line}</div>}
        </fieldset>
      )}
    </div>
  );
}
