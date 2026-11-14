import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus2, Users, Layers, Settings as Cog, Plus, WifiOff, ChevronLeft } from 'lucide-react';
import { Logo, Mark } from './Logo';
import { cx } from '../lib/util';
import { useOnline, useUpdate } from '../lib/pwa';
import { useSettings } from '../lib/db';
import SpecialtyPrompt from './SpecialtyPicker';
import { useEffect } from 'react';
import { flushOv } from '../lib/ovsync';
import { startSync, stopSync } from '../lib/sync';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/new', label: 'New Prescription', short: 'New Rx', icon: FilePlus2 },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/templates', label: 'My Templates', short: 'Templates', icon: Layers },
  { to: '/settings', label: 'Settings', icon: Cog },
];

/** Phone tab bar: New Rx sits in the middle. */
const MOBILE_NAV = [NAV[0], NAV[2], NAV[1], NAV[3], NAV[4]];

export default function Layout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const inBuilder = pathname === '/new' || pathname.startsWith('/rx/');
  const online = useOnline();
  const upd = useUpdate();
  const s = useSettings();
  const doc = s?.doctor.fullName;
  const ovEmail = s?.ovEmail;
  useEffect(() => {
    if (!ovEmail) return;
    flushOv(ovEmail);
    startSync(ovEmail);
    const f = () => flushOv(ovEmail);
    window.addEventListener('online', f);
    return () => window.removeEventListener('online', f);
  }, [ovEmail, online]);
  return (
    <div className="flex h-full">
      <SpecialtyPrompt />
      {upd.available && (
        <div className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-white shadow-2xl">
          <div className="flex-1 text-sm"><div className="font-extrabold">New version available</div><div className="text-xs text-slate-300">Your data and drafts stay safe.</div></div>
          <button onClick={upd.apply} className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold hover:bg-brand-600">Update now</button>
        </div>
      )}
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-navy p-4 text-white md:flex">
        <Logo light className="px-2 py-3" tagline />
        <button onClick={() => nav('/new')} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[15px] font-bold shadow-lg shadow-brand/30 transition hover:bg-brand-600 active:scale-[.98]">
          <Plus size={18} /> New Prescription
        </button>
        <nav className="mt-5 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition', isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')}>
              <n.icon size={19} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-white/10 p-3 text-xs text-slate-200">
          <div className="truncate font-bold text-white">{doc ? (/^dr/i.test(doc) ? doc : 'Dr. ' + doc) : 'Doctor profile not set'}</div>
          <div className="mt-0.5 text-slate-300">{online ? 'Works offline · data stored on this device' : 'Offline mode · data is safe on this device'}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 md:hidden">
          <div className="flex items-center gap-2">
            {inBuilder && <button aria-label="Back to dashboard" onClick={() => nav('/')} className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"><ChevronLeft size={24} /></button>}
            <Mark className="h-7 w-auto" /><span className="text-lg font-extrabold">MedScript</span>
          </div>
          {!online && <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800"><WifiOff size={13} /> Offline</span>}
        </header>
        <main className={cx('scroll-thin min-h-0 flex-1 overflow-y-auto md:pb-6', inBuilder ? 'pb-4' : 'pb-24')}><Outlet /></main>
        {/* Mobile tab bar */}
        <nav className={cx('safe-b fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden', inBuilder ? 'hidden' : 'flex')}>
          {MOBILE_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex min-h-[56px] flex-1 flex-col items-center justify-end gap-0.5 pb-1.5 pt-2 text-[10.5px] font-bold', isActive ? 'text-brand' : 'text-slate-500')}>
              {n.to === '/new' ? (
                <span className="-mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/40 ring-4 ring-white"><Plus size={22} /></span>
              ) : <n.icon size={21} />}
              {n.short || n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
