import { useRef } from 'react';
import { shapeEl, pinEl, partLabel, type Pin } from '../lib/body';
import { detailH, detailShapes, type DView, type Detail } from '../lib/detail';

/** Detailed hand / foot figure. Either tap a region (onToggle) or drop a point (onPoint, used for wound pins). */
export default function DetailFigure({ d, view, side, sel, pins = [], onToggle, onPoint, readOnly, className = 'h-80' }: {
  d: Detail; view: DView; side: 'R' | 'L'; sel?: Set<string>; pins?: Pin[]; onToggle?: (id: string) => void; onPoint?: (x: number, y: number) => void; readOnly?: boolean; className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const H = detailH(d, view);
  const shapes = detailShapes(d, view, side);
  function point(e: React.PointerEvent<SVGSVGElement>) {
    if (!onPoint || readOnly || !ref.current) return;
    const pt = ref.current.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = ref.current.getScreenCTM(); if (!m) return;
    const q = pt.matrixTransform(m.inverse());
    if (q.x < 0 || q.x > 120 || q.y < 0 || q.y > H) return;
    onPoint(Math.round(q.x), Math.round(q.y));
  }
  return (
    <svg ref={ref} viewBox={`0 0 120 ${H}`} onPointerDown={point} className={`mx-auto w-auto max-w-full touch-manipulation select-none ${className}`} role="group" aria-label={`${d === 'hand' ? 'Hand' : 'Foot'} figure`}>
      {shapes.map((s) => (
        <g key={s.id} onClick={onToggle && !readOnly ? () => onToggle(s.id) : undefined} className={onToggle && !readOnly ? 'cursor-pointer' : ''} role={onToggle ? 'button' : undefined} aria-label={partLabel(s.id)} aria-pressed={onToggle ? !!sel?.has(s.id) : undefined}>
          <title>{partLabel(s.id)}</title>
          <g dangerouslySetInnerHTML={{ __html: shapeEl(s, !!sel?.has(s.id)) }} />
        </g>
      ))}
      <g style={{ pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: pins.map((p) => pinEl(p, 4)).join('') }} />
    </svg>
  );
}
