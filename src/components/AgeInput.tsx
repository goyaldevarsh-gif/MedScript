import { composeAge, parseAge } from '../lib/age';

/** Age as years, months and days: fill any one or a mix (6 y 5 m, 5 m 7 d). Stored as one short string. */
export default function AgeInput({ age, unit, onChange, compact }: { age: string; unit: string; onChange: (v: { age: string; ageUnit: 'Y' | 'M' }) => void; compact?: boolean }) {
  const a = parseAge(age, unit);
  const raw = !a && age ? age : '';
  const cell = (k: 'y' | 'm' | 'd', label: string) => (
    <label key={k} className="relative min-w-0 flex-1">
      <input type="number" min="0" inputMode="numeric" className={'field !pr-6 ' + (compact ? '!px-2' : '')} value={a && a[k] ? a[k] : ''} placeholder="0" aria-label={label}
        onChange={(e) => onChange(composeAge({ ...(a ?? { y: 0, m: 0, d: 0 }), [k]: e.target.value }))} />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-extrabold uppercase text-slate-400">{k}</span>
    </label>
  );
  return <div className="flex gap-1" title={raw ? 'Unreadable age: ' + raw : 'Years · months · days'}>{cell('y', 'Years')}{cell('m', 'Months')}{cell('d', 'Days')}</div>;
}
