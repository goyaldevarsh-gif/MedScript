import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { updateSettings } from '../lib/db';
import type { AppSettings } from '../lib/types';
import { ovCheck, ovMsg, ovSignIn, ovSignOut } from '../lib/ovcloud';
import { Btn, Card, Field, useToast } from './ui';

export default function OvLinkCard({ s }: { s: AppSettings }) {
  const toast = useToast();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function link() {
    setBusy(true); setErr('');
    try { const e = await ovSignIn(email, pw); await updateSettings((x) => { x.ovEmail = e; }); setPw(''); toast('Linked to OrthoVault'); }
    catch (e) { setErr(ovMsg(e)); }
    setBusy(false);
  }
  const [chk, setChk] = useState('');
  async function check() { setChk('Checking…'); try { setChk(await ovCheck(s.ovEmail || '')); } catch (e) { setChk(ovMsg(e)); } }
  async function unlink() { await ovSignOut(); await updateSettings((x) => { x.ovEmail = ''; }); toast('Unlinked'); }
  return (
    <Card className="space-y-4 p-5">
      <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Link2 size={19} /> OrthoVault link</h2>
        <p className="text-sm text-slate-600">Optional. Sign in with your own OrthoVault account to receive patients from it and send authorised prescriptions back automatically. Nothing is shared with other doctors; each account sees only its own data.</p></div>
      {s.ovEmail ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">Linked as {s.ovEmail}</div>
          <div className="flex flex-wrap gap-2"><Btn onClick={check}>Test connection</Btn><Btn variant="secondary" onClick={unlink}>Unlink this device</Btn></div>
          {chk && <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800">{chk}</div>}
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="OrthoVault email"><input className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><input className="field" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          {err && <div className="text-sm font-bold text-red-700">{err}</div>}
          <Btn disabled={busy || !email.trim() || !pw} onClick={link}>{busy ? 'Linking…' : 'Link OrthoVault'}</Btn>
        </div>
      )}
    </Card>
  );
}
