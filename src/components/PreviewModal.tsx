import { useEffect, useState } from 'react';
import { Download, Printer, Share2, MessageCircle, CheckCircle2 } from 'lucide-react';
import type { Prescription } from '../lib/types';
import { Btn, Modal, useToast } from './ui';
import PdfPreview from './PdfPreview';
import { buildPdf, pdfName } from '../lib/pdf';
import { makeSnapshot } from '../lib/snapshot';
import { getSettings } from '../lib/db';
import { download } from '../lib/util';
import { printBlob, shareWhatsApp, sharePdf } from '../lib/share';

export default function PreviewModal({ rx, onClose, onFinalize, sample }: { rx: Prescription; onClose: () => void; onFinalize?: () => void; sample?: boolean }) {
  const toast = useToast();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [pages, setPages] = useState(1);
  const [err, setErr] = useState('');
  const final = rx.status === 'final';
  const [lhCfg, setLhCfg] = useState<{ on: boolean } | null>(null);
  const [lhOn, setLhOn] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const snap = final && rx.doctorSnapshot ? rx.doctorSnapshot : makeSnapshot(await getSettings(), rx.clinicId);
        if (!off) setLhCfg(snap.clinic.letterhead ? { on: snap.clinic.letterhead.on } : null);
        const r = await buildPdf(rx, snap, { draft: !final, showLogo: rx.toggles.logo, showSignature: rx.toggles.signature, showStamp: rx.toggles.stamp, letterhead: lhOn });
        if (!off) { setBlob(r.blob); setPages(r.pages); }
      } catch (e: any) { console.error(e); if (!off) setErr(e?.message || 'Could not build the PDF'); }
    })();
    return () => { off = true; };
  }, [rx, final, lhOn]);
  const name = pdfName(rx);
  const dn = rx.doctorSnapshot?.doctor.fullName || '';
  return (
    <Modal full title={<span>{final ? 'Prescription' : 'Draft preview'} <span className="ml-1 text-sm font-semibold text-slate-500">· {pages} page{pages > 1 ? 's' : ''}</span></span>} onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">{lhCfg && <button type="button" onClick={() => setLhOn(!(lhOn ?? lhCfg.on))} className={`rounded-full border px-3 py-1 font-bold ${(lhOn ?? lhCfg.on) ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700'}`}>Letterhead print: {(lhOn ?? lhCfg.on) ? 'On' : 'Off'}</button>}<span>{sample ? (rx.doctorSnapshot ? 'Sample with dummy doctor, clinic, signature and stamp. Nothing is saved.' : 'Sample with your own profile, signature and stamp. Nothing is saved.') : final ? <span className="flex items-center gap-1 text-teal-700"><CheckCircle2 size={14} /> Authorised · {rx.rxNo}</span> : 'Draft: no signature or stamp is applied until you authorise it.'}</span></div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>button]:flex-1 [&>button]:whitespace-nowrap sm:[&>button]:flex-none">
            <Btn variant="secondary" disabled={!blob} onClick={() => blob && download(blob, name)}><Download size={16} /> {sample ? 'Download sample' : final ? 'Download PDF' : 'Download draft'}</Btn>
            {final && !sample ? (
              <>
                <Btn variant="secondary" disabled={!blob} onClick={() => blob && printBlob(blob)}><Printer size={16} /> Print</Btn>
                <Btn variant="secondary" disabled={!blob} onClick={async () => { if (!blob) return; const r = await sharePdf(blob, name, `Prescription for ${rx.patient.name}`); if (r === 'downloaded') toast('Sharing not supported here: PDF downloaded'); }}><Share2 size={16} /> Share</Btn>
                <Btn variant="success" disabled={!blob} onClick={async () => { if (!blob) return; const r = await shareWhatsApp(rx, blob, name, dn); if (r === 'downloaded') toast('PDF downloaded: attach it in the WhatsApp chat', { ms: 5000 }); }}><MessageCircle size={16} /> WhatsApp</Btn>
              </>
            ) : onFinalize && <Btn onClick={onFinalize}><CheckCircle2 size={16} /> Review & finalize</Btn>}
          </div>
        </div>
      }>
      <div className="-m-4 bg-slate-200/70 p-3 sm:p-5">
        {err ? <div className="p-8 text-center font-semibold text-danger">{err}</div> : <PdfPreview blob={blob} />}
      </div>
    </Modal>
  );
}
