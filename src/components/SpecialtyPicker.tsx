import { Stethoscope } from 'lucide-react';
import { SPECIALTIES } from '../lib/defaults';
import { updateSettings, useSettings } from '../lib/db';
import type { SpecialtyKey } from '../lib/types';
import { Modal } from './ui';

export async function chooseSpecialty(key: SpecialtyKey) {
  const sp = SPECIALTIES.find((x) => x.key === key)!;
  await updateSettings((s) => {
    const prev = SPECIALTIES.find((x) => x.key === s.specialtyKey)?.title;
    s.specialtyKey = key;
    if (sp.title && (!s.doctor.specialty.trim() || s.doctor.specialty === prev)) s.doctor.specialty = sp.title;
  });
}

/** First-run question: shown until a specialty is chosen. */
export default function SpecialtyPrompt() {
  const s = useSettings();
  if (!s || s.specialtyKey) return null;
  return (
    <Modal title={<span className="flex items-center gap-2"><Stethoscope size={20} /> What is your specialty?</span>} onClose={() => chooseSpecialty('ortho')}>
      <p className="mb-3 text-sm font-medium text-slate-600">The prescription form, templates and advice are set up for it. You can change this anytime in Settings.</p>
      <div className="space-y-2.5">
        {SPECIALTIES.map((x) => (
          <button key={x.key} onClick={() => chooseSpecialty(x.key)} className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-brand active:scale-[.99]">
            <div className="text-lg font-extrabold text-navy">{x.label}</div>
            <div className="text-sm font-medium text-slate-500">{x.sub}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
