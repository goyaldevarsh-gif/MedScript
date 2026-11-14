import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Pencil, Plus, RotateCcw, Search, Star, Trash2 } from 'lucide-react';
import { db, resetBuiltInTemplate, useSettings } from '../lib/db';
import type { Side, Template } from '../lib/types';
import { Badge, Btn, Chip, Empty, Field, Modal, useToast } from '../components/ui';
import { TemplateIcon } from '../components/TemplateIcon';
import { emptyClinical, isOrtho } from '../lib/defaults';
import { cx, norm, uid } from '../lib/util';

const ICONS = ['knee', 'spine', 'ankle', 'shoulder', 'hip', 'hand', 'fracture', 'bone', 'postop'];

export default function Templates() {
  const nav = useNavigate();
  const toast = useToast();
  const st = useSettings();
  const list = (useLiveQuery(() => db.templates.toArray(), []) || []).filter((t) => isOrtho(st) || !t.builtIn);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'fav' | 'mine'>('all');
  const [edit, setEdit] = useState<Template | null>(null);
  const f = list.filter((t) => norm(t.name + t.clinical.diagnosis).includes(norm(q)) && (tab === 'all' || (tab === 'fav' ? t.favourite : !t.builtIn))).sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.name.localeCompare(b.name));
  const blank = (): Template => ({ id: 'tpl-' + uid(), name: '', builtIn: false, icon: 'bone', favourite: false, clinical: emptyClinical(), followUpDays: 14, items: [], createdAt: Date.now(), updatedAt: Date.now() });
  async function del(t: Template) { await db.templates.delete(t.id); toast(`${t.name} deleted`, { action: { label: 'Undo', onClick: () => db.templates.put(t) } }); }
  async function dup(t: Template) { await db.templates.put({ ...JSON.parse(JSON.stringify(t)), id: 'tpl-' + uid(), builtIn: false, sourceKey: undefined, name: t.name + ' (copy)', favourite: false, createdAt: Date.now(), updatedAt: Date.now() }); toast('Duplicated to My Templates'); }
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">My Templates</h1><Btn onClick={() => setEdit(blank())}><Plus size={17} /> New template</Btn></div>
      <div className="relative"><Search size={18} className="absolute left-3 top-3 text-slate-400" /><input className="field pl-10" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="flex gap-2">{([['all', 'All'], ['fav', 'Favourites'], ['mine', 'Created by me']] as const).map(([v, l]) => <Chip key={v} active={tab === v} onClick={() => setTab(v)}>{l}</Chip>)}</div>
      <p className="text-xs text-slate-600">Starter templates fill diagnosis, examination, investigations and advice. They never add medicines on their own. All templates are editable.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {f.map((t) => (
          <div key={t.id} className="card flex flex-col p-3.5">
            <div className="flex items-start gap-3">
              <TemplateIcon name={t.icon} className="h-10 w-10 shrink-0 rounded-xl bg-brand-50 p-2 text-brand" />
              <div className="min-w-0 flex-1"><div className="text-[15px] font-extrabold leading-tight">{t.name}</div><div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{t.clinical.diagnosis}</div>
                <div className="mt-1 flex gap-1.5">{t.builtIn ? <Badge tone="blue">Starter</Badge> : <Badge tone="teal">Mine</Badge>}{t.items.length > 0 && <Badge>{t.items.length} meds</Badge>}</div></div>
              <button aria-label="Favourite" onClick={() => db.templates.update(t.id, { favourite: !t.favourite })} className={cx('rounded-lg p-1.5 hover:bg-slate-100', t.favourite ? 'text-amber-500' : 'text-slate-400')}><Star size={18} fill={t.favourite ? 'currentColor' : 'none'} /></button>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <Btn size="sm" className="flex-1" onClick={() => nav(`/new?template=${t.id}`)}>Use template</Btn>
              <Btn size="sm" variant="secondary" aria-label="Edit" onClick={() => setEdit(t)}><Pencil size={15} /></Btn>
              <Btn size="sm" variant="secondary" aria-label="Duplicate" onClick={() => dup(t)}><Copy size={15} /></Btn>
              {t.builtIn ? <Btn size="sm" variant="secondary" aria-label="Reset to default" title="Reset to default" onClick={async () => { await resetBuiltInTemplate(t.id); toast('Reset to default'); }}><RotateCcw size={15} /></Btn> : <Btn size="sm" variant="danger" aria-label="Delete" onClick={() => del(t)}><Trash2 size={15} /></Btn>}
            </div>
          </div>
        ))}
      </div>
      {!f.length && <Empty title="No templates" text={tab === 'mine' ? 'Save any prescription as a template from the builder, or create one here.' : 'Try a different search.'} />}
      {edit && <TemplateEditor t={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function TemplateEditor({ t, onClose }: { t: Template; onClose: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Template>(t);
  const c = (x: Partial<Template['clinical']>) => setD({ ...d, clinical: { ...d.clinical, ...x } });
  const [err, setErr] = useState('');
  async function save() {
    if (!d.name.trim()) return setErr('Give the template a name.');
    await db.templates.put({ ...d, name: d.name.trim(), clinical: { ...d.clinical, advice: d.clinical.advice.map((a) => a.trim()).filter(Boolean) }, updatedAt: Date.now() });
    toast('Template saved'); onClose();
  }
  return (
    <Modal wide title={t.name ? 'Edit template' : 'New template'} onClose={onClose} footer={<div className="flex gap-2 [&>button]:flex-1 sm:justify-end sm:[&>button]:flex-none"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={save}>Save template</Btn></div>}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Template name *"><input className="field" value={d.name} onChange={(e) => { setD({ ...d, name: e.target.value }); setErr(''); }} /></Field>
          <Field label="Diagnosis"><input className="field" value={d.clinical.diagnosis} onChange={(e) => c({ diagnosis: e.target.value })} /></Field></div>
        <div className="flex flex-wrap gap-2">{ICONS.map((i) => <button key={i} type="button" onClick={() => setD({ ...d, icon: i })} className={cx('rounded-lg border p-2', d.icon === i ? 'border-brand bg-brand-50 text-brand' : 'border-slate-200 text-slate-500')} aria-label={i}><TemplateIcon name={i} className="h-5 w-5" /></button>)}</div>
        <Field label="Chief complaint"><input className="field" value={d.clinical.complaint} onChange={(e) => c({ complaint: e.target.value })} /></Field>
        <div><span className="lbl">Side</span><div className="flex gap-2">{(['Left', 'Right', 'Bilateral', 'N/A'] as Side[]).map((s) => <Chip key={s} active={d.clinical.side === s} onClick={() => c({ side: s })}>{s}</Chip>)}</div></div>
        <Field label="Examination fields"><textarea className="field" rows={2} value={d.clinical.examination} onChange={(e) => c({ examination: e.target.value })} /></Field>
        <Field label="Investigations"><textarea className="field" rows={2} value={d.clinical.investigations} onChange={(e) => c({ investigations: e.target.value })} /></Field>
        <Field label="Advice (one per line)"><textarea className="field min-h-[120px]" value={d.clinical.advice.join('\n')} onChange={(e) => c({ advice: e.target.value.split('\n') })} /></Field>
        <Field label="Default follow-up (days)"><input type="number" min="0" className="field w-32" value={d.followUpDays} onChange={(e) => setD({ ...d, followUpDays: Number(e.target.value) })} /></Field>
        {d.items.length > 0 && <div><span className="lbl">Included medicines</span>{d.items.map((i) => <div key={i.id} className="mb-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold">{i.brand || i.generic} {i.strength}<button className="text-danger" onClick={() => setD({ ...d, items: d.items.filter((x) => x.id !== i.id) })}><Trash2 size={15} /></button></div>)}</div>}
        {err && <div className="text-sm font-semibold text-danger">{err}</div>}
      </div>
    </Modal>
  );
}
