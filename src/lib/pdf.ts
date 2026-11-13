import type { DoctorSnapshot, Prescription, RxItem } from './types';
import { brandMarkPng, imageSize, renderSeal } from './imaging';
import { dosePattern, computeQty, doseLabel, durationLabel, freqLabel, freqMeta, itemInstructions, timingMeta } from './dosage';
import { addDays, fmtDate, fmtDateTime } from './util';

const NAVY: [number, number, number] = [16, 36, 58];
const BLUE: [number, number, number] = [37, 99, 235];
const TEAL: [number, number, number] = [13, 148, 136];
const GREY: [number, number, number] = [90, 100, 115];
const RED: [number, number, number] = [198, 40, 40];
const SURFACE: [number, number, number] = [243, 246, 250];

const clean = (s: string) => (s || '').replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF–—‘’“”•…]/g, '').replace(/→/g, '->');
import { adviceHi } from '../data/advice';
const DEV = /[\u0900-\u097F]/;
const FORM_PREFIX: Record<string, string> = { Tablet: 'TAB.', Capsule: 'CAP.', Syrup: 'SYP.', Suspension: 'SUSP.', Injection: 'INJ.', Gel: 'GEL', Cream: 'CREAM', Ointment: 'OINT.', Drops: 'DROPS', Sachet: 'SACHET', Powder: 'POWDER', Lotion: 'LOTION', Spray: 'SPRAY', Patch: 'PATCH', Inhaler: 'INHALER' };
const drName = (n: string) => (!n.trim() ? '' : /^dr\.?\s/i.test(n) ? n.trim() : 'Dr. ' + n.trim());

export interface PdfOpts { draft: boolean; showSignature: boolean; showStamp: boolean; showLogo: boolean }
export const pdfName = (rx: Prescription) => `Rx_${(rx.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '_')}_${new Date(rx.authorizedAt || rx.updatedAt).toISOString().slice(0, 10)}${rx.rxNo ? '_' + rx.rxNo : '_DRAFT'}.pdf`;

export function itemTitle(it: RxItem, mode: 'generic' | 'brand', caps: boolean): { main: string; sub: string } {
  const pre = FORM_PREFIX[it.form] || '';
  const gen = caps ? it.generic.toUpperCase() : it.generic;
  const st = it.strength ? ' ' + it.strength : '';
  if (mode === 'brand' && it.brand) return { main: `${pre ? pre + ' ' : ''}${it.brand}${st}`, sub: `(${gen})` };
  return { main: `${pre ? pre + ' ' : ''}${gen}${st}`, sub: it.brand ? `(Brand: ${it.brand})` : '' };
}

export async function buildPdf(rx: Prescription, snap: DoctorSnapshot, opts: PdfOpts): Promise<{ blob: Blob; pages: number }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `Prescription - ${rx.patient.name || 'Patient'}`, author: drName(snap.doctor.fullName) || 'MedScript', creator: 'MedScript' });
  const PW = 210, PH = 297, M = 14, CW = PW - 2 * M;
  const L = snap.layout;
  const sc = L.fontScale === 'large' ? 1.1 : 1;
  const clinic = snap.clinic;
  let y = 0;
  const lh = (pt: number) => pt * 0.3528 * 1.28;
  const font = (style: 'normal' | 'bold' | 'italic' | 'bolditalic', size: number, color: [number, number, number] = NAVY) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]);
  };
  const wrap = (t: string, w: number) => doc.splitTextToSize(clean(t), w) as string[];
  /* Devanagari text is drawn as an image (the PDF base fonts have no Devanagari), shaped by the browser. */
  const PXMM = 11;
  const hiCache = new Map<string, { url: string; w: number; h: number }>();
  const hiBlock = (text: string, wMm: number, pt: number, color: [number, number, number], bold = false) => {
    const key = [text, wMm, pt, color.join(), bold].join('|');
    const hit = hiCache.get(key); if (hit) return hit;
    const px = pt * 0.3528 * PXMM, lineH = px * 1.6, maxW = wMm * PXMM;
    const f = `${bold ? 700 : 400} ${px}px "Noto Sans Devanagari", "Inter Variable", sans-serif`;
    const c = document.createElement('canvas'); const ctx = c.getContext('2d')!;
    ctx.font = f;
    const lines: string[] = []; let cur = '';
    for (const wd of text.split(/\s+/)) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; }
    if (cur) lines.push(cur);
    c.width = Math.ceil(maxW); c.height = Math.ceil(lineH * lines.length);
    ctx.font = f; ctx.fillStyle = `rgb(${color.join(',')})`; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, 0, i * lineH + px * 0.2));
    const out = { url: c.toDataURL('image/png'), w: c.width / PXMM, h: c.height / PXMM };
    hiCache.set(key, out); return out;
  };
  const hiPara = (t: string, x: number, w: number, size: number, color: [number, number, number], bold: boolean, gap = 0) => {
    const b = hiBlock(t, w, size, color, bold); ensure(b.h);
    doc.addImage(b.url, 'PNG', x, y, b.w, b.h, undefined, 'FAST'); y += b.h + gap;
  };
  /** draw wrapped paragraph, advance y */
  const para = (t: string, x: number, w: number, style: Parameters<typeof font>[0], size: number, color?: [number, number, number], gap = 0) => {
    if (DEV.test(t)) { hiPara(t, x, w, size, color || NAVY, style === 'bold' || style === 'bolditalic', gap); return; }
    font(style, size, color);
    const lines = wrap(t, w);
    for (const ln of lines) { ensure(lh(size)); doc.text(ln, x, y + size * 0.3528 * 0.85); y += lh(size); }
    y += gap;
  };
  const heightOf = (t: string, w: number, size: number, style: Parameters<typeof font>[0] = 'normal') => {
    if (DEV.test(t)) return hiBlock(t, w, size, NAVY, style === 'bold').h;
    font(style, size); return wrap(t, w).length * lh(size);
  };
  try { await Promise.all([document.fonts.load('400 16px "Noto Sans Devanagari"', 'अ'), document.fonts.load('700 16px "Noto Sans Devanagari"', 'अ')]); } catch { /* falls back to system font */ }

  const logoMark = await brandMarkPng();
  const sigSize = snap.signature.dataUrl ? await imageSize(snap.signature.dataUrl) : null;
  const sealUrl = snap.seal.mode === 'uploaded' ? snap.seal.uploaded : snap.seal.mode === 'generated' ? snap.sealDataUrl : '';
  const sealSize = sealUrl ? await imageSize(sealUrl) : null;
  const logoSize = clinic.logo ? await imageSize(clinic.logo) : null;

  /* ---------- header ---------- */
  const drawHeader = () => {
    const top = 11;
    let leftX = M;
    let hLogo = 0;
    if (opts.showLogo) {
      const box = { w: 26, h: 22 };
      if (clinic.logo && logoSize) {
        const k = Math.min(box.w / logoSize.w, box.h / logoSize.h);
        const w = logoSize.w * k, h = logoSize.h * k;
        doc.addImage(clinic.logo, 'PNG', M, top + (box.h - h) / 2, w, h, undefined, 'FAST');
        leftX = M + box.w + 5; hLogo = box.h;
      } else if (L.headerBrand) {
        doc.addImage(logoMark, 'PNG', M, top + 2, 20, 15.4, undefined, 'FAST');
        font('bold', 10, NAVY); doc.text('MedScript', M, top + 21.5);
        leftX = M + 28; hLogo = 24;
      }
    }
    // doctor block
    y = top + 1;
    const dw = 100 - (leftX - M);
    font('bold', 16 * sc, NAVY);
    const nm = clean(drName(snap.doctor.fullName)) || 'Doctor name not set';
    doc.text(nm, leftX, y + 5); y += 7.2 * sc;
    if (snap.doctor.qualifications) { font('normal', 9.5 * sc, NAVY); wrap(snap.doctor.qualifications, dw).forEach((l) => { doc.text(l, leftX, y + 3); y += 4.2; }); }
    if (snap.doctor.specialty) { font('bold', 9.5 * sc, TEAL); wrap(snap.doctor.specialty, dw).forEach((l) => { doc.text(l, leftX, y + 3); y += 4.2; }); }
    const reg = snap.doctor.regNo ? `Reg. No.: ${snap.doctor.regNo}${snap.doctor.regCouncil ? ' (' + snap.doctor.regCouncil + ')' : ''}` : '';
    if (reg) { font('bold', 9 * sc, NAVY); wrap(reg, dw).forEach((l) => { doc.text(l, leftX, y + 3); y += 4; }); }
    const leftEnd = y;
    // clinic block
    let ry = top + 1; const rx0 = 118, rw = PW - M - rx0;
    if (clinic.name) { font('bold', 10.5 * sc, NAVY); wrap(clinic.name, rw).forEach((l) => { doc.text(l, rx0, ry + 4); ry += 4.6; }); }
    font('normal', 8.5 * sc, GREY);
    if (clinic.address) wrap(clinic.address, rw).forEach((l) => { doc.text(l, rx0, ry + 3.5); ry += 3.9; });
    const phone = clinic.phone || snap.doctor.phone;
    if (phone) { doc.text('Ph: ' + clean(phone), rx0, ry + 3.5); ry += 3.9; }
    const email = clinic.email || snap.doctor.email;
    if (email) { doc.text(clean(email), rx0, ry + 3.5); ry += 3.9; }
    if (clinic.timings) wrap('Timings: ' + clinic.timings, rw).forEach((l) => { doc.text(l, rx0, ry + 3.5); ry += 3.9; });
    y = Math.max(leftEnd, ry, top + hLogo) + 2.5;
    doc.setDrawColor(...BLUE); doc.setLineWidth(0.7); doc.line(M, y, PW - M, y);
    doc.setDrawColor(...TEAL); doc.setLineWidth(0.3); doc.line(M, y + 0.9, PW - M, y + 0.9);
    y += 4;
  };
  const drawContHeader = () => {
    y = 10;
    font('bold', 9, NAVY); doc.text(clean(drName(snap.doctor.fullName)), M, y + 3);
    font('normal', 8.5, GREY); doc.text(clean(`Patient: ${rx.patient.name} ${rx.patient.pid ? '(' + rx.patient.pid + ')' : ''} - continued`), PW - M, y + 3, { align: 'right' });
    doc.setDrawColor(...BLUE); doc.setLineWidth(0.5); doc.line(M, y + 6, PW - M, y + 6);
    y += 10;
  };

  const SIG_H = 40;
  const limitNormal = () => PH - 16;
  function ensure(h: number) {
    if (y + h > limitNormal()) { doc.addPage(); drawContHeader(); }
  }

  drawHeader();

  /* ---------- patient strip ---------- */
  {
    const p = rx.patient;
    const when = fmtDate(rx.authorizedAt || rx.createdAt);
    const ageSex = `${p.age ? p.age + (p.ageUnit === 'M' ? ' M' : ' Y') : '-'} / ${p.sex || '-'}`;
    const row2: string[] = [];
    if (L.showPhone && p.phone) row2.push(`Phone: ${p.phone}`);
    if (p.weight) row2.push(`Weight: ${p.weight} kg`);
    if (rx.rxNo) row2.push(`Rx No.: ${rx.rxNo}`);
    const allergy = p.allergies.trim() ? `Allergies: ${p.allergies.trim()}` : '';
    const noAllergy = /^(no known|nkda|nil|none|no allerg)/i.test(p.allergies.trim());
    const h = 7 + (row2.length ? 5 : 0) + (allergy ? heightOf(allergy, CW - 6, 8.5 * sc, 'bold') + 0.5 : 0) + 3;
    doc.setFillColor(...SURFACE); doc.roundedRect(M, y, CW, h, 1.6, 1.6, 'F');
    let yy = y + 5.2;
    if (DEV.test(p.name)) { const b = hiBlock(p.name, 78, 10 * sc, NAVY, true); doc.addImage(b.url, 'PNG', M + 3, yy - 4.4, b.w, b.h, undefined, 'FAST'); } else { font('bold', 10 * sc, NAVY); doc.text(clean(p.name || 'Patient name not entered'), M + 3, yy); }
    font('normal', 9 * sc, NAVY);
    doc.text(clean(`Age/Sex: ${ageSex}`), M + 84, yy);
    doc.text(clean(`ID: ${p.pid || '-'}`), M + 122, yy);
    doc.text(`Date: ${when}`, PW - M - 3, yy, { align: 'right' });
    yy += 5;
    if (row2.length) { font('normal', 8.5 * sc, GREY); doc.text(clean(row2.join('     ')), M + 3, yy); yy += 5; }
    if (allergy) { font(noAllergy ? 'normal' : 'bold', 8.5 * sc, noAllergy ? GREY : RED); wrap(allergy, CW - 6).forEach((l) => { doc.text(l, M + 3, yy); yy += lh(8.5 * sc); }); }
    y += h + 3.5;
  }

  /* ---------- clinical ---------- */
  const c = rx.clinical;
  const block = (label: string, text: string, w = CW) => {
    if (!text.trim()) return;
    ensure(lh(9) * 2 + 2);
    font('bold', 7.5 * sc, TEAL); doc.text(label.toUpperCase(), M, y + 2.6); y += 3.6;
    para(text, M, w, 'normal', 9.2 * sc, NAVY, 1.6);
  };
  if (rx.print.complaint) block('Chief complaint', c.complaint);
  if (c.diagnosis.trim()) block('Diagnosis', c.diagnosis + (c.side && c.side !== 'N/A' ? ` (${c.side})` : ''));
  if ((c.comorbidities || '').trim()) block('Comorbidities', c.comorbidities!);
  if (rx.print.examination) block('Examination', c.examination.split(/[;\n]/).map((x) => x.trim()).filter((x) => x && !/:\s*$/.test(x)).join('; '));
  if (rx.print.investigations) block('Investigations', c.investigations);
  if (rx.print.notes) block('Clinical notes', c.notes);

  /* ---------- medicines ---------- */
  if (rx.items.length) {
    ensure(26);
    y += 1;
    font('bolditalic', 22 * sc, BLUE); doc.text('Rx', M, y + 7);
    doc.setDrawColor(210, 218, 228); doc.setLineWidth(0.25); doc.line(M + 14, y + 5.5, PW - M, y + 5.5);
    y += 11;
    rx.items.forEach((it, idx) => {
      const t = itemTitle(it, L.nameDisplay, L.genericCaps);
      const indent = M + 7, w = CW - 7;
      const comp = it.ingredients.map((g) => `${g.name}${g.strength ? ' ' + g.strength : ''}`).join(' + ');
      const compLine = L.showComposition && (it.ingredients.length > 1 || it.brand) ? `Composition: ${comp}${it.manufacturer ? '  |  Mfr: ' + it.manufacturer : ''}` : '';
      const qty = computeQty(it);
      const parts: string[] = [];
      if (it.useTaper && it.taper.length) parts.push('Dose: tapering schedule');
      else parts.push(`Dose: ${doseLabel(it) || '-'}`);
      parts.push(`Route: ${it.route}`);
      parts.push(`Freq: ${it.useTaper ? 'as below' : freqLabel(it) + (dosePattern(it) ? ` (${dosePattern(it)})` : '')}`);
      const tm = timingMeta(it.timing); if (tm) parts.push(tm.label);
      if (!it.useTaper && durationLabel(it)) parts.push(`Duration: ${durationLabel(it)}`);
      if (it.freq === 'SOS' && it.sosMax) parts.push(`Max ${it.sosMax}/day`);
      if (qty.text) parts.push(`Qty: ${qty.text}`);
      const ins = itemInstructions(it, rx.lang);
      const insLines: { t: string; style: 'italic' | 'normal'; hi?: boolean }[] = [];
      if (ins.en) insLines.push({ t: ins.en, style: 'italic' });
      if (ins.hi) insLines.push({ t: ins.hi, style: 'italic', hi: true });
      if (ins.schedule) insLines.push({ t: ins.schedule, style: 'normal', hi: true });
      const nameFull = t.main + (t.sub ? '  ' + t.sub : '');
      let need = heightOf(`${idx + 1}. ` + nameFull, w, 10.5 * sc, 'bold') + (compLine ? heightOf(compLine, w, 8 * sc) : 0) + heightOf(parts.join('     '), w, 8.8 * sc, 'bold');
      insLines.forEach((l) => (need += l.hi ? hiBlock(l.t, w - 2, 9 * sc, NAVY, l.style === 'normal').h : heightOf(l.t, w - 2, 8.8 * sc, l.style)));
      ensure(Math.min(need + 3, 40));
      // number + name
      font('bold', 10.5 * sc, NAVY);
      doc.text(`${idx + 1}.`, M, y + 3.6);
      const nameLines = wrap(t.main, w);
      nameLines.forEach((l, i) => { font('bold', 10.5 * sc, NAVY); ensure(lh(10.5 * sc)); doc.text(l, indent, y + 3.6); if (i === nameLines.length - 1 && t.sub) { const tw = doc.getTextWidth(l + '  '); font('normal', 9 * sc, GREY); doc.text(clean(t.sub), indent + tw, y + 3.6); } y += lh(10.5 * sc); });
      if (compLine) para(compLine, indent, w, 'normal', 8 * sc, GREY);
      para(parts.join('     '), indent, w, 'bold', 8.8 * sc, [30, 64, 110]);
      if (it.useTaper && it.taper.length) {
        const steps = it.taper.map((s, i) => `Step ${i + 1}: ${s.dose} ${it.doseUnit}${s.dose > 1 ? 's' : ''} x ${s.timesPerDay}/day for ${s.days} day${s.days > 1 ? 's' : ''}`).join('   ');
        para(steps, indent, w, 'normal', 8.5 * sc, NAVY);
      }
      insLines.forEach((l) => (l.hi ? hiPara(l.t, indent + 2, w - 2, 9 * sc, l.style === 'italic' ? [60, 72, 90] : TEAL, l.style === 'normal') : para(l.t, indent + 2, w - 2, l.style, 8.8 * sc, [60, 72, 90])));
      y += 1.6;
      doc.setDrawColor(228, 233, 240); doc.setLineWidth(0.2);
      if (idx < rx.items.length - 1) { doc.line(indent, y, PW - M, y); y += 2.6; }
    });
    y += 2;
  }

  /* ---------- advice & follow-up ---------- */
  const advice = c.advice.map((a) => a.trim()).filter(Boolean);
  if (advice.length) {
    ensure(14);
    font('bold', 7.5 * sc, TEAL); doc.text('ADVICE', M, y + 2.6); y += 3.8;
    advice.forEach((a) => {
      const hi = rx.lang !== 'en' ? adviceHi(a) : '';
      const showEn = !(rx.lang === 'hi' && hi);
      if (DEV.test(a)) { ensure(8); doc.setFillColor(...NAVY); doc.circle(M + 1.6, y + 2.2, 0.55, 'F'); hiPara(a, M + 5, CW - 5, 9.2 * sc, NAVY, false, 0.4); return; }
      ensure((showEn ? wrap(a, CW - 5).length * lh(9.2 * sc) : 0) + (hi ? hiBlock(hi, CW - 5, 9, NAVY).h + 0.6 : 0));
      if (showEn) {
        font('normal', 9.2 * sc, NAVY);
        const lines = wrap(a, CW - 5);
        ensure(lines.length * lh(9.2 * sc));
        doc.text('•', M + 1, y + 3);
        lines.forEach((ln) => { doc.text(ln, M + 5, y + 3); y += lh(9.2 * sc); });
      }
      if (hi) { ensure(6); if (!showEn) { doc.setFillColor(...NAVY); doc.circle(M + 1.6, y + 2.2, 0.55, 'F'); } hiPara(hi, M + 5, CW - 5, 9, showEn ? TEAL : NAVY, false, 0.6); }
    });
    y += 1.5;
  }
  const refDate = new Date(rx.authorizedAt || rx.createdAt);
  const fuDate = rx.followUpDays > 0 ? addDays(refDate, rx.followUpDays) : null;
  const nt = (c.nextTests || '').trim();
  if (fuDate || nt) {
    const ntLines = nt ? wrap('Tests before next visit: ' + nt, CW - 6) : [];
    const hbox = 3 + (fuDate ? 5 : 0) + ntLines.length * 4.4;
    ensure(hbox + 2);
    doc.setFillColor(234, 245, 243); doc.roundedRect(M, y, CW, hbox, 1.2, 1.2, 'F');
    let yy = y + 5;
    if (fuDate) {
      const label = rx.followUpDays % 7 === 0 ? `${rx.followUpDays / 7} week${rx.followUpDays / 7 > 1 ? 's' : ''}` : `${rx.followUpDays} days`;
      const wd = fuDate.toLocaleDateString('en-GB', { weekday: 'long' });
      font('bold', 9.5 * sc, TEAL); doc.text(`Next visit: ${fmtDate(fuDate)} (${wd})  -  follow-up after ${label}`, M + 3, yy); yy += 5;
    }
    ntLines.forEach((l) => { font('bold', 9 * sc, NAVY); doc.text(l, M + 3, yy); yy += 4.4; });
    y += hbox + 3;
  }
  const wa = (clinic.whatsapp || '').trim(), an = (clinic.appointmentNote || '').trim();
  if (wa) para(`For any problem, WhatsApp: ${wa}`, M, CW, 'bold', 9 * sc, NAVY, 1);
  if (an) para(an, M, CW, 'normal', 8.6 * sc, GREY, 1);

  /* ---------- signature block (last page) ---------- */
  if (y > PH - 16 - SIG_H - 2) { doc.addPage(); drawContHeader(); }
  const sigBottom = PH - 18;
  const lineY = sigBottom - 12;
  const showSig = !opts.draft && opts.showSignature && snap.signature.dataUrl && sigSize;
  const showSeal = !opts.draft && opts.showStamp && sealUrl && sealSize;
  const colW = 62;
  const sealW = showSeal ? snap.seal.widthMm : 0;
  const sealH = showSeal && sealSize ? sealW * (sealSize.h / sealSize.w) : 0;
  const sigRight = PW - M - (showSeal && !L.sealLeft ? sealW + 8 : 0);
  const sigLeft = sigRight - colW;
  if (showSig && sigSize) {
    let w = snap.signature.widthMm; let h = w * (sigSize.h / sigSize.w);
    if (h > 22) { h = 22; w = h * (sigSize.w / sigSize.h); }
    const x = sigRight - colW / 2 - w / 2 + snap.signature.offsetX;
    const yy = lineY - h - 0.5 + snap.signature.offsetY;
    doc.addImage(snap.signature.dataUrl, 'PNG', x, yy, w, h, undefined, 'FAST');
  }
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.3); doc.line(sigLeft, lineY, sigRight, lineY);
  font('bold', 9.5 * sc, NAVY); doc.text(clean(drName(snap.doctor.fullName)), sigRight - colW / 2, lineY + 4.2, { align: 'center' });
  font('normal', 8 * sc, GREY);
  let ty = lineY + 8;
  if (snap.doctor.qualifications) { doc.text(clean(snap.doctor.qualifications), sigRight - colW / 2, ty, { align: 'center', maxWidth: colW + 6 }); ty += 3.6; }
  if (snap.doctor.regNo) doc.text(clean('Reg. No. ' + snap.doctor.regNo), sigRight - colW / 2, ty, { align: 'center' });
  if (showSeal && sealSize) {
    const sx = (L.sealLeft ? sigLeft - sealW - 6 : PW - M - sealW) + snap.seal.offsetX;
    const sy = sigBottom - sealH + snap.seal.offsetY + 2;
    doc.addImage(sealUrl, 'PNG', sx, sy, sealW, sealH, undefined, 'FAST');
  }

  /* ---------- footers & watermark ---------- */
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (opts.draft) {
      try {
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.09 }));
        font('bold', 90, NAVY); doc.text('DRAFT', PW / 2, PH / 2 + 10, { align: 'center', angle: 35 });
        (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
      } catch { /* watermark is cosmetic */ }
    }
    doc.setDrawColor(210, 218, 228); doc.setLineWidth(0.25); doc.line(M, PH - 12, PW - M, PH - 12);
    font('normal', 7.5, GREY);
    const left = opts.draft ? 'DRAFT - not authorised by the doctor' : `Rx ${rx.rxNo}  |  Authorised ${fmtDateTime(rx.authorizedAt || Date.now())}`;
    doc.text(clean(left), M, PH - 8);
    doc.text(`Page ${i} of ${total}`, PW / 2, PH - 8, { align: 'center' });
    if (L.footerBranding) { font('bold', 7.5, BLUE); doc.text('Generated with MedScript', PW - M, PH - 8, { align: 'right' }); }
    if (L.footerNote.trim()) { font('italic', 7.5, GREY); doc.text(clean(L.footerNote), PW / 2, PH - 4.5, { align: 'center', maxWidth: CW }); }
  }
  return { blob: doc.output('blob'), pages: total };
}

export async function sealFor(snap: DoctorSnapshot) {
  return snap.seal.mode === 'generated' ? renderSeal(snap.seal, snap.doctor, snap.clinic) : '';
}
export { freqMeta };
