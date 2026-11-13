import { useState } from 'react';
import type { Patient } from '../lib/types';
import { Btn, Chip, Field, Modal } from './ui';
import { blankPatient } from '../lib/defaults';
import { upsertPatient } from '../lib/db';

export default function PatientForm({ initial, onClose, onSaved }: { initial?: Patient; onClose: () => void; onSaved: (p: Patient) => void }) {
  const [p, setP] = useState<Patient>(initial || blankPatient());
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (x: Partial<Patient>) => setP({ ...p, ...x });
  async function save() {
    const e: Record<string, string> = {};
    if (!p.name.trim()) e.name = 'Name is required';
    if (p.age && (isNaN(Number(p.age)) || Number(p.age) < 0 || Number(p.age) > 120)) e.age = 'Enter a valid age';
    if (p.phone && p.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit mobile number';
    if (p.weight && (isNaN(Number(p.weight)) || Number(p.weight) <= 0)) e.weight = 'Enter weight in kg';
    setErr(e);
    if (Object.keys(e).length) return;
    onSaved(await upsertPatient({ ...p, name: p.name.trim() }));
  }
  const E = ({ k }: { k: string }) => (err[k] ? <span className="mt-1 block text-xs font-semibold text-danger">{err[k]}</span> : null);
  return (
    <Modal title={initial ? 'Edit patient' : 'New patient'} onClose={onClose} footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={save}>Save patient</Btn></div>}>
      <div className="space-y-3">
        <Field label="Patient name *"><input autoFocus className="field" value={p.name} onChange={(e) => set({ name: e.target.value })} /><E k="name" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age"><div className="flex gap-1"><input type="number" className="field" value={p.age} onChange={(e) => set({ age: e.target.value })} /><select className="field !w-16 !px-1" value={p.ageUnit} onChange={(e) => set({ ageUnit: e.target.value as any })}><option value="Y">Y</option><option value="M">M</option></select></div><E k="age" /></Field>
          <div><span className="lbl">Sex</span><div className="flex gap-1.5">{(['Male', 'Female', 'Other'] as const).map((s) => <Chip key={s} className="flex-1 !px-2" active={p.sex === s} onClick={() => set({ sex: s })}>{s}</Chip>)}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input className="field" type="tel" value={p.phone} onChange={(e) => set({ phone: e.target.value })} /><E k="phone" /></Field>
          <Field label="Weight (kg)"><input className="field" type="number" value={p.weight} onChange={(e) => set({ weight: e.target.value })} /><E k="weight" /></Field>
        </div>
        <Field label="Known allergies"><input className="field" value={p.allergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="e.g. Penicillin" /></Field>
        {initial && <div className="text-xs text-slate-500">Patient ID: <b>{p.pid}</b></div>}
      </div>
    </Modal>
  );
}
