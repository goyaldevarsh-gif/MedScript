export type Sex = 'Male' | 'Female' | 'Other' | '';
export type Side = 'Left' | 'Right' | 'Bilateral' | 'N/A';
export type Freq = 'OD' | 'BD' | 'TDS' | 'QID' | 'HS' | 'SOS' | 'WEEKLY' | 'CUSTOM';
export type Timing = '' | 'before' | 'after' | 'with' | 'empty' | 'bedtime' | 'asreq';
export type Lang = 'en' | 'hi' | 'both';

export interface Patient {
  id: string; pid: string; name: string; age: string; ageUnit: 'Y' | 'M';
  sex: Sex; phone: string; weight: string; allergies: string; ovId?: string;
  createdAt: number; updatedAt: number;
}
export interface Ingredient { name: string; strength: string }
export interface Medicine {
  id: string; brand: string; generic: string; ingredients: Ingredient[];
  strength: string; form: string; route: string; manufacturer: string;
  verified: boolean; source: 'catalogue' | 'brand' | 'custom' | 'import'; category?: string;
  /** set for medicines imported from a medical shop's stock list */
  shop?: string;
}
export interface MedMeta { id: string; favourite: boolean; lastUsedAt: number; useCount: number; reg?: Partial<RxItem> }
export interface TaperStep { id: string; dose: number; timesPerDay: number; days: number }
export interface RxItem {
  id: string; medId?: string; brand: string; generic: string; ingredients: Ingredient[];
  strength: string; form: string; route: string; manufacturer: string; verified: boolean; src?: Medicine['source'];
  doseQty: number | null; doseText: string; doseUnit: string;
  freq: Freq; freqCustom: string; timesPerDay: number; odSlot: 'morning' | 'afternoon' | 'night';
  timing: Timing; duration: number; durationUnit: 'days' | 'weeks' | 'months';
  sosMax: number | null; useTaper: boolean; taper: TaperStep[];
  qtyOverride: string; instructionOverride: string; notes: string;
  /** set when copied from an earlier visit, e.g. '12 Nov' (shown as a review badge) */
  carried?: string;
}
export interface Clinical {
  complaint: string; diagnosis: string; side: Side; notes: string;
  examination: string; investigations: string; advice: string[];
  comorbidities?: string; nextTests?: string; injury?: 'trauma' | 'nontrauma' | ''; bodyParts?: string[];
}
export interface PrintOpts { complaint: boolean; examination: boolean; investigations: boolean; notes: boolean }
export interface PdfToggles { signature: boolean; stamp: boolean; logo: boolean }
export interface Doctor {
  fullName: string; qualifications: string; specialty: string; regNo: string; regCouncil: string;
  phone: string; email: string; morePhones?: string[]; qrUrl?: string;
  /** base link of the doctor's own patient-guide site; when set, the Rx QR opens the page matching the diagnosis (falls back to qrUrl) */
  eduBase?: string;
  /** which QR codes to print on the Rx (guide defaults on, location and WhatsApp default off) */
  qrShow?: { guide?: boolean; map?: boolean; wa?: boolean };
}
export interface Letterhead { on: boolean; top: number; bottom: number }
export interface Clinic { letterhead?: Letterhead; logoSize?: 'S' | 'M' | 'L'; id: string; name: string; address: string; phone: string; email: string; timings: string; logo: string; whatsapp?: string; appointmentNote?: string; morePhones?: string[]; qrUrl?: string; /** optional Google Maps link; otherwise made from the address */ mapsUrl?: string }
export interface SignatureCfg { dataUrl: string; source: 'upload' | 'draw' | ''; widthMm: number; offsetX: number; offsetY: number }
export interface SealCfg {
  mode: 'none' | 'generated' | 'uploaded'; style: 'circle' | 'rect' | 'classic'; ink: 'blue' | 'black' | 'red';
  showName: boolean; showQuals: boolean; showSpecialty: boolean; showReg: boolean; showClinic: boolean; showSymbol?: boolean;
  uploaded: string; widthMm: number; offsetX: number; offsetY: number;
}
export interface LayoutCfg {
  nameDisplay: 'generic' | 'brand'; nameV2?: boolean; genericCaps: boolean; fontScale: 'normal' | 'large';
  showPhone: boolean; showComposition: boolean; footerBranding: boolean; headerBrand: boolean;
  footerNote: string; sealLeft: boolean;
}
export type SpecialtyKey = 'ortho' | 'general' | 'other';
export interface AppSettings {
  doctor: Doctor; clinics: Clinic[]; defaultClinicId: string;
  signature: SignatureCfg; seal: SealCfg; layout: LayoutCfg;
  defaultLang: Lang; defaultFollowUpDays: number; lastBackupAt: number;
  rxCounter: number; patientCounter: number; seeded: boolean; specialtyKey?: SpecialtyKey; orthovaultUrl?: string; ovEmail?: string;
}
export interface DoctorSnapshot {
  doctor: Doctor; clinic: Clinic; signature: SignatureCfg; sealDataUrl: string; seal: SealCfg; layout: LayoutCfg;
}
export interface Wound {
  on: boolean; type?: string; status?: string; site?: string; autoSite?: string; dressing?: string; sutureDays?: number; note?: string;
  pins?: { v: string; x: number; y: number; f?: 'hand' | 'foot'; side?: 'R' | 'L' }[];
}
export interface Prescription {
  wound?: Wound;
  id: string; rxNo: string; status: 'draft' | 'final'; version: number; parentId?: string;
  patientId: string; patient: Patient; clinicId: string;
  clinical: Clinical; print: PrintOpts; items: RxItem[];
  followUpDays: number; followUpDate: string; lang: Lang; toggles: PdfToggles;
  showInstr?: boolean; followUpManual?: boolean; qrUrl?: string; ovId?: string;
  createdAt: number; updatedAt: number; authorizedAt?: number; hash?: string;
  doctorSnapshot?: DoctorSnapshot; warningsAtAuth?: string[];
}
export interface Template {
  id: string; name: string; builtIn: boolean; sourceKey?: string; icon: string; favourite: boolean;
  clinical: Clinical; followUpDays: number; items: RxItem[]; createdAt: number; updatedAt: number;
}
export interface AuditEntry { id: string; ts: number; event: string; rxId: string; rxNo: string; details: string; hash?: string }
