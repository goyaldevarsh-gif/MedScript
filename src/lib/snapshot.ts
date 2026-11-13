import type { AppSettings, DoctorSnapshot } from './types';
import { renderSeal } from './imaging';

export function makeSnapshot(s: AppSettings, clinicId: string): DoctorSnapshot {
  const clinic = s.clinics.find((c) => c.id === clinicId) || s.clinics.find((c) => c.id === s.defaultClinicId) || s.clinics[0];
  const sealDataUrl = s.seal.mode === 'generated' && s.doctor.fullName.trim() && s.doctor.regNo.trim() ? renderSeal(s.seal, s.doctor, clinic) : '';
  return JSON.parse(JSON.stringify({ doctor: s.doctor, clinic, signature: s.signature, sealDataUrl, seal: s.seal, layout: s.layout }));
}
