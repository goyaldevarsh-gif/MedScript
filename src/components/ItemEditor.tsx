import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Trash2, Plus, RotateCcw, Sparkles } from 'lucide-react';
import type { Freq, Lang, RxItem, Timing } from '../lib/types';
import { Badge, Chip, Field } from './ui';
import { DURATIONS, FREQS, TIMINGS, computeQty, doseLabel, durationLabel, freqLabel, instructionEn, instructionHi, isLiquid, itemInstructions, itemIssues } from '../lib/dosage';
import { ROUTES, unitForForm } from '../lib/defaults';
import { cx, uid } from '../lib/util';
import { itemTitle } from '../lib/pdf';
import type { Warning } from '../lib/safety';

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
  const preview = itemInstructions(it, lang === 'hi' ? 'hi' : 'en');
  const presetDur = it.durationUnit === 'days' && DURATIONS.includes(it.duration) && !customDur;
  const doseIsPreset = it.doseQty != null && solidDoses.includes(it.doseQty) && !customDose;
  const dis = !!readOnly;
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
        <fieldset disabled={dis} className="space-y-4 border-t border-slate-100 p-3 pt-4">
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              {warnings.filter((w) => w.level !== 'info').map((w, i) => (
                <div key={i} className={cx('rounded-lg px-3 py-2 text-[13px] font-semibold', w.level === 'danger' ? 'bg-danger-50 text-danger' : 'bg-amber-50 text-amber-900')}>{w.text}</div>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Brand (from pack, optional)"><input className="field" value={it.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="Brand name" /></Field>
            <Field label="Route"><select className="field" value={it.route} onChange={(e) => set({ route: e.target.value })}>{ROUTES.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="Dose unit"><select className="field" value={it.doseUnit} onChange={(e) => set({ doseUnit: e.target.value, doseQty: e.target.value === 'mL' ? 5 : it.doseQty })}>{UNITS.map((r) => <option key={r}>{r}</option>)}</select></Field>
          </div>

          <div>
            <span className="lbl">Dose {liquid && '(mL)'}</span>
            <div className="flex flex-wrap items-center gap-2">
              {solidDoses.map((d) => <Chip key={d} active={doseIsPreset && it.doseQty === d} onClick={() => { setCustomDose(false); set({ doseQty: d, doseText: '' }); }}>{d === 0.5 ? '½' : d} {it.doseUnit === 'mL' ? 'mL' : it.doseUnit + (d > 1 ? 's' : '')}</Chip>)}
              <Chip active={!doseIsPreset} onClick={() => setCustomDose(true)}>Custom</Chip>
              {!doseIsPreset && (
                <>
                  <input type="number" step="0.5" min="0" className="field w-24" value={it.doseQty ?? ''} placeholder="Qty" onChange={(e) => set({ doseQty: e.target.value === '' ? null : Number(e.target.value) })} />
                  <input className="field w-48" value={it.doseText} placeholder="or text e.g. as directed" onChange={(e) => set({ doseText: e.target.value, doseQty: e.target.value ? null : it.doseQty })} />
                </>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="lbl !mb-0">Frequency</span>
              <label className="flex items-center gap-1.5 text-xs font-bold text-brand"><input type="checkbox" checked={it.useTaper} onChange={(e) => set({ useTaper: e.target.checked, taper: e.target.checked && !it.taper.length ? [{ id: uid(), dose: it.doseQty || 1, timesPerDay: 2, days: 3 }] : it.taper })} /> Tapering / custom schedule</label>
            </div>
            {!it.useTaper ? (
              <div className="flex flex-wrap gap-2">
                {FREQS.map((f) => <Chip key={f.v} tone={f.v === 'SOS' ? 'red' : 'brand'} active={it.freq === f.v} onClick={() => set({ freq: f.v as Freq, timesPerDay: f.v === 'CUSTOM' ? it.timesPerDay || 2 : f.perDay || 1, timing: f.v === 'HS' ? 'bedtime' : f.v === 'SOS' ? 'asreq' : it.timing === 'bedtime' || it.timing === 'asreq' ? 'after' : it.timing })}>{f.label}</Chip>)}
              </div>
            ) : (
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
            {!it.useTaper && it.freq === 'OD' && (
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">When: {(['morning', 'afternoon', 'night'] as const).map((s) => <Chip key={s} active={it.odSlot === s} onClick={() => set({ odSlot: s })}>{s[0].toUpperCase() + s.slice(1)}</Chip>)}</div>
            )}
            {!it.useTaper && it.freq === 'SOS' && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
                Max doses per day
                <input type="number" min="1" className="field w-20" value={it.sosMax ?? ''} onChange={(e) => set({ sosMax: e.target.value ? Number(e.target.value) : null })} />
                {it.sosMax && it.doseQty != null && <span className="text-slate-600">= max {Math.round(it.sosMax * it.doseQty * 10) / 10} {it.doseUnit} / 24 h</span>}
              </div>
            )}
          </div>

          <div>
            <span className="lbl">Timing</span>
            <div className="flex flex-wrap gap-2">
              {TIMINGS.map((t) => <Chip key={t.v} tone="teal" active={it.timing === t.v} onClick={() => set({ timing: it.timing === t.v ? '' : (t.v as Timing) })}>{t.label}</Chip>)}
            </div>
          </div>

          {!it.useTaper && (
            <div>
              <span className="lbl">Duration</span>
              <div className="flex flex-wrap items-center gap-2">
                {DURATIONS.map((d) => <Chip key={d} active={presetDur && it.duration === d} onClick={() => { setCustomDur(false); set({ duration: d, durationUnit: 'days' }); }}>{d} days</Chip>)}
                <Chip active={!presetDur} onClick={() => setCustomDur(true)}>Custom</Chip>
                {!presetDur && (
                  <>
                    <input type="number" min="1" className="field w-24" value={it.duration || ''} onChange={(e) => set({ duration: Number(e.target.value) })} />
                    <select className="field w-28" value={it.durationUnit} onChange={(e) => set({ durationUnit: e.target.value as any })}><option>days</option><option>weeks</option><option>months</option></select>
                  </>
                )}
                {it.freq === 'SOS' && <Chip active={!it.duration} onClick={() => set({ duration: 0 })}>No limit</Chip>}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Quantity ${qty.text && !it.qtyOverride ? '(auto: ' + qty.text + ')' : ''}`} hint="Leave blank to use the auto-calculated quantity.">
              <input className="field" value={it.qtyOverride} onChange={(e) => set({ qtyOverride: e.target.value })} placeholder={qty.text || 'e.g. 1 tube'} />
            </Field>
            <Field label="Extra note (added to patient instruction)"><input className="field" value={it.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. Swallow whole. Avoid alcohol." /></Field>
          </div>

          <div className="rounded-xl bg-teal-50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-teal-700"><Sparkles size={14} /> Patient instruction · review before approving</span>
              {it.instructionOverride && <button className="flex items-center gap-1 text-xs font-bold text-brand" onClick={() => set({ instructionOverride: '' })}><RotateCcw size={12} /> Reset to auto</button>}
            </div>
            <textarea className="field min-h-[56px] bg-white" value={it.instructionOverride || auto} onChange={(e) => set({ instructionOverride: e.target.value === auto ? '' : e.target.value })} />
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
