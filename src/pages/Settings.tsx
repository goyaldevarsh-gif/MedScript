import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, Building2, Cloud, Download, Eye, FileSignature, Layout as LayoutIcon, Pill, Plus, Smartphone, Star, Trash2, Upload, User, Stamp, Languages, Check, AlertTriangle, ShieldAlert, Printer } from 'lucide-react';
import type { AppSettings, Clinic, Doctor, Lang, Prescription } from '../lib/types';
import { db, exportAll, importAll, toggleFavourite, updateSettings, useMedicineIndex, useSettings, wipeAll } from '../lib/db';
import OvLinkCard from '../components/OvLinkCard';
import { Badge, Btn, Card, Chip, Field, Modal, Spinner, useToast } from '../components/ui';
import SignaturePad from '../components/SignaturePad';
import { DrugLibrary, MedRow } from '../components/MedicineLibrary';
import SampleRx from '../components/SampleRx';
import { chooseSpecialty } from '../components/SpecialtyPicker';
import { SPECIALTIES } from '../lib/defaults';
import { cleanStamp, rotateDataUrl, cleanSignature, fileToDataUrl, trimLogo, renderSeal, sealPossible, sealAspect } from '../lib/imaging';
import { blankRx, itemFromMedicine, newClinic } from '../lib/defaults';
import { CATALOGUE } from '../data/catalogue';
import { cx, download, fmtDateTime } from '../lib/util';
import { useInstall, useUpdate } from '../lib/pwa';
import { useLiveQuery } from 'dexie-react-hooks';

const TABS = [
  { k: 'doctor', l: 'Doctor profile', i: User }, { k: 'clinic', l: 'Clinic profile', i: Building2 }, { k: 'sign', l: 'Signature & seal', i: FileSignature },
  { k: 'layout', l: 'Prescription layout', i: LayoutIcon }, { k: 'lang', l: 'Default language', i: Languages }, { k: 'favs', l: 'Favourite medicines', i: Pill },
  { k: 'backup', l: 'Backup & restore', i: Cloud }, { k: 'app', l: 'Application', i: Smartphone },
] as const;

export default function SettingsPage() {
  const s = useSettings();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'doctor';
  if (!s) return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-extrabold">Settings</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[230px_minmax(0,1fr)]">
        <nav className="scroll-thin flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => setSp({ tab: t.k }, { replace: true })} className={cx('flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition', tab === t.k ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-slate-100 md:bg-transparent')}>
              <t.i size={17} /> {t.l}
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-4">
          {tab === 'doctor' && <DoctorCard s={s} />}
          {tab === 'clinic' && <ClinicsCard s={s} />}
          {tab === 'sign' && <><SignatureCard s={s} /><SealCard s={s} /><SamplePreview /></>}
          {tab === 'layout' && <LayoutCard s={s} />}
          {tab === 'lang' && <LangCard s={s} />}
          {tab === 'favs' && <FavCard />}
          {tab === 'backup' && <BackupCard s={s} />}
          {tab === 'app' && <><OvLinkCard s={s} /><AppCard /></>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Doctor ---------------- */
function DoctorCard({ s }: { s: AppSettings }) {
  const toast = useToast();
  const [d, setD] = useState<Doctor>(s.doctor);
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (x: Partial<Doctor>) => setD({ ...d, ...x });
  useEffect(() => { setD((cur) => (cur.specialty === s.doctor.specialty ? cur : { ...cur, specialty: s.doctor.specialty })); }, [s.doctor.specialty]);
  const dirty = JSON.stringify(d) !== JSON.stringify(s.doctor);
  async function save() {
    const e: Record<string, string> = {};
    if (!d.fullName.trim()) e.fullName = 'Full name is required';
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) e.email = 'Enter a valid email';
    if (d.phone && d.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid phone number';
    setErr(e); if (Object.keys(e).length) return;
    await updateSettings((x) => { x.doctor = { ...d, fullName: d.fullName.trim(), regNo: d.regNo.trim() }; });
    toast('Doctor profile saved');
  }
  const E = ({ k }: { k: string }) => (err[k] ? <span className="mt-1 block text-xs font-semibold text-danger">{err[k]}</span> : null);
  return (
    <Card className="space-y-4 p-5">
      <div><h2 className="text-lg font-extrabold">Doctor profile</h2><p className="text-sm text-slate-600">Printed on every prescription. Enter exactly as registered. MedScript never fills registration details for you.</p></div>
      <div>
        <span className="lbl">I practise</span>
        <div className="flex flex-wrap gap-2">{SPECIALTIES.map((x) => <Chip key={x.key} active={(s.specialtyKey || 'ortho') === x.key} onClick={async () => { await chooseSpecialty(x.key); toast('Specialty set: ' + x.label); }}>{x.label}</Chip>)}</div>
        <p className="mt-1 text-xs font-medium text-slate-500">Ortho: body-site, side, ortho templates and advice. Others: simple Rx form.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name *"><input className="field" value={d.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="e.g. Anita Sharma" /><E k="fullName" /></Field>
        <Field label="Qualifications"><input className="field" value={d.qualifications} onChange={(e) => set({ qualifications: e.target.value })} placeholder="e.g. MBBS, MS (Orthopaedics)" /></Field>
        <Field label="Specialty"><input className="field" value={d.specialty} onChange={(e) => set({ specialty: e.target.value })} placeholder="e.g. Orthopaedic Surgeon" /></Field>
        <Field label="Medical registration number *" hint="Mandatory on every prescription under NMC regulations"><input className="field" value={d.regNo} onChange={(e) => set({ regNo: e.target.value })} /></Field>
        <Field label="Registering council" hint="e.g. State Medical Council name"><input className="field" value={d.regCouncil} onChange={(e) => set({ regCouncil: e.target.value })} /></Field>
        <PhonesField label="Your mobile number(s)" primary={d.phone} more={d.morePhones} onChange={(p, m) => set({ phone: p, morePhones: m })} /><E k="phone" />
        <Field label="Email (optional)"><input type="email" className="field" value={d.email} onChange={(e) => set({ email: e.target.value })} /><E k="email" /></Field>
        <Field label="QR link for all prescriptions (optional)" hint="Printed as a small QR on every Rx. A clinic-specific or per-Rx link overrides it." className="sm:col-span-2"><input className="field" value={d.qrUrl || ''} onChange={(e) => set({ qrUrl: e.target.value.trim() })} placeholder="https://… (website, WhatsApp, Google review, patient guide)" /></Field>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-500">{!d.regNo.trim() && <span className="flex items-center gap-1 text-amber-700"><AlertTriangle size={13} /> Registration number is needed before you can authorise prescriptions.</span>}</div>
        <Btn onClick={save} disabled={!dirty}>Save profile</Btn>
      </div>
    </Card>
  );
}

/* ---------------- shared: several mobile numbers ---------------- */
function PhonesField({ label, primary, more, onChange }: { label: string; primary: string; more?: string[]; onChange: (primary: string, more: string[]) => void }) {
  const list = [primary, ...(more || [])];
  const set = (i: number, v: string) => { const n = [...list]; n[i] = v; onChange(n[0], n.slice(1)); };
  return (
    <div className="sm:col-span-2">
      <span className="lbl">{label}</span>
      <div className="space-y-2">
        {list.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-2 text-sm font-bold text-slate-500">+91</span>
            <input type="tel" inputMode="tel" className="field" value={v} onChange={(e) => set(i, e.target.value)} placeholder="10-digit mobile number" />
            {i > 0 && <button className="text-sm font-bold text-danger" onClick={() => { const n = list.filter((_, k) => k !== i); onChange(n[0], n.slice(1)); }} aria-label="Remove number">Remove</button>}
          </div>
        ))}
        <button className="text-sm font-bold text-brand underline" onClick={() => onChange(list[0], [...list.slice(1), ''])}>+ Add another number</button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Prints as +91-XXXXXXXXXX. Landline numbers print as you type them (with STD code).</p>
    </div>
  );
}

/* ---------------- Clinics ---------------- */
function ClinicsCard({ s }: { s: AppSettings }) {
  const toast = useToast();
  return (
    <>
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">Clinic profiles</h2><p className="text-sm text-slate-600">Add every clinic or hospital you practise at, and pick one on each prescription.</p></div>
        <Btn variant="secondary" onClick={async () => { await updateSettings((x) => { x.clinics.push(newClinic('')); }); toast('Clinic added'); }}><Plus size={16} /> Add clinic</Btn></div>
      {s.clinics.map((c) => <ClinicEditor key={c.id} c={c} isDefault={c.id === s.defaultClinicId} canDelete={s.clinics.length > 1} />)}
    </>
  );
}
function ClinicEditor({ c, isDefault, canDelete }: { c: Clinic; isDefault: boolean; canDelete: boolean }) {
  const toast = useToast();
  const [d, setD] = useState(c);
  const file = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(d) !== JSON.stringify(c);
  const set = (x: Partial<Clinic>) => setD({ ...d, ...x });
  async function logo(f?: File) {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please choose an image file', { tone: 'err' });
    set({ logo: await trimLogo(await fileToDataUrl(f)) });
  }
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2"><span className="font-extrabold">{c.name || 'New clinic'}</span>{isDefault && <Badge tone="blue">Default</Badge>}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Clinic / hospital name"><input className="field" value={d.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <PhonesField label="Clinic phone / mobile number(s)" primary={d.phone} more={d.morePhones} onChange={(p, m) => set({ phone: p, morePhones: m })} />
        <Field label="Address" className="sm:col-span-2"><textarea className="field" rows={2} value={d.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Field label="Email"><input className="field" type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Timings (optional)"><input className="field" value={d.timings} onChange={(e) => set({ timings: e.target.value })} placeholder="e.g. Mon-Sat 4-7 PM" /></Field>
        <Field label="WhatsApp for patient queries (optional)"><input className="field" type="tel" value={d.whatsapp || ''} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="Printed as: For any problem, WhatsApp …" /></Field>
        <Field label="Patient education link for QR (optional)" className="sm:col-span-2"><input className="field" value={d.qrUrl || ''} onChange={(e) => set({ qrUrl: e.target.value })} placeholder="https://… (printed as a small QR: scan to learn about your condition)" /></Field>
        <Field label="Appointment note (optional)" className="sm:col-span-2"><textarea className="field" rows={2} value={d.appointmentNote || ''} onChange={(e) => set({ appointmentNote: e.target.value })} placeholder="e.g. Call 7 days before the follow-up date to confirm your appointment. Booking time 11 AM - 4 PM." /></Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-1">{d.logo ? <img src={d.logo} alt="Clinic logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs font-semibold text-slate-400">No logo</span>}</div>
        <input ref={file} hidden type="file" accept="image/*" onChange={(e) => { logo(e.target.files?.[0]); e.target.value = ''; }} />
        <Btn variant="secondary" size="sm" onClick={() => file.current?.click()}><Upload size={15} /> {d.logo ? 'Replace logo' : 'Upload logo'}</Btn>
        {d.logo && <Btn variant="ghost" size="sm" onClick={async () => { set({ logo: await trimLogo(d.logo) }); toast('Empty space around the logo removed'); }}>Crop empty space</Btn>}
        {d.logo && <Btn variant="ghost" size="sm" onClick={() => set({ logo: '' })}>Remove logo</Btn>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Logo size on prescription</span>
        {([['S', 'Small'], ['M', 'Medium'], ['L', 'Large']] as const).map(([v, l]) => <Chip key={v} active={(d.logoSize || 'M') === v} onClick={() => set({ logoSize: v })}>{l}</Chip>)}
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <label className="flex items-start gap-2 text-sm font-bold"><input type="checkbox" className="mt-1" checked={!!d.letterhead?.on} onChange={(e) => set({ letterhead: { top: 45, bottom: 25, ...d.letterhead, on: e.target.checked } })} />
          <span>Print on my own letterhead<span className="block text-xs font-medium text-slate-600">For clinics with a pre-printed pad. The clinic header, logo and footer are left blank so nothing prints over your letterhead. Doctor name, qualification and registration number still print above the signature.</span></span></label>
        {d.letterhead?.on && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <Field label="Blank space at top (mm)"><select className="field" value={d.letterhead.top} onChange={(e) => set({ letterhead: { ...d.letterhead!, top: Number(e.target.value) } })}>{Array.from({ length: 19 }, (_, i) => 10 + i * 5).map((n) => <option key={n} value={n}>{n} mm</option>)}</select></Field>
              <Field label="Blank space at bottom (mm)"><select className="field" value={d.letterhead.bottom} onChange={(e) => set({ letterhead: { ...d.letterhead!, bottom: Number(e.target.value) } })}>{Array.from({ length: 13 }, (_, i) => i * 5).map((n) => <option key={n} value={n}>{n} mm</option>)}</select></Field>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn variant="secondary" size="sm" onClick={async () => { const { letterheadTestPdf } = await import('../lib/pdf'); const b = await letterheadTestPdf(d.letterhead!.top, d.letterhead!.bottom, d.name); const { printBlob } = await import('../lib/share'); printBlob(b); }}><Printer size={15} /> Print test page</Btn>
              <span className="text-xs font-medium text-slate-600">Measure your printed header with a ruler, or print the test page on your pad and adjust until the red lines sit just outside your printed header and footer. Typical: 40-55 mm top, 15-25 mm bottom.</span>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex gap-2">
          {!isDefault && <Btn variant="secondary" size="sm" onClick={async () => { await updateSettings((x) => { x.defaultClinicId = c.id; }); toast('Set as default'); }}>Make default</Btn>}
          {canDelete && <Btn variant="danger" size="sm" onClick={async () => { await updateSettings((x) => { x.clinics = x.clinics.filter((k) => k.id !== c.id); if (x.defaultClinicId === c.id) x.defaultClinicId = x.clinics[0].id; }); toast('Clinic removed (past prescriptions keep their copy)'); }}><Trash2 size={14} /> Remove</Btn>}
        </div>
        <Btn disabled={!dirty} onClick={async () => { await updateSettings((x) => { x.clinics = x.clinics.map((k) => (k.id === c.id ? d : k)); }); toast('Clinic saved'); }}>Save clinic</Btn>
      </div>
    </Card>
  );
}

/* ---------------- Signature ---------------- */
const checker = 'bg-[repeating-conic-gradient(#eef2f7_0%_25%,#fff_0%_50%)] [background-size:16px_16px]';
function SignatureCard({ s }: { s: AppSettings }) {
  const toast = useToast();
  const sig = s.signature;
  const [pad, setPad] = useState(false);
  const [removeWhite, setRemoveWhite] = useState(true);
  const file = useRef<HTMLInputElement>(null);
  const patch = (x: Partial<AppSettings['signature']>) => updateSettings((c) => { c.signature = { ...c.signature, ...x }; });
  async function upload(f?: File) {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please choose an image (PNG preferred)', { tone: 'err' });
    try { await patch({ dataUrl: await cleanSignature(await fileToDataUrl(f), removeWhite), source: 'upload' }); toast('Signature saved'); }
    catch { toast('Could not read that image', { tone: 'err' }); }
  }
  return (
    <Card className="space-y-4 p-5">
      <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><FileSignature size={19} /> Digital signature</h2>
        <p className="text-sm text-slate-600">Upload your own signature image or draw it. It is only applied when <b>you</b> authorise a prescription, never to drafts.</p></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className={cx('flex h-36 items-center justify-center rounded-xl border border-slate-200', checker)}>{sig.dataUrl ? <img src={sig.dataUrl} alt="Signature preview" className="max-h-28 max-w-[90%] object-contain" /> : <span className="text-sm font-semibold text-slate-400">No signature added</span>}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input ref={file} hidden type="file" accept="image/png,image/jpeg,image/*" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
            <Btn variant="secondary" size="sm" onClick={() => file.current?.click()}><Upload size={15} /> {sig.dataUrl ? 'Replace: upload' : 'Upload image'}</Btn>
            <Btn variant="secondary" size="sm" onClick={() => setPad(true)}><FileSignature size={15} /> {sig.dataUrl ? 'Replace: draw' : 'Draw signature'}</Btn>
            {sig.dataUrl && <Btn variant="danger" size="sm" onClick={async () => { await patch({ dataUrl: '', source: '' }); toast('Signature removed'); }}><Trash2 size={14} /> Remove</Btn>}
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={removeWhite} onChange={(e) => setRemoveWhite(e.target.checked)} /> Remove white background when uploading (for photos / scans)</label>
        </div>
        <div className="space-y-3">
          <Slider label="Signature size" unit="mm" min={20} max={70} v={sig.widthMm} on={(v) => patch({ widthMm: v })} />
          <Slider label="Nudge left / right" unit="mm" min={-30} max={30} v={sig.offsetX} on={(v) => patch({ offsetX: v })} />
          <Slider label="Nudge up / down" unit="mm" min={-10} max={10} v={sig.offsetY} on={(v) => patch({ offsetY: v })} />
          <p className="text-xs text-slate-500">It sits automatically above your printed name at the bottom of the prescription. Use “Preview sample” below to check placement.</p>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium leading-relaxed text-amber-900"><ShieldAlert size={16} className="mt-0.5 shrink-0" />
        <span>An inserted signature image is <b>not</b> a legally validated digital signature. Valid electronic signatures under the IT Act need a Digital Signature Certificate (DSC) or Aadhaar eSign, which MedScript does not implement yet. For maximum validity, print and sign by hand.</span></div>
      {pad && <SignaturePad onClose={() => setPad(false)} onSave={async (u) => { await patch({ dataUrl: u, source: 'draw' }); setPad(false); toast('Signature saved'); }} />}
    </Card>
  );
}
function Slider({ label, unit, min, max, v, on }: { label: string; unit: string; min: number; max: number; v: number; on: (v: number) => void }) {
  return (<div><div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-wide text-slate-600"><span>{label}</span><span className="text-navy">{v} {unit}</span></div>
    <input type="range" min={min} max={max} value={v} onChange={(e) => on(Number(e.target.value))} className="w-full accent-brand" aria-label={label} /></div>);
}

/* ---------------- Seal ---------------- */
function SealCard({ s }: { s: AppSettings }) {
  const toast = useToast();
  const sl = s.seal;
  const clinic = s.clinics.find((c) => c.id === s.defaultClinicId) || s.clinics[0];
  const patch = (x: Partial<AppSettings['seal']>) => updateSettings((c) => { c.seal = { ...c.seal, ...x }; });
  const ok = sealPossible(s.doctor);
  const [url, setUrl] = useState('');
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { setUrl(sl.mode === 'generated' && ok ? renderSeal(sl, s.doctor, clinic) : sl.mode === 'uploaded' ? sl.uploaded : ''); }, [s]); // eslint-disable-line
  const toggles: [keyof AppSettings['seal'], string][] = [...(sl.style === 'classic' ? [['showSymbol', 'Symbol']] as [keyof AppSettings['seal'], string][] : []), ['showName', "Doctor's name"], ['showQuals', 'Qualifications'], ['showSpecialty', 'Specialty'], ['showReg', 'Registration number'], ['showClinic', 'Clinic name']];
  return (
    <Card className="space-y-4 p-5">
      <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Stamp size={19} /> Clinic stamp / seal</h2><p className="text-sm text-slate-600">Generate a stamp from your verified profile, or upload your existing stamp.</p></div>
      <div className="flex flex-wrap gap-2">
        {([['none', 'No stamp'], ['generated', 'Generate from profile'], ['uploaded', 'Upload my stamp']] as const).map(([m, l]) => <Chip key={m} active={sl.mode === m} onClick={() => patch({ mode: m })}>{l}</Chip>)}
      </div>
      {sl.mode === 'generated' && !ok && <div className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Add your full name and registration number in Doctor profile first. The stamp uses only details you have entered.</div>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cx('flex min-h-[200px] items-center justify-center rounded-xl border border-slate-200 p-3', checker)}>
          {url ? <img src={url} alt="Stamp preview" className="max-h-52 max-w-full object-contain" /> : <span className="text-sm font-semibold text-slate-400">No stamp</span>}
        </div>
        <div className="space-y-3">
          {sl.mode === 'generated' && (
            <>
              <div><span className="lbl">Format</span><div className="flex gap-2">{(['classic', 'circle', 'rect'] as const).map((f) => <Chip key={f} active={sl.style === f} onClick={() => patch({ style: f, ...(f === 'classic' && sl.widthMm < 45 ? { widthMm: 52 } : f === 'circle' ? { widthMm: 34 } : {}) })}>{f === 'classic' ? 'Classic' : f === 'circle' ? 'Circular' : 'Boxed'}</Chip>)}</div></div>
              <div><span className="lbl">Ink</span><div className="flex gap-2">{(['blue', 'black', 'red'] as const).map((f) => <Chip key={f} active={sl.ink === f} onClick={() => patch({ ink: f })}>{f[0].toUpperCase() + f.slice(1)}</Chip>)}</div></div>
              <div><span className="lbl">Include</span><div className="flex flex-wrap gap-x-4 gap-y-1.5">{toggles.map(([k, l]) => <label key={k} className="flex items-center gap-1.5 text-sm font-semibold"><input type="checkbox" checked={k === 'showSymbol' ? sl.showSymbol !== false : (sl[k] as boolean)} onChange={(e) => patch({ [k]: e.target.checked } as any)} /> {l}</label>)}</div></div>
            </>
          )}
          {sl.mode === 'uploaded' && (
            <div>
              <input ref={file} hidden type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await patch({ uploaded: await cleanStamp(await fileToDataUrl(f)), widthMm: Math.max(sl.widthMm, 48) }); toast('Stamp cleaned and saved. Rotate if it is upside down.'); } e.target.value = ''; }} />
              <Btn variant="secondary" size="sm" onClick={() => file.current?.click()}><Upload size={15} /> {sl.uploaded ? 'Replace stamp image' : 'Upload stamp image'}</Btn>
              {sl.uploaded && <div className="mt-2 flex gap-2"><Btn variant="secondary" size="sm" onClick={async () => patch({ uploaded: await rotateDataUrl(sl.uploaded, 90) })}>Rotate 90°</Btn><Btn variant="secondary" size="sm" onClick={async () => patch({ uploaded: await rotateDataUrl(sl.uploaded, 180) })}>Flip upside down</Btn></div>}
              <p className="mt-1 text-xs text-slate-500">Photo of your stamp is fine: paper background is removed automatically. Best: stamp on plain white paper, good light, straight from above.</p>
            </div>
          )}
          {sl.mode !== 'none' && (
            <>
              <Slider label="Stamp size" unit="mm" min={22} max={70} v={sl.widthMm} on={(v) => patch({ widthMm: v })} />
              <Slider label="Nudge left / right" unit="mm" min={-20} max={20} v={sl.offsetX} on={(v) => patch({ offsetX: v })} />
              <Slider label="Nudge up / down" unit="mm" min={-10} max={10} v={sl.offsetY} on={(v) => patch({ offsetY: v })} />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
function SamplePreview() {
  return <div className="flex justify-end"><SampleRx label="Preview sample prescription" className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white" /></div>;
}

/* ---------------- Layout ---------------- */
function LayoutCard({ s }: { s: AppSettings }) {
  const L = s.layout;
  const patch = (x: Partial<AppSettings['layout']>) => updateSettings((c) => { c.layout = { ...c.layout, ...x }; });
  const [note, setNote] = useState(L.footerNote);
  const Sw = ({ k, label, hint }: { k: keyof AppSettings['layout']; label: string; hint?: string }) => (
    <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-brand" checked={L[k] as boolean} onChange={(e) => patch({ [k]: e.target.checked } as any)} /><span><span className="block text-sm font-bold">{label}</span>{hint && <span className="text-xs text-slate-500">{hint}</span>}</span></label>
  );
  const d = s.doctor;
  const checks: [boolean, string][] = [
    [!!d.fullName.trim(), 'Doctor name printed'], [!!d.qualifications.trim(), 'Qualifications printed'], [!!d.regNo.trim(), 'Registration number printed (NMC requires this)'],
    [!!d.regCouncil.trim(), 'Registering council printed'], [L.nameDisplay === 'generic' && L.genericCaps, 'Medicines by generic name in capital letters (NMC)'], [true, 'Patient name, age/sex and date printed'], [!!s.signature.dataUrl, 'Doctor signature available'],
  ];
  return (
    <>
      <Card className="space-y-4 p-5">
        <div><h2 className="text-lg font-extrabold">Prescription layout</h2><p className="text-sm text-slate-600">A4, selectable text, built for print.</p></div>
        <div><span className="lbl">Medicine names</span>
          <div className="flex flex-wrap gap-2"><Chip active={L.nameDisplay === 'generic'} onClick={() => patch({ nameDisplay: 'generic' })}>Generic first (NMC recommended)</Chip><Chip active={L.nameDisplay === 'brand'} onClick={() => patch({ nameDisplay: 'brand' })}>Brand in CAPS, salt small below</Chip></div></div>
        <div><span className="lbl">Text size</span><div className="flex gap-2"><Chip active={L.fontScale === 'normal'} onClick={() => patch({ fontScale: 'normal' })}>Normal</Chip><Chip active={L.fontScale === 'large'} onClick={() => patch({ fontScale: 'large' })}>Large</Chip></div></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Sw k="genericCaps" label="Generic names in CAPITAL LETTERS" hint="NMC: legibly and preferably in capitals" />
          <Sw k="showComposition" label="Print composition under each medicine" />
          <Sw k="showPhone" label="Print patient phone number" />
          <Sw k="sealLeft" label="Stamp on the left of signature" hint="Turn off to place the stamp at the far right" />
        </div>
        <Field label="Custom footer line (optional)"><input className="field" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => patch({ footerNote: note })} placeholder="e.g. Not valid for medico-legal purposes" /></Field>
      </Card>
      <Card className="p-5">
        <h3 className="mb-2 flex items-center gap-2 font-extrabold"><BadgeCheck size={18} className="text-teal" /> NMC-style checklist</h3>
        <ul className="space-y-1.5 text-sm font-semibold">{checks.map(([ok, t]) => <li key={t} className={cx('flex items-center gap-2', ok ? 'text-teal-700' : 'text-amber-700')}>{ok ? <Check size={16} /> : <AlertTriangle size={16} />} {t}</li>)}</ul>
        <p className="mt-3 text-xs text-slate-500">Based on the Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations 2002: registration number on every prescription, generic names written legibly, preferably in capital letters. This is a helper, not legal advice.</p>
      </Card>
    </>
  );
}

function LangCard({ s }: { s: AppSettings }) {
  const toast = useToast();
  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-lg font-extrabold">Default language</h2>
      <p className="text-sm text-slate-600">Patient instruction line and advice print in one language only: English or Hindi (Devanagari). You can switch it, or turn the instruction line off, on each prescription.</p>
      <div className="flex gap-2">{([['en', 'English'], ['hi', 'हिंदी']] as [Lang, string][]).map(([v, l]) => <Chip key={v} active={s.defaultLang === v || (v === 'hi' && s.defaultLang === 'both')} onClick={() => updateSettings((x) => { x.defaultLang = v; })}>{l}</Chip>)}</div>
      <Field label="Default follow-up (days)"><input type="number" min="0" className="field w-32" defaultValue={s.defaultFollowUpDays} onBlur={(e) => { updateSettings((x) => { x.defaultFollowUpDays = Math.max(0, Number(e.target.value) || 0); }); toast('Saved'); }} /></Field>
    </Card>
  );
}

function FavCard() {
  const idx = useMedicineIndex();
  const [lib, setLib] = useState(false);
  const favs = idx ? idx.all.filter((m) => idx.meta.get(m.id)?.favourite) : [];
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">Favourite medicines</h2><p className="text-sm text-slate-600">Shown as one-tap chips in the prescription builder.</p></div><Btn onClick={() => setLib(true)}><Plus size={16} /> Browse library</Btn></div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{favs.map((m) => <MedRow key={m.id} m={m} fav onFav={() => toggleFavourite(m.id)} />)}</div>
      {!favs.length && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"><Star className="mx-auto mb-1" size={18} /> No favourites yet. Open the library and tap the star next to a medicine.</div>}
      {lib && <DrugLibrary onClose={() => setLib(false)} />}
    </Card>
  );
}

function BackupCard({ s }: { s: AppSettings }) {
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<any>(null);
  const [wipe, setWipe] = useState(false);
  const [typed, setTyped] = useState('');
  const counts = useLiveQuery(async () => ({ p: await db.patients.count(), r: await db.prescriptions.count(), a: await db.audit.count() }), []);
  async function doExport() {
    const data = await exportAll();
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `MedScript_backup_${new Date().toISOString().slice(0, 10)}.json`);
    toast('Backup downloaded. Keep it somewhere safe.');
  }
  async function run(mode: 'merge' | 'replace') {
    try { await importAll(pending, mode); toast('Data restored'); setPending(null); } catch (e: any) { toast(e.message, { tone: 'err' }); }
  }
  return (
    <Card className="space-y-4 p-5">
      <div><h2 className="text-lg font-extrabold">Backup & restore</h2><p className="text-sm text-slate-600">All data lives on this device. A backup file contains everything, including finalized prescriptions and the audit log.</p></div>
      <div className="grid grid-cols-3 gap-3 text-center">{[['Patients', counts?.p], ['Prescriptions', counts?.r], ['Audit entries', counts?.a]].map(([l, n]) => <div key={l as string} className="rounded-xl bg-slate-50 p-3"><div className="text-2xl font-extrabold">{n ?? '–'}</div><div className="text-xs font-bold uppercase text-slate-500">{l}</div></div>)}</div>
      <div className="text-sm font-semibold text-slate-600">Last backup: {s.lastBackupAt ? fmtDateTime(s.lastBackupAt) : 'never'}</div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={doExport}><Download size={16} /> Download backup</Btn>
        <input ref={file} hidden type="file" accept=".json,application/json" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setPending(JSON.parse(await f.text())); } catch { toast('That file is not a valid backup', { tone: 'err' }); } e.target.value = ''; }} />
        <Btn variant="secondary" onClick={() => file.current?.click()}><Upload size={16} /> Restore from file</Btn>
      </div>
      <div className="border-t border-slate-100 pt-3"><Btn variant="danger" size="sm" onClick={() => setWipe(true)}><Trash2 size={14} /> Erase all data on this device</Btn></div>
      {pending && (
        <Modal title="Restore backup" onClose={() => setPending(null)}>
          <p className="mb-3 text-sm">Backup from <b>{pending.exportedAt ? new Date(pending.exportedAt).toLocaleString('en-IN') : 'unknown date'}</b> with {pending.data?.prescriptions?.length ?? 0} prescriptions and {pending.data?.patients?.length ?? 0} patients.</p>
          <div className="space-y-2"><Btn className="w-full" onClick={() => run('merge')}>Merge into current data (safe)</Btn><Btn className="w-full" variant="danger" onClick={() => run('replace')}>Replace everything on this device</Btn></div>
          <p className="mt-2 text-xs text-slate-500">Merge keeps your existing finalized prescriptions untouched.</p>
        </Modal>
      )}
      {wipe && (
        <Modal title="Erase all data?" onClose={() => setWipe(false)} footer={<div className="flex gap-2 [&>button]:flex-1 sm:justify-end sm:[&>button]:flex-none"><Btn variant="secondary" onClick={() => setWipe(false)}>Cancel</Btn><Btn variant="danger" disabled={typed !== 'DELETE'} onClick={async () => { await wipeAll(); toast('All data erased'); setTimeout(() => location.reload(), 600); }}>Erase everything</Btn></div>}>
          <p className="mb-2 text-sm text-slate-700">This permanently deletes patients, prescriptions, templates, signature, stamp and settings from this device. Download a backup first.</p>
          <input className="field" placeholder="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </Modal>
      )}
    </Card>
  );
}

function AppCard() {
  const inst = useInstall();
  const upd = useUpdate();
  const toast = useToast();
  const [persist, setPersist] = useState<boolean | null>(null);
  useEffect(() => { navigator.storage?.persisted?.().then(setPersist).catch(() => setPersist(null)); }, []);
  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-lg font-extrabold">Application</h2>
      <div className="rounded-xl bg-slate-50 p-4">
        <div className="font-bold">Install MedScript</div>
        {inst.standalone ? <p className="text-sm text-teal-700">Installed: running as an app.</p> : inst.canInstall ? <Btn className="mt-2" onClick={inst.install}><Smartphone size={16} /> Install app</Btn>
          : <p className="mt-1 text-sm text-slate-600">{inst.ios ? 'On iPhone/iPad: tap Share, then “Add to Home Screen”.' : 'Use your browser menu → “Install app” / “Add to Home screen”.'}</p>}
      </div>
      <div className="rounded-xl bg-slate-50 p-4">
        <div className="font-bold">App updates</div>
        {upd.available ? <Btn className="mt-2" onClick={upd.apply}>Update now</Btn> : <><p className="mt-1 text-sm text-slate-600">New versions appear automatically as an “Update now” banner.</p><Btn variant="secondary" className="mt-2" onClick={async () => { await upd.check(); toast('Checked. You will see a banner if an update is found.'); }}>Check for updates</Btn></>}
      </div>
      <ul className="space-y-1.5 text-sm font-medium text-slate-700">
        <li>• Works offline after the first load. Your data is stored on this device (IndexedDB).</li>
        <li>• Persistent storage: {persist === null ? 'unknown' : persist ? 'granted' : 'not granted (take regular backups)'}</li>
        <li>• Version 1.0 · prepared for secure cloud sync later (every record has a unique ID and update time).</li>
      </ul>
    </Card>
  );
}
