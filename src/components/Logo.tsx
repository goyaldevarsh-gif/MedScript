import { cx } from '../lib/util';

export const Mark = ({ className, white }: { className?: string; white?: boolean }) => (
  <svg viewBox="0 0 130 100" className={className} aria-hidden>
        <path d="M12 90 L28 22 L48 64 L70 22 L84 90" fill="none" stroke={white ? '#fff' : '#2563EB'} strokeWidth="17" strokeMiterlimit="2.2" />
    <path d="M104 12v36M86 30h36" fill="none" stroke={white ? '#5EEAD4' : '#0D9488'} strokeWidth="14" />
  </svg>
);
export function Logo({ light, tagline, className }: { light?: boolean; tagline?: boolean; className?: string }) {
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <Mark white={light} className="h-9 w-auto" />
      <div className="leading-none">
        <div className={cx('text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-navy')}>MedScript<sup className="ml-0.5 text-[8px] font-semibold">®</sup></div>
        {tagline && <div className={cx('mt-1 text-[11px] font-medium', light ? 'text-teal-100' : 'text-slate-500')}>Digital Prescription Maker</div>}
      </div>
    </div>
  );
}
