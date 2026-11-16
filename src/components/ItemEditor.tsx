import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Trash2, Plus, RotateCcw, Sparkles } from 'lucide-react';
import type { Freq, Lang, RxItem, Timing } from '../lib/types';
import { Badge, Chip, Field } from './ui';
import { DURATIONS, FREQS, TIMINGS, computeQty, doseLabel, durationLabel, freqLabel, instructionEn, instructionHi, isLiquid, itemInstructions, itemIssues } from '../lib/dosage';
import { ROUTES, unitForForm } from '../lib/defaults';
import { cx, uid } from '../lib/util';
import { itemTitle } from '../lib/pdf';
import type { Warning } from '../lib/safety';

const QTY_PRESETS = ['1 strip', '2 strips', '3 strips', '1 bottle', '1 tube', '1 sachet pack', '1 vial'];
const NOTE_PRESETS = ['Swallow whole.', 'Do not crush or chew.', 'Avoid alcohol.', 'Take with plenty of water.', 'Complete the full course.', 'Apply a thin layer. Do not rub hard.', 'Shake well before use.', 'Stop if rash or swelling occurs.'];
const UNITS = ['tablet', 'capsule', 'mL', 'drop', 'sachet', 'application', 'puff', 'patch', 'scoop', 'unit'];

export default function ItemEditor({ it, index, total, open, onToggle, onChange, onRemove, onMove, lang, warnings, readOnly, caps, nameMode }: {
  it: RxItem; index: number; total: number; open: boolean; onToggle: () => void; onChange: (n: RxItem) => void; onRemove: () => void; onMove: (d: -1 | 1) => void;
  lang: Lang; warnings: Warning[]; readOnly?: boolean; caps: boolean; nameMode: 'generic' | 'brand';
}) {
  const set = (p: Partial<RxItem>) => onChange({ ...it, ...p });
  const liquid = isLiquid(it);
  const solidDoses = it.doseUnit === 'application' ? [] : liquid ? (it.doseUnit === 'drop' ? [1, 2, 3] : [2.5, 5, 10]) : [0.5, 1, 2];
  const qty = computeQty(it);
  const title = itemTitle(it, nameMode, caps);
  const issues = itemIssues(it);
  const auto = instructionEn(it);
  const [customDose, setCustomDose] = useState(false);
  const [customDur, setCustomDur] = useState(false);
  const [customQty, setCustomQty] = useState(false);
  const [more, setMore] = useState(false);
  const [customNote, setCustomNote] = useState(false);
  const preview = itemInstructions(it, lang === 'hi' ? 'hi' : 'en');
  const presetDur = it.durationUnit === 'days' && DURATIONS.includes(it.duration) && !customDur;
  const doseIsPreset = it.doseQty != null && solidDoses.includes(it.doseQty) && !customDose;
  const dis = !!readOnly;
  const pickFreq = (v: string) => { const f = FREQS.find((x) => x.v === v)!; set({ freq: f.v as Freq, timesPerDay: f.v === 'CUSTOM' ? it.timesPerDay || 2 : f.perDay || 1, timing: f.v === 'HS' ? 'bedtime' : f.v === 'SOS' ? 'asreq' : it.timing === 'bedtime' || it.timing === 'asreq' ? 'after' : it.timing }); };
  const unitS = it.doseUnit === 'mL' ? 'mL' : it.doseUnit;
  const wd = warnings.filter((w) => w.level === 'danger').length;

  return (
    <div className={cx('rounded-2xl border bg-white shadow-card', wd ? 'border-danger/50' : issues.length ? 'border-amber-300' : 'border-slate-200')}>
      <div className="flex items-start gap-2 p-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-extrabold text-white">{index + 1}</div>
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="text-[15px] font-extrabold leading-snug">{title.main} <span className="font-semibold text-slate-500">{title.sub}</span></div>
          <div className="mt-0.5 text-[13px] font-semibold text-[#1e406e]">
            {[doseLabel(it), it.useTaper ? 'Tapering' : freqLabel(it), timingText(it.timing), !it.useTaper && durationLabel(it), qty.text && `Qty ${qty.text}`].filter(Boolean).join(' · ') || 'Set dose'}
          </div>
          {!open && <div className="mt-1 line-clamp-2 text-xs italic text-slate-500">{preview.en || preview.hi}</div>}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {it.carried && <Badge tone="blue">From {it.carried}</Badge>}
            {issues.map((e) => <Badge key={e} tone="amber">{e}</Badge>)}
            {wd > 0 && <Badge tone="red">{wd} warning{wd > 1 ? 's' : ''}</Badge>}
          </div>
        </button>
        {!dis && (
          <div className="flex shrink-0 items-center">
            <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up"><ArrowUp size={17} /></button>
            <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Move down"><ArrowDown size={17} /></button>
            <button className="rounded-lg p-1.5 text-danger hover:bg-danger-50" onClick={onRemove} aria-label="Remove medicine"><Trash2 size={17} /></button>
          </div>
        )}
        <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={onToggle} aria-label="Expand">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
      </div>

      {open && (
        <fieldset disabled={dis} className="space-y-2.5 border-t border-slate-100 p-3 pt-3">
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              {warnings.filter((w) => w.level !== 'info').map((w, i) => (
                <div key={i} className={cx('rounded-lg px-3 py-2 text-[13px] font-semibold', w.level === 'danger' ? 'bg-danger-50 text-danger' : 'bg-amber-50 text-amber-900')}>{w.text}</div>
              ))}
            </div>
          )}
          {/* main row: the four things that change most. Everything else is under "More". */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
            {solidDoses.length > 0 && (
              <label className="block"><span className="lbl">Dose</span>
                <select className="field sm:!w-auto sm:!px-2 sm:!py-2" value={doseIsPreset ? String(it.doseQty) : 'custom'} onChange={(e) => { if (e.target.value === 'custom') setCustomDose(true); else { setCustomDose(false); set({ doseQty: Number(e.target.value), doseText: '' }); } }}>
                  {solidDoses.map((d) => <option key={d} value={String(d)}>{d === 0.5 ? '½' : d} {unitS + (d > 1 && unitS !== 'mL' ? 's' : '')}</option>)}
                  <option value="custom">Custom…</option>
                </select>
              </label>
            )}
            {!it.useTaper && (
              <label className="block"><span className="lbl">How often</span>
                <select className="field sm:!w-auto sm:!px-2 sm:!py-2" value={it.freq} onChange={(e) => pickFreq(e.target.value)}>{FREQS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}</select>
              </label>
            )}
            <label className="block"><span className="lbl">Timing</span>
              <select className="field sm:!w-auto sm:!px-2 sm:!py-2" value={it.timing} onChange={(e) => set({ timing: e.target.value as Timing })}><option value="">Not specified</option>{TIMINGS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</select>
            </label>
            {!it.useTaper && (
              <label className="block"><span className="lbl">For how long</span>
                <select className="field sm:!w-auto sm:!px-2 sm:!py-2" value={presetDur ? String(it.duration) : it.freq === 'SOS' && !it.duration ? 'nolimit' : 'custom'} onChange={(e) => { const v = e.target.value; if (v === 'custom') setCustomDur(true); else if (v === 'nolimit') { setCustomDur(false); set({ duration: 0 }); } else { setCustomDur(false); set({ duration: Number(v), durationUnit: 'days' }); } }}>
                  {DURATIONS.map((d) => <option key={d} value={String(d)}>{d} days</option>)}
                  {it.freq === 'SOS' && <option value="nolimit">No limit</option>}
                  <option value="custom">Custom…</option>
                </select>
              </label>
            )}
            {(!doseIsPreset || solidDoses.length === 0) && (
              <div className="col-span-2 flex flex-wrap gap-2 sm:w-full">
                <input type="number" step="0.5" min="0" className="field w-24" value={it.doseQty ?? ''} placeholder="Qty" onChange={(e) => set({ doseQty: e.target.value === '' ? null : Number(e.target.value) })} />
                <input className="field min-w-0 flex-1" value={it.doseText} placeholder="or text e.g. as directed" onChange={(e) => set({ doseText: e.target.value, doseQty: e.target.value ? null : it.doseQty })} />
              </div>
            )}
            {!it.useTaper && !presetDur && !(it.freq === 'SOS' && !it.duration) && (
              <div className="col-span-2 flex gap-2 sm:w-full">
                <input type="number" min="1" className="field w-24" value={it.duration || ''} onChange={(e) => set({ duration: Number(e.target.value) })} />
                <select className="field w-28" value={it.durationUnit} onChange={(e) => set({ durationUnit: e.target.value as any })}><option>days</option><option>weeks</option><option>months</option></select>
              </div>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-brand"><input type="checkbox" checked={it.useTaper} onChange={(e) => set({ useTaper: e.target.checked, taper: e.target.checked && !it.taper.length ? [{ id: uid(), dose: it.doseQty || 1, timesPerDay: 2, days: 3 }] : it.taper })} /> Tapering / custom schedule</label>
            <button type="button" className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand" onClick={() => setMore(!more)}>{more ? <ChevronUp size={14} /> : <ChevronDown size={14} />} More: brand, route, unit, quantity, note</button>
            {!it.useTaper && it.freq === 'OD' && (
              <label className="flex items-center gap-2 text-sm font-semibold">When
                <select className="field !w-auto !py-1" value={it.odSlot} onChange={(e) => set({ odSlot: e.target.value as any })}>{(['morning', 'afternoon', 'night'] as const).map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</select>
              </label>
            )}
            {!it.useTaper && it.freq === 'SOS' && (
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                Max doses per day
                <select className="field !w-auto !py-1" value={it.sosMax ?? ''} onChange={(e) => set({ sosMax: e.target.value ? Number(e.target.value) : null })}><option value="">Not set</option>{[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                {it.sosMax && it.doseQty != null && <span className="text-slate-600">= max {Math.round(it.sosMax * it.doseQty * 10) / 10} {it.doseUnit} / 24 h</span>}
              </div>
            )}
            </div>
            {more && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 sm:grid-cols-3">
                <label className="col-span-2 block sm:col-span-3"><span className="lbl">Brand (from pack, optional)</span><input className="field" value={it.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="Brand name" /></label>
                <label className="block"><span className="lbl">Route</span><select className="field" value={it.route} onChange={(e) => set({ route: e.target.value })}>{ROUTES.map((r) => <option key={r}>{r}</option>)}</select></label>
                <label className="block"><span className="lbl">Dose unit</span><select className="field" value={it.doseUnit} onChange={(e) => set({ doseUnit: e.target.value, doseQty: e.target.value === 'mL' ? 5 : it.doseQty })}>{UNITS.map((r) => <option key={r}>{r}</option>)}</select></label>
                <label className="block"><span className="lbl">Quantity</span>
                  <select className="field" value={customQty ? 'custom' : it.qtyOverride === '' ? 'auto' : QTY_PRESETS.includes(it.qtyOverride) ? it.qtyOverride : 'custom'} onChange={(e) => { const v = e.target.value; if (v === 'custom') setCustomQty(true); else { setCustomQty(false); set({ qtyOverride: v === 'auto' ? '' : v }); } }}>
                    <option value="auto">Auto{qty.text ? ` (${qty.text})` : ''}</option>
                    {QTY_PRESETS.map((q) => <option key={q} value={q}>{q}</option>)}
                    <option value="custom">Custom…</option>
                  </select>
                </label>
                {(customQty || (it.qtyOverride !== '' && !QTY_PRESETS.includes(it.qtyOverride))) && <input className="field" value={it.qtyOverride} onChange={(e) => set({ qtyOverride: e.target.value })} placeholder="e.g. 1 tube" />}
                <label className="col-span-2 block"><span className="lbl">Extra note</span>
                  <select className="field" value={customNote ? 'custom' : it.notes === '' ? 'none' : NOTE_PRESETS.includes(it.notes) ? it.notes : 'custom'} onChange={(e) => { const v = e.target.value; if (v === 'custom') setCustomNote(true); else { setCustomNote(false); set({ notes: v === 'none' ? '' : v }); } }}>
                    <option value="none">None</option>
                    {NOTE_PRESETS.map((q) => <option key={q} value={q}>{q}</option>)}
                    <option value="custom">Custom…</option>
                  </select>
                </label>
                {(customNote || (it.notes !== '' && !NOTE_PRESETS.includes(it.notes))) && <input className="field col-span-2 sm:col-span-3" value={it.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Type your note" />}
              </div>
            )}
            {!it.useTaper ? null : (
              <div className="space-y-2 rounded-xl bg-slate-50 p-2.5">
                {it.taper.map((s, i) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <span className="w-12 text-xs font-bold text-slate-500">Step {i + 1}</span>
                    <input type="number" step="0.5" min="0" className="field w-20" value={s.dose} onChange={(e) => set({ taper: it.taper.map((x) => (x.id === s.id ? { ...x, dose: Number(e.target.value) } : x)) })} /> {it.doseUnit}(s) ×
                    <input type="number" min="1" className="field w-16" value={s.timesPerDay} onChange={(e) => set({ taper: it.taper.map((x) => (x.id === s.id ? { ...x, timesPerDay: Number(e.target.value) } : x)) })} /> /day for
                    <input type="number" min="1" className="field w-16" value={s.days} onChange={(e) => set({ taper: it.taper.map((x) => (x.id === s.id ? { ...x, days: Number(e.target.value) } : x)) })} /> days
                    <button type="button" className="rounded p-1 text-danger hover:bg-danger-50" onClick={() => set({ taper: it.taper.filter((x) => x.id !== s.id) })} aria-label="Remove step"><Trash2 size={15} /></button>
                  </div>
                ))}
                <button type="button" className="flex items-center gap-1 text-sm font-bold text-brand" onClick={() => { const last = it.taper[it.taper.length - 1]; set({ taper: [...it.taper, { id: uid(), dose: Math.max(0.5, (last?.dose || 1) - 0.5), timesPerDay: last?.timesPerDay || 1, days: last?.days || 3 }] }); }}><Plus size={14} /> Add step</button>
              </div>
            )}
            {!it.useTaper && it.freq === 'CUSTOM' && (
              <div className="mt-2 flex flex-wrap gap-2">
                <input className="field w-60" placeholder="e.g. every 8 hours / alternate days" value={it.freqCustom} onChange={(e) => set({ freqCustom: e.target.value })} />
                <input type="number" min="0.25" step="0.5" className="field w-28" value={it.timesPerDay} onChange={(e) => set({ timesPerDay: Number(e.target.value) })} aria-label="Times per day" /><span className="self-center text-xs font-semibold text-slate-500">times/day (for quantity)</span>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-teal-50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-teal-700"><Sparkles size={14} /> Patient instruction · review before approving</span>
              {it.instructionOverride && <button className="flex items-center gap-1 text-xs font-bold text-brand" onClick={() => set({ instructionOverride: '' })}><RotateCcw size={12} /> Reset to auto</button>}
            </div>
            <textarea className="field min-h-[44px] bg-white" rows={2} value={it.instructionOverride || auto} onChange={(e) => set({ instructionOverride: e.target.value === auto ? '' : e.target.value })} />
            {lang !== 'en' && (
              <div className="mt-2 text-sm font-medium text-teal-900">
                <b>Hindi:</b> {instructionHi(it).sentence}
                {instructionHi(it).schedule && <div className="text-xs font-semibold text-teal-700">{instructionHi(it).schedule}</div>}
              </div>
            )}
          </div>
        </fieldset>
      )}
    </div>
  );
}
const timingText = (t: Timing) => TIMINGS.find((x) => x.v === t)?.label || '';
export { freqLabel };
