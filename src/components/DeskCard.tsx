import { useState } from 'react';
import { Copy, ConciergeBell } from 'lucide-react';
import { updateSettings } from '../lib/db';
import { DESK_RULES, deskDirSync, deskLink, deskMsg, deskWipe, newDeskId, newDeskKey } from '../lib/desk';
import { deskRows } from './DeskSync';
import type { AppSettings } from '../lib/types';
import { Btn, Card, useToast } from './ui';

/** Settings: switch the reception desk on, get its secret link. */
export default function DeskCard({ s }: { s: AppSettings }) {
  const toast = useToast(); const [rules, setRules] = useState(false); const [chk, setChk] = useState('');
  const copy = async (t: string, m: string) => { try { await navigator.clipboard.writeText(t); toast(m); } catch { toast('Copy did not work. Select the text and copy it.', { tone: 'err' }); } };
  return (
    <Card className="space-y-3 p-5">
      <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><ConciergeBell size={19} /> Reception desk</h2>
        <p className="text-sm text-slate-600">Optional. A separate screen for your reception. They fill the patient's details and the reason for the visit, and the patient appears in your waiting list here. The desk screen cannot see prescriptions, medicines or any other patient.</p></div>
      {!s.deskId ? <Btn onClick={() => updateSettings((x) => { x.deskId = newDeskId(); x.deskKey = newDeskKey(); })}>Turn on reception desk</Btn> : (
        <div className="space-y-3">
          <div className="break-all rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{s.deskKey ? deskLink(s.deskId, s.deskKey) : 'Preparing link…'}</div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => copy(deskLink(s.deskId!, s.deskKey), 'Desk link copied')}><Copy size={15} /> Copy link</Btn>
            <Btn variant="secondary" onClick={() => window.open(deskLink(s.deskId!, s.deskKey), '_blank')}>Open desk</Btn>
            <Btn variant="secondary" onClick={() => { if (confirm('Make a new link? The old link will stop working and the reception must open the new one.')) { deskWipe(s.deskId!); updateSettings((x) => { x.deskId = newDeskId(); x.deskKey = newDeskKey(); }); } }}>New link</Btn>
            <Btn variant="secondary" onClick={async () => { setChk('Checking…'); try { if (!s.deskKey) throw new Error('Preparing link, try again'); localStorage.removeItem(`ms-desk-dir:${s.deskId}`); const r = await deskDirSync(s.deskId!, s.deskKey, await deskRows()); setChk(`Search ready: ${r.total} patient${r.total === 1 ? '' : 's'}.`); } catch (e) { setChk('Search not ready: ' + deskMsg(e)); } }}>Check search</Btn>
            <Btn variant="secondary" onClick={() => { if (confirm('Turn the reception desk off?')) { deskWipe(s.deskId!); updateSettings((x) => { x.deskId = ''; x.deskKey = ''; }); } }}>Turn off</Btn>
          </div>
          {chk && <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold">{chk}</div>}
          <p className="text-xs font-semibold text-slate-600">Open this link once on the reception computer and bookmark it. Anyone with this link can add patients and see patient names and mobile numbers, so share it only with your reception. Allergies, diagnosis and prescriptions are never sent.</p>
          <button type="button" className="text-sm font-bold text-brand underline" onClick={() => setRules((v) => !v)}>{rules ? 'Hide' : 'One-time cloud setup (needed once)'}</button>
          {rules && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              <div>Firebase console, project <b>orthovault02</b>, Firestore Database, Rules. Paste this inside <code>match /databases/{'{database}'}/documents {'{ … }'}</code>, below your existing rules (do not delete them), then Publish. Until then the desk shows a "not switched on" message.</div>
              <pre className="overflow-x-auto whitespace-pre rounded-lg bg-white p-2 text-[11px] font-medium text-slate-800">{DESK_RULES}</pre>
              <Btn size="sm" onClick={() => copy(DESK_RULES, 'Rules copied')}><Copy size={14} /> Copy rules</Btn>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
