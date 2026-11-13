import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Users } from 'lucide-react';
import { db } from '../lib/db';
import { Btn, Empty } from '../components/ui';
import PatientForm from '../components/PatientForm';
import { fmtDate, norm } from '../lib/util';

export default function Patients() {
  const nav = useNavigate();
  const list = useLiveQuery(() => db.patients.orderBy('updatedAt').reverse().toArray(), []);
  const counts = useLiveQuery(async () => { const m = new Map<string, number>(); (await db.prescriptions.toArray()).forEach((r) => m.set(r.patientId, (m.get(r.patientId) || 0) + 1)); return m; }, []);
  const [q, setQ] = useState('');
  const [add, setAdd] = useState(false);
  const f = (list || []).filter((p) => norm(`${p.name} ${p.phone} ${p.pid}`).includes(norm(q)));
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Patients</h1><Btn onClick={() => setAdd(true)}><Plus size={17} /> Add patient</Btn></div>
      <div className="relative"><Search size={18} className="absolute left-3 top-3 text-slate-400" /><input className="field pl-10" placeholder="Search by name, phone or patient ID" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="space-y-2">
        {f.map((p) => (
          <Link key={p.id} to={`/patients/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 hover:border-brand">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-extrabold text-white">{p.name.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-extrabold">{p.name}</div><div className="truncate text-xs text-slate-500">{p.pid} · {p.age}{p.age && p.ageUnit} · {p.sex || '—'}{p.phone && ` · ${p.phone}`} · {counts?.get(p.id) || 0} Rx · updated {fmtDate(p.updatedAt)}</div></div>
            <Btn size="sm" variant="secondary" onClick={(e) => { e.preventDefault(); nav(`/new?patient=${p.id}`); }}>New Rx</Btn>
          </Link>
        ))}
      </div>
      {list && !f.length && <Empty icon={<Users />} title={q ? 'No matching patient' : 'No patients yet'} text={q ? 'Check the spelling or add a new patient.' : 'Add a patient here, or simply create a prescription: the patient is saved automatically.'} action={<Btn onClick={() => setAdd(true)}><Plus size={16} /> Add patient</Btn>} />}
      {add && <PatientForm onClose={() => setAdd(false)} onSaved={(p) => { setAdd(false); nav(`/patients/${p.id}`); }} />}
    </div>
  );
}
