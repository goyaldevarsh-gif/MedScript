import { useMemo, useRef, useState } from 'react';
import { Search, Star, Plus, Library, Trash2, Upload, Pencil } from 'lucide-react';
import type { Medicine } from '../lib/types';
import { Badge, Btn, Chip, Empty, Field, Modal, useDebounced, useToast } from './ui';
import { GROUPS, groupsOf, searchBlob, type Group } from '../data/catalogue';
import { parseComp } from '../data/brands';
import { deleteCustomMedicine, saveCustomMedicine, toggleFavourite, useMedicineIndex } from '../lib/db';
import { FORMS, ROUTES, routeForForm } from '../lib/defaults';
import { cx, norm } from '../lib/util';

export const compositionOf = (m: Medicine) => m.ingredients.map((i) => `${i.name}${i.strength ? ' ' + i.strength : ''}`).join(' + ');

export function SourceBadge({ m }: { m: Medicine }) {
  if (m.source === 'catalogue') return <Badge tone="green">Catalogue</Badge>;
  if (m.source === 'brand') return <Badge tone="amber">Brand · check pack</Badge>;
  return <Badge tone="slate">Doctor-entered · unverified</Badge>;
}

function rank(m: Medicine, q: string, meta: Map<string, { favourite: boolean; lastUsedAt: number; useCount: number }>): number {
  const mm = meta.get(m.id);
  let s = 0;
  const b = m.brand.toLowerCase(), g = m.generic.toLowerCase();
  if (b.startsWith(q)) s += 60; else if (g.startsWith(q)) s += 50; else if (b.includes(q) || g.includes(q)) s += 20;
  if (m.brand) s += 6;
  if (mm?.favourite) s += 40;
  if (mm?.useCount) s += Math.min(30, mm.useCount * 3);
  if (m.source === 'custom') s += 8;
  return s;
}

export function useMedicineSearch(query: string, group: string = 'All', limit = 40) {
  const idx = useMedicineIndex();
  const q = useDebounced(norm(query), 100);
  return useMemo(() => {
    if (!idx) return { list: [] as Medicine[], total: 0, idx };
    const toks = q.split(' ').filter(Boolean);
    let pool = idx.all;
    if (group === 'Favourites') pool = pool.filter((m) => idx.meta.get(m.id)?.favourite);
    else if (group === 'Recent') pool = pool.filter((m) => (idx.meta.get(m.id)?.lastUsedAt || 0) > 0).sort((a, b) => (idx.meta.get(b.id)!.lastUsedAt) - (idx.meta.get(a.id)!.lastUsedAt));
    else if (group === 'Mine') pool = pool.filter((m) => m.source === 'custom' || m.source === 'import');
    else if (group !== 'All') pool = pool.filter((m) => groupsOf(m).includes(group as Group));
    let res = toks.length ? pool.filter((m) => { const b = searchBlob(m); return toks.every((t) => b.includes(t)); }) : pool;
    if (toks.length) res = [...res].sort((a, b) => rank(b, q, idx.meta) - rank(a, q, idx.meta));
    else if (group === 'All') res = [...res].sort((a, b) => ((idx.meta.get(b.id)?.useCount || 0) - (idx.meta.get(a.id)?.useCount || 0)) || a.generic.localeCompare(b.generic));
    return { list: res.slice(0, limit), total: res.length, idx };
  }, [idx, q, group, limit]);
}

export function MedRow({ m, onAdd, fav, onFav, onEdit, compact }: { m: Medicine; onAdd?: () => void; fav?: boolean; onFav?: () => void; onEdit?: () => void; compact?: boolean }) {
  const comp = compositionOf(m);
  return (
    <div className={cx('flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3', compact && 'p-2.5')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] font-extrabold">{m.brand || m.generic}</span>
          {m.brand && <span className="text-sm font-semibold text-slate-600">{m.generic}</span>}
          <SourceBadge m={m} />
        </div>
        <div className="mt-0.5 text-[13px] text-slate-600">
          <b className="text-navy">{m.strength || 'strength: set on pack'}</b> · {m.form} · {m.route}{m.manufacturer ? ` · ${m.manufacturer}` : ''}
        </div>
        {(m.ingredients.length > 1 || m.brand) && <div className="mt-0.5 text-xs text-slate-500">Composition: {comp}</div>}
        {m.category && <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal">{m.category}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {onAdd && <Btn size="sm" onClick={onAdd}><Plus size={15} /> Add</Btn>}
        <div className="flex gap-1">
          {onFav && <button onClick={onFav} aria-label="Favourite" className={cx('rounded-lg p-1.5 hover:bg-slate-100', fav ? 'text-amber-500' : 'text-slate-400')}><Star size={17} fill={fav ? 'currentColor' : 'none'} /></button>}
          {onEdit && <button onClick={onEdit} aria-label="Edit" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Custom medicine form ---------- */
export function CustomMedicineForm({ initial, onClose, onSaved }: { initial?: Partial<Medicine>; onClose: () => void; onSaved: (m: Medicine) => void }) {
  const toast = useToast();
  const [brand, setBrand] = useState(initial?.brand || '');
  const [generic, setGeneric] = useState(initial?.generic || '');
  const [ings, setIngs] = useState(initial?.ingredients?.length ? initial.ingredients : [{ name: '', strength: '' }]);
  const [form, setForm] = useState(initial?.form || 'Tablet');
  const [route, setRoute] = useState(initial?.route || 'Oral');
  const [mfr, setMfr] = useState(initial?.manufacturer || '');
  const [err, setErr] = useState('');
  const ingClean = ings.filter((i) => i.name.trim());
  const strength = ingClean.map((i) => i.strength.trim()).filter(Boolean).join(' + ');
  async function save() {
    const gen = generic.trim() || ingClean.map((i) => i.name.trim()).join(' + ');
    if (!gen) return setErr('Enter the generic name or at least one active ingredient.');
    if (!ingClean.length) { ingClean.push({ name: gen, strength: '' }); }
    const m = await saveCustomMedicine({ id: initial?.id, brand: brand.trim(), generic: gen, ingredients: ingClean.map((i) => ({ name: i.name.trim(), strength: i.strength.trim() })), strength, form, route, manufacturer: mfr.trim() });
    toast('Saved to My medicines'); onSaved(m);
  }
  return (
    <Modal title={initial?.id ? 'Edit my medicine' : 'Add custom medicine'} onClose={onClose}
      footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={save}>Save medicine</Btn></div>}>
      <div className="space-y-3">
        <div className="rounded-lg bg-amber-50 p-2.5 text-xs font-medium text-amber-900">Enter details exactly as printed on the pack. Custom entries are marked <b>unverified</b> and are remembered for next time.</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Brand name (optional)"><input className="field" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="As printed on pack" /></Field>
          <Field label="Generic name *"><input className="field" value={generic} onChange={(e) => { setGeneric(e.target.value); setErr(''); }} placeholder="e.g. Paracetamol" /></Field>
        </div>
        <div>
          <span className="lbl">Active ingredients and strength</span>
          {ings.map((g, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className="field" placeholder="Ingredient" value={g.name} onChange={(e) => setIngs(ings.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="field w-36" placeholder="e.g. 500 mg" value={g.strength} onChange={(e) => setIngs(ings.map((x, j) => (j === i ? { ...x, strength: e.target.value } : x)))} />
              {ings.length > 1 && <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setIngs(ings.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={16} /></button>}
            </div>
          ))}
          <Btn variant="ghost" size="sm" onClick={() => setIngs([...ings, { name: '', strength: '' }])}><Plus size={14} /> Add ingredient (combination)</Btn>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Dosage form"><select className="field" value={form} onChange={(e) => { setForm(e.target.value); setRoute(routeForForm(e.target.value)); }}>{FORMS.map((f) => <option key={f}>{f}</option>)}</select></Field>
          <Field label="Route"><select className="field" value={route} onChange={(e) => setRoute(e.target.value)}>{ROUTES.map((f) => <option key={f}>{f}</option>)}</select></Field>
          <Field label="Manufacturer"><input className="field" value={mfr} onChange={(e) => setMfr(e.target.value)} /></Field>
        </div>
        {err && <div className="text-sm font-semibold text-danger">{err}</div>}
      </div>
    </Modal>
  );
}

/* ---------- CSV import ---------- */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export async function importCsvMedicines(file: File): Promise<number> {
  const rows = parseCsv(await file.text());
  if (rows.length < 2) throw new Error('CSV is empty.');
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const iB = col('brand', 'brand name'), iG = col('generic', 'generic name'), iC = col('composition', 'salt', 'salts'), iS = col('strength'), iF = col('form', 'dosage form'), iR = col('route'), iM = col('manufacturer', 'company');
  if (iB < 0 && iG < 0 && iC < 0) throw new Error('CSV needs a header row with columns like: brand, generic, composition, strength, form, route, manufacturer');
  let n = 0;
  for (const r of rows.slice(1)) {
    const brand = (iB >= 0 ? r[iB] : '')?.trim() || '';
    const comp = (iC >= 0 ? r[iC] : '')?.trim() || '';
    const ingredients = comp ? comp.split(/\s*\+\s*/).map(parseComp) : (iG >= 0 && r[iG]?.trim() ? [{ name: r[iG].trim(), strength: (iS >= 0 ? r[iS] : '')?.trim() || '' }] : []);
    if (!ingredients.length) continue;
    const generic = (iG >= 0 && r[iG]?.trim()) || ingredients.map((i) => i.name).join(' + ');
    const form = (iF >= 0 && FORMS.find((f) => f.toLowerCase() === r[iF]?.trim().toLowerCase())) || 'Tablet';
    const route = (iR >= 0 && ROUTES.find((f) => f.toLowerCase() === r[iR]?.trim().toLowerCase())) || routeForForm(form);
    const m = await saveCustomMedicine({ brand, generic, ingredients, strength: (iS >= 0 && r[iS]?.trim()) || ingredients.map((i) => i.strength).filter(Boolean).join(' + '), form, route, manufacturer: (iM >= 0 ? r[iM] : '')?.trim() || '' });
    await import('../lib/db').then(({ db }) => db.medicines.put({ ...m, source: 'import' }));
    n++;
  }
  return n;
}

/* ---------- Full library modal ---------- */
export function DrugLibrary({ onClose, onPick }: { onClose: () => void; onPick?: (m: Medicine) => void }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string>('All');
  const [limit, setLimit] = useState(40);
  const [custom, setCustom] = useState<Partial<Medicine> | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const { list, total, idx } = useMedicineSearch(q, group, limit);
  const tabs = ['All', 'Favourites', 'Recent', 'Mine', ...GROUPS];
  return (
    <Modal full title={<span className="flex items-center gap-2"><Library size={18} /> Drug Library</span>} onClose={onClose}
      footer={<div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-600">{total} medicines · brand entries come from a reference list: always confirm on the pack</div>
        <div className="flex gap-2">
          <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const n = await importCsvMedicines(f); toast(`${n} medicines imported`); } catch (er: any) { toast(er.message, { tone: 'err', ms: 6000 }); } e.target.value = ''; }} />
          <Btn variant="secondary" size="sm" onClick={() => file.current?.click()}><Upload size={15} /> Import CSV</Btn>
          <Btn size="sm" onClick={() => setCustom({ generic: q.trim() })}><Plus size={15} /> Add custom medicine</Btn>
        </div>
      </div>}>
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 mb-3 border-b border-slate-200 bg-white px-4 pb-3 pt-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input autoFocus className="field pl-10" placeholder="Search brand, generic, salt, manufacturer, or type: pain killer, calcium, vitamin, muscle relaxant, antibiotic…" value={q} onChange={(e) => { setQ(e.target.value); setLimit(40); }} />
        </div>
        <div className="scroll-thin mt-2 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => <Chip key={t} active={group === t} onClick={() => { setGroup(t); setLimit(40); }} className="whitespace-nowrap">{t === 'Mine' ? 'My medicines' : t}</Chip>)}
        </div>
      </div>
      {!list.length ? (
        <Empty icon={<Search />} title="No medicine found" text="Add it as a custom medicine. It will be saved and appear in search next time."
          action={<Btn onClick={() => setCustom({ generic: q.trim() })}><Plus size={16} /> Add “{q || 'custom medicine'}”</Btn>} />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {list.map((m) => (
            <MedRow key={m.id} m={m} fav={idx?.meta.get(m.id)?.favourite} onFav={() => toggleFavourite(m.id)}
              onAdd={onPick ? () => { onPick(m); toast(`${m.brand || m.generic} added`); } : undefined}
              onEdit={m.source === 'custom' || m.source === 'import' ? () => setCustom(m) : undefined} />
          ))}
        </div>
      )}
      {total > list.length && <div className="mt-3 text-center"><Btn variant="secondary" onClick={() => setLimit(limit + 60)}>Show more ({total - list.length} left)</Btn></div>}
      {custom && <CustomMedicineForm initial={custom} onClose={() => setCustom(null)} onSaved={(m) => { setCustom(null); onPick?.(m); }} />}
    </Modal>
  );
}

/* ---------- Inline typeahead + quick chips (used in the prescription builder) ---------- */
export function MedicineSearch({ onPick }: { onPick: (m: Medicine) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [lib, setLib] = useState(false);
  const [custom, setCustom] = useState<Partial<Medicine> | null>(null);
  const { list, idx } = useMedicineSearch(q, 'All', 10);
  const quick = useMemo(() => {
    if (!idx) return { fav: [] as Medicine[], recent: [] as Medicine[] };
    const byId = new Map(idx.all.map((m) => [m.id, m]));
    const metas = [...idx.meta.values()];
    return {
      fav: metas.filter((m) => m.favourite).map((m) => byId.get(m.id)).filter(Boolean).slice(0, 12) as Medicine[],
      recent: metas.filter((m) => m.lastUsedAt && !m.favourite).sort((a, b) => b.lastUsedAt - a.lastUsedAt).map((m) => byId.get(m.id)).filter(Boolean).slice(0, 10) as Medicine[],
    };
  }, [idx]);
  const pick = (m: Medicine) => { onPick(m); setQ(''); setOpen(false); };
  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-slate-400" />
        <input className="field pl-10 pr-24" placeholder="Search medicine: brand, generic, salt or type 'pain killer', 'calcium'…" value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) { e.preventDefault(); pick(list[0]); } if (e.key === 'Escape') setOpen(false); }} />
        <button type="button" onClick={() => setLib(true)} className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-navy hover:bg-slate-200"><Library size={14} /> Library</button>
        {open && q.trim() && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div className="scroll-thin absolute left-0 right-0 top-full z-30 mt-1 max-h-[60vh] space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
              {list.map((m) => <MedRow key={m.id} m={m} compact onAdd={() => pick(m)} />)}
              <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-dashed border-brand/50 bg-brand-50 px-3 py-2.5 text-left text-sm font-bold text-brand" onClick={() => { setCustom({ generic: q.trim() }); setOpen(false); }}>
                <Plus size={16} /> Add “{q.trim()}” as custom medicine
              </button>
            </div>
          </>
        )}
      </div>
      {(quick.fav.length > 0 || quick.recent.length > 0) && (
        <div className="scroll-thin mt-2 flex gap-2 overflow-x-auto pb-1">
          {quick.fav.map((m) => <Chip key={m.id} tone="teal" onClick={() => pick(m)} className="whitespace-nowrap" title="Favourite"><Star size={12} className="mr-1 inline" fill="currentColor" />{m.brand || m.generic} {m.strength}</Chip>)}
          {quick.recent.map((m) => <Chip key={m.id} onClick={() => pick(m)} className="whitespace-nowrap">{m.brand || m.generic} {m.strength}</Chip>)}
        </div>
      )}
      {lib && <DrugLibrary onClose={() => setLib(false)} onPick={(m) => { onPick(m); }} />}
      {custom && <CustomMedicineForm initial={custom} onClose={() => setCustom(null)} onSaved={(m) => { setCustom(null); pick(m); }} />}
    </div>
  );
}
