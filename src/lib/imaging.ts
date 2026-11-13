import type { Clinic, Doctor, SealCfg } from './types';

export const fileToDataUrl = (f: File | Blob): Promise<string> =>
  new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read image')); i.src = src; });

export async function imageSize(src: string) { const i = await loadImage(src); return { w: i.naturalWidth, h: i.naturalHeight }; }

export async function resizeImage(src: string, maxSide: number, keepAlpha = true): Promise<string> {
  const img = await loadImage(src);
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const ctx = c.getContext('2d')!;
  if (!keepAlpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.92);
}

/** Makes near-white pixels transparent (for scanned / photographed signatures) and trims empty borders. */
export async function cleanSignature(src: string, removeWhite: boolean, maxSide = 900): Promise<string> {
  const img = await loadImage(src);
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (removeWhite) {
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const lum = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
      if (lum > 225) d.data[i + 3] = 0;
      else if (lum > 150) d.data[i + 3] = Math.round(d.data[i + 3] * ((225 - lum) / 75));
    }
    ctx.putImageData(d, 0, 0);
  }
  return trimCanvas(c).toDataURL('image/png');
}

export function trimCanvas(c: HTMLCanvasElement, pad = 6): HTMLCanvasElement {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: h } = c;
  const d = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  if (maxX < 0) return c;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
  const o = document.createElement('canvas');
  o.width = maxX - minX + 1; o.height = maxY - minY + 1;
  o.getContext('2d')!.drawImage(c, minX, minY, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}

/** MedScript brand mark → PNG data URL (for jsPDF). */
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 100" width="520" height="400"><defs><linearGradient id="b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1D4ED8"/><stop offset="1" stop-color="#2563EB"/></linearGradient><linearGradient id="t" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0D9488"/><stop offset="1" stop-color="#14B8A6"/></linearGradient></defs><path d="M12 90 L28 22 L48 64 L70 22 L84 90" fill="none" stroke="url(#b)" stroke-width="17" stroke-miterlimit="2.2"/><path d="M104 12v36M86 30h36" fill="none" stroke="url(#t)" stroke-width="14"/></svg>`;
let markCache = '';
export async function brandMarkPng(): Promise<string> {
  if (markCache) return markCache;
  const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MARK_SVG));
  const c = document.createElement('canvas'); c.width = 520; c.height = 400;
  c.getContext('2d')!.drawImage(img, 0, 0, 520, 400);
  return (markCache = c.toDataURL('image/png'));
}

/* ---------- Seal generator ---------- */
const INK = { blue: '#1B3FA8', black: '#16181d', red: '#B42323' } as const;

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, weight = '700', min = 14) {
  let s = start;
  for (; s > min; s -= 1) { ctx.font = `${weight} ${s}px Arial, Helvetica, sans-serif`; if (ctx.measureText(text).width <= maxW) break; }
  ctx.font = `${weight} ${s}px Arial, Helvetica, sans-serif`;
  return s;
}
function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, centerAngle: number, size: number, bottom: boolean, maxSweep: number) {
  let fs = size;
  const spacing = 2;
  let total = 0;
  for (; fs > 12; fs -= 1) {
    ctx.font = `700 ${fs}px Arial, Helvetica, sans-serif`;
    total = [...text].reduce((a, ch) => a + ctx.measureText(ch).width + spacing, 0) / r;
    if (total <= maxSweep) break;
  }
  ctx.font = `700 ${fs}px Arial, Helvetica, sans-serif`;
  total = [...text].reduce((a, ch) => a + ctx.measureText(ch).width + spacing, 0) / r;
  let ang = bottom ? centerAngle + total / 2 : centerAngle - total / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const ch of text) {
    const w = ctx.measureText(ch).width + spacing;
    const a = bottom ? ang - w / r / 2 : ang + w / r / 2;
    ctx.save();
    ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.rotate(bottom ? a - Math.PI / 2 : a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    ang = bottom ? ang - w / r : ang + w / r;
  }
}
const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] => {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
};

export function sealPossible(doc: Doctor): boolean { return !!(doc.fullName.trim() && doc.regNo.trim()); }

/** Renders a stamp from the doctor's own verified profile. Never fills in missing data. */
export function renderSeal(cfg: SealCfg, doc: Doctor, clinic?: Clinic): string {
  const ink = INK[cfg.ink];
  const c = document.createElement('canvas');
  const name = (/^dr\.?\s/i.test(doc.fullName) ? doc.fullName : 'Dr. ' + doc.fullName).trim();
  const reg = doc.regNo.trim() ? `REG. NO. ${doc.regNo.trim()}` : '';
  if (cfg.style === 'circle') {
    const S = 640; c.width = S; c.height = S;
    const ctx = c.getContext('2d')!; ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = ink; ctx.fillStyle = ink;
    const cx = S / 2, cy = S / 2;
    ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, 300, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 228, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 308, 0, Math.PI * 2); ctx.stroke();
    if (cfg.showName) arcText(ctx, name.toUpperCase(), cx, cy, 262, -Math.PI / 2, 46, false, 2.5);
    if (cfg.showReg && reg) arcText(ctx, reg, cx, cy, 262, Math.PI / 2, 40, true, 2.4);
    ctx.font = '700 38px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★', cx - 268, cy); ctx.fillText('★', cx + 268, cy);
    const lines: { t: string; w: string; s: number }[] = [];
    ctx.font = '700 40px Arial';
    if (cfg.showQuals && doc.qualifications) wrapLines(ctx, doc.qualifications.toUpperCase(), 330).forEach((t) => lines.push({ t, w: '700', s: 40 }));
    if (cfg.showSpecialty && doc.specialty) wrapLines(ctx, doc.specialty.toUpperCase(), 330).forEach((t) => lines.push({ t, w: '700', s: 34 }));
    if (cfg.showClinic && clinic?.name) wrapLines(ctx, clinic.name, 330).forEach((t) => lines.push({ t, w: '400', s: 30 }));
    const lh = 46; let y = cy - ((lines.length - 1) * lh) / 2;
    for (const l of lines.slice(0, 5)) { fit(ctx, l.t, 340, l.s, l.w, 18); ctx.fillText(l.t, cx, y); y += lh; }
    return c.toDataURL('image/png');
  }
  const W = 900, H = 460; c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = ink; ctx.fillStyle = ink;
  ctx.lineWidth = 8; ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.lineWidth = 3; ctx.strokeRect(24, 24, W - 48, H - 48);
  const rows: { t: string; w: string; s: number }[] = [];
  if (cfg.showName) rows.push({ t: name, w: '700', s: 64 });
  if (cfg.showQuals && doc.qualifications) rows.push({ t: doc.qualifications, w: '600', s: 40 });
  if (cfg.showSpecialty && doc.specialty) rows.push({ t: doc.specialty, w: '400', s: 36 });
  if (cfg.showClinic && clinic?.name) rows.push({ t: clinic.name, w: '400', s: 34 });
  if (cfg.showReg && doc.regNo.trim()) rows.push({ t: `Reg. No. ${doc.regNo.trim()}`, w: '700', s: 44 });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lh = Math.min(76, (H - 100) / Math.max(rows.length, 1)); let y = H / 2 - ((rows.length - 1) * lh) / 2;
  rows.forEach((r, i) => {
    fit(ctx, r.t, W - 110, r.s, r.w, 20);
    if (i === rows.length - 1 && cfg.showReg && rows.length > 1) { ctx.fillRect(70, y - lh / 2 + 4, W - 140, 3); }
    ctx.fillText(r.t, W / 2, y); y += lh;
  });
  return c.toDataURL('image/png');
}
export const sealAspect = (cfg: SealCfg) => (cfg.style === 'circle' ? 1 : 460 / 900);
