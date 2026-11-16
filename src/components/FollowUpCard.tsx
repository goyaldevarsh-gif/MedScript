import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarClock, ChevronDown, ChevronUp, History, Repeat } from 'lucide-react';
import { db } from '../lib/db';
import type { Prescription, RxItem } from '../lib/types';
import { Badge, Btn, Card } from './ui';
import { agoText, followUpStatus, itemState, shortDate, visitTs } from '../lib/followup';
import { doseLabel, durationLabel, freqLabel } from '../lib/dosage';
import { itemTitle } from '../lib/pdf';
import { woundLine } from '../lib/wound';
import { cx } from '../lib/util';

/** Shown for a returning patient: what was done last time, plus one-tap "continue same treatment". */
export default function FollowUpCard({ patientId, curId, hasItems, clinicName, onApply }: {
  patientId: string; curId: string; hasItems: boolean; clinicName: (id: string) => string;
  onApply: (prev: Prescription, items: RxItem[], full: boolean) => void;
}) {
  const list = useLiveQuery(
    () => (patientId ? db.prescriptions.where('patientId').equals(patientId).filter((r) => r.status === 'final' && r.id !== curId).toArray() : Promise.resolve([] as Prescription[])),
    [patientId, curId]) || [];
  const prev = useMemo(() => [...list].sort((a, b) => visitTs(b) - visitTs(a))[0], [list]);
  const [open, setOpen] = useState(true);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<string>('');
  useEffect(() => { setDone(''); setOpen(!hasItems); }, [prev?.id]); // eslint-disable-line
  useEffect(() => {
    if (!prev) return;
    const m: Record<string, boolean> = {}; const t = visitTs(prev);
    prev.items.forEach((i) => { m[i.id] = itemState(i, t).checked; });
    setSel(m);
  }, [prev?.id]); // eslint-disable-line
  if (!prev) return null;

  const t = visitTs(prev);
  const fu = followUpStatus(prev);
  const wound = woundLine(prev);
  const chosen = prev.items.filter((i) => sel[i.id]);
  const dx = prev.clinical.diagnosis.trim();
  const side = prev.clinical.side && prev.clinical.side !== 'N/A' ? prev.clinical.side : '';
  const apply = (full: boolean) => { onApply(prev, chosen, full); setDone(`${chosen.length} medicine${chosen.length === 1 ? '' : 's'}${full ? ' + diagnosis' : ''} copied from ${shortDate(t)}. Review before approving.`); setOpen(false); };

  return (
    <Card className="mb-3 border-l-4 !border-l-teal-500 p-3 sm:p-4">
      <button type="button" className="flex w-full items-start gap-2 text-left" onClick={() => setOpen(!open)}>
        <History size={18} className="mt-0.5 shrink-0 text-teal-700" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold">Last visit · {shortDate(t)} <span className="font-semibold text-slate-500">({agoText(t)}){prev.clinicId ? ' · ' + clinicName(prev.clinicId) : ''}</span></div>
          <div className="mt-0.5 text-[13px] font-semibold text-slate-700">{[dx && (side ? `${dx} (${side})` : dx), `${prev.items.length} medicine${prev.items.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</div>
          {fu && <div className="mt-1 sm:hidden"><Badge tone={fu.tone === 'green' ? 'green' : fu.tone}>{fu.text}</Badge></div>}
          {done && <div className="mt-1 text-xs font-bold text-teal-700">{done}</div>}
        </div>
        {fu && <span className="hidden sm:block"><Badge tone={fu.tone === 'green' ? 'green' : fu.tone}>{fu.text}</Badge></span>}
        {open ? <ChevronUp size={18} className="mt-0.5 shrink-0 text-slate-500" /> : <ChevronDown size={18} className="mt-0.5 shrink-0 text-slate-500" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {(wound || prev.clinical.complaint.trim()) && (
            <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 text-[13px] text-slate-700">
              {prev.clinical.complaint.trim() && <div><b className="text-slate-500">Was:</b> {prev.clinical.complaint}</div>}
              {wound && <div><b className="text-slate-500">Wound:</b> {wound}</div>}
            </div>
          )}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Medicines to continue</span>
              <span className="flex gap-3 text-xs font-bold text-brand">
                <button type="button" onClick={() => setSel(Object.fromEntries(prev.items.map((i) => [i.id, true])))}>All</button>
                <button type="button" onClick={() => setSel(Object.fromEntries(prev.items.map((i) => [i.id, false])))}>None</button>
              </span>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {prev.items.map((i) => {
                const st = itemState(i, t); const ti = itemTitle(i, 'brand', false);
                return (
                  <label key={i.id} className={cx('flex cursor-pointer items-start gap-2.5 p-2.5', !sel[i.id] && 'bg-slate-50/60')}>
                    <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={!!sel[i.id]} onChange={(e) => setSel({ ...sel, [i.id]: e.target.checked })} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold leading-snug">{ti.main} <span className="font-semibold text-slate-500">{ti.sub}</span></div>
                      <div className="text-xs font-semibold text-[#1e406e]">{[doseLabel(i), i.useTaper ? 'Tapering' : freqLabel(i), !i.useTaper && durationLabel(i)].filter(Boolean).join(' · ')}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone={st.state === 'ended' ? 'amber' : 'slate'}>{st.text}</Badge>
                        {st.state === 'ended' && st.risky && <Badge tone="red">Antibiotic / steroid / opioid: confirm before continuing</Badge>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => apply(true)} disabled={!chosen.length && !dx}><Repeat size={16} /> Continue same treatment</Btn>
            <Btn variant="secondary" onClick={() => apply(false)} disabled={!chosen.length}>Only medicines ({chosen.length})</Btn>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Start fresh</Btn>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500"><CalendarClock size={13} className="mt-0.5 shrink-0" /> Complaint, examination and investigations are not copied, since they change at every visit. Medicines whose course has ended are un-ticked if they are antibiotics, steroids or opioids.</p>
        </div>
      )}
    </Card>
  );
}
