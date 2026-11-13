import { useEffect, useRef, useState } from 'react';
import { Eraser, Undo2 } from 'lucide-react';
import { Btn, Modal } from './ui';
import { trimCanvas } from '../lib/imaging';

export default function SignaturePad({ onClose, onSave }: { onClose: () => void; onSave: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<{ x: number; y: number }[][]>([]);
  const cur = useRef<{ x: number; y: number }[] | null>(null);
  const [color, setColor] = useState('#0b1f5c');
  const [empty, setEmpty] = useState(true);
  const redraw = () => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = color; ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of strokes.current) {
      if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0].x, s[0].y, 2, 0, 7); ctx.fillStyle = color; ctx.fill(); continue; }
      ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
      for (let i = 1; i < s.length - 1; i++) { const mx = (s[i].x + s[i + 1].x) / 2, my = (s[i].y + s[i + 1].y) / 2; ctx.quadraticCurveTo(s[i].x, s[i].y, mx, my); }
      ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y); ctx.stroke();
    }
    setEmpty(strokes.current.length === 0);
  };
  useEffect(() => { const c = ref.current!; c.width = 1200; c.height = 480; redraw(); }, []); // eslint-disable-line
  useEffect(redraw, [color]); // eslint-disable-line
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 1200, y: ((e.clientY - r.top) / r.height) * 480 }; };
  return (
    <Modal wide title="Draw your signature" onClose={onClose} footer={
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Btn variant="secondary" size="sm" onClick={() => { strokes.current.pop(); redraw(); }}><Undo2 size={15} /> Undo</Btn>
          <Btn variant="secondary" size="sm" onClick={() => { strokes.current = []; redraw(); }}><Eraser size={15} /> Clear</Btn>
          {[['#0b1f5c', 'Blue'], ['#111827', 'Black']].map(([c, l]) => <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-brand' : 'border-slate-300'}`} style={{ background: c }} aria-label={l} />)}
        </div>
        <div className="flex gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn disabled={empty} onClick={() => { const t = trimCanvas(ref.current!, 8); onSave(t.toDataURL('image/png')); }}>Use this signature</Btn></div>
      </div>}>
      <p className="mb-2 text-sm text-slate-600">Sign with your finger, stylus or mouse. The background stays transparent.</p>
      <canvas ref={ref} className="w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-[repeating-conic-gradient(#f3f6fa_0%_25%,#fff_0%_50%)] [background-size:20px_20px]" style={{ aspectRatio: '1200/480' }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); cur.current = [pos(e)]; strokes.current.push(cur.current); redraw(); }}
        onPointerMove={(e) => { if (!cur.current) return; cur.current.push(pos(e)); redraw(); }}
        onPointerUp={() => { cur.current = null; }} onPointerCancel={() => { cur.current = null; }} />
    </Modal>
  );
}
