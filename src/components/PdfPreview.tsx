import { useEffect, useRef, useState } from 'react';
import { Spinner } from './ui';

export default function PdfPreview({ blob }: { blob: Blob | null }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'err'>('idle');
  useEffect(() => {
    if (!blob || !host.current) return;
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const pdfjs: any = await import('pdfjs-dist');
        const worker: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const data = new Uint8Array(await blob.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled || !host.current) return;
        host.current.innerHTML = '';
        const width = Math.min(host.current.clientWidth || 600, 900);
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: (width / base.width) * dpr });
          const c = document.createElement('canvas');
          c.width = vp.width; c.height = vp.height;
          c.style.cssText = `width:${width}px;height:${(vp.height / dpr).toFixed(1)}px;max-width:100%;background:#fff;box-shadow:0 2px 12px rgba(16,36,58,.18);border-radius:4px;margin:0 auto 14px;display:block`;
          c.className = 'pdf-page';
          host.current.appendChild(c);
          await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
          if (cancelled) return;
        }
        setState('idle');
      } catch (e) { console.error(e); if (!cancelled) setState('err'); }
    })();
    return () => { cancelled = true; };
  }, [blob]);
  return (
    <div className="relative min-h-[300px]">
      {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>}
      {state === 'err' && <div className="p-6 text-center text-sm text-danger">Preview could not be rendered. You can still download the PDF.</div>}
      <div ref={host} />
    </div>
  );
}
