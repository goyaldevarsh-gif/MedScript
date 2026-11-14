import { useState } from 'react';
import { Search, Star } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useSettings } from '../lib/db';
import { isOrtho } from '../lib/defaults';
import type { Template } from '../lib/types';
import { Empty, Modal } from './ui';
import { TemplateIcon } from './TemplateIcon';
import { norm } from '../lib/util';

export default function TemplatePicker({ onClose, onPick }: { onClose: () => void; onPick: (t: Template) => void }) {
  const st = useSettings();
  const list = (useLiveQuery(() => db.templates.toArray(), []) || []).filter((t) => isOrtho(st) || !t.builtIn);
  const [q, setQ] = useState('');
  const f = list.filter((t) => norm(t.name + ' ' + t.clinical.diagnosis).includes(norm(q))).sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.name.localeCompare(b.name));
  return (
    <Modal title="Start from a template" onClose={onClose}>
      <div className="relative mb-3"><Search size={18} className="absolute left-3 top-3 text-slate-400" /><input autoFocus className="field pl-10" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <p className="mb-3 text-xs text-slate-600">Templates fill diagnosis, examination, investigations and advice. Medicines are never added unless you saved them in your own template.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {f.map((t) => (
          <button key={t.id} onClick={() => onPick(t)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand hover:bg-brand-50">
            <TemplateIcon name={t.icon} className="h-9 w-9 shrink-0 rounded-lg bg-brand-50 p-1.5 text-brand" />
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{t.name}</div><div className="truncate text-xs text-slate-500">{t.clinical.diagnosis}{t.items.length ? ` · ${t.items.length} medicines` : ''}</div></div>
            {t.favourite && <Star size={15} className="text-amber-500" fill="currentColor" />}
          </button>
        ))}
      </div>
      {!f.length && <Empty title="No template found" text="Try a different search, or save your own from any prescription." />}
    </Modal>
  );
}
