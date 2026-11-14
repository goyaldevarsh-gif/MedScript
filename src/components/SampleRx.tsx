import { useState } from 'react';
import { Eye } from 'lucide-react';
import type { DoctorSnapshot, Lang, Prescription, RxItem } from '../lib/types';
import { useSettings } from '../lib/db';
import { blankRx, defaultSettings, itemFromMedicine } from '../lib/defaults';
import { renderSeal, trimCanvas } from '../lib/imaging';
import { CATALOGUE } from '../data/catalogue';
import { Btn, Modal } from './ui';
import PreviewModal from './PreviewModal';
import { cx } from '../lib/util';

/* Fully dummy doctor, clinic, signature and seal so the sample always looks complete. */
function sampleSignature(): string {
  const c = document.createElement('canvas'); c.width = 600; c.height = 240;
  const x = c.getContext('2d')!;
  x.strokeStyle = '#1e3a8a'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(40, 170); x.bezierCurveTo(70, 40, 120, 40, 130, 150); x.bezierCurveTo(140, 60, 190, 50, 215, 150);
  x.bezierCurveTo(235, 210, 270, 90, 300, 130); x.bezierCurveTo(330, 170, 350, 100, 390, 120); x.bezierCurveTo(430, 140, 460, 110, 560, 95); x.stroke();
  x.lineWidth = 3.5; x.beginPath(); x.moveTo(80, 195); x.bezierCurveTo(200, 175, 360, 210, 540, 170); x.stroke();
  return trimCanvas(c).toDataURL('image/png');
}
function sampleSnapshot(): DoctorSnapshot {
  const d = defaultSettings();
  const doctor = { fullName: 'Dr. Arjun Mehta', qualifications: 'MBBS, MS (Orthopaedics)', specialty: 'Orthopaedic & Joint Replacement Surgeon', regNo: 'RMC/12345', regCouncil: 'Rajasthan Medical Council', phone: '9876543210', morePhones: ['9123456780'], email: 'dr.arjun@example.com' };
  const clinic = { ...d.clinics[0], name: 'Sample Ortho & Fracture Clinic', address: '12, Sample Road, Near City Hospital, Jaipur - 302001', phone: '0141-2345678', morePhones: ['9988776655'], email: 'clinic@example.com', timings: 'Mon-Sat: 5:00 PM - 8:00 PM', logo: '', whatsapp: '9876543210', qrUrl: 'https://example.com/know-your-condition', appointmentNote: 'अपॉइंटमेंट के लिए दी हुई तारीख से सात दिन पहले कॉल करके अपना अपॉइंटमेंट सुनिश्चित कर लें। समय: शाम 5 से 8 बजे।' };
  const seal = { ...d.seal, mode: 'generated' as const, style: 'classic' as const, widthMm: 52 };
  return {
    doctor, clinic, seal, layout: { ...d.layout, footerNote: 'SAMPLE prescription with dummy details. Not for patient use.' },
    signature: { dataUrl: sampleSignature(), source: 'draw', widthMm: 42, offsetX: 0, offsetY: 0 },
    sealDataUrl: renderSeal(seal, doctor, clinic),
  };
}

type Spec = { g: string[]; st: string; form?: string; patch: Partial<RxItem> };
const find = (s: Spec): RxItem | null => {
  const m = CATALOGUE.find((x) => x.source === 'catalogue' && s.g.length === x.ingredients.length && s.g.every((n) => x.ingredients.some((i) => i.name === n)) && x.strength === s.st && (!s.form || x.form === s.form));
  return m ? { ...itemFromMedicine(m), ...s.patch } : null;
};
const D = (n: number) => ({ duration: n, durationUnit: 'days' as const });

const SCENARIOS: { key: string; title: string; sub: string; patient: { name: string; age: string; sex: 'Male' | 'Female'; weight: string }; clinical: any; items: Spec[] }[] = [
  {
    key: 'knee', title: 'Knee osteoarthritis', sub: 'Painkiller + gastro cover + gel + calcium',
    patient: { name: 'Ramesh Sharma', age: '58', sex: 'Male', weight: '72' },
    clinical: { complaint: 'Pain right knee x 6 months, worse on stairs', diagnosis: 'Osteoarthritis knee', side: 'Right', injury: 'nontrauma', bodyParts: ['knee-R'], examination: 'Joint line tenderness; crepitus; ROM 0-110', investigations: 'X-ray knee standing AP / lateral', advice: ['Quadriceps strengthening and knee range-of-motion exercises daily', 'Hot fomentation to the knee for 15 minutes, twice daily', 'Reduce body weight if overweight'], comorbidities: 'Hypertension', nextTests: 'ESR, CRP' },
    items: [
      { g: ['Etoricoxib'], st: '60 mg', patch: { freq: 'OD', timesPerDay: 1, timing: 'after', ...D(5) } },
      { g: ['Pantoprazole'], st: '40 mg', patch: { freq: 'OD', timesPerDay: 1, timing: 'before', ...D(5) } },
      { g: ['Diclofenac'], st: '1% w/w', form: 'Gel', patch: { freq: 'BD', timesPerDay: 2, timing: '', ...D(14) } },
      { g: ['Calcium carbonate', 'Cholecalciferol (Vitamin D3)'], st: '1250 mg + 250 IU', patch: { freq: 'OD', timesPerDay: 1, timing: 'after', ...D(30) } },
      { g: ['Paracetamol'], st: '650 mg', patch: { freq: 'SOS', timesPerDay: 0, sosMax: 3, ...D(7) } },
    ],
  },
  {
    key: 'sciatica', title: 'Sciatica / low back pain', sub: 'Neuropathic + muscle relaxant + NSAID',
    patient: { name: 'Sunita Verma', age: '42', sex: 'Female', weight: '64' },
    clinical: { complaint: 'Low back pain radiating to left leg x 2 weeks', diagnosis: 'Lumbar radiculopathy (L5-S1)', side: 'Left', injury: 'nontrauma', bodyParts: ['lumbar', 'hip-L'], examination: 'SLR positive at 50°; no motor deficit', investigations: 'MRI lumbosacral spine', advice: ['Avoid heavy lifting and forward bending; lift with knees bent', 'Hot fomentation to the back, twice daily', 'Stay active; avoid prolonged bed rest'], nextTests: 'MRI report' },
    items: [
      { g: ['Pregabalin', 'Methylcobalamin'], st: '75 mg + 750 mcg', patch: { freq: 'HS', timesPerDay: 1, timing: '', ...D(14) } },
      { g: ['Aceclofenac', 'Paracetamol'], st: '100 mg + 325 mg', patch: { freq: 'BD', timesPerDay: 2, timing: 'after', ...D(5) } },
      { g: ['Thiocolchicoside'], st: '4 mg', patch: { freq: 'BD', timesPerDay: 2, timing: 'after', ...D(5) } },
      { g: ['Pantoprazole'], st: '40 mg', patch: { freq: 'OD', timesPerDay: 1, timing: 'before', ...D(5) } },
    ],
  },
  {
    key: 'fracture', title: 'Post-op fracture follow-up', sub: 'Pain control + calcium + vitamin D',
    patient: { name: 'Mohan Lal', age: '67', sex: 'Male', weight: '65' },
    clinical: { complaint: 'Follow-up 2 weeks after right femur IMNail', diagnosis: 'Fracture shaft femur, post fixation', side: 'Right', injury: 'trauma', bodyParts: ['thigh-R', 'knee-R'], examination: 'Wound healthy; stitches in situ; knee flexion 70°', investigations: 'X-ray femur AP / lateral', advice: ['Keep the wound clean and dry; suture removal as advised', 'Walk with a walker / support as advised; follow the physiotherapy protocol', 'Take bone-health medicines regularly as prescribed'], comorbidities: 'Type 2 diabetes', nextTests: 'X-ray femur AP / lateral' },
    items: [
      { g: ['Aceclofenac', 'Paracetamol'], st: '100 mg + 325 mg', patch: { freq: 'BD', timesPerDay: 2, timing: 'after', ...D(5) } },
      { g: ['Pantoprazole'], st: '40 mg', patch: { freq: 'OD', timesPerDay: 1, timing: 'before', ...D(5) } },
      { g: ['Calcium carbonate', 'Cholecalciferol (Vitamin D3)'], st: '1250 mg + 250 IU', patch: { freq: 'OD', timesPerDay: 1, timing: 'after', ...D(60) } },
      { g: ['Cholecalciferol (Vitamin D3)'], st: '60000 IU', form: 'Sachet', patch: { freq: 'WEEKLY', timesPerDay: 1, timing: 'after', duration: 8, durationUnit: 'weeks' } },
    ],
  },
];

export default function SampleRx({ label = 'See a sample prescription', className }: { label?: string; className?: string }) {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('hi');
  const [own, setOwn] = useState(false);
  const [rx, setRx] = useState<Prescription | null>(null);
  if (!s) return null;

  function build(key: string) {
    const sc = SCENARIOS.find((x) => x.key === key)!;
    const r = blankRx(s!.defaultClinicId, lang, 14);
    r.status = 'final'; r.showInstr = true; r.rxNo = 'SAMPLE'; r.authorizedAt = Date.now();
    r.patient = { ...r.patient, ...sc.patient, pid: 'P-00000', phone: '9876543210', allergies: '' };
    r.clinical = { ...r.clinical, ...sc.clinical };
    r.items = sc.items.map(find).filter(Boolean) as RxItem[];
    if (own) r.doctorSnapshot = undefined; else r.doctorSnapshot = sampleSnapshot();
    setOpen(false); setRx(r);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={className || 'inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:border-brand hover:text-brand'}>
        <Eye size={16} /> {label}
      </button>
      {open && (
        <Modal title="Sample prescription" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm font-medium text-slate-600">Pick a case to see how a finished prescription looks, with a dummy doctor, clinic, signature, stamp and registration number (or switch to your own profile). Dummy patient, nothing is saved.</p>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Patient instructions</span>
            {([['en', 'English'], ['hi', 'हिंदी']] as [Lang, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setLang(v)} className={cx('rounded-full border px-3 py-1 text-xs font-bold', lang === v ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}>{l}</button>
            ))}
          </div>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Doctor details</span>
            {([[false, 'Dummy doctor (full sample)'], [true, 'My own profile']] as [boolean, string][]).map(([v, l]) => (
              <button key={l} onClick={() => setOwn(v)} className={cx('rounded-full border px-3 py-1 text-xs font-bold', own === v ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}>{l}</button>
            ))}
          </div>
          <div className="space-y-2">
            {SCENARIOS.map((sc) => (
              <button key={sc.key} onClick={() => build(sc.key)} className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-brand hover:bg-brand-50">
                <div className="text-[15px] font-extrabold">{sc.title}</div>
                <div className="text-xs text-slate-500">{sc.sub}</div>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {rx && <PreviewModal sample rx={rx} onClose={() => setRx(null)} />}
    </>
  );
}
