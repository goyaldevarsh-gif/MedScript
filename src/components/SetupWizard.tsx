import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ArrowRight, Check, FileSignature, Upload } from 'lucide-react';
import { db, updateSettings, useSettings } from '../lib/db';
import { SPECIALTIES } from '../lib/defaults';
import { cleanSignature, fileToDataUrl, sealPossible } from '../lib/imaging';
import { chooseSpecialty } from './SpecialtyPicker';
import SignaturePad from './SignaturePad';
import SampleRx from './SampleRx';
import { Btn, Field, useToast } from './ui';
import { cx } from '../lib/util';

/** Decides ONCE per app start whether the first-run setup shows. ONLY for a brand-new, completely empty profile: never for a doctor who has
 *  any prescription, any saved profile detail (name, registration, phone, clinic, signature), or has finished/skipped it. Latched so it doesn't vanish mid-way. */
export function useWizardGate() {
  const s = useSettings();
  const n = useLiveQuery(() => db.prescriptions.count(), []);
  const [on, setOn] = useState<boolean | undefined>();
  useEffect(() => {
    if (on !== undefined || !s || n === undefined) return;
    const cl = s.clinics[0];
    const untouched = !s.doctor.fullName.trim() && !s.doctor.regNo.trim() && !s.doctor.phone.trim() && !(cl?.name || '').trim() && !s.signature.dataUrl;
    setOn(!s.setupDone && n === 0 && untouched);
  }, [s, n, on]);
  return [on, () => setOn(false)] as const;
}

const STEPS = ['Specialty', 'About you', 'Clinic', 'Signature', 'Done'];

export default function SetupWizard({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  const nav = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [pad, setPad] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const [d, setD] = useState({ fullName: '', qualifications: '', specialty: '', regNo: '', regCouncil: '', phone: '' });
  const [c, setC] = useState({ name: '', address: '', timings: '', phone: '' });
  const loaded = useRef(false);
  useEffect(() => { // start from whatever is already saved; never blank it out
    if (!s || loaded.current) return; loaded.current = true;
    const cl = s.clinics.find((x) => x.id === s.defaultClinicId) || s.clinics[0];
    setD({ fullName: s.doctor.fullName, qualifications: s.doctor.qualifications, specialty: s.doctor.specialty, regNo: s.doctor.regNo, regCouncil: s.doctor.regCouncil, phone: s.doctor.phone });
    setC({ name: cl?.name || '', address: cl?.address || '', timings: cl?.timings || '', phone: cl?.phone || '' });
  }, [s]);
  if (!s) return null;

  async function finish() {
    await updateSettings((x) => {
      x.setupDone = true;
      if (!x.specialtyKey) x.specialtyKey = 'ortho';
    });
    onClose();
  }
  async function saveDoctor() {
    if (!d.fullName.trim()) { setErr('Please enter your full name.'); return false; }
    if (d.phone.trim() && d.phone.replace(/\D/g, '').length < 10) { setErr('Mobile number should be 10 digits.'); return false; }
    setErr('');
    await updateSettings((x) => { x.doctor = { ...x.doctor, fullName: d.fullName.trim(), qualifications: d.qualifications.trim(), specialty: d.specialty.trim(), regNo: d.regNo.trim(), regCouncil: d.regCouncil.trim(), phone: d.phone.trim() };
      // stamp is made from the doctor's own name + registration number, only when both are filled and no stamp is set yet
      if (x.seal.mode === 'none' && sealPossible(x.doctor)) x.seal = { ...x.seal, mode: 'generated' };
    });
    return true;
  }
  async function saveClinic() {
    await updateSettings((x) => { const k = x.clinics.find((z) => z.id === x.defaultClinicId) || x.clinics[0]; if (k) Object.assign(k, { name: c.name.trim(), address: c.address.trim(), timings: c.timings.trim(), phone: c.phone.trim() }); });
    return true;
  }
  async function next() {
    if (step === 1 && !(await saveDoctor())) return;
    if (step === 2) await saveClinic();
    setStep(step + 1);
  }
  async function upload(f?: File) {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please choose an image', { tone: 'err' });
    try { const u = await cleanSignature(await fileToDataUrl(f), true); await updateSettings((x) => { x.signature = { ...x.signature, dataUrl: u, source: 'upload' }; }); }
    catch { toast('Could not read that image', { tone: 'err' }); }
  }
  const sp = s.specialtyKey;
  const needReg = !s.doctor.regNo.trim();

  return (
    <div className="fixed inset-0 z-[45] flex flex-col bg-slate-50">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 pt-4">
        <div className="text-sm font-extrabold text-navy">Set up MedScript</div>
        <button onClick={() => finish()} className="text-sm font-bold text-slate-500 underline">Skip setup</button>
      </div>
      <div className="mx-auto w-full max-w-xl px-4 pt-3">
        <div className="flex gap-1.5">{STEPS.map((l, i) => <div key={l} className={cx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-brand' : 'bg-slate-200')} />)}</div>
        <div className="mt-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Step {step + 1} of {STEPS.length}: {STEPS[step]}</div>
      </div>
      <div className="scroll-thin mx-auto min-h-0 w-full max-w-xl flex-1 overflow-y-auto px-4 py-4">
        {step === 0 && <div className="space-y-2.5">
          <h1 className="text-xl font-extrabold text-navy">What is your specialty?</h1>
          <p className="text-sm font-medium text-slate-600">The form, templates and advice are set up for it. You can change it later in Settings.</p>
          {SPECIALTIES.map((x) => (
            <button key={x.key} onClick={async () => { await chooseSpecialty(x.key); setStep(1); }} className={cx('w-full rounded-2xl border-2 bg-white p-4 text-left transition active:scale-[.99]', sp === x.key ? 'border-brand' : 'border-slate-200 hover:border-brand')}>
              <div className="text-lg font-extrabold text-navy">{x.label}</div>
              <div className="text-sm font-medium text-slate-500">{x.sub}</div>
            </button>
          ))}
        </div>}
        {step === 1 && <div className="space-y-3">
          <h1 className="text-xl font-extrabold text-navy">About you</h1>
          <p className="text-sm font-medium text-slate-600">This prints on every prescription. Enter it exactly as registered.</p>
          <Field label="Full name *"><input className="field" autoFocus value={d.fullName} onChange={(e) => setD({ ...d, fullName: e.target.value })} placeholder="e.g. Anita Sharma" /></Field>
          <Field label="Qualifications"><input className="field" value={d.qualifications} onChange={(e) => setD({ ...d, qualifications: e.target.value })} placeholder="e.g. MBBS, MS (Orthopaedics)" /></Field>
          <Field label="Specialty (as printed)"><input className="field" value={d.specialty} onChange={(e) => setD({ ...d, specialty: e.target.value })} placeholder="e.g. Orthopaedic Surgeon" /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Registration number"><input className="field" value={d.regNo} onChange={(e) => setD({ ...d, regNo: e.target.value })} /></Field>
            <Field label="Registering council"><input className="field" value={d.regCouncil} onChange={(e) => setD({ ...d, regCouncil: e.target.value })} placeholder="e.g. Rajasthan Medical Council" /></Field>
          </div>
          <Field label="Mobile number" hint="10 digits, prints as +91-XXXXXXXXXX"><input className="field" type="tel" inputMode="tel" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="e.g. 9876543210" /></Field>
          <p className="text-xs font-medium text-amber-800">The registration number is required to finalise prescriptions. You can add it later in Settings.</p>
          {err && <p className="text-sm font-bold text-danger">{err}</p>}
        </div>}
        {step === 2 && <div className="space-y-3">
          <h1 className="text-xl font-extrabold text-navy">Your clinic</h1>
          <p className="text-sm font-medium text-slate-600">Printed at the top of the prescription. Logo, more clinics and WhatsApp can be added later in Settings.</p>
          <Field label="Clinic / hospital name"><input className="field" autoFocus value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="e.g. City Ortho & Fracture Clinic" /></Field>
          <Field label="Address"><textarea className="field" rows={2} value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} /></Field>
          <Field label="Timings"><input className="field" value={c.timings} onChange={(e) => setC({ ...c, timings: e.target.value })} placeholder="e.g. Mon-Sat: 5:00 PM - 8:00 PM" /></Field>
          <Field label="Clinic phone (optional)"><input className="field" type="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
        </div>}
        {step === 3 && <div className="space-y-3">
          <h1 className="text-xl font-extrabold text-navy">Your signature</h1>
          <p className="text-sm font-medium text-slate-600">Printed above your name, only when <b>you</b> finalise a prescription. Your stamp is made automatically from your name and registration number.</p>
          <div className="flex h-36 items-center justify-center rounded-xl border border-slate-200 bg-white">{s.signature.dataUrl ? <img src={s.signature.dataUrl} alt="Signature" className="max-h-28 max-w-[90%] object-contain" /> : <span className="text-sm font-semibold text-slate-400">No signature yet</span>}</div>
          <div className="flex flex-wrap gap-2">
            <input ref={file} hidden type="file" accept="image/*" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
            <Btn variant="secondary" onClick={() => setPad(true)}><FileSignature size={16} /> Draw</Btn>
            <Btn variant="secondary" onClick={() => file.current?.click()}><Upload size={16} /> Upload image</Btn>
          </div>
          <p className="text-xs font-medium text-slate-500">No signature handy? Skip this, it can be added later in Settings.</p>
          {pad && <SignaturePad onClose={() => setPad(false)} onSave={async (u) => { await updateSettings((x) => { x.signature = { ...x.signature, dataUrl: u, source: 'draw' }; }); setPad(false); }} />}
        </div>}
        {step === 4 && <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white"><Check size={30} /></div>
          <h1 className="text-xl font-extrabold text-navy">You are ready{s.doctor.fullName ? ', ' + (/^dr\.?\s/i.test(s.doctor.fullName) ? s.doctor.fullName : 'Dr. ' + s.doctor.fullName) : ''}</h1>
          <p className="text-sm font-medium text-slate-600">See how a finished prescription looks with <b>your</b> name, clinic, signature and stamp. It uses a dummy patient and nothing is saved.</p>
          <div className="flex justify-center"><SampleRx label="Preview my prescription" defaultOwn autoKey="knee" className="inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-3 text-base font-bold text-white" /></div>
          {needReg && <p className="text-xs font-semibold text-amber-800">Add your registration number in Settings to finalise real prescriptions.</p>}
        </div>}
      </div>
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3">
        {step > 0 && step < 4 ? <Btn variant="secondary" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</Btn> : <span />}
        {step === 1 || step === 2 || step === 3 ? <Btn onClick={next}>{step === 3 && !s.signature.dataUrl ? 'Skip for now' : 'Next'} <ArrowRight size={16} /></Btn> : null}
        {step === 4 && <div className="flex gap-2"><Btn variant="secondary" onClick={() => finish()}>Go to dashboard</Btn><Btn onClick={async () => { await finish(); nav('/new'); }}>Create first prescription</Btn></div>}
      </div>
    </div>
  );
}
