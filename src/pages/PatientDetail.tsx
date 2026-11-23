import { fmtAge } from '../lib/age';
import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Pencil, Plus, Trash2, Copy, Send, Check } from 'lucide-react';
import { db, duplicateRx, useSettings } from '../lib/db';
import { markSent, ovMsg, sendRx, wasSent } from '../lib/ovcloud';
import { ovSendable } from '../lib/orthovault';
import { Btn, Card, Empty, Modal, useToast } from '../components/ui';
import { uid } from '../lib/util';
import PatientForm from '../components/PatientForm';
import RxRow from '../components/RxRow';

export default function PatientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const p = useLiveQuery(() => db.patients.get(id!), [id]);
  const rxs = useLiveQuery(() => db.prescriptions.where('patientId').equals(id!).toArray().then((a) => a.sort((x, y) => (y.authorizedAt || y.updatedAt) - (x.authorizedAt || x.updatedAt))), [id]) || [];
  const settings = useSettings();
  const [edit, setEdit] = useState(false);
  const [askDel, setAskDel] = useState(false); const [typed, setTyped] = useState('');
  const [, bump] = useState(0);
  const [sending, setSending] = useState(false);
  const inOv = rxs.some((r) => wasSent(r.id));
  async function toOv() {
    const all = rxs.filter((x) => x.status === 'final' && ovSendable(x)).sort((x, y) => (x.authorizedAt || x.updatedAt) - (y.authorizedAt || y.updatedAt));
    if (!settings?.ovEmail) return;
    if (!all.length) return toast('Finalize a prescription with at least one medicine first. OrthoVault only accepts those.', { tone: 'err' });
    setSending(true);
    try {
      for (const r of all) { await sendRx({ ...r, patient: { ...r.patient, name: p!.name, age: p!.age, ageUnit: p!.ageUnit, sex: p!.sex, phone: p!.phone, weight: p!.weight, allergies: p!.allergies } }, settings.ovEmail); markSent(r.id); }
      bump((n) => n + 1); toast(`Sent to OrthoVault: ${all.length} visit${all.length > 1 ? 's' : ''}. Later prescriptions will follow automatically.`);
    } catch (e) { toast(ovMsg(e), { tone: 'err' }); }
    setSending(false);
  }
  if (p === undefined) return null;
  if (!p) return <div className="p-8 text-center text-slate-600">Patient not found. <Link to="/patients" className="font-bold text-brand">Back to patients</Link></div>;
  const finals = rxs.filter((r) => r.status === 'final').length;
  async function remove() {
    // a patient with finished prescriptions is deleted only after a typed confirmation; a short record of the deletion (no clinical data) stays in the audit log
    await db.transaction('rw', [db.prescriptions, db.patients, db.audit], async () => {
      await Promise.all(rxs.map((r) => db.prescriptions.delete(r.id))); await db.patients.delete(p!.id);
      if (finals > 0) await db.audit.add({ id: uid(), ts: Date.now(), event: 'PATIENT_DELETED', rxId: '', rxNo: '', details: `Patient ${p!.name} (${p!.pid}) deleted with ${rxs.length} prescription${rxs.length === 1 ? '' : 's'} (${finals} finalized).` });
    });
    toast('Patient deleted'); nav('/patients');
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <button onClick={() => nav('/patients')} className="flex items-center gap-1 text-sm font-bold text-slate-600"><ArrowLeft size={16} /> Patients</button>
      <Card className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-xl font-extrabold text-white">{p.name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-[10rem] flex-1">
            <h1 className="text-2xl font-extrabold">{p.name}</h1>
            <div className="text-sm font-medium text-slate-600">{p.pid} · {fmtAge(p.age, p.ageUnit).toUpperCase()} · {p.sex || '—'}{p.phone && ` · ${p.phone}`}{p.weight && ` · ${p.weight} kg`}</div>
            {p.allergies && <div className="mt-1 text-sm font-bold text-danger">Allergies: {p.allergies}</div>}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">{settings?.ovEmail && rxs.length > 0 && <Btn variant="secondary" size="sm" disabled={sending} onClick={toOv}>{inOv ? <Check size={15} /> : <Send size={15} />} {sending ? 'Sending…' : inOv ? 'In OrthoVault · resend all' : 'To OrthoVault'}</Btn>}<Btn variant="secondary" size="sm" onClick={() => setEdit(true)}><Pencil size={15} /> Edit</Btn><Btn size="sm" onClick={() => nav(`/new?patient=${p.id}`)}><Plus size={15} /> New prescription</Btn></div>
        </div>
      </Card>
      <div>
        <div className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">History ({rxs.length})</div>
        <div className="space-y-2">
          {rxs.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1"><RxRow rx={r} showPatient={false} /></div>
              <Btn variant="ghost" size="sm" title="Duplicate as draft" onClick={async () => { const c = await duplicateRx(r.id); toast('Duplicated as draft'); nav(`/rx/${c.id}`); }}><Copy size={16} /></Btn>
            </div>
          ))}
          {!rxs.length && <Empty title="No prescriptions yet" text="Create the first prescription for this patient." action={<Btn onClick={() => nav(`/new?patient=${p.id}`)}><Plus size={16} /> New prescription</Btn>} />}
        </div>
      </div>
      <Btn variant="danger" size="sm" onClick={() => { setTyped(''); if (finals === 0 && rxs.length === 0) remove(); else setAskDel(true); }}><Trash2 size={15} /> Delete patient</Btn>
      {edit && <PatientForm initial={p} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); toast('Patient updated'); }} />}
      {askDel && (
        <Modal title="Delete this patient?" onClose={() => setAskDel(false)} footer={<div className="flex gap-2 [&>button]:flex-1 sm:justify-end sm:[&>button]:flex-none"><Btn variant="secondary" onClick={() => setAskDel(false)}>Keep patient</Btn><Btn variant="danger" disabled={finals > 0 && typed.trim().toLowerCase() !== p.name.trim().toLowerCase()} onClick={remove}><Trash2 size={15} /> Delete for good</Btn></div>}>
          <div className="space-y-3 text-sm text-slate-700">
            <p><b>{p.name}</b> and {rxs.length} prescription{rxs.length === 1 ? '' : 's'}{finals > 0 ? <> (<b>{finals} finalized</b>)</> : ' (drafts only)'} will be removed from this device (and from synced devices, if cloud sync is on). This cannot be undone.</p>
            {finals > 0 && <>
              <p className="rounded-xl bg-amber-50 px-3 py-2 font-semibold text-amber-900">Finalized prescriptions are medical records. Take a backup first (Settings, Backup) if you may need them. A copy already sent to OrthoVault stays there.</p>
              <label className="block"><span className="lbl">Type the patient's name to confirm</span><input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={p.name} /></label>
            </>}
          </div>
        </Modal>
      )}
    </div>
  );
}
