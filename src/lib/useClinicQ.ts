import { useEffect, useMemo, useRef, useState } from 'react';
import { deskDay, type DeskItem, type DirRow } from './desk';
import { cqArrive, cqCancel, cqMsg, cqPublishLive, cqSendToDesk, cqSetStatus, cqSignIn, cqSignOut, cqWatch, cqWho } from './clinicq';
import { liveRows, seenSync, type CqAppt } from './clinicqLogic';

export interface Who { clinicId: string; clinicName: string; doctorName: string }
/** Everything the desk needs from ClinicQ: who is signed in, the day's bookings, and the three automatic jobs
    (Seen/undo from the doctor's list → booking, "who is checked in" list for patients' phones). */
export function useClinicQ(deskId: string, list: DeskItem[], dir: DirRow[] | null) {
  const [who, setWho] = useState<Who | null | undefined>(undefined); // undefined = still checking
  const [date, setDate] = useState(deskDay());
  const [appts, setAppts] = useState<CqAppt[]>([]);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState('');
  useEffect(() => { cqWho().then(setWho).catch((e) => { setWho(null); setErr(cqMsg(e)); }); }, []);
  useEffect(() => {
    if (!who) return; let off: (() => void) | undefined; let dead = false;
    cqWatch(who.clinicId, date, (a) => { if (!dead) { setAppts(a); setErr(''); } }, (e) => !dead && setErr(cqMsg(e))).then((u) => { if (dead) u(); else off = u; }).catch((e) => setErr(cqMsg(e)));
    return () => { dead = true; off?.(); };
  }, [who?.clinicId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // the doctor marks Seen (or puts back) on the waiting list → the booking follows, so the patient's phone is right
  useEffect(() => {
    if (!who) return;
    for (const c of seenSync(appts, list)) { const a = appts.find((x) => x.id === c.id); if (a) cqSetStatus(a, c.status).catch(() => {}); }
  }, [appts, list, who]);

  // patients' phones read "who is checked in" to show how many are ahead; only for today
  const lastLive = useRef('');
  useEffect(() => {
    if (!who || date !== deskDay()) return;
    const rows = liveRows(appts); const sig = JSON.stringify(rows);
    if (sig === lastLive.current) return; lastLive.current = sig;
    cqPublishLive(who.clinicId, rows).catch(() => { lastLive.current = ''; });
  }, [appts, who, date]);

  const run = async (key: string, f: () => Promise<unknown>) => { setBusy(key); setErr(''); try { await f(); } catch (e) { setErr(cqMsg(e)); } setBusy(''); };
  return useMemo(() => ({
    who, date, setDate, appts, err, busy,
    signIn: (email: string, pw: string) => run('in', async () => { await cqSignIn(email, pw); setWho(await cqWho()); }),
    signOut: () => run('out', async () => { await cqSignOut(); setWho(null); setAppts([]); }),
    arrive: (a: CqAppt) => run(a.id, () => cqArrive(a, deskId, dir)),
    sendToDesk: (a: CqAppt) => run(a.id, () => cqSendToDesk(a, deskId, dir)),
    cancel: (a: CqAppt) => run(a.id, () => cqCancel(a)),
  }), [who, date, appts, err, busy, deskId, dir]); // eslint-disable-line react-hooks/exhaustive-deps
}
export type ClinicQ = ReturnType<typeof useClinicQ>;
