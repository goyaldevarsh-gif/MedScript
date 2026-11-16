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
const markReady = () => { if (!needRefresh) { needRefresh = true; notifyUpd(); } };

/** Looks for a downloaded-but-not-yet-active version (also waits for one that is still downloading). */
async function detectWaiting(reg: ServiceWorkerRegistration | undefined, waitMs = 0): Promise<boolean> {
  if (!reg) return false;
  if (reg.waiting) { markReady(); return true; }
  const inst = reg.installing;
  if (inst && waitMs > 0) {
    await new Promise<void>((res) => {
      const t = setTimeout(res, waitMs);
      inst.addEventListener('statechange', () => { if (inst.state === 'installed' || inst.state === 'redundant' || inst.state === 'activated') { clearTimeout(t); res(); } });
    });
    if (reg.waiting) { markReady(); return true; }
  }
  return needRefresh;
}

export function initUpdates() {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() { markReady(); },
    onRegisteredSW(_url, reg) {
      swReg = reg;
      if (!reg) return;
      detectWaiting(reg); // a new version may already be waiting from an earlier visit
      setInterval(() => { reg.update().then(() => detectWaiting(reg)).catch(() => {}); }, 30 * 60 * 1000);
    },
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') swReg?.update().then(() => detectWaiting(swReg)).catch(() => {});
  });
}
export type UpdateCheck = 'available' | 'latest' | 'offline' | 'error';
export function useUpdate() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); updSubs.add(f); return () => { updSubs.delete(f); }; }, []);
  return {
    available: needRefresh,
    apply: async () => {
      try { await applyUpdate?.(true); } catch { /* fall through to the hard reload below */ }
      setTimeout(() => location.reload(), 2500); // if the new version did not take over by itself
    },
    /** Checks for a new version and waits (up to ~25 s) for it to finish downloading. */
    check: async (): Promise<UpdateCheck> => {
      if (!navigator.onLine) return 'offline';
      try {
        const reg = swReg || (await navigator.serviceWorker?.getRegistration());
        if (!reg) return 'error';
        swReg = reg;
        await reg.update();
        return (await detectWaiting(reg, 25000)) ? 'available' : 'latest';
      } catch { return 'error'; }
    },
    /** Last resort: drop cached app files and the service worker, then reload. Saved prescriptions (IndexedDB) are not touched. */
    forceRefresh: async () => {
      try { const regs = await navigator.serviceWorker?.getRegistrations(); await Promise.all((regs || []).map((r) => r.unregister())); } catch { /* ignore */ }
      try { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } catch { /* ignore */ }
      location.reload();
    },
  };
}
