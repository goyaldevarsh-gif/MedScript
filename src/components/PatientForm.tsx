import AgeInput from './AgeInput';
import { useState } from 'react';
import type { Patient } from '../lib/types';
import { Btn, Chip, Field, Modal } from './ui';
import { blankPatient } from '../lib/defaults';
import { upsertPatient } from '../lib/db';
import TemplatePicker from './TemplatePicker';
import { LayoutTemplate, X } from 'lucide-react';

export default function PatientForm({ initial, onClose, onSaved }: { initial?: Patient; onClose: () => void; onSaved: (p: Patient, templateId?: string) => void }) {
  const [p, setP] = useState<Patient>(initial || blankPatient());
  const [tpl, setTpl] = useState<{ id: string; name: string } | null>(null);
  const [pick, setPick] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (x: Partial<Patient>) => setP({ ...p, ...x });
  async function save(withRx = false) {
    const e: Record<string, string> = {};
    if (!p.name.trim()) e.name = 'Name is required';
    if (p.age && (isNaN(Number(p.age)) || Number(p.age) < 0 || Number(p.age) > 120)) e.age = 'Enter a valid age';
    if (p.phone && p.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit mobile number';
    if (p.weight && (isNaN(Number(p.weight)) || Number(p.weight) <= 0)) e.weight = 'Enter weight in kg';
    setErr(e);
    if (Object.keys(e).length) return;
    onSaved(await upsertPatient({ ...p, name: p.name.trim() }), withRx ? tpl?.id || '' : undefined);
  }
  const E = ({ k }: { k: string }) => (err[k] ? <span className="mt-1 block text-xs font-semibold text-danger">{err[k]}</span> : null);
  return (
    <Modal title={initial ? 'Edit patient' : 'New patient'} onClose={onClose} footer={<div className="flex gap-2 [&>button]:flex-1 sm:justify-end sm:[&>button]:flex-none"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant={initial ? 'primary' : 'secondary'} onClick={() => save(false)}>Save patient</Btn>{!initial && <Btn onClick={() => save(true)}>Save & prescribe</Btn>}</div>}>
      <div className="space-y-3">
        <Field label="Patient name *"><input autoFocus className="field" value={p.name} onChange={(e) => set({ name: e.target.value })} /><E k="name" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age"><AgeInput age={p.age} unit={p.ageUnit} onChange={(v) => set(v)} /><E k="age" /></Field>
          <div><span className="lbl">Sex</span><div className="flex gap-1.5">{(['Male', 'Female', 'Other'] as const).map((s) => <Chip key={s} className="flex-1 !px-2" active={p.sex === s} onClick={() => set({ sex: s })}>{s}</Chip>)}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input className="field" type="tel" value={p.phone} onChange={(e) => set({ phone: e.target.value })} /><E k="phone" /></Field>
          <Field label="Weight (kg)"><input className="field" type="number" value={p.weight} onChange={(e) => set({ weight: e.target.value })} /><E k="weight" /></Field>
        </div>
        <Field label="Known allergies"><input className="field" value={p.allergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="e.g. Penicillin" /></Field>
        {!initial && (
          <div>
            <span className="lbl">Start prescription with a template (optional)</span>
            {tpl ? <div className="flex items-center gap-2"><Chip active>{tpl.name}</Chip><button type="button" className="text-slate-400" onClick={() => setTpl(null)} aria-label="Remove template"><X size={16} /></button></div>
              : <button type="button" className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:border-brand" onClick={() => setPick(true)}><LayoutTemplate size={15} /> Search templates</button>}
          </div>
        )}
        {pick && <TemplatePicker onClose={() => setPick(false)} onPick={(t) => { setTpl({ id: t.id, name: t.name }); setPick(false); }} />}
        {initial && <div className="text-xs text-slate-500">Patient ID: <b>{p.pid}</b></div>}
      </div>
    </Modal>
  );
}
