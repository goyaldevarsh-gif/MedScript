import { X } from 'lucide-react';
import type { Warning } from '../lib/safety';
import { cx } from '../lib/util';

/** one alert in red (danger) or amber (warn). The x hides it for this prescription when it is not relevant. */
export default function WarnBanner({ w, onHide }: { w: Warning; onHide?: (w: Warning) => void }) {
  return (
    <div className={cx('flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold', w.level === 'danger' ? 'bg-danger-50 text-danger' : 'bg-amber-50 text-amber-900')}>
      <span className="min-w-0 flex-1">{w.text}</span>
      {onHide && !w.req && (
        <button type="button" onClick={() => onHide(w)} title="Not relevant here: hide this alert" aria-label="Hide this alert, not relevant here"
          className="-mr-1 -mt-0.5 flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-bold opacity-80 hover:bg-black/5 hover:opacity-100">
          <X size={14} /> Not relevant
        </button>
      )}
    </div>
  );
}
