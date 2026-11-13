import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Pencil, Plus, Trash2, Copy } from 'lucide-react';
import { db, duplicateRx } from '../lib/db';
import { Btn, Card, Empty, useToast } from '../components/ui';
import PatientForm from '../components/PatientForm';
import RxRow from '../components/RxRow';

export default function PatientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const p = useLiveQuery(() => db.patients.get(id!), [id]);
  const rxs = useLiveQuery(() => db.prescriptions.where('patientId').equals(id!).toArray().then((a) => a.sort((x, y) => (y.authorizedAt || y.updatedAt) - (x.authorizedAt || x.updatedAt))), [id]) || [];
  const [edit, setEdit] = useState(false);
  if (p === undefined) return null;
  if (!p) return <div className="p-8 text-center text-slate-600">Patient not found. <Link to="/patients" className="font-bold text-brand">Back to patients</Link></div>;
  const finals = rxs.filter((r) => r.status === 'final').length;
  async function remove() {
    if (finals > 0) return toast('Patients with finalized prescriptions cannot be deleted.', { tone: 'err' });
    await Promise.all(rxs.map((r) => db.prescriptions.delete(r.id))); await db.patients.delete(p!.id);
    toast('Patient deleted'); nav('/patients');
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <button onClick={() => nav('/patients')} className="flex items-center gap-1 text-sm font-bold text-slate-600"><ArrowLeft size={16} /> Patients</button>
      <Card className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-xl font-extrabold text-white">{p.name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold">{p.name}</h1>
            <div className="text-sm font-medium text-slate-600">{p.pid} · {p.age}{p.age && p.ageUnit} · {p.sex || '—'}{p.phone && ` · ${p.phone}`}{p.weight && ` · ${p.weight} kg`}</div>
            {p.allergies && <div className="mt-1 text-sm font-bold text-danger">Allergies: {p.allergies}</div>}
          </div>
          <div className="flex gap-2"><Btn variant="secondary" size="sm" onClick={() => setEdit(true)}><Pencil size={15} /> Edit</Btn><Btn size="sm" onClick={() => nav(`/new?patient=${p.id}`)}><Plus size={15} /> New prescription</Btn></div>
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
      {finals === 0 && <Btn variant="danger" size="sm" onClick={remove}><Trash2 size={15} /> Delete patient</Btn>}
      {edit && <PatientForm initial={p} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); toast('Patient updated'); }} />}
    </div>
  );
}
