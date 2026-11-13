import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
let deferred: any = null;
const subs = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()); });
}
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    canInstall: !!deferred, standalone, ios,
    install: async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; force((x) => x + 1); },
  };
}
export function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener('online', a); window.addEventListener('offline', b);
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); };
  }, []);
  return on;
}

/* ---- App updates: new version is downloaded in background, doctor taps "Update now" ---- */
let needRefresh = false;
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
let swReg: ServiceWorkerRegistration | undefined;
const updSubs = new Set<() => void>();
const notifyUpd = () => updSubs.forEach((f) => f());
export function initUpdates() {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() { needRefresh = true; notifyUpd(); },
    onRegisteredSW(_url, reg) {
      swReg = reg;
      if (!reg) return;
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    },
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') swReg?.update().catch(() => {}); });
}
export function useUpdate() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); updSubs.add(f); return () => { updSubs.delete(f); }; }, []);
  return {
    available: needRefresh,
    apply: async () => { await applyUpdate?.(); },
    check: async () => { await swReg?.update(); },
  };
}
