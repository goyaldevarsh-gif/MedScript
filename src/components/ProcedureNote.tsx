import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Prescription, ProcNote, Side } from '../lib/types';
import { Btn, Chip, Field, Modal } from './ui';
import { KINDS, procText } from '../lib/procedures';
import { uid } from '../lib/util';

/** A quiet link under Clinical details. Opens a short form; the note is saved with this prescription (so it sits in the patient's history). */
export default function ProcedureNotes({ rx, update, readOnly }: { rx: Prescription; update: (f: (r: Prescription) => Prescription) => void; readOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const list = rx.procedures || [];
  if (readOnly && !list.length) return null;
  return (
    <div className="px-1">
      {list.map((p) => (
        <div key={p.id} className="mb-1 flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          <span>{procText(p)}{p.consent && <span className="ml-1 text-teal-700">· consent taken</span>}{!p.print && <span className="ml-1 text-slate-400">· not printed</span>}</span>
          {!readOnly && <button aria-label="Remove procedure" className="text-slate-400 hover:text-danger" onClick={() => update((r) => ({ ...r, procedures: (r.procedures || []).filter((x) => x.id !== p.id) }))}><X size={14} /></button>}
        </div>))}
      {!readOnly && <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-teal/50 bg-teal-50/70 px-3 py-2.5 text-sm font-bold text-teal-800 hover:bg-teal-50" onClick={() => setOpen(true)}><Plus size={15} /> Procedure done today (plaster, injection, dressing…)</button>}
      {open && <ProcModal rx={rx} onClose={() => setOpen(false)} onSave={(p) => { update((r) => ({ ...r, procedures: [...(r.procedures || []), p] })); setOpen(false); }} />}
    </div>
  );
}

function ProcModal({ rx, onClose, onSave }: { rx: Prescription; onClose: () => void; onSave: (p: ProcNote) => void }) {
  const [p, setP] = useState<ProcNote>({ id: uid(), kind: 'injection', site: '', side: rx.clinical.side || 'N/A', drug: '', dose: '', consent: true, note: '', print: false, ts: Date.now() });
  const k = KINDS.find((x) => x.k === p.kind)!;
  return (
    <Modal title="Procedure note" onClose={onClose}
      footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={() => onSave({ ...p, site: p.site.trim(), drug: p.drug.trim(), dose: p.dose.trim(), note: p.note.trim() })}>Add to this visit</Btn></div>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">{KINDS.map((x) => <Chip key={x.k} active={p.kind === x.k} onClick={() => setP({ ...p, kind: x.k, drug: '' })}>{x.l}</Chip>)}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Site"><input className="field" value={p.site} placeholder={k.siteHint} onChange={(e) => setP({ ...p, site: e.target.value })} /></Field>
          <div><span className="lbl">Side</span><div className="flex flex-wrap gap-2">{(['Left', 'Right', 'Bilateral', 'N/A'] as Side[]).map((s) => <Chip key={s} active={p.side === s} onClick={() => setP({ ...p, side: s })}>{s}</Chip>)}</div></div>
        </div>
        <Field label={p.kind === 'plaster' ? 'Type' : p.kind === 'injection' ? 'Medicine' : p.kind === 'dressing' ? 'Dressing used' : 'Material / procedure'}>
          <input className="field" value={p.drug} onChange={(e) => setP({ ...p, drug: e.target.value })} />
          {k.drugs.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{k.drugs.map((d) => <Chip key={d} onClick={() => setP({ ...p, drug: d })}>{d}</Chip>)}</div>}
        </Field>
        <Field label={p.kind === 'plaster' ? 'Duration' : p.kind === 'injection' ? 'Dose' : p.kind === 'aspiration' ? 'Amount and fluid' : 'Details'}><input className="field" value={p.dose} placeholder={k.doseHint} onChange={(e) => setP({ ...p, dose: e.target.value })} /></Field>
        <Field label="Note (optional)"><input className="field" value={p.note} onChange={(e) => setP({ ...p, note: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand" checked={p.consent} onChange={(e) => setP({ ...p, consent: e.target.checked })} /> Informed consent taken</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand" checked={p.print} onChange={(e) => setP({ ...p, print: e.target.checked })} /> Print one line about this on the prescription</label>
      </div>
    </Modal>
  );
}
