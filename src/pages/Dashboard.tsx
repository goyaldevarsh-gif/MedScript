import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Users, Pill, Layers, Clock, AlertTriangle } from 'lucide-react';
import { db, useMedicineIndex, useSettings } from '../lib/db';
import { Card, Chip, Empty } from '../components/ui';
import RxRow from '../components/RxRow';
import { isToday } from '../lib/util';
import { TemplateIcon } from '../components/TemplateIcon';
import SampleRx from '../components/SampleRx';

export default function Dashboard() {
  const nav = useNavigate();
  const s = useSettings();
  const rxs = useLiveQuery(() => db.prescriptions.orderBy('updatedAt').reverse().limit(60).toArray(), []) || [];
  const patients = useLiveQuery(() => db.patients.orderBy('updatedAt').reverse().limit(5).toArray(), []) || [];
  const tpls = useLiveQuery(() => db.templates.toArray(), []) || [];
  const idx = useMedicineIndex();
  const today = rxs.filter((r) => isToday(r.authorizedAt || r.updatedAt));
  const recentMeds = idx ? [...idx.meta.values()].filter((m) => m.lastUsedAt).sort((a, b) => b.lastUsedAt - a.lastUsedAt).slice(0, 10).map((m) => idx.all.find((x) => x.id === m.id)).filter(Boolean) : [];
  const favTpls = tpls.filter((t) => t.favourite);
  const name = s?.doctor.fullName.trim();
  const hr = new Date().getHours();
  const incomplete = s && (!s.doctor.fullName.trim() || !s.doctor.regNo.trim());
  const daysSinceBackup = s?.lastBackupAt ? Math.floor((Date.now() - s.lastBackupAt) / 86400000) : null;
  const finals = rxs.filter((r) => r.status === 'final').length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'}{name ? `, ${/^dr/i.test(name) ? name : 'Dr. ' + name.split(' ')[0]}` : ''}</h1>
        <p className="text-sm font-medium text-slate-600">Ready for the next patient.</p>
      </div>
      {incomplete && (
        <Link to="/settings" className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          <AlertTriangle size={18} /> Set up your doctor profile (name, qualifications, registration number) to print valid prescriptions. <span className="ml-auto underline">Set up</span>
        </Link>
      )}
      <button onClick={() => nav('/new', { state: { t: Date.now() } })} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-brand to-brand-600 px-6 py-6 text-xl font-extrabold text-white shadow-lg shadow-brand/25 transition active:scale-[.99] sm:py-7">
        <Plus size={28} /> Create New Prescription
      </button>
      <div className="flex justify-center"><SampleRx /></div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <SectionTitle icon={<Clock size={16} />} title={`Today's prescriptions (${today.length})`} />
          <div className="space-y-2">{today.slice(0, 5).map((r) => <RxRow key={r.id} rx={r} />)}
            {!today.length && <Empty title="Nothing yet today" text="Prescriptions you create today will show up here." />}</div>
        </Card>
        <Card className="p-4">
          <SectionTitle icon={<Users size={16} />} title="Recent patients" link={{ to: '/patients', label: 'All patients' }} />
          <div className="space-y-2">{patients.map((p) => (
            <Link key={p.id} to={`/patients/${p.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 hover:border-brand">
              <div><div className="text-[15px] font-extrabold">{p.name}</div><div className="text-xs text-slate-500">{p.age}{p.age && p.ageUnit} · {p.sex || '—'} · {p.pid}</div></div>
              <button className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand" onClick={(e) => { e.preventDefault(); nav(`/new?patient=${p.id}`); }}>New Rx</button>
            </Link>))}
            {!patients.length && <Empty title="No patients yet" text="Patients are saved automatically with their first prescription." />}</div>
        </Card>
        <Card className="p-4">
          <SectionTitle icon={<Pill size={16} />} title="Recently used medicines" />
          <div className="flex flex-wrap gap-2">{recentMeds.map((m) => m && <Chip key={m.id} onClick={() => nav(`/new?med=${encodeURIComponent(m.id)}`)}>{m.brand || m.generic} {m.strength}</Chip>)}
            {!recentMeds.length && <div className="text-sm text-slate-500">Medicines you prescribe will appear here for one-tap reuse.</div>}</div>
        </Card>
        <Card className="p-4">
          <SectionTitle icon={<Layers size={16} />} title="Favourite templates" link={{ to: '/templates', label: 'All templates' }} />
          <div className="grid gap-2 sm:grid-cols-2">{favTpls.map((t) => (
            <button key={t.id} onClick={() => nav(`/new?template=${t.id}`)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-brand hover:bg-brand-50">
              <TemplateIcon name={t.icon} className="h-8 w-8 rounded-lg bg-brand-50 p-1.5 text-brand" /><span className="text-sm font-bold">{t.name}</span></button>))}
            {!favTpls.length && <div className="text-sm text-slate-500">Star a template to pin it here.</div>}</div>
        </Card>
      </div>
      <Card className="p-4">
        <SectionTitle title="Recent prescriptions" />
        <div className="grid gap-2 md:grid-cols-2">{rxs.slice(0, 8).map((r) => <RxRow key={r.id} rx={r} />)}</div>
        {!rxs.length && <Empty title="No prescriptions yet" text="Tap “Create New Prescription” to make your first one in under a minute." />}
      </Card>
      {(finals > 0 && (daysSinceBackup === null || daysSinceBackup > 7)) && (
        <Link to="/settings?tab=backup" className="block rounded-xl bg-slate-100 px-4 py-2.5 text-center text-xs font-bold text-slate-700">Your data lives on this device. {daysSinceBackup === null ? 'You have never taken a backup.' : `Last backup ${daysSinceBackup} days ago.`} Back up now →</Link>
      )}
    </div>
  );
}
function SectionTitle({ title, icon, link }: { title: string; icon?: React.ReactNode; link?: { to: string; label: string } }) {
  return <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">{icon}{title}</div>{link && <Link to={link.to} className="text-xs font-bold text-brand">{link.label}</Link>}</div>;
}
