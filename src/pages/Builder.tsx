import { ADVICE_CHIPS, shortAdvice } from '../data/advice';
import { isOrtho } from '../lib/defaults';
import BodyPicker from '../components/BodyPicker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Eye, FilePlus2, Layers, Save, ShieldCheck, Copy, FileEdit, Lock, Search, X, UserPlus, Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Clinical, Lang, Medicine, Patient, Prescription, RxItem, Side, Template } from '../lib/types';
import { blankRx, itemFromMedicine } from '../lib/defaults';
import { db, deleteDraft, duplicateRx, peekPatientId, saveDraft, touchMedicines, useSettings } from '../lib/db';
import { Badge, Btn, Card, Chip, Field, Modal, Spinner, useToast } from '../components/ui';
import { MedicineSearch } from '../components/MedicineLibrary';
import ItemEditor from '../components/ItemEditor';
import TemplatePicker from '../components/TemplatePicker';
import PreviewModal from '../components/PreviewModal';
import ReviewModal from '../components/ReviewModal';
import { checkRx, disclaimer } from '../lib/safety';
import { STARTERS } from '../data/templates';
import { cx, fmtDateTime, norm, uid } from '../lib/util';

const hasContent = (r: Prescription) => !!(r.patient.name.trim() || r.clinical.diagnosis.trim() || r.clinical.complaint.trim() || r.items.length);
const FU = [0, 3, 7, 14, 21, 28, 42, 90];
const fuLabel = (d: number) => (d === 0 ? 'None' : d % 7 === 0 ? `${d / 7} wk` : d === 90 ? '3 mo' : `${d} d`);

export default function BuilderRoute() { const l = useLocation(); return <Builder key={l.key} />; }

function Builder() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const ortho = isOrtho(settings);
  const [rx, setRx] = useState<Prescription | null>(null);
  const [rev, setRev] = useState(0);
  const [status, setStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [review, setReview] = useState(false);
  const [tplPicker, setTplPicker] = useState(false);
  const [saveTpl, setSaveTpl] = useState(false);
  const [nextPid, setNextPid] = useState('');
  const rxRef = useRef<Prescription | null>(null);
  rxRef.current = rx;
  const initRef = useRef(false);

  /* ---------- load / init ---------- */
  useEffect(() => {
    if (!settings || initRef.current) return;
    initRef.current = true;
    (async () => {
      peekPatientId().then(setNextPid);
      if (id) {
        const r = await db.prescriptions.get(id);
        if (r) { setRx(r); return; }
        toast('Prescription not found', { tone: 'err' }); nav('/', { replace: true }); return;
      }
      const r = blankRx(settings.defaultClinicId, settings.defaultLang, settings.defaultFollowUpDays);
      const pid = sp.get('patient'); const tid = sp.get('template'); const mid = sp.get('med');
      if (pid) { const p = await db.patients.get(pid); if (p) { r.patient = { ...p }; r.patientId = p.id; } }
      if (tid) { const t = await db.templates.get(tid); if (t) applyTpl(r, t); }
      if (mid) {
        const idx = [...(await db.medicines.toArray())]; const { CATALOGUE } = await import('../data/catalogue');
        const m = [...idx, ...CATALOGUE].find((x) => x.id === mid);
        if (m) r.items.push(itemFromMedicine(m));
      }
      setRx(r);
      if (tid || pid || mid) setRev(1);
    })();
  }, [settings]); // eslint-disable-line

  const readOnly = rx?.status === 'final';
  const update = useCallback((fn: (r: Prescription) => Prescription) => { setRx((r) => (r ? fn(r) : r)); setRev((v) => v + 1); setStatus('idle'); }, []);

  /* ---------- autosave ---------- */
  useEffect(() => {
    if (!rx || readOnly || rev === 0) return;
    const h = setTimeout(async () => {
      const cur = rxRef.current; if (!cur || !hasContent(cur)) return;
      setStatus('saving');
      try {
        const out = await saveDraft(cur);
        setRx((r) => (r && r.id === out.id ? { ...r, patient: { ...r.patient, pid: out.patient.pid }, patientId: out.patientId } : r));
        setStatus('saved');
        if (!id && window.location.hash.indexOf('/rx/') < 0) window.history.replaceState(null, '', `#/rx/${out.id}`);
      } catch (e: any) { toast(e.message, { tone: 'err' }); }
    }, 700);
    return () => clearTimeout(h);
  }, [rev]); // eslint-disable-line
  useEffect(() => {
    const flush = () => { const cur = rxRef.current; if (cur && cur.status === 'draft' && hasContent(cur)) saveDraft(cur).catch(() => {}); };
    const vis = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', vis); window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', flush); flush(); };
  }, []);

  /* follow-up date follows the longest medicine duration unless the doctor sets it by hand */
  useEffect(() => {
    if (!rx || readOnly || rx.followUpManual) return;
    const days = Math.max(0, ...rx.items.filter((i) => i.freq !== 'SOS' || i.duration).map((i) => (i.useTaper ? i.taper.reduce((a, t) => a + t.days, 0) : (i.duration || 0) * (i.durationUnit === 'weeks' ? 7 : i.durationUnit === 'months' ? 30 : 1))));
    if (days > 0 && days !== rx.followUpDays) update((r) => ({ ...r, followUpDays: Math.min(days, 90) }));
  }, [rx?.items]); // eslint-disable-line

  /* ---------- helpers ---------- */
  function applyTpl(r: Prescription, t: Template) {
    r.clinical = { ...r.clinical, complaint: t.clinical.complaint, diagnosis: t.clinical.diagnosis, side: t.clinical.side, examination: t.clinical.examination, investigations: t.clinical.investigations, advice: shortAdvice(t.clinical.advice) };
    r.followUpDays = t.followUpDays;
    if (t.items.length) r.items = [...r.items, ...t.items.map((i) => ({ ...i, id: uid() }))];
  }
  const setPatient = (p: Partial<Patient>) => update((r) => ({ ...r, patient: { ...r.patient, ...p } }));
  const setClin = (c: Partial<Clinical>) => update((r) => ({ ...r, clinical: { ...r.clinical, ...c } }));
  const warnings = useMemo(() => (rx ? checkRx(rx) : []), [rx]);

  async function addMedicine(m: Medicine) {
    const it = itemFromMedicine(m);
    try { const mm = m.id ? await db.meta.get(m.id) : undefined; if (mm?.reg) Object.assign(it, mm.reg); } catch { /* ignore */ }
    update((r) => ({ ...r, items: [...r.items, it] }));
    setOpenItem(it.id);
    if (m.source === 'catalogue' || m.source === 'brand') touchMedicines([{ ...it, medId: m.id }]).catch(() => {});
  }
  function removeItem(it: RxItem) {
    update((r) => ({ ...r, items: r.items.filter((x) => x.id !== it.id) }));
    toast(`${it.brand || it.generic} removed`, { action: { label: 'Undo', onClick: () => update((r) => ({ ...r, items: [...r.items, it] })) } });
  }
  function move(i: number, d: -1 | 1) { update((r) => { const a = [...r.items]; const j = i + d; if (j < 0 || j >= a.length) return r; [a[i], a[j]] = [a[j], a[i]]; return { ...r, items: a }; }); }
  function pickTemplate(t: Template) {
    const prev = rx!;
    update((r) => { const c = JSON.parse(JSON.stringify(r)); applyTpl(c, t); return c; });
    setTplPicker(false);
    toast(`Template applied: ${t.name}${t.items.length ? '. Review the medicines.' : ''}`, { action: { label: 'Undo', onClick: () => update(() => prev) } });
  }
  async function discard() { if (rx && rx.status === 'draft') { await deleteDraft(rx.id); toast('Draft discarded'); nav('/'); } }
  async function dupe(amend: boolean) { if (!rx) return; const c = await duplicateRx(rx.id, amend); toast(amend ? 'New version created as draft' : 'Duplicated as draft'); nav(`/rx/${c.id}`); }

  if (!rx || !settings) return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  const clinicOptions = settings.clinics;
  const p = rx.patient;
  const itemWarn = (id: string) => warnings.filter((w) => w.itemId === id);
  const topWarn = warnings.filter((w) => w.level !== 'info' && !w.itemId);
  const itemWarnAll = warnings.filter((w) => w.level !== 'info' && w.itemId);
  const unsetProfile = !settings.doctor.fullName.trim() || !settings.doctor.regNo.trim();

  return (
    <div className="mx-auto max-w-7xl p-3 pb-32 sm:p-5 md:pb-28">
      {/* top bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-extrabold sm:text-2xl">{readOnly ? <span className="flex items-center gap-2"><Lock size={20} className="text-teal" /> {rx.rxNo}</span> : 'New Prescription'}</h1>
        {!readOnly && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            {status === 'saving' ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : status === 'saved' ? <><Check size={14} className="text-teal" /> Draft saved</> : hasContent(rx) ? 'Autosave on' : 'Nothing to save yet'}
          </span>
        )}
        {!readOnly && clinicOptions.length > 1 && (
          <select className="field !w-auto !py-1.5 text-sm" value={rx.clinicId} onChange={(e) => update((r) => ({ ...r, clinicId: e.target.value }))} aria-label="Clinic">
            {clinicOptions.map((c) => <option key={c.id} value={c.id}>{c.name || 'Unnamed clinic'}</option>)}
          </select>
        )}
        {!readOnly && (
          <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-0.5" role="group" aria-label="Patient instruction language">
            {([['en', 'English'], ['hi', 'हिंदी']] as [Lang, string][]).map(([v, l]) => (
              <button key={v} onClick={() => update((r) => ({ ...r, lang: v }))} className={cx('rounded-md px-2.5 py-1 text-xs font-bold', (rx.lang === v || (v === 'hi' && rx.lang === 'both')) ? 'bg-navy text-white' : 'text-slate-600')}>{l}</button>
            ))}
          </div>
        )}
        {!readOnly && (
          <label className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600"><input type="checkbox" checked={rx.showInstr !== false} onChange={(e) => update((r) => ({ ...r, showInstr: e.target.checked }))} /> Instruction line</label>
        )}
        {!readOnly && <Btn variant="secondary" size="sm" onClick={() => setTplPicker(true)}><Layers size={16} /> Template</Btn>}
      </div>

      {unsetProfile && !readOnly && (
        <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
          Doctor name and registration number are required to authorise a prescription. <button className="underline" onClick={() => nav('/settings')}>Complete profile</button>
        </div>
      )}
      {readOnly && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-teal/30 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700">
          <ShieldCheck size={18} /> Authorised {rx.authorizedAt ? fmtDateTime(rx.authorizedAt) : ''} · locked{rx.version > 1 ? ` · version ${rx.version}` : ''}
          <span className="ml-auto flex flex-wrap gap-2">
            <Btn size="sm" onClick={() => setPreview(true)}><Eye size={15} /> View / share PDF</Btn>
            <Btn size="sm" variant="secondary" onClick={() => dupe(false)}><Copy size={15} /> Duplicate as draft</Btn>
            <Btn size="sm" variant="secondary" onClick={() => dupe(true)}><FileEdit size={15} /> Amend (new version)</Btn>
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <PatientCard p={p} nextPid={nextPid} readOnly={!!readOnly} setPatient={setPatient} onPick={(pt) => update((r) => ({ ...r, patient: { ...pt }, patientId: pt.id }))} onClear={() => update((r) => ({ ...r, patient: { ...blankRxPatient(), id: uid() }, patientId: '' }))} />
          {ortho && <Card className="p-4">
            <div className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">Site of complaint</div>
            <BodyPicker clin={rx.clinical} set={setClin} readOnly={!!readOnly} />
          </Card>}
          <Card className="p-4">
            <fieldset disabled={readOnly} className="space-y-3">
              <div className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Clinical details</div>
              <Field label="Chief complaint"><input className="field" value={rx.clinical.complaint} onChange={(e) => setClin({ complaint: e.target.value })} placeholder="e.g. Pain in right knee for 3 months" /></Field>
              <Field label="Diagnosis"><input list="dx-list" className="field" value={rx.clinical.diagnosis} onChange={(e) => setClin({ diagnosis: e.target.value })} placeholder="Start typing…" /></Field>
              <Field label="Comorbidities (optional)"><input className="field" value={rx.clinical.comorbidities || ''} onChange={(e) => setClin({ comorbidities: e.target.value })} placeholder="e.g. Diabetes, Hypertension, Anaemia" /></Field>
              <datalist id="dx-list">{(ortho ? STARTERS : []).map((s) => <option key={s.key} value={s.clinical.diagnosis} />)}</datalist>
              {ortho && <div>
                <span className="lbl">Side</span>
                <div className="flex flex-wrap gap-2">{(['Left', 'Right', 'Bilateral', 'N/A'] as Side[]).map((s) => <Chip key={s} active={rx.clinical.side === s} onClick={() => setClin({ side: s })}>{s}</Chip>)}</div>
              </div>}
              <PrintField label="Examination findings" value={rx.clinical.examination} onChange={(v) => setClin({ examination: v })} on={rx.print.examination} setOn={(b) => update((r) => ({ ...r, print: { ...r.print, examination: b } }))} />
              <PrintField label="Investigations" value={rx.clinical.investigations} onChange={(v) => setClin({ investigations: v })} on={rx.print.investigations} setOn={(b) => update((r) => ({ ...r, print: { ...r.print, investigations: b } }))} />
              <PrintField label="Clinical notes (private by default)" value={rx.clinical.notes} onChange={(v) => setClin({ notes: v })} on={rx.print.notes} setOn={(b) => update((r) => ({ ...r, print: { ...r.print, notes: b } }))} />
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={rx.print.complaint} onChange={(e) => update((r) => ({ ...r, print: { ...r.print, complaint: e.target.checked } }))} /> Print chief complaint on prescription</label>
            </fieldset>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between"><div className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Medicines {rx.items.length > 0 && <span className="ml-1 rounded-full bg-navy px-2 py-0.5 text-xs text-white">{rx.items.length}</span>}</div></div>
            {!readOnly && <MedicineSearch onPick={addMedicine} />}
            {(topWarn.length > 0 || itemWarnAll.length > 0) && (
              <div className="mt-3 space-y-1.5">
                {[...topWarn, ...itemWarnAll].map((w, i) => (
                  <div key={i} className={cx('rounded-lg px-3 py-2 text-[13px] font-semibold', w.level === 'danger' ? 'bg-danger-50 text-danger' : 'bg-amber-50 text-amber-900')}>{w.text}</div>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-2.5">
              {rx.items.map((it, i) => (
                <ItemEditor key={it.id} it={it} index={i} total={rx.items.length} open={openItem === it.id} onToggle={() => setOpenItem(openItem === it.id ? null : it.id)}
                  onChange={(n) => update((r) => ({ ...r, items: r.items.map((x) => (x.id === n.id ? n : x)) }))} onRemove={() => removeItem(it)} onMove={(d) => move(i, d)}
                  lang={rx.lang} warnings={itemWarn(it.id)} readOnly={!!readOnly} caps={settings.layout.genericCaps} nameMode={settings.layout.nameDisplay} />
              ))}
              {!rx.items.length && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm font-medium text-slate-500">No medicines yet. Search above, tap a favourite, or open the Library.</div>}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{disclaimer}</p>
          </Card>

          <Card className="p-4">
            <fieldset disabled={readOnly} className="space-y-3">
              <Field label="Advice (one point per line, 2-3 short points are enough)">
                <textarea className="field min-h-[110px]" value={rx.clinical.advice.join('\n')} onChange={(e) => setClin({ advice: e.target.value.split('\n') })} placeholder={'Rest\nPhysiotherapy as advised\nHot fomentation'} />
                {!readOnly && ortho && <div className="mt-2 flex flex-wrap gap-1.5">{ADVICE_CHIPS.filter((x) => !rx.clinical.advice.includes(x)).map((x) => <Chip key={x} onClick={() => setClin({ advice: [...rx.clinical.advice.filter((l) => l.trim()), x] })}>+ {x}</Chip>)}</div>}
              </Field>
              <Field label="Tests to bring on next visit (optional)"><input className="field" value={rx.clinical.nextTests || ''} onChange={(e) => setClin({ nextTests: e.target.value })} placeholder="e.g. CBC, ESR" /></Field>
              <div>
                <span className="lbl">Next visit {rx.followUpManual ? <button className="ml-1 text-xs font-bold text-brand underline" onClick={() => update((r) => ({ ...r, followUpManual: false }))}>use medicine duration</button> : <span className="text-xs font-semibold normal-case text-slate-400">(auto from medicine duration)</span>}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {FU.map((d) => <Chip key={d} tone="teal" active={rx.followUpDays === d} onClick={() => update((r) => ({ ...r, followUpDays: d, followUpManual: true }))}>{fuLabel(d)}</Chip>)}
                  <input type="number" min="0" className="field w-24" value={rx.followUpDays || ''} placeholder="days" onChange={(e) => update((r) => ({ ...r, followUpDays: Number(e.target.value) || 0, followUpManual: true }))} aria-label="Custom follow-up days" />
                </div>
              </div>
              <Field label="QR on prescription: patient education link (optional)"><input className="field" value={rx.qrUrl ?? (settings?.clinics.find((c) => c.id === rx.clinicId)?.qrUrl || settings?.doctor.qrUrl) ?? ''} onChange={(e) => update((r) => ({ ...r, qrUrl: e.target.value }))} placeholder="Paste a condition-guide link, leave empty for no QR" /></Field>
            </fieldset>
          </Card>
        </div>
      </div>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          {!readOnly ? (
            <>
              <Btn variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={discard}><X size={15} /> Discard</Btn>
              <Btn variant="ghost" size="sm" className="hidden sm:inline-flex" disabled={!hasContent(rx)} onClick={() => setSaveTpl(true)}><Save size={15} /> Save as template</Btn>
              <span className="mr-auto" />
              <Btn variant="secondary" onClick={() => setPreview(true)}><Eye size={17} /> Preview</Btn>
              <Btn variant="success" onClick={() => setReview(true)}><ShieldCheck size={17} /> Review & finalize</Btn>
            </>
          ) : (
            <><span className="mr-auto" /><Btn onClick={() => setPreview(true)}><Eye size={17} /> View / share PDF</Btn></>
          )}
        </div>
      </div>

      {tplPicker && <TemplatePicker onClose={() => setTplPicker(false)} onPick={pickTemplate} />}
      {preview && <PreviewModal rx={rx} onClose={() => setPreview(false)} onFinalize={!readOnly ? () => { setPreview(false); setReview(true); } : undefined} />}
      {review && <ReviewModal rx={rx} settings={settings} onClose={() => setReview(false)} onChangeToggles={(t) => update((r) => ({ ...r, toggles: t }))}
        onDone={(done) => { setReview(false); setRx(done); window.history.replaceState(null, '', `#/rx/${done.id}`); setPreview(true); }} />}
      {saveTpl && <SaveTemplateModal rx={rx} onClose={() => setSaveTpl(false)} />}
    </div>
  );
}

const blankRxPatient = (): Patient => ({ id: '', pid: '', name: '', age: '', ageUnit: 'Y', sex: '', phone: '', weight: '', allergies: '', createdAt: Date.now(), updatedAt: Date.now() });

function PrintField({ label, value, onChange, on, setOn }: { label: string; value: string; onChange: (v: string) => void; on: boolean; setOn: (b: boolean) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between"><span className="lbl !mb-0">{label}</span>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Print</label></div>
      <textarea className="field min-h-[56px]" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PatientCard({ p, nextPid, readOnly, setPatient, onPick, onClear }: { p: Patient; nextPid: string; readOnly: boolean; setPatient: (p: Partial<Patient>) => void; onPick: (p: Patient) => void; onClear: () => void }) {
  const [q, setQ] = useState('');
  const all = useLiveQuery(() => db.patients.orderBy('updatedAt').reverse().toArray(), []) || [];
  const matches = q.trim() ? all.filter((x) => norm(`${x.name} ${x.phone} ${x.pid}`).includes(norm(q))).slice(0, 6) : [];
  return (
    <Card className="p-4">
      <fieldset disabled={readOnly} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Patient</div>
          <div className="flex items-center gap-2"><Badge tone="blue">{p.pid || nextPid || 'P-…'}{!p.pid && ' (new)'}</Badge>
            {p.pid && !readOnly && <button className="flex items-center gap-1 text-xs font-bold text-brand" onClick={onClear}><UserPlus size={13} /> New patient</button>}</div>
        </div>
        {!readOnly && !p.pid && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input className="field pl-9" placeholder="Search existing patient (name / phone / ID)" value={q} onChange={(e) => setQ(e.target.value)} />
            {matches.length > 0 && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {matches.map((m) => <button key={m.id} className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-brand-50" onClick={() => { onPick(m); setQ(''); }}><span className="text-sm font-bold">{m.name}</span><span className="text-xs text-slate-500">{m.age}{m.ageUnit} · {m.sex} · {m.phone || m.pid}</span></button>)}
              </div>
            )}
          </div>
        )}
        <Field label="Patient name *"><input className="field" value={p.name} onChange={(e) => setPatient({ name: e.target.value })} placeholder="Full name" autoComplete="off" /></Field>
        <div className="grid grid-cols-5 gap-2">
          <Field label="Age" className="col-span-2"><div className="flex gap-1"><input type="number" min="0" className="field" value={p.age} onChange={(e) => setPatient({ age: e.target.value })} inputMode="numeric" />
            <select className="field !w-16 !px-1" value={p.ageUnit} onChange={(e) => setPatient({ ageUnit: e.target.value as 'Y' | 'M' })}><option value="Y">Y</option><option value="M">M</option></select></div></Field>
          <div className="col-span-3"><span className="lbl">Sex</span><div className="flex gap-1.5">{(['Male', 'Female', 'Other'] as const).map((s) => <Chip key={s} className="flex-1 !px-2" active={p.sex === s} onClick={() => setPatient({ sex: s })}>{s}</Chip>)}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Phone"><input className="field" type="tel" inputMode="tel" value={p.phone} onChange={(e) => setPatient({ phone: e.target.value })} placeholder="10-digit mobile" /></Field>
          <Field label="Weight (kg)"><input className="field" type="number" min="0" inputMode="decimal" value={p.weight} onChange={(e) => setPatient({ weight: e.target.value })} /></Field>
        </div>
        <Field label="Known allergies">
          <input className="field" value={p.allergies} onChange={(e) => setPatient({ allergies: e.target.value })} placeholder="e.g. Penicillin, NSAIDs" />
          <div className="mt-1.5"><Chip tone="teal" active={/^no known/i.test(p.allergies)} onClick={() => setPatient({ allergies: /^no known/i.test(p.allergies) ? '' : 'No known drug allergies' })}>No known allergies</Chip></div>
        </Field>
      </fieldset>
    </Card>
  );
}

function SaveTemplateModal({ rx, onClose }: { rx: Prescription; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(rx.clinical.diagnosis || '');
  const [withMeds, setWithMeds] = useState(false);
  async function save() {
    if (!name.trim()) return;
    const now = Date.now();
    await db.templates.put({ id: 'tpl-' + uid(), name: name.trim(), builtIn: false, icon: 'bone', favourite: false, clinical: { ...rx.clinical, notes: '', advice: rx.clinical.advice.filter(Boolean) }, followUpDays: rx.followUpDays, items: withMeds ? rx.items.map((i) => ({ ...i, id: uid() })) : [], createdAt: now, updatedAt: now });
    toast('Saved to My Templates'); onClose();
  }
  return (
    <Modal title="Save as my template" onClose={onClose} footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={!name.trim()}>Save template</Btn></div>}>
      <div className="space-y-3">
        <Field label="Template name"><input autoFocus className="field" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" className="mt-1" checked={withMeds} onChange={(e) => setWithMeds(e.target.checked)} /> Include the {rx.items.length} medicine(s) with doses (you will still review them each time)</label>
        <p className="text-xs text-slate-500">Patient details and private clinical notes are never saved into a template.</p>
      </div>
    </Modal>
  );
}
export { FilePlus2 };
