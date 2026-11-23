import { useState } from 'react';
/** a per-device "hide the shortcuts" switch, remembered. Shortcuts are only aids, so the doctor can always hide them and just type. */
export function useHidden(key: string): [boolean, (v: boolean) => void] {
  const k = 'ms-hide-' + key;
  const [h, setH] = useState(() => { try { return localStorage.getItem(k) === '1'; } catch { return false; } });
  return [h, (v) => { setH(v); try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* private mode: just for this visit */ } }];
}
