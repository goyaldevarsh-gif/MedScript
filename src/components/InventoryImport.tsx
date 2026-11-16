import { useRef, useState } from 'react';
import { FileUp, Store, Trash2, Check } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Badge, Btn, Field, Modal, Spinner, useToast } from './ui';
import { db } from '../lib/db';
import { planImport, readTable, tableToRows, type ImportPlan, type RawRow } from '../lib/inventory';

/** "Import my medical shop's stock list": CSV / Excel / PDF -> medicines tagged with the shop name. */
export default function InventoryImport({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [shop, setShop] = useState('');
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [fname, setFname] = useState('');
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const shops = useLiveQuery(async () => {
    const all = await db.medicines.filter((m) => !!m.shop).toArray();
    const c = new Map<string, number>(); all.forEach((m) => c.set(m.shop!, (c.get(m.shop!) || 0) + 1));
    return [...c.entries()];
  }, []);

  const pick = async (f: File) => {
    setBusy(true); setPlan(null); setRows(null);
    try {
      const r = tableToRows(await readTable(f));
      if (!r.length) throw new Error('No medicine names found in this file. Try the Excel or CSV export of the stock list.');
      const name = shop.trim() || f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      setShop(name); setFname(f.name); setRows(r); setPlan(planImport(r, name));
    } catch (e: any) { toast(e.message || 'Could not read this file', { tone: 'err', ms: 7000 }); }
    setBusy(false);
  };
  const rename = (v: string) => { setShop(v); if (rows && v.trim()) setPlan(planImport(rows, v.trim())); };
  const run = async () => {
    if (!plan || !shop.trim()) return;
    setBusy(true);
    await db.medicines.bulkPut(plan.meds);
    setBusy(false);
    toast(`${plan.meds.length} medicines added from ${shop.trim()}`);
    onClose();
  };
  const removeShop = async (s: string) => {
    if (!confirm(`Remove all medicines imported from "${s}"?`)) return;
    const ids = (await db.medicines.filter((m) => m.shop === s).toArray()).map((m) => m.id);
    await db.medicines.bulkDelete(ids);
    toast(`Removed ${ids.length} medicines`);
  };

  return (
    <Modal title={<span className="flex items-center gap-2"><Store size={18} /> Import shop stock list</span>} onClose={onClose}
      footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Close</Btn>{plan && <Btn onClick={run} disabled={busy || !shop.trim()}><Check size={16} /> Import {plan.meds.length} medicines</Btn>}</div>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Upload the medical shop's stock list (Excel, CSV or PDF). Medicines it can recognise get their composition filled in; the rest are added by name only. They stay on this device and show as <b>Shop stock</b>.</p>
        <input ref={file} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Shop / hospital name" hint="Used to group these medicines. You can remove a shop's list later."><input className="field" value={shop} onChange={(e) => rename(e.target.value)} placeholder="e.g. Mittal Medical Store" /></Field>
          <Btn onClick={() => file.current?.click()} disabled={busy}><FileUp size={16} /> {rows ? 'Choose another file' : 'Choose file'}</Btn>
        </div>
        {busy && <div className="flex items-center gap-2 text-sm text-slate-600"><Spinner /> Reading file…</div>}
        {plan && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-bold">{fname}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-sm">
              <Badge tone="blue">{plan.meds.length} to import</Badge>
              <Badge tone="green">{plan.matched} composition known</Badge>
              <Badge tone="amber">{plan.nameOnly} name only</Badge>
              {plan.skipped > 0 && <Badge>{plan.skipped} skipped (duplicates / blanks)</Badge>}
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {plan.sample.map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="font-semibold">{m.brand}</span><span className="truncate text-slate-500">{m.generic || 'composition not known'}</span></li>)}
            </ul>
            {plan.nameOnly > 0 && <p className="mt-3 text-xs text-amber-800">Name-only medicines have no composition, so allergy and interaction checks can't run for them. Add the composition from the Drug Library when you use them.</p>}
          </div>
        )}
        {!!shops?.length && (
          <div>
            <div className="lbl">Already imported</div>
            <div className="space-y-1.5">
              {shops.map(([s, n]) => <div key={s} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"><span><b>{s}</b> · {n} medicines</span><button onClick={() => removeShop(s)} aria-label={`Remove ${s}`} className="rounded p-1 text-danger hover:bg-danger-50"><Trash2 size={16} /></button></div>)}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
