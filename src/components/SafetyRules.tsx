import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AGE_RULES, CLASSES, CTX_RULES, RULES } from '../data/interactions';
import { updateSettings } from '../lib/db';
import { Btn, Card, useToast } from './ui';
import { uid } from '../lib/util';
import type { AppSettings, IxCustom } from '../lib/types';

const LEVELS: { k: IxCustom['level']; l: string }[] = [{ k: 'danger', l: 'Avoid' }, { k: 'warn', l: 'Caution' }, { k: 'info', l: 'Note' }];
const tone = (l: string) => l === 'danger' ? 'bg-red-100 text-red-800' : l === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700';
const label = (l: string) => LEVELS.find((x) => x.k === l)?.l || l;
const nice = (r: { a?: string; b?: string; cls?: string; id: string }) => r.cls ? CLASSES[r.cls]?.label : `${CLASSES[r.a!]?.label} + ${CLASSES[r.b!]?.label}`;

/** Settings → Drug safety: the interaction checker's built-in rules (each can be switched off) and the doctor's own rules. */
export default function SafetyRules({ s }: { s: AppSettings }) {
  const toast = useToast();
  const muted = new Set(s.ixMuted || []); const custom = s.ixCustom || [];
  const [d, setD] = useState<IxCustom>({ id: '', a: '', b: '', level: 'warn', note: '' });
  const [open, setOpen] = useState(false);
  const toggle = (id: string) => updateSettings((x) => { const m = new Set(x.ixMuted || []); m.has(id) ? m.delete(id) : m.add(id); x.ixMuted = [...m]; });
  const add = async () => {
    if (d.a.trim().length < 3 || d.b.trim().length < 3) { toast('Type both medicines or groups (at least 3 letters each)', { tone: 'err' }); return; }
    await updateSettings((x) => { x.ixCustom = [...(x.ixCustom || []), { ...d, id: 'cx-' + uid() }]; });
    setD({ id: '', a: '', b: '', level: 'warn', note: '' }); toast('Rule added');
  };
  const groups = [...new Set([...RULES, ...CTX_RULES, ...AGE_RULES].map((r) => r.group))];
  const all = [...RULES.map((r) => ({ ...r, name: nice(r) })), ...CTX_RULES.map((r) => ({ ...r, name: `${CLASSES[r.cls].label} with ${r.condLabel}` })), ...AGE_RULES.map((r) => ({ ...r, name: r.max !== undefined ? `${CLASSES[r.cls].label}, under ${r.max < 1 ? '6 months' : r.max + ' years'}` : `${CLASSES[r.cls].label}, age ${r.min}+` }))] as { id: string; group: string; level: string; text: string; name: string }[];
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <div><h2 className="text-lg font-extrabold">Your own interaction rules</h2>
          <p className="text-sm text-slate-600">Add a combination you never want to see together. It appears as a warning in the prescription, like the built-in ones.</p></div>
        {custom.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-sm"><span className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tone(c.level)}`}>{label(c.level)}</span><b>{c.a}</b> + <b>{c.b}</b>{c.note && <span className="text-slate-600"> · {c.note}</span>}</div>
            <button className="text-slate-400 hover:text-danger" aria-label="Delete rule" onClick={() => updateSettings((x) => { x.ixCustom = (x.ixCustom || []).filter((r) => r.id !== c.id); })}><Trash2 size={16} /></button>
          </div>))}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className="field" list="ix-classes" placeholder="Medicine or group A (e.g. tramadol)" value={d.a} onChange={(e) => setD({ ...d, a: e.target.value })} />
          <input className="field" list="ix-classes" placeholder="Medicine or group B (e.g. pregabalin)" value={d.b} onChange={(e) => setD({ ...d, b: e.target.value })} />
          <datalist id="ix-classes">{Object.keys(CLASSES).map((k) => <option key={k} value={k}>{CLASSES[k].label}</option>)}</datalist>
          <select className="field" value={d.level} onChange={(e) => setD({ ...d, level: e.target.value as IxCustom['level'] })}>{LEVELS.map((l) => <option key={l.k} value={l.k}>{l.l}</option>)}</select>
          <input className="field" placeholder="Short note (optional)" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
        </div>
        <p className="text-xs text-slate-500">A group name such as <b>nsaid</b>, <b>steroid</b>, <b>opioid</b>, <b>benzo</b> or <b>fq</b> covers every medicine in it. Anything else is matched on the medicine name.</p>
        <Btn onClick={add}><Plus size={16} /> Add rule</Btn>
      </Card>
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">Built-in checks</h2><p className="text-sm text-slate-600">{all.length - muted.size} of {all.length} on. Switch off any check you do not want.</p></div>
          <button className="text-sm font-bold text-brand" onClick={() => setOpen(!open)}>{open ? 'Hide list' : 'Show list'}</button></div>
        {open && groups.map((g) => (
          <div key={g}><div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">{g}</div>
            <div className="space-y-1">{all.filter((r) => r.group === g).map((r) => (
              <label key={r.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={!muted.has(r.id)} onChange={() => toggle(r.id)} />
                <span><span className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tone(r.level)}`}>{label(r.level)}</span><b>{r.name}</b><span className="block text-xs text-slate-600">{r.text}</span></span>
              </label>))}</div></div>))}
        <p className="text-xs text-slate-500">Medicines are matched on their composition, and what the patient already takes is read from the Comorbidities box (for example "on warfarin, telmisartan"). Topical NSAIDs and steroids are ignored.</p>
      </Card>
    </div>
  );
}
