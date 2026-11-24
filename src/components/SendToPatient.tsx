import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { cqMsg, cqSendRecord, cqSignIn, cqWho, setCqAuto } from '../lib/clinicq';
import { recordFromRx } from '../lib/clinicqLogic';
import type { Prescription } from '../lib/types';
import { Btn, Modal, useToast } from './ui';

/** "Send to patient": puts this prescription in the patient's ClinicQ Records. A deliberate tap, one prescription at a time. */
export default function SendToPatient({ rx }: { rx: Prescription }) {
  const toast = useToast(); const [ask, setAsk] = useState(false); const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [auto, setAuto] = useState(true);
  if (!recordFromRx(rx, 'x')) return null; // drafts and patients without a 10-digit phone have nothing to send
  async function go(signIn = false) {
    setBusy(true); setErr('');
    try {
      if (signIn) { await cqSignIn(email, pw); setCqAuto(auto); }
      const w = await cqWho();
      if (!w) { setAsk(true); setBusy(false); return; }
      await cqSendRecord(recordFromRx(rx, w.clinicId)!);
      setAsk(false); toast('Sent to patient. They see it in ClinicQ → Records (if sharing is on in ClinicQ Settings).');
    } catch (e) { setErr(cqMsg(e)); if (!ask) toast(cqMsg(e), { tone: 'err' }); }
    setBusy(false);
  }
  return (<>
    <Btn variant="ghost" size="sm" title="Send to patient (ClinicQ Records)" disabled={busy} onClick={() => go()}><Smartphone size={16} /></Btn>
    {ask && <Modal title="Connect ClinicQ" onClose={() => setAsk(false)} footer={<Btn disabled={busy} onClick={() => go(true)}>{busy ? 'Connecting…' : 'Connect and send'}</Btn>}>
      <div className="space-y-3"><p className="text-sm text-slate-600">Sign in once with the ClinicQ clinic staff account. This device remembers it.</p>
        <input className="field" type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="password" autoComplete="current-password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={auto} onChange={(e) => setAuto(e.target.checked)} />Send every new prescription automatically (no extra tap)</label>
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{err}</div>}</div>
    </Modal>}
  </>);
}
