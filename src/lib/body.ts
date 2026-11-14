/** Simple front/back body figure with tappable regions, used in the Builder and printed (marked) on the prescription. */
export type Shape = { id: string; t: 'e' | 'r'; a: number[] };
const CX = 60;
const NAMES: Record<string, string> = { head: 'Head', neck: 'Neck', cervical: 'Cervical spine', thoracic: 'Dorsal spine', lumbar: 'Lumbar spine', sacrum: 'Sacrum / SI joint', chest: 'Chest', abdomen: 'Abdomen / pelvis', shoulder: 'shoulder', scapula: 'scapula', arm: 'arm', elbow: 'elbow', forearm: 'forearm', wrist: 'wrist', hand: 'hand', hip: 'hip', thigh: 'thigh', knee: 'knee', leg: 'leg', ankle: 'ankle', foot: 'foot' };
export const partLabel = (id: string) => {
  const [p, s] = id.split('-');
  return s ? `${s === 'R' ? 'Right' : 'Left'} ${NAMES[p] || p}` : NAMES[p] || id;
};
const BACK_ONLY = ['cervical', 'thoracic', 'lumbar', 'sacrum', 'scapula'];
export const needsBack = (sel: string[]) => sel.some((s) => BACK_ONLY.includes(s.split('-')[0]));
export const sideOf = (sel: string[]): 'Left' | 'Right' | 'Bilateral' | '' => {
  const r = sel.some((s) => s.endsWith('-R')), l = sel.some((s) => s.endsWith('-L'));
  return r && l ? 'Bilateral' : r ? 'Right' : l ? 'Left' : '';
};

export function shapes(view: 'front' | 'back'): Shape[] {
  const out: Shape[] = [];
  const e = (id: string, cx: number, cy: number, rx: number, ry: number) => out.push({ id, t: 'e', a: [cx, cy, rx, ry] });
  const r = (id: string, x: number, y: number, w: number, h: number, rr = 4) => out.push({ id, t: 'r', a: [x, y, w, h, rr] });
  e('head', CX, 17, 11, 14);
  r(view === 'front' ? 'neck' : 'cervical', 54, 31, 12, 10, 3);
  if (view === 'front') { r('chest', 41, 42, 38, 30, 7); r('abdomen', 43, 73, 34, 26, 6); }
  else { r('thoracic', 43, 42, 34, 33, 6); r('lumbar', 44, 76, 32, 22, 6); r('sacrum', 47, 99, 26, 14, 5); }
  for (const side of ['R', 'L'] as const) {
    const sg = (side === 'R' ? -1 : 1) * (view === 'front' ? 1 : -1);
    const x = (dx: number) => CX + sg * dx;
    const ex = (dx: number, w: number) => x(dx) - w / 2;
    e(`shoulder-${side}`, x(28), 47, 8, 8);
    if (view === 'back') e(`scapula-${side}`, x(15), 57, 8, 11);
    r(`arm-${side}`, ex(33, 10), 55, 10, 34, 4);
    e(`elbow-${side}`, x(34), 93, 6, 6);
    r(`forearm-${side}`, ex(36, 9), 99, 9, 32, 4);
    e(`wrist-${side}`, x(37), 135, 5, 4);
    e(`hand-${side}`, x(38), 147, 6, 9);
    e(`hip-${side}`, x(15), 108, 10, 9);
    r(`thigh-${side}`, ex(13, 17), 117, 17, 53, 6);
    e(`knee-${side}`, x(12), 177, 9, 8);
    r(`leg-${side}`, ex(11, 14), 186, 14, 48, 5);
    e(`ankle-${side}`, x(11), 239, 6, 5);
    e(`foot-${side}`, x(12), 253, 8, 8);
  }
  return out;
}
const sty = (on: boolean) => (on ? 'fill="#e11d48" fill-opacity="0.88" stroke="#9f1239" stroke-width="1.2"' : 'fill="#eef2f7" stroke="#8a97a8" stroke-width="0.9"');
export function shapeEl(s: Shape, on: boolean) {
  return s.t === 'e' ? `<ellipse cx="${s.a[0]}" cy="${s.a[1]}" rx="${s.a[2]}" ry="${s.a[3]}" ${sty(on)}/>` : `<rect x="${s.a[0]}" y="${s.a[1]}" width="${s.a[2]}" height="${s.a[3]}" rx="${s.a[4]}" ${sty(on)}/>`;
}
export const BODY_H = 270;
/** SVG string with one or two views for printing */
export type Pin = { v: 'front' | 'back'; x: number; y: number };
export const pinEl = (p: Pin, r = 4.2) => `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#f59e0b" stroke="#7c2d12" stroke-width="1.3"/><circle cx="${p.x}" cy="${p.y}" r="${r * 0.35}" fill="#fff"/>`;
/** which body region a tapped point belongs to (nearest shape) */
export function regionAt(v: 'front' | 'back', x: number, y: number): string {
  let best = '', bd = 1e9;
  for (const s of shapes(v)) {
    const d = s.t === 'e' ? Math.hypot((x - s.a[0]) / s.a[2], (y - s.a[1]) / s.a[3]) : Math.hypot((x - (s.a[0] + s.a[2] / 2)) / (s.a[2] / 2), (y - (s.a[1] + s.a[3] / 2)) / (s.a[3] / 2)) * 0.9;
    if (d < bd) { bd = d; best = s.id; }
  }
  return bd < 2.2 ? partLabel(best) : '';
}
export function bodySvg(sel: string[], views: ('front' | 'back')[], pins: Pin[] = []): string {
  const S = new Set(sel);
  const g = views.map((v, i) => `<g transform="translate(${i * 124},0)">${shapes(v).map((s) => shapeEl(s, S.has(s.id))).join('')}${pins.filter((p) => p.v === v).map((p) => pinEl(p, 6.5)).join('')}</g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${views.length * 124 - 4} ${BODY_H}" width="${views.length * 124 - 4}" height="${BODY_H}">${g}</svg>`;
}
/** Marked figure as PNG for the PDF; size in mm */
export async function bodyPng(sel: string[], pins: Pin[] = []): Promise<{ url: string; w: number; h: number } | null> {
  if (!sel.length && !pins.length) return null;
  const views: ('front' | 'back')[] = needsBack(sel) || pins.some((p) => p.v === 'back') ? ['front', 'back'] : ['front'];
  const svg = bodySvg(sel, views, pins);
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('body')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const W = views.length * 120 * 4, H = BODY_H * 4;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  c.getContext('2d')!.drawImage(img, 0, 0, W, H);
  const hMm = 38;
  return { url: c.toDataURL('image/png'), w: (hMm * W) / H, h: hMm };
}
