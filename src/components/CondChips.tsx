import { COND_CHIPS, chipActive, showWomenChips, toggleChip } from '../lib/conditions';
import type { Patient } from '../lib/types';
import { Chip } from './ui';

/** one-tap conditions. They go into the Comorbidities box, which the interaction checker reads. */
export default function CondChips({ value, onChange, patient }: { value: string; onChange: (v: string) => void; patient: Pick<Patient, 'sex' | 'age' | 'ageUnit'> }) {
  const women = showWomenChips(patient);
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {COND_CHIPS.filter((c) => !c.women || women).map((c) => (
        <Chip key={c.label} active={chipActive(value, c)} onClick={() => onChange(toggleChip(value, c))}>{c.label}</Chip>
      ))}
    </div>
  );
}
