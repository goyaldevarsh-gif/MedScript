import type { DoctorSnapshot, Prescription, RxItem } from './types';
import { imageSize, renderSeal } from './imaging';
import { fmtMobile, phoneList } from './phone';
import { bodyPng } from './body';
import QRCode from 'qrcode';
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
export const pdfName = (rx: Prescription) => `Rx_${(rx.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'patient'}_${new Date(rx.authorizedAt || rx.updatedAt).toISOString().slice(0, 10)}${rx.rxNo ? '_' + rx.rxNo : '_DRAFT'}.pdf`;

export function itemTitle(it: RxItem, mode: 'generic' | 'brand', caps: boolean): { main: string; sub: string } {
  const pre = FORM_PREFIX[it.form] || '';
  const gen = caps ? it.generic.toUpperCase() : it.generic;
  const st = it.strength ? ' ' + it.strength : '';
  if (mode === 'brand' && it.brand) return { main: `${pre ? pre + ' ' : ''}${it.brand.toUpperCase()}`, sub: '' };
  return { main: `${pre ? pre + ' ' : ''}${gen}${st}`, sub: it.brand ? `(Brand: ${it.brand})` : '' };
}

async function renderPdf(rx: Prescription, snap: DoctorSnapshot, opts: PdfOpts, fit: number): Promise<{ blob: Blob; pages: number }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `Prescription - ${rx.patient.name || 'Patient'}`, author: drName(snap.doctor.fullName) || 'MedScript', creator: 'MedScript' });
  const PW = 210, PH = 297, M = 14, CW = PW - 2 * M;
  const L = snap.layout;
  const sc = (L.fontScale === 'large' ? 1.1 : 1) * fit;
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


  const sigSize = snap.signature.dataUrl ? await imageSize(snap.signature.dataUrl) : null;
  const sealUrl = snap.seal.mode === 'uploaded' ? snap.seal.uploaded : snap.seal.mode === 'generated' ? snap.sealDataUrl : '';
  const sealSize = sealUrl ? await imageSize(sealUrl) : null;
  const logoSize = clinic.logo ? await imageSize(clinic.logo) : null;
  const c = rx.clinical;
  const body = await bodyPng(c.bodyParts || []).catch(() => null);
  const qrText = (rx.qrUrl ?? clinic.qrUrl ?? '').trim();
  const qrUrl = qrText ? await QRCode.toDataURL(qrText, { margin: 0, width: 240, errorCorrectionLevel: 'M', color: { dark: '#3b4a5e', light: '#ffffff' } }).catch(() => '') : '';
  const lang: 'en' | 'hi' = rx.lang === 'en' ? 'en' : 'hi';
  const T = (en: string, hi: string) => (lang === 'hi' ? hi : en);

  /* ---------- header: clinic on the left, doctor on the right ---------- */
  const dPhones = phoneList(snap.doctor.phone, snap.doctor.morePhones);
  const cPhones = phoneList(clinic.phone, clinic.morePhones);
  const hasClinic = !!(clinic.name || clinic.address || cPhones.length || clinic.email || clinic.timings || clinic.logo);
  const drawHeader = () => {
    const top = 11;
    const rule = (yy: number) => { doc.setDrawColor(...BLUE); doc.setLineWidth(0.7); doc.line(M, yy, PW - M, yy); doc.setDrawColor(...TEAL); doc.setLineWidth(0.3); doc.line(M, yy + 0.9, PW - M, yy + 0.9); };
    // doctor lines
    const docLines: { t: string; st: 'bold' | 'normal'; sz: number; col: [number, number, number] }[] = [];
    const nm = clean(drName(snap.doctor.fullName)) || 'Doctor name not set';
    docLines.push({ t: nm, st: 'bold', sz: 15 * sc, col: NAVY });
    if (snap.doctor.qualifications) docLines.push({ t: snap.doctor.qualifications, st: 'normal', sz: 9.3 * sc, col: NAVY });
    if (snap.doctor.specialty) docLines.push({ t: snap.doctor.specialty, st: 'bold', sz: 9.3 * sc, col: TEAL });
    if (snap.doctor.regNo) docLines.push({ t: `Reg. No.: ${snap.doctor.regNo}${snap.doctor.regCouncil ? ' (' + snap.doctor.regCouncil + ')' : ''}`, st: 'bold', sz: 8.8 * sc, col: NAVY });
    if (dPhones.length) docLines.push({ t: 'Mob: ' + dPhones.join('  |  '), st: 'normal', sz: 8.6 * sc, col: GREY });
    if (snap.doctor.email && !hasClinic) docLines.push({ t: snap.doctor.email, st: 'normal', sz: 8.6 * sc, col: GREY });
    const dw = hasClinic ? 92 : CW - 4;
    let leftX = M, hLogo = 0;
    let ly = top;
    if (hasClinic) {
      if (opts.showLogo && clinic.logo && logoSize) {
        const box = { w: 24, h: 20 }; const k = Math.min(box.w / logoSize.w, box.h / logoSize.h);
        const w = logoSize.w * k, h = logoSize.h * k;
        doc.addImage(clinic.logo, 'PNG', M, top + (box.h - h) / 2, w, h, undefined, 'FAST');
        leftX = M + box.w + 4; hLogo = box.h;
      }
      const cw = 92 - (leftX - M);
      if (clinic.name) { font('bold', 12 * sc, NAVY); wrap(clinic.name, cw).forEach((l) => { doc.text(l, leftX, ly + 4.6); ly += 5; }); }
      font('normal', 8.4 * sc, GREY);
      if (clinic.address) wrap(clinic.address, cw).forEach((l) => { doc.text(l, leftX, ly + 3.6); ly += 3.9; });
      if (cPhones.length) wrap('Ph: ' + cPhones.join('  |  '), cw).forEach((l) => { doc.text(l, leftX, ly + 3.6); ly += 3.9; });
      if (clinic.email) { doc.text(clean(clinic.email), leftX, ly + 3.6); ly += 3.9; }
      if (clinic.timings) wrap('Timings: ' + clinic.timings, cw).forEach((l) => { doc.text(l, leftX, ly + 3.6); ly += 3.9; });
    } else if (opts.showLogo && clinic.logo && logoSize) { /* logo without details: keep left */ }
    // doctor block (right when a clinic is shown, otherwise left)
    let ry = top;
    const align = hasClinic ? 'right' : 'left';
    const rxPos = hasClinic ? PW - M : M;
    docLines.forEach((l) => {
      font(l.st, l.sz, l.col);
      wrap(l.t, dw).forEach((ln) => { doc.text(ln, rxPos, ry + l.sz * 0.3528 * 0.9, { align }); ry += lh(l.sz) * 0.95; });
      if (l === docLines[0]) ry += 0.6;
    });
    y = Math.max(ly, ry, top + hLogo) + 2.2;
    rule(y); y += 4.2;
  };
  const drawContHeader = () => {
    y = 10;
    font('bold', 9, NAVY); doc.text(clean(drName(snap.doctor.fullName)), M, y + 3);
    font('normal', 8.5, GREY); doc.text(clean(`Patient: ${rx.patient.name} ${rx.patient.pid ? '(' + rx.patient.pid + ')' : ''} - continued`), PW - M, y + 3, { align: 'right' });
    doc.setDrawColor(...BLUE); doc.setLineWidth(0.5); doc.line(M, y + 6, PW - M, y + 6);
    y += 10;
  };

  const sigH = sigSize ? 0 : 0;
  void sigH;
  const showSig = !opts.draft && opts.showSignature && snap.signature.dataUrl && sigSize;
  const showSeal = !opts.draft && opts.showStamp && sealUrl && sealSize;
  const sealW = showSeal ? snap.seal.widthMm : 0;
  const sealH = showSeal && sealSize ? sealW * (sealSize.h / sealSize.w) : 0;
  const BLOCK_H = Math.max(36, sealH + 6, qrUrl ? 30 : 0);
  const limitNormal = () => PH - 16;
  function ensure(h: number) {
    if (y + h > limitNormal()) { doc.addPage(); drawContHeader(); }
  }

  drawHeader();

  /* ---------- patient strip (one ID only) ---------- */
  {
    const p = rx.patient;
    const when = fmtDate(rx.authorizedAt || rx.createdAt);
    const ageSex = [p.age ? p.age + (p.ageUnit === 'M' ? ' M' : ' Y') : '', p.sex || ''].filter(Boolean).join(' / ') || '-';
    const row2: string[] = [];
    if (L.showPhone && p.phone) row2.push(`Phone: ${fmtMobile(p.phone)}`);
    if (p.weight) row2.push(`Weight: ${p.weight} kg`);
    const allergy = p.allergies.trim() ? `Allergies: ${p.allergies.trim()}` : '';
    const noAllergy = /^(no known|nkda|nil|none|no allerg)/i.test(p.allergies.trim());
    const h = 6.4 + (row2.length ? 4.6 : 0) + (allergy ? heightOf(allergy, CW - 6, 8.5 * sc, 'bold') + 0.5 : 0) + 2.4;
    doc.setFillColor(...SURFACE); doc.roundedRect(M, y, CW, h, 1.6, 1.6, 'F');
    let yy = y + 5;
    if (DEV.test(p.name)) { let np = 10 * sc, b = hiBlock(p.name, 78, np, NAVY, true); while (b.h > np * 0.3528 * 1.75 && np > 6.5) { np -= 0.5; b = hiBlock(p.name, 78, np, NAVY, true); } doc.addImage(b.url, 'PNG', M + 3, yy - 4.4, b.w, b.h, undefined, 'FAST'); } else { let nt = 10 * sc; const nm = clean(p.name || 'Patient name not entered'); font('bold', nt, NAVY); while (doc.getTextWidth(nm) > 78 && nt > 6.5) { nt -= 0.5; font('bold', nt, NAVY); } doc.text(nm, M + 3, yy); }
    font('normal', 9 * sc, NAVY);
    doc.text(clean(`Age/Sex: ${ageSex}`), M + 84, yy);
    doc.text(clean(`ID: ${p.pid || '-'}`), M + 122, yy);
    doc.text(`Date: ${when}`, PW - M - 3, yy, { align: 'right' });
    yy += 4.6;
    if (row2.length) { font('normal', 8.5 * sc, GREY); doc.text(clean(row2.join('     ')), M + 3, yy); yy += 4.6; }
    if (allergy) { font(noAllergy ? 'normal' : 'bold', 8.5 * sc, noAllergy ? GREY : RED); wrap(allergy, CW - 6).forEach((l) => { doc.text(l, M + 3, yy); yy += lh(8.5 * sc); }); }
    y += h + 3;
  }

  /* ---------- clinical: compact label/value rows, trauma ticks, marked body figure ---------- */
  const figW = body ? body.w + 4 : 0;
  const textW = CW - figW;
  const yClin = y; const pageAtClin = doc.getNumberOfPages();
  const LBL = 26;
  const row = (label: string, text: string) => {
    if (!text.trim()) return;
    const w = textW - LBL;
    ensure(heightOf(text, w, 9.2 * sc) + 1);
    font('bold', 7.4 * sc, TEAL); doc.text(label.toUpperCase(), M, y + 3.1);
    const y0 = y; para(text, M + LBL, w, 'normal', 9.2 * sc, NAVY, 0.9);
    if (y < y0 + 4.2) y = y0 + 4.2;
  };
  if (c.injury) {
    ensure(6);
    font('bold', 7.4 * sc, TEAL); doc.text('TYPE', M, y + 3.1);
    const box = (x: number, on: boolean, label: string) => {
      doc.setDrawColor(...NAVY); doc.setLineWidth(0.3); doc.rect(x, y + 0.4, 3.2, 3.2);
      if (on) { doc.setLineWidth(0.55); doc.line(x + 0.6, y + 2.1, x + 1.4, y + 3); doc.line(x + 1.4, y + 3, x + 2.8, y + 0.8); }
      font(on ? 'bold' : 'normal', 9 * sc, NAVY); doc.text(label, x + 4.6, y + 3.2);
    };
    box(M + LBL, c.injury === 'trauma', 'Trauma'); box(M + LBL + 28, c.injury === 'nontrauma', 'Non-trauma');
    y += 5.6;
  }
  if (rx.print.complaint) row('Complaint', c.complaint);
  if (c.diagnosis.trim()) row('Diagnosis', c.diagnosis + (c.side && c.side !== 'N/A' ? ` (${c.side})` : ''));
  row('Comorbidities', c.comorbidities || '');
  if (rx.print.examination) row('Examination', c.examination.split(/[;\n]/).map((x) => x.trim()).filter((x) => x && !/:\s*$/.test(x)).join('; '));
  if (rx.print.investigations) row('Investigations', c.investigations);
  if (rx.print.notes) row('Notes', c.notes);
  if (body && doc.getNumberOfPages() === pageAtClin) {
    doc.addImage(body.url, 'PNG', PW - M - body.w, yClin, body.w, body.h, undefined, 'FAST');
    y = Math.max(y, yClin + body.h + 1);
  }
  y += 1;

  /* ---------- medicines (compact) ---------- */
  if (rx.items.length) {
    ensure(22);
    font('bolditalic', 20 * sc, BLUE); doc.text('Rx', M, y + 6.5);
    doc.setDrawColor(210, 218, 228); doc.setLineWidth(0.25); doc.line(M + 12, y + 5, PW - M, y + 5);
    y += 9.5;
    const showIns = rx.showInstr !== false;
    rx.items.forEach((it, idx) => {
      const t = itemTitle(it, L.nameDisplay, L.genericCaps);
      const indent = M + 7, w = CW - 7;
      const comp = it.ingredients.map((g) => `${g.name}${g.strength ? ' ' + g.strength : ''}`).join(' + ');
      const brandFirst = L.nameDisplay === 'brand' && !!it.brand;
      const compLine = L.showComposition && it.brand ? (brandFirst ? comp.replace(/Cholecalciferol \(Vitamin D3\)/g, 'Vitamin D3').replace(/ calcium (\d)/g, ' Ca $1') : (it.ingredients.length > 1 ? `Composition: ${comp}${it.manufacturer ? '  |  Mfr: ' + it.manufacturer : ''}` : '')) : '';
      const qty = computeQty(it);
      const parts: string[] = [];
      if (it.useTaper && it.taper.length) parts.push('Tapering schedule');
      else {
        parts.push(doseLabel(it) || '-');
        parts.push(freqLabel(it) + (dosePattern(it) ? ` (${dosePattern(it)})` : ''));
      }
      const tm = timingMeta(it.timing); if (tm) parts.push(tm.label);
      if (!it.useTaper && durationLabel(it)) parts.push(durationLabel(it));
      if (it.freq === 'SOS' && it.sosMax) parts.push(`max ${it.sosMax}/day`);
      if (it.route && it.route !== 'Oral') parts.push(it.route);
      if (qty.text) parts.push(`Qty ${qty.text}`);
      const partsLine = parts.join('  |  ');
      const ins = showIns ? itemInstructions(it, lang) : { en: '', hi: '', schedule: '' };
      const insText = lang === 'hi' ? ins.hi : ins.en;
      const nameFull = t.main + (t.sub ? '  ' + t.sub : '');
      let need = heightOf(`${idx + 1}. ` + nameFull, w, (brandFirst ? 11 : 10.2) * sc, 'bold') + (compLine ? heightOf(compLine, w, 7.8 * sc) : 0) + heightOf(partsLine, w, 8.6 * sc, 'bold') + 2;
      if (insText) need += lang === 'hi' ? hiBlock(insText, w - 2, 8.8 * sc, NAVY).h : heightOf(insText, w - 2, 8.5 * sc, 'italic');
      ensure(Math.min(need + 1, 40));
      font('bold', (brandFirst ? 11 : 10.2) * sc, NAVY);
      doc.text(`${idx + 1}.`, M, y + 3.5);
      const nameLines = wrap(t.main, w);
      nameLines.forEach((l, i) => { font('bold', (brandFirst ? 11 : 10.2) * sc, NAVY); ensure(lh(10.2 * sc)); doc.text(l, indent, y + 3.5); if (i === nameLines.length - 1 && t.sub) { const tw = doc.getTextWidth(l + '  '); font('normal', 8.8 * sc, GREY); doc.text(clean(t.sub), indent + tw, y + 3.5); } y += lh(10.2 * sc); });
      if (compLine) para(compLine, indent, w, 'normal', brandFirst ? 7.2 * sc : 7.8 * sc, [128, 138, 152]);
      para(partsLine, indent, w, 'bold', 8.6 * sc, [30, 64, 110]);
      if (it.useTaper && it.taper.length) {
        const steps = it.taper.map((s, i) => `Step ${i + 1}: ${s.dose} ${it.doseUnit}${s.dose > 1 ? 's' : ''} x ${s.timesPerDay}/day for ${s.days} day${s.days > 1 ? 's' : ''}`).join('   ');
        para(steps, indent, w, 'normal', 8.4 * sc, NAVY);
      }
      if (insText) { if (lang === 'hi') hiPara(insText, indent, w - 2, 8.8 * sc, [70, 82, 100], false); else para(insText, indent, w - 2, 'italic', 8.5 * sc, [70, 82, 100]); }
      y += 1.7;
    });
    y += 0.5;
  }

  /* ---------- advice (short, one language) ---------- */
  const advice = c.advice.map((a) => a.trim()).filter(Boolean);
  if (advice.length) {
    ensure(12);
    font('bold', 7.4 * sc, TEAL); doc.text('ADVICE', M, y + 2.6); y += 3.8;
    advice.forEach((a) => {
      const hi = lang === 'hi' && !DEV.test(a) ? adviceHi(a) : '';
      const text = hi || a;
      doc.setFillColor(...NAVY); doc.circle(M + 1.6, y + 2, 0.5, 'F');
      if (DEV.test(text)) hiPara(text, M + 5, CW - 5, 9 * sc, NAVY, false, 0.5);
      else { para(text, M + 5, CW - 5, 'normal', 9 * sc, NAVY, 0.5); }
    });
    y += 1;
  }

  /* ---------- next visit: just a date + one light line ---------- */
  const refDate = new Date(rx.authorizedAt || rx.createdAt);
  const fuDate = rx.followUpDays > 0 ? addDays(refDate, rx.followUpDays) : null;
  const nt = (c.nextTests || '').trim();
  if (fuDate) {
    ensure(14);
    const wd = fuDate.toLocaleDateString('en-GB', { weekday: 'long' });
    doc.setFillColor(234, 245, 243); doc.roundedRect(M, y, CW, 5.8, 1.2, 1.2, 'F');
    font('bold', 9.6 * sc, TEAL);
    doc.text(`${T('Next visit', 'Next visit')}: ${fmtDate(fuDate)} (${wd})`, M + 3, y + 4);
    y += 7;
    const note = T('Please bring this prescription and your previous reports on the next visit.', 'अगली बार यह पर्चा और पुरानी जाँच रिपोर्ट साथ लाएँ।') + (nt ? (lang === 'hi' ? ` जाँच: ${nt}` : ` Tests: ${nt}.`) : '');
    para(note, M, CW, 'normal', 8.2 * sc, GREY, 0.6);
  } else if (nt) para(`Tests: ${nt}`, M, CW, 'normal', 8.4 * sc, GREY, 0.6);
  const wa = fmtMobile((clinic.whatsapp || '').trim()), an = (clinic.appointmentNote || '').trim();
  if (wa) para(`${T('For any problem, WhatsApp', 'कोई परेशानी हो तो व्हाट्सऐप करें')}: ${wa}`, M, CW, 'bold', 8.6 * sc, NAVY, 0.4);
  if (an) para(an, M, CW, 'normal', 8 * sc, GREY, 0.4);

  /* ---------- authorisation block: QR (left) | stamp | signature (right) - never overlapping ---------- */
  if (y > PH - 16 - BLOCK_H) { doc.addPage(); drawContHeader(); }
  const sigBottom = PH - 16;
  const lineY = sigBottom - 11;
  const colW = 60, gap = 6;
  let sigLeft = PW - M - colW, sealX = 0;
  if (showSeal) {
    if (L.sealLeft) sealX = sigLeft - gap - sealW; else { sealX = PW - M - sealW; sigLeft = sealX - gap - colW; }
  }
  const sigRight = sigLeft + colW;
  if (showSig && sigSize) {
    let w = Math.min(snap.signature.widthMm, colW); let h = w * (sigSize.h / sigSize.w);
    if (h > 20) { h = 20; w = h * (sigSize.w / sigSize.h); }
    doc.addImage(snap.signature.dataUrl, 'PNG', sigRight - colW / 2 - w / 2 + snap.signature.offsetX, lineY - h - 0.5 + snap.signature.offsetY, w, h, undefined, 'FAST');
  }
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.3); doc.line(sigLeft, lineY, sigRight, lineY);
  font('bold', 9.3 * sc, NAVY); doc.text(clean(drName(snap.doctor.fullName)), sigRight - colW / 2, lineY + 4.2, { align: 'center' });
  font('normal', 7.8 * sc, GREY);
  let ty = lineY + 7.8;
  if (snap.doctor.qualifications) { doc.text(clean(snap.doctor.qualifications), sigRight - colW / 2, ty, { align: 'center', maxWidth: colW + 4 }); ty += 3.4; }
  if (snap.doctor.regNo) doc.text(clean('Reg. No. ' + snap.doctor.regNo), sigRight - colW / 2, ty, { align: 'center' });
  if (showSeal && sealSize) doc.addImage(sealUrl, 'PNG', sealX + snap.seal.offsetX, sigBottom - sealH + snap.seal.offsetY + 1, sealW, sealH, undefined, 'FAST');
  if (qrUrl) {
    const qs = 16, qx = M, qy = sigBottom - qs - 7;
    doc.addImage(qrUrl, 'PNG', qx, qy, qs, qs, undefined, 'FAST');
    const avail = Math.max(24, Math.min(showSeal ? sealX : sigLeft, sigLeft) - M - 3);
    const cap = T('Scan to learn about your condition', 'अपनी बीमारी के बारे में जानने के लिए स्कैन करें');
    const yy0 = y; y = qy + qs + 1.2;
    if (lang === 'hi') { const b = hiBlock(cap, avail, 6.6, GREY); doc.addImage(b.url, 'PNG', qx, y, b.w, b.h, undefined, 'FAST'); }
    else { font('normal', 6.6, GREY); wrap(cap, avail).forEach((l, i) => doc.text(l, qx, y + 2.2 + i * 2.7)); }
    y = yy0;
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
    if (total > 1) doc.text(`Page ${i} of ${total}`, PW - M, PH - 8, { align: 'right' });
    if (L.footerNote.trim()) { font('italic', 7.5, GREY); doc.text(clean(L.footerNote), PW / 2, PH - 4.5, { align: 'center', maxWidth: CW }); }
  }
  return { blob: doc.output('blob'), pages: total };
}

/** Renders at normal size; if it spills onto a second page, retries slightly smaller so most prescriptions fit one page. */
export async function buildPdf(rx: Prescription, snap: DoctorSnapshot, opts: PdfOpts): Promise<{ blob: Blob; pages: number }> {
  const first = await renderPdf(rx, snap, opts, 1);
  if (first.pages === 1) return first;
  for (const f of [0.94, 0.88]) { const t = await renderPdf(rx, snap, opts, f); if (t.pages === 1) return t; }
  return first;
}

export async function sealFor(snap: DoctorSnapshot) {
  return snap.seal.mode === 'generated' ? renderSeal(snap.seal, snap.doctor, snap.clinic) : '';
}
export { freqMeta };
