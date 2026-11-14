import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, FileSignature, Stamp, Image as ImageIcon, XCircle } from 'lucide-react';
import type { AppSettings, Prescription } from '../lib/types';
import { Btn, Modal, useToast } from './ui';
import { checkRx, disclaimer } from '../lib/safety';
import { computeQty, doseLabel, durationLabel, freqLabel, itemInstructions, itemIssues, timingMeta } from '../lib/dosage';
import { makeSnapshot } from '../lib/snapshot';
import { finalizeRx } from '../lib/db';
import { flushOv } from '../lib/ovsync';
import { cx } from '../lib/util';
import { itemTitle } from '../lib/pdf';

export default function ReviewModal({ rx, settings, onClose, onDone, onChangeToggles }: {
  rx: Prescription; settings: AppSettings; onClose: () => void; onDone: (r: Prescription) => void; onChangeToggles: (t: Prescription['toggles']) => void;
}) {
  const toast = useToast();
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const warnings = useMemo(() => checkRx(rx), [rx]);
  const snap = useMemo(() => makeSnapshot(settings, rx.clinicId), [settings, rx.clinicId]);
  const hasSig = !!settings.signature.dataUrl;
  const hasSeal = settings.seal.mode === 'uploaded' ? !!settings.seal.uploaded : settings.seal.mode === 'generated' ? !!snap.sealDataUrl : false;
  const hasLogo = !!snap.clinic.logo;

  const blockers: { text: string; link?: boolean }[] = [];
  if (!settings.doctor.fullName.trim()) blockers.push({ text: 'Doctor name is missing in Settings → Doctor profile.', link: true });
  if (!settings.doctor.regNo.trim()) blockers.push({ text: 'Medical registration number is missing. NMC rules require it on every prescription.', link: true });
  if (!rx.patient.name.trim()) blockers.push({ text: 'Patient name is required.' });
  if (!rx.items.length) blockers.push({ text: 'Add at least one medicine before authorising.' });
  rx.items.forEach((it, i) => itemIssues(it).forEach((e) => blockers.push({ text: `Medicine ${i + 1} (${it.generic || 'unnamed'}): ${e}` })));
  const notes = warnings.filter((w) => w.level !== 'info');
  const info = warnings.filter((w) => w.level === 'info');
  const brandFirst = settings.layout.nameDisplay === 'brand';
  const needAck = notes.length > 0;

  async function authorise() {
    setBusy(true);
    try {
      const sealOn = rx.toggles.stamp && hasSeal;
      const done = await finalizeRx({ ...rx, toggles: { logo: rx.toggles.logo && hasLogo || (rx.toggles.logo && settings.layout.headerBrand), signature: rx.toggles.signature && hasSig, stamp: sealOn } }, snap, notes.map((w) => w.text));
      toast(`Authorised · ${done.rxNo}`);
      flushOv(settings.ovEmail, done);
      onDone(done);
    } catch (e: any) { toast(e.message || 'Could not finalize', { tone: 'err' }); setBusy(false); }
  }
  const Toggle = ({ k, icon, label, have, miss }: { k: keyof Prescription['toggles']; icon: React.ReactNode; label: string; have: boolean; miss: string }) => (
    <label className={cx('flex items-center gap-3 rounded-xl border p-3', have ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50')}>
      <input type="checkbox" className="h-5 w-5 accent-brand" checked={rx.toggles[k] && have} disabled={!have} onChange={(e) => onChangeToggles({ ...rx.toggles, [k]: e.target.checked })} />
      <span className="text-slate-600">{icon}</span>
      <span className="flex-1"><span className="block text-sm font-bold">{label}</span>{!have && <span className="text-xs font-medium text-slate-500">{miss}</span>}</span>
    </label>
  );
  return (
    <Modal wide title={<span className="flex items-center gap-2"><ShieldCheck size={18} className="text-teal" /> Review & authorise</span>} onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          {needAck ? (
            <label className={cx('flex max-w-xl items-start gap-2 text-sm font-semibold', blockers.length > 0 && 'opacity-50')}>
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-brand" checked={ack} disabled={blockers.length > 0} onChange={(e) => setAck(e.target.checked)} />
              I have reviewed the alerts above and authorise this prescription.
            </label>
          ) : <span className="text-xs font-semibold text-slate-500">Authorising confirms you have reviewed the medicines and doses.</span>}
          <div className="flex w-full gap-2 sm:w-auto [&>button]:flex-1 [&>button:last-child]:flex-[1.8] [&>button]:whitespace-nowrap sm:[&>button]:flex-none"><Btn variant="secondary" onClick={onClose}>Back to edit</Btn><Btn variant="success" disabled={(needAck && !ack) || blockers.length > 0 || busy} onClick={authorise}><FileSignature size={16} /> {busy ? 'Authorising…' : 'Authorise & generate'}</Btn></div>
        </div>
      }>
      <div className="space-y-4">
        {blockers.length > 0 && (
          <div className="rounded-xl border border-danger/40 bg-danger-50 p-3">
            <div className="mb-1 flex items-center gap-2 font-extrabold text-danger"><XCircle size={18} /> Fix before authorising</div>
            <ul className="list-disc space-y-0.5 pl-5 text-sm font-semibold text-danger">
              {blockers.map((b, i) => <li key={i}>{b.text} {b.link && <Link to="/settings" className="underline">Open Settings</Link>}</li>)}
            </ul>
          </div>
        )}
        {notes.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
            <div className="mb-1 flex items-center gap-2 font-extrabold text-amber-900"><AlertTriangle size={18} /> Alerts to review ({notes.length})</div>
            <ul className="space-y-1 text-sm font-semibold">
              {notes.map((w, i) => <li key={i} className={w.level === 'danger' ? 'text-danger' : 'text-amber-900'}>• {w.text}</li>)}
            </ul>
          </div>
        )}
        {brandFirst && <div className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Your layout prints brand names first. NMC regulations ask doctors to prescribe by generic name, legibly and preferably in capital letters. You can change this in Settings → Prescription layout.</div>}

        <div>
          <div className="lbl">Medicines to be authorised</div>
          <div className="space-y-2">
            {rx.items.map((it, i) => {
              const ins = itemInstructions(it, rx.lang === 'hi' ? 'hi' : 'en');
              const t = itemTitle(it, settings.layout.nameDisplay, settings.layout.genericCaps);
              return (
                <div key={it.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="font-extrabold">{i + 1}. {t.main} <span className="font-medium text-slate-500">{t.sub}</span></div>
                  <div className="font-semibold text-[#1e406e]">{[`Dose ${doseLabel(it)}`, it.route, it.useTaper ? 'Tapering' : freqLabel(it), timingMeta(it.timing)?.label, !it.useTaper && durationLabel(it), computeQty(it).text && 'Qty ' + computeQty(it).text].filter(Boolean).join(' · ')}</div>
                  <div className="italic text-slate-600">{ins.en || ins.hi}</div>
                </div>
              );
            })}
            {!rx.items.length && <div className="text-sm text-slate-500">No medicines added.</div>}
          </div>
        </div>

        <div>
          <div className="lbl">Show on prescription</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Toggle k="logo" icon={<ImageIcon size={18} />} label="Clinic logo" have={hasLogo || settings.layout.headerBrand} miss="No logo uploaded" />
            <Toggle k="signature" icon={<FileSignature size={18} />} label="Digital signature" have={hasSig} miss="Add in Settings → Signature & seal" />
            <Toggle k="stamp" icon={<Stamp size={18} />} label="Clinic stamp" have={hasSeal} miss="Add in Settings → Signature & seal" />
          </div>
          {!hasSig && <p className="mt-2 text-xs font-medium text-slate-600">No signature on file: print the prescription and sign by hand, or add your signature in Settings.</p>}
        </div>

        {info.length > 0 && (
          <details className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><summary className="cursor-pointer font-bold">Other notes ({info.length})</summary>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">{info.map((w, i) => <li key={i}>{w.text}</li>)}</ul></details>
        )}
        <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <p><b>Signature note:</b> the signature and stamp are applied as images you supplied. They are <b>not</b> a legally validated digital signature (DSC / Aadhaar eSign under the IT Act). A printed copy signed by hand remains fully valid.</p>
          <p>{disclaimer}</p>
          <p>Once authorised, this prescription is locked and recorded in the audit log. Later changes create a new version; the original is never overwritten.</p>
        </div>
      </div>
    </Modal>
  );
}
