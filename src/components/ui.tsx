import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X, Check } from 'lucide-react';
import { cx } from '../lib/util';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'dark';
const VAR: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-600 shadow-sm',
  secondary: 'bg-white text-navy border border-slate-300 hover:bg-slate-50',
  ghost: 'text-navy hover:bg-slate-100',
  success: 'bg-teal text-white hover:bg-teal-700 shadow-sm',
  danger: 'bg-white text-danger border border-danger/40 hover:bg-danger-50',
  dark: 'bg-navy text-white hover:bg-navy-800',
};
export function Btn({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-4 py-2.5 text-[15px]',
        VAR[variant], className
      )}
    />
  );
}
export const Card = ({ className, children }: { className?: string; children: ReactNode }) => <div className={cx('card', className)}>{children}</div>;
export function Field({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="lbl">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
export function Chip({ active, children, onClick, tone = 'brand', className, title }: { active?: boolean; children: ReactNode; onClick?: () => void; tone?: 'brand' | 'teal' | 'red'; className?: string; title?: string }) {
  const on = tone === 'red' ? 'bg-danger text-white border-danger' : tone === 'teal' ? 'bg-teal text-white border-teal' : 'bg-brand text-white border-brand';
  return (
    <button type="button" title={title} onClick={onClick}
      className={cx('inline-flex min-h-[40px] items-center justify-center rounded-full border px-3.5 py-1.5 text-sm font-bold transition active:scale-95 sm:min-h-0', active ? on : 'border-slate-300 bg-white text-navy hover:border-brand hover:text-brand', className)}>
      {children}
    </button>
  );
}
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'teal' }) {
  const m = { slate: 'bg-slate-100 text-slate-700', green: 'bg-teal-50 text-teal-700', amber: 'bg-amber-100 text-amber-800', red: 'bg-danger-50 text-danger', blue: 'bg-brand-50 text-brand-600', teal: 'bg-teal-50 text-teal-700' } as const;
  return <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', m[tone])}>{children}</span>;
}
export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center sm:py-10">
      {icon && <div className="rounded-full bg-teal-50 p-3 text-teal">{icon}</div>}
      <div className="text-base font-bold">{title}</div>
      {text && <div className="max-w-sm text-sm text-slate-600">{text}</div>}
      {action}
    </div>
  );
}
export const Spinner = () => <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />;

export function Modal({ title, onClose, children, wide, footer, full }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean; footer?: ReactNode; full?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', full ? 'sm:max-w-6xl sm:h-[92vh] h-[94vh]' : wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-base font-extrabold">{title}</div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="safe-b border-t border-slate-200 bg-slate-50 p-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---- Toasts ---- */
interface Toast { id: number; msg: string; action?: { label: string; onClick: () => void }; tone?: 'ok' | 'err' }
const ToastCtx = createContext<(msg: string, o?: { action?: Toast['action']; tone?: Toast['tone']; ms?: number }) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const n = useRef(0);
  const push = useCallback((msg: string, o?: { action?: Toast['action']; tone?: Toast['tone']; ms?: number }) => {
    const id = ++n.current;
    setList((l) => [...l, { id, msg, action: o?.action, tone: o?.tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), o?.ms ?? (o?.action ? 6000 : 3000));
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[68px] z-[60] flex flex-col items-center gap-2 px-3 md:bottom-6 md:top-auto">
        {list.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-xl', t.tone === 'err' ? 'bg-danger' : 'bg-navy')}>
            {t.tone !== 'err' && <Check size={16} className="text-teal-100" />}
            <span>{t.msg}</span>
            {t.action && <button className="rounded-md bg-white/15 px-2 py-0.5 font-bold hover:bg-white/25" onClick={() => { t.action!.onClick(); setList((l) => l.filter((x) => x.id !== t.id)); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export function useDebounced<T>(v: T, ms = 150) {
  const [d, setD] = useState(v);
  useEffect(() => { const h = setTimeout(() => setD(v), ms); return () => clearTimeout(h); }, [v, ms]);
  return d;
}
