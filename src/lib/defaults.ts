import type { AppSettings, Clinical, RxItem, Prescription, Patient, PrintOpts } from './types';
import { uid } from './util';

export const emptyClinical = (): Clinical => ({
  complaint: '', diagnosis: '', side: 'N/A', notes: '', examination: '', investigations: '', advice: [],
});
export const defaultPrint = (): PrintOpts => ({ complaint: true, examination: true, investigations: true, notes: false });
export const newClinic = (name = '') => ({ id: uid(), name, address: '', phone: '', email: '', timings: '', logo: '' });

export function defaultSettings(): AppSettings {
  const c = newClinic('');
  return {
    doctor: { fullName: '', qualifications: '', specialty: '', regNo: '', regCouncil: '', phone: '', email: '' },
    clinics: [c], defaultClinicId: c.id,
    signature: { dataUrl: '', source: '', widthMm: 42, offsetX: 0, offsetY: 0 },
    seal: {
      mode: 'none', style: 'classic', ink: 'blue', showName: true, showQuals: true, showSpecialty: true,
      showReg: true, showClinic: false, showSymbol: true, uploaded: '', widthMm: 52, offsetX: 0, offsetY: 0,
    },
    layout: {
      nameDisplay: 'brand', genericCaps: true, fontScale: 'normal', showPhone: true, showComposition: true,
      footerBranding: true, headerBrand: true, footerNote: '', sealLeft: true,
    },
    defaultLang: 'en', defaultFollowUpDays: 14, lastBackupAt: 0, rxCounter: 0, patientCounter: 0, seeded: false,
  };
}

export const blankPatient = (): Patient => ({
  id: uid(), pid: '', name: '', age: '', ageUnit: 'Y', sex: '', phone: '', weight: '', allergies: '',
  createdAt: Date.now(), updatedAt: Date.now(),
});

export function blankRx(clinicId: string, lang: AppSettings['defaultLang'], followUpDays: number): Prescription {
  const now = Date.now();
  return {
    id: uid(), rxNo: '', status: 'draft', version: 1, patientId: '', patient: blankPatient(), clinicId,
    clinical: emptyClinical(), print: defaultPrint(), items: [], followUpDays, followUpDate: '', lang,
    toggles: { signature: true, stamp: true, logo: true }, createdAt: now, updatedAt: now,
  };
}

export const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Drops', 'Injection', 'Gel', 'Cream', 'Ointment', 'Lotion', 'Spray', 'Sachet', 'Powder', 'Patch', 'Inhaler', 'Other'];
export const ROUTES = ['Oral', 'Topical', 'IM', 'IV', 'SC', 'Intra-articular', 'Local infiltration', 'Rectal', 'Inhalation', 'Ophthalmic', 'Nasal', 'Other'];
export const unitForForm = (form: string): string => {
  switch (form) {
    case 'Tablet': return 'tablet';
    case 'Capsule': return 'capsule';
    case 'Syrup': case 'Suspension': return 'mL';
    case 'Drops': return 'drop';
    case 'Injection': return 'mL';
    case 'Gel': case 'Cream': case 'Ointment': case 'Lotion': return 'application';
    case 'Spray': return 'puff';
    case 'Sachet': return 'sachet';
    case 'Powder': return 'scoop';
    case 'Patch': return 'patch';
    case 'Inhaler': return 'puff';
    default: return 'unit';
  }
};
export const routeForForm = (form: string): string => {
  if (['Gel', 'Cream', 'Ointment', 'Lotion', 'Patch'].includes(form)) return 'Topical';
  if (form === 'Injection') return 'IM';
  if (form === 'Inhaler') return 'Inhalation';
  return 'Oral';
};
export function itemFromMedicine(m: { id?: string; brand: string; generic: string; ingredients: any[]; strength: string; form: string; route: string; manufacturer: string; verified: boolean; source?: any }): RxItem {
  const unit = unitForForm(m.form);
  const liquid = unit === 'mL';
  const cat = ((m as any).category || '').toLowerCase();
  const ppi = /ppi/.test(cat) && !/combination/.test(cat);
  const is60k = /60000/.test(m.strength || '');
  const supp = /vitamin|calcium|bone|supplement|chondro|collagen|joint|enzyme/.test(cat) && !/injection|antibiotic/.test(cat) && m.form !== 'Injection';
  const base: Pick<RxItem, 'freq' | 'timesPerDay' | 'timing' | 'duration' | 'durationUnit'> = is60k
    ? { freq: 'WEEKLY', timesPerDay: 1, timing: 'after', duration: 8, durationUnit: 'weeks' }
    : supp ? { freq: ppi ? 'OD' : 'BD', timesPerDay: 2, timing: 'after', duration: 30, durationUnit: 'days' }
    : { freq: ppi ? 'OD' : 'BD', timesPerDay: ppi ? 1 : 2, timing: ppi && !/p-cab/.test(cat) ? 'before' : 'after', duration: 5, durationUnit: 'days' };
  return {
    id: uid(), medId: m.id, brand: m.brand, generic: m.generic, ingredients: m.ingredients, strength: m.strength,
    form: m.form, route: m.route || routeForForm(m.form), manufacturer: m.manufacturer, verified: m.verified, src: m.source,
    doseQty: liquid ? 5 : 1, doseText: '', doseUnit: unit,
    ...base, freqCustom: '', odSlot: 'morning',
    sosMax: null, useTaper: false, taper: [], qtyOverride: '', instructionOverride: '', notes: '',
  };
}

export const SPECIALTIES: { key: 'ortho' | 'general' | 'other'; label: string; sub: string; title: string }[] = [
  { key: 'ortho', label: 'Orthopaedics', sub: 'Site, side, trauma/non-trauma, ortho templates and advice', title: 'Orthopaedic Surgeon' },
  { key: 'general', label: 'General Physician', sub: 'Simple Rx: complaint, diagnosis, medicines, advice', title: 'General Physician' },
  { key: 'other', label: 'Other specialty', sub: 'Same simple Rx; you type your own specialty', title: '' },
];
/** Ortho-specific parts (body picker, side, ortho starter templates, ortho advice) show unless another specialty is chosen. */
export const isOrtho = (s?: { specialtyKey?: string } | null) => !s?.specialtyKey || s.specialtyKey === 'ortho';
