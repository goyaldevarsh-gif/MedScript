import { useState } from 'react';
import { Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Freq, Kit, Medicine, RxItem } from '../lib/types';
import { updateSettings, useMedicineIndex, useSettings } from '../lib/db';
import { itemFromMedicine } from '../lib/defaults';
import { FREQS, freqMeta } from '../lib/dosage';
import { useMedicineSearch } from './MedicineLibrary';
import { Btn, Card, Modal } from './ui';
import { uid } from '../lib/util';

const nm = (m: Medicine) => [m.brand || m.generic, m.strength].filter(Boolean).join(' ') + (m.brand && m.generic ? ` (${m.generic})` : '');

/** "10" -> "10 tablets" so the printed quantity reads naturally; anything else is kept as typed. */
export function qtyText(raw: string, unit: string): string {
  const q = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(q)) return q;
  const n = Number(q); const u = unit === 'unit' ? 'unit' : unit;
  return `${q} ${u}${n > 1 && !u.endsWith('s') ? 's' : ''}`;
}

/** Build a prescription line from a kit entry. SOS lines carry no duration, the quantity is what you typed. */
export function kitItem(m: Medicine, qty: string, freq: Freq): RxItem {
  const it = itemFromMedicine(m);
  it.freq = freq; it.timesPerDay = Math.max(1, Math.round(freqMeta(freq).perDay) || 1);
  if (freq === 'SOS') { it.duration = 0; it.timing = 'asreq'; }
  it.qtyOverride = qtyText(qty, it.doseUnit);
  return it;
}

function FreqSel({ v, on }: { v: Freq; on: (f: Freq) => void }) {
  return <select className="field !w-auto !py-1.5 text-sm" value={v} onChange={(e) => on(e.target.value as Freq)} aria-label="How often">{FREQS.filter((f) => f.v !== 'CUSTOM').map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}</select>;
}

/* ---------------- Settings: manage kits ---------------- */
export function KitsCard() {
  const s = useSettings();
  const [edit, setEdit] = useState<Kit | null>(null);
  if (!s) return null;
  const kits = s.kits || [];
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Package size={19} /> My kits</h2>
          <p className="text-sm text-slate-600">A short list of medicines for one purpose, like a trip bag. While making a prescription, tap “Add from kit” to pick only from it and set quantity. Medicines stay in the main library too.</p></div>
        <Btn size="sm" onClick={() => setEdit({ id: uid(), name: '', items: [] })}><Plus size={15} /> New kit</Btn>
      </div>
      {!kits.length && <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm font-medium text-slate-500">No kits yet.</div>}
      {kits.map((k) => (
        <div key={k.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
          <div><div className="font-extrabold text-navy">{k.name || 'Untitled kit'}</div><div className="text-xs font-medium text-slate-500">{k.items.length} medicine{k.items.length === 1 ? '' : 's'}</div></div>
          <div className="flex gap-1">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Edit kit" onClick={() => setEdit(JSON.parse(JSON.stringify(k)))}><Pencil size={16} /></button>
            <button className="rounded-lg p-2 text-danger hover:bg-red-50" aria-label="Delete kit" onClick={async () => { if (confirm(`Delete kit “${k.name}”? Medicines in the library are not affected.`)) await updateSettings((x) => { x.kits = (x.kits || []).filter((z) => z.id !== k.id); }); }}><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
      {edit && <KitEditor kit={edit} onClose={() => setEdit(null)} />}
    </Card>
  );
}

function KitEditor({ kit, onClose }: { kit: Kit; onClose: () => void }) {
  const [k, setK] = useState<Kit>(kit);
  const [q, setQ] = useState('');
  const { list, idx } = useMedicineSearch(q, 'All', 8);
  const byId = new Map((idx?.all || []).map((m) => [m.id, m]));
  const add = (m: Medicine) => { if (!k.items.some((i) => i.medId === m.id)) setK({ ...k, items: [...k.items, { medId: m.id, qty: '', freq: 'SOS' }] }); setQ(''); };
  async function save() {
    if (!k.name.trim()) return;
    await updateSettings((x) => { const a = x.kits || []; const i = a.findIndex((z) => z.id === k.id); const v = { ...k, name: k.name.trim() }; if (i >= 0) a[i] = v; else a.push(v); x.kits = a; });
    onClose();
  }
  return (
    <Modal wide title="Kit" onClose={onClose} footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn disabled={!k.name.trim()} onClick={save}>Save kit</Btn></div>}>
      <label className="block"><span className="lbl">Kit name</span><input className="field" value={k.name} onChange={(e) => setK({ ...k, name: e.target.value })} placeholder="e.g. Trip kit" autoFocus /></label>
      <div className="mt-4"><span className="lbl">Add medicines</span>
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand or generic…" />
        {q.trim() && <div className="mt-1 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1.5">{list.map((m) => <button key={m.id} onClick={() => add(m)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-brand-50">{nm(m)}</button>)}{!list.length && <div className="p-2 text-sm text-slate-500">Nothing found.</div>}</div>}
      </div>
      <div className="mt-4 space-y-2">
        <span className="lbl">In this kit ({k.items.length})</span>
        {!k.items.length && <div className="text-sm text-slate-500">Search above and tap a medicine to add it.</div>}
        {k.items.map((it, i) => {
          const m = byId.get(it.medId);
          return (
            <div key={it.medId} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2.5">
              <div className="min-w-0 flex-1 text-sm font-bold">{m ? nm(m) : it.medId}</div>
              <input className="field !w-24 !py-1.5 text-sm" value={it.qty} placeholder="Qty" aria-label="Quantity" onChange={(e) => setK({ ...k, items: k.items.map((z, j) => (j === i ? { ...z, qty: e.target.value } : z)) })} />
              <FreqSel v={it.freq} on={(f) => setK({ ...k, items: k.items.map((z, j) => (j === i ? { ...z, freq: f } : z)) })} />
              <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Remove" onClick={() => setK({ ...k, items: k.items.filter((_, j) => j !== i) })}><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/* ---------------- Rx builder: pick from a kit ---------------- */
export function KitPicker({ onClose, onAdd }: { onClose: () => void; onAdd: (items: RxItem[]) => void }) {
  const s = useSettings();
  const idx = useMedicineIndex();
  const kits = s?.kits || [];
  const [kid, setKid] = useState(kits[0]?.id || '');
  const kit = kits.find((x) => x.id === kid) || kits[0];
  const [rows, setRows] = useState<Record<string, { on: boolean; qty: string; freq: Freq }>>({});
  if (!s || !idx) return null;
  const byId = new Map(idx.all.map((m) => [m.id, m]));
  const row = (medId: string, d: { qty: string; freq: Freq }) => rows[`${kit?.id}|${medId}`] || { on: true, qty: d.qty, freq: d.freq };
  const setRow = (medId: string, d: { qty: string; freq: Freq }, p: Partial<{ on: boolean; qty: string; freq: Freq }>) => setRows({ ...rows, [`${kit?.id}|${medId}`]: { ...row(medId, d), ...p } });
  const chosen = (kit?.items || []).filter((it) => row(it.medId, it).on && byId.get(it.medId));
  function add() {
    const out = chosen.map((it) => { const r = row(it.medId, it); return kitItem(byId.get(it.medId)!, r.qty, r.freq); });
    onAdd(out); onClose();
  }
  return (
    <Modal wide title={<span className="flex items-center gap-2"><Package size={20} /> Add from kit</span>} onClose={onClose} footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn disabled={!chosen.length} onClick={add}>Add {chosen.length} medicine{chosen.length === 1 ? '' : 's'}</Btn></div>}>
      {!kits.length && <p className="text-sm font-medium text-slate-600">No kits yet. Make one in Settings → Favourite medicines → My kits.</p>}
      {kits.length > 1 && <div className="mb-3 flex flex-wrap gap-2">{kits.map((x) => <button key={x.id} onClick={() => setKid(x.id)} className={`rounded-full border px-3 py-1 text-sm font-bold ${x.id === kit?.id ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{x.name}</button>)}</div>}
      <div className="space-y-2">
        {(kit?.items || []).map((it) => {
          const m = byId.get(it.medId); if (!m) return null;
          const r = row(it.medId, it);
          return (
            <div key={it.medId} className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 ${r.on ? 'border-brand/40 bg-brand-50/40' : 'border-slate-200 opacity-60'}`}>
              <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={r.on} onChange={(e) => setRow(it.medId, it, { on: e.target.checked })} /><span className="truncate">{nm(m)}</span></label>
              <input className="field !w-24 !py-1.5 text-sm" value={r.qty} placeholder="Qty" aria-label="Quantity" onChange={(e) => setRow(it.medId, it, { qty: e.target.value })} />
              <FreqSel v={r.freq} on={(f) => setRow(it.medId, it, { freq: f })} />
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">Quantity: type a number (10 becomes “10 tablets”) or any text (“1 tube”). You can still edit each line after adding.</p>
    </Modal>
  );
}
