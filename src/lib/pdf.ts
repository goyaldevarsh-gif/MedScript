import { fmtAge, fmtAgePdf } from './age';
import { splitHistory } from '../data/exam';
import type { DoctorSnapshot, Prescription, RxItem } from './types';
import { imageSize, renderSeal } from './imaging';
import { fmtMobile, phoneList } from './phone';
import { figuresPng, partLabel } from './body';
import { detailOf } from './detail';
import { woundLine } from './wound';
import { procLine } from './procedures';
import QRCode from 'qrcode';
import { eduUrl } from '../data/eduMap';
import { dosePattern, computeQty, doseLabel, durationLabel, freqLabel, freqMeta, itemInstructions, timingMeta } from './dosage';
import { addDays, fmtDate, fmtDateTime } from './util';
import { printTests } from '../data/tests';

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

export interface PdfOpts { draft: boolean; showSignature: boolean; showStamp: boolean; showLogo: boolean; /** override the clinic's letterhead setting for this one PDF */ letterhead?: boolean }
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
  /* printing on the clinic's own pre-printed letterhead: leave the header and footer areas blank */
  const lhCfg = clinic.letterhead;
  const LH = (opts.letterhead ?? lhCfg?.on) && lhCfg ? { top: Math.min(90, Math.max(0, lhCfg.top)), bottom: Math.min(60, Math.max(0, lhCfg.bottom)) } : null;
  const FB = LH ? Math.max(8, LH.bottom) : 12;
  const FOOT = LH ? FB + 8 : 16;
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
  const body = await figuresPng(c.bodyParts || [], rx.wound?.on ? rx.wound.pins || [] : []).catch(() => null);
  /* up to three QR codes: condition guide | clinic location | WhatsApp (each switched on in Settings) */
  const qs3 = snap.doctor.qrShow || {};
  const guideText = rx.qrUrl !== undefined && rx.qrUrl !== null ? rx.qrUrl.trim() : (qs3.guide === false ? '' : (eduUrl(rx, snap.doctor.eduBase) || snap.doctor.eduBase || clinic.qrUrl || snap.doctor.qrUrl || '').trim());
  const mapText = qs3.map && clinic.address?.trim() ? ((clinic.mapsUrl || '').trim() || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([clinic.name, clinic.address].filter(Boolean).join(', '))) : '';
  const waDigits = (clinic.whatsapp || '').replace(/\D/g, '').replace(/^0+/, '');
  const waText = (qs3.wa ?? true) && waDigits.length >= 10 ? `https://wa.me/${waDigits.length === 10 ? '91' + waDigits : waDigits}?text=` + encodeURIComponent('Hello, I would like to book an appointment / emergency consultation.') : '';
  const qrList = (await Promise.all([
    { text: guideText, kind: 'guide' as const }, { text: mapText, kind: 'map' as const }, { text: waText, kind: 'wa' as const },
  ].filter((q) => q.text).map(async (q) => ({ kind: q.kind, url: await QRCode.toDataURL(q.text, { margin: 0, width: 240, errorCorrectionLevel: 'M', color: { dark: '#3b4a5e', light: '#ffffff' } }).catch(() => '') })))).filter((q) => q.url);
  const lang: 'en' | 'hi' = rx.lang === 'en' ? 'en' : 'hi';
  const T = (en: string, hi: string) => (lang === 'hi' ? hi : en);

  /* ---------- header: clinic on the left, doctor on the right ---------- */
  const dPhones = phoneList(snap.doctor.phone, snap.doctor.morePhones);
  const cPhones = phoneList(clinic.phone, clinic.morePhones);
  const hasClinic = !!(clinic.name || clinic.address || cPhones.length || clinic.email || clinic.timings || clinic.logo);
  const drawHeader = () => {
    if (LH) { y = LH.top + 1; return; }
    const top = 11;
    const rule = (yy: number) => { doc.setDrawColor(...TEAL); doc.setLineWidth(0.5); doc.line(M, yy, PW - M, yy); };
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
        const box = clinic.logoSize === 'S' ? { w: 26, h: 18 } : clinic.logoSize === 'L' ? { w: 46, h: 30 } : { w: 36, h: 24 }; const k = Math.min(box.w / logoSize.w, box.h / logoSize.h);
        const w = logoSize.w * k, h = logoSize.h * k;
        try { doc.addImage(clinic.logo, 'PNG', M, top + (box.h - h) / 2, w, h, undefined, 'FAST'); } catch { /* an unreadable image must not stop the prescription from being made */ }
        leftX = M + box.w + 4; hLogo = box.h;
      }
      const cw = Math.max(40, 92 - (leftX - M));
      if (clinic.name) { font('bold', 12 * sc, NAVY); wrap(clinic.name, cw).forEach((l) => { doc.text(l, leftX, ly + 4.6); ly += 5; }); }
      font('normal', 8.4 * sc, GREY);
      // name and timings only: the address is in the footer and on the location QR
      if (clinic.timings) { font('normal', 8.8 * sc, GREY); wrap(clinic.timings, cw).forEach((l, i) => { doc.text((i === 0 ? 'Timings: ' : '') + l, leftX, ly + 4); ly += 4; }); }
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
    y = Math.max(ly, ry, top + hLogo) + 1.8;
    rule(y); y += 4.6;
  };
  const drawContHeader = () => {
    y = LH ? LH.top + 1 : 10;
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
  const BLOCK_H = Math.max(42, sealH + 12, qrList.length ? 30 : 0);
  const limitNormal = () => PH - FOOT;
  function ensure(h: number) {
    if (y + h > limitNormal()) { doc.addPage(); drawContHeader(); }
  }

  drawHeader();

  /* ---------- patient strip (one ID only) ---------- */
  {
    const p = rx.patient;
    const when = fmtDate(rx.authorizedAt || rx.createdAt);
    const ageSex = [p.age ? fmtAgePdf(p.age, p.ageUnit) : '', p.sex || ''].filter(Boolean).join(' / ') || '-';
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
  if ((c.bodyParts || []).some((id) => detailOf(id))) row('Site', (c.bodyParts || []).map((id) => partLabel(id)).join('; '));
  if (rx.print.complaint) row('Complaint', c.complaint);
  if (c.diagnosis.trim()) row('Diagnosis', c.diagnosis + (c.side && c.side !== 'N/A' ? ` (${c.side})` : ''));
  row('Comorbidities', c.comorbidities || '');
  if (rx.print.examination) { const sh = splitHistory(c.examination); row('History / red flags', sh.hist); row('Examination', sh.exam.split(/[;\n]/).map((x) => x.trim()).filter((x) => x && !/:\s*$/.test(x)).join('; ')); }
  if (rx.print.investigations) row('Investigations', printTests(c.investigations));
  { const pl = procLine(rx); if (pl) row('Procedure', pl); }
  { const wl = woundLine(rx); if (wl) row('Wound', wl + (rx.wound?.pins?.length ? '  (marked on figure)' : '')); }
  if (rx.print.notes) row('Notes', c.notes);
  if (body && doc.getNumberOfPages() === pageAtClin) {
    doc.addImage(body.url, 'PNG', PW - M - body.w, yClin, body.w, body.h, undefined, 'FAST');
    y = Math.max(y, yClin + body.h + 1);
  }
  y += 1;

  /* ---------- medicines (compact) ---------- */
  if (rx.items.length) {
    ensure(22);
    font('bolditalic', 17 * sc, TEAL); doc.text('Rx', M, y + 6);
    doc.setDrawColor(210, 218, 228); doc.setLineWidth(0.25); doc.line(M + 12, y + 5, PW - M, y + 5);
    y += 9.5;
    const showIns = rx.showInstr !== false;
    /* few medicines: larger text so the page does not look empty */
    const nMed = rx.items.length;
    const ms = nMed <= 3 ? 1.1 : nMed <= 5 ? 1.04 : 1;
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
      const partsLine = parts.join('   ·   ');
      const ins = showIns ? itemInstructions(it, lang) : { en: '', hi: '', schedule: '' };
      const insText = lang === 'hi' ? ins.hi : ins.en;
      const nameFull = t.main + (t.sub ? '  ' + t.sub : '');
      let need = heightOf(`${idx + 1}. ` + nameFull, w, (brandFirst ? 11 : 10.2) * sc * ms, 'bold') + (compLine ? heightOf(compLine, w, 7.8 * sc * ms) : 0) + heightOf(partsLine, w, 8.6 * sc * ms, 'bold') + 2;
      if (insText) need += lang === 'hi' ? hiBlock(insText, w - 2, 8.8 * sc * ms, NAVY).h : heightOf(insText, w - 2, 8.5 * sc * ms, 'italic');
      ensure(Math.min(need + 1, 40));
      const nb = (brandFirst ? 11 : 10.2) * sc * ms * 0.3528 * 0.9; // baseline offset scales with the font (stops overlap on crowded pages)
      font('bold', (brandFirst ? 11 : 10.2) * sc * ms, NAVY);
      doc.text(`${idx + 1}.`, M, y + nb);
      const nameLines = wrap(t.main, w);
      nameLines.forEach((l, i) => { font('bold', (brandFirst ? 11 : 10.2) * sc * ms, NAVY); ensure(lh(10.2 * sc * ms)); doc.text(l, indent, y + nb); if (i === nameLines.length - 1 && t.sub) { const tw = doc.getTextWidth(l + '  '); font('normal', 8.8 * sc * ms, GREY); doc.text(clean(t.sub), indent + tw, y + nb); } y += lh(10.2 * sc * ms); });
      if (compLine) para(compLine, indent, w, 'normal', brandFirst ? 7.2 * sc * ms : 7.8 * sc * ms, [128, 138, 152]);
      para(partsLine, indent, w, 'normal', 8.8 * sc * ms, [30, 64, 110]);
      if (it.useTaper && it.taper.length) {
        const steps = it.taper.map((s, i) => `Step ${i + 1}: ${s.dose} ${it.doseUnit}${s.dose > 1 ? 's' : ''} x ${s.timesPerDay}/day for ${s.days} day${s.days > 1 ? 's' : ''}`).join('   ');
        para(steps, indent, w, 'normal', 8.4 * sc * ms, NAVY);
      }
      if (insText) { if (lang === 'hi') hiPara(insText, indent, w - 2, 8.8 * sc * ms, [70, 82, 100], false); else para(insText, indent, w - 2, 'italic', 8.5 * sc * ms, [70, 82, 100]); }
      y += (1.7 + (ms - 1) * 6) * Math.min(1, 0.5 + fit / 2);
    });
    y += 0.5;
  }

  /* ---------- advice (short, one language) ---------- */
  const advice = c.advice.map((a) => a.trim()).filter(Boolean);
  if (advice.length) {
    ensure(12);
    font('bold', 7.4 * sc, TEAL); doc.text('ADVICE', M, y + 2.6); y += 3.8;
    // one language for the whole advice block: Hindi only when every line has a Hindi version, else all lines stay as written
    const hiAll = lang === 'hi' && advice.every((a) => DEV.test(a) || adviceHi(a));
    advice.forEach((a) => {
      const text = hiAll && !DEV.test(a) ? adviceHi(a) : a;
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
  if (y > PH - FOOT - BLOCK_H) { doc.addPage(); drawContHeader(); }
  const sigBottom = PH - FOOT;
  const lineY = sigBottom - 11;
  const colW = 60, gap = 9;
  let sigLeft = PW - M - colW, sealX = 0;
  if (showSeal) {
    if (L.sealLeft) sealX = sigLeft - gap - sealW; else { sealX = PW - M - sealW; sigLeft = sealX - gap - colW; }
  }
  const sigRight = sigLeft + colW;
  if (showSig && sigSize) {
    let w = Math.min(snap.signature.widthMm, colW); let h = w * (sigSize.h / sigSize.w);
    if (h > 20) { h = 20; w = h * (sigSize.w / sigSize.h); }
    try { doc.addImage(snap.signature.dataUrl, 'PNG', sigRight - colW / 2 - w / 2 + snap.signature.offsetX, lineY - h - 0.5 + snap.signature.offsetY, w, h, undefined, 'FAST'); } catch { /* an unreadable image must not stop the prescription from being made */ }
  }
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.3); doc.line(sigLeft, lineY, sigRight, lineY);
  font('bold', 9.3 * sc, NAVY); doc.text(clean(drName(snap.doctor.fullName)), sigRight - colW / 2, lineY + 4.2, { align: 'center' });
  font('normal', 7.8 * sc, GREY);
  let ty = lineY + 7.8;
  if (snap.doctor.qualifications) { wrap(clean(snap.doctor.qualifications), colW + 4).slice(0, 2).forEach((l) => { doc.text(l, sigRight - colW / 2, ty, { align: 'center' }); ty += 3.4; }); }
  /* registration number: one line above both the stamp and the signature */
  const sealBottom = sigBottom - 1;
  const imgTop = Math.min(lineY - 20, showSeal ? sealBottom - sealH : lineY - 20);
  if (snap.doctor.regNo && LH) {
    const cx = showSeal ? (Math.min(sealX, sigLeft) + sigRight) / 2 : sigRight - colW / 2;
    font('bold', 8.4 * sc, NAVY);
    doc.text(clean('Reg. No.: ' + snap.doctor.regNo + (snap.doctor.regCouncil ? ' (' + snap.doctor.regCouncil + ')' : '')), cx, imgTop - 2, { align: 'center' });
  }
  if (showSeal && sealSize) try { doc.addImage(sealUrl, 'PNG', sealX + snap.seal.offsetX, sealBottom - sealH + snap.seal.offsetY, sealW, sealH, undefined, 'FAST'); } catch { /* unreadable seal image: skip it */ }
  if (qrList.length) {
    const n = qrList.length, qs = n > 1 ? 15 : 16, qy = sigBottom - qs - 7;
    const avail0 = Math.max(24, Math.min(showSeal ? sealX : sigLeft, sigLeft) - M - 3);
    const cw = n > 1 ? Math.min(27, avail0 / n) : avail0;
    const caps = {
      guide: n > 1 ? T('Scan: your condition guide', 'स्कैन करें: बीमारी की जानकारी') : T('Scan to learn about your condition', 'अपनी बीमारी के बारे में जानने के लिए स्कैन करें'),
      map: T('Scan: clinic location', 'स्कैन करें: क्लिनिक का पता'),
      wa: T('Scan: WhatsApp for appointment / emergency', 'स्कैन करें: WhatsApp अपॉइंटमेंट / इमरजेंसी'),
    };
    const yy0 = y;
    qrList.forEach((q, i) => {
      const qx = M + i * cw;
      doc.addImage(q.url, 'PNG', qx, qy, qs, qs, undefined, 'FAST');
      const cap = caps[q.kind], w = cw - 1.5;
      const cy = qy + qs + 1.2;
      if (lang === 'hi') { const b = hiBlock(cap, w, 6.4, GREY); doc.addImage(b.url, 'PNG', qx, cy, b.w, b.h, undefined, 'FAST'); }
      else { font('normal', 6.4, GREY); wrap(cap, w).slice(0, 3).forEach((l, k) => doc.text(l, qx, cy + 2.2 + k * 2.6)); }
    });
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
    font('normal', 7.5, GREY);
    const left = opts.draft ? 'DRAFT - not authorised by the doctor' : `Rx ${rx.rxNo}  |  Authorised ${fmtDateTime(rx.authorizedAt || Date.now())}`;
    if (LH) {
      /* the letterhead prints its own footer: only a small Rx / page line just above that area */
      const fy = PH - FB - 1.5;
      doc.text(clean(left), M, fy);
      if (total > 1) doc.text(`Page ${i} of ${total}`, PW - M, fy, { align: 'right' });
      continue;
    }
    doc.setDrawColor(210, 218, 228); doc.setLineWidth(0.25); doc.line(M, PH - 12, PW - M, PH - 12);
    doc.text(clean(left), M, PH - 8);
    if (total > 1) doc.text(`Page ${i} of ${total}`, PW - M, PH - 8, { align: 'right' });
    const foot = [[clinic.name, clinic.address].filter((x) => x && x.trim()).join(', '), L.footerNote.trim()].filter(Boolean).join('   ·   ');
    if (foot) { let fs = 7.2; font('normal', fs, GREY); while (fs > 5.6 && doc.getTextWidth(clean(foot)) > CW) { fs -= 0.2; font('normal', fs, GREY); } doc.text(clean(foot), PW / 2, PH - 4.5, { align: 'center', maxWidth: CW }); }
  }
  return { blob: doc.output('blob'), pages: total };
}

/** Renders at normal size; if it spills onto a second page, retries slightly smaller so most prescriptions fit one page. */
export async function buildPdf(rx: Prescription, snap: DoctorSnapshot, opts: PdfOpts): Promise<{ blob: Blob; pages: number }> {
  const first = await renderPdf(rx, snap, opts, 1);
  if (first.pages === 1) return first;
  // keep the prescription on ONE page: shrink everything a little at a time until it fits
  for (const f of [0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.79, 0.76, 0.73, 0.7, 0.67, 0.64, 0.61, 0.58, 0.55]) { const t = await renderPdf(rx, snap, opts, f); if (t.pages === 1) return t; }
  return first;
}

export async function sealFor(snap: DoctorSnapshot) {
  return snap.seal.mode === 'generated' ? renderSeal(snap.seal, snap.doctor, snap.clinic) : '';
}
export { freqMeta };

/** One calibration page: print it on the pre-printed letterhead and check that the shaded areas cover the printed header and footer. */
export async function letterheadTestPdf(top: number, bottom: number, clinicName = ''): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, fb = Math.max(8, bottom), foot = fb + 8;
  doc.setFillColor(254, 226, 226); doc.rect(0, 0, PW, top + 1, 'F'); doc.rect(0, PH - fb, PW, fb, 'F');
  doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.4); doc.line(0, top + 1, PW, top + 1); doc.line(0, PH - fb, PW, PH - fb);
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.25); doc.setLineDashPattern([1.5, 1.5], 0); doc.line(0, PH - foot, PW, PH - foot); doc.setLineDashPattern([], 0);
  doc.setTextColor(185, 28, 28); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(`Header space: ${top} mm (your printed header must end above the red line)`, PW / 2, top - 3, { align: 'center' });
  doc.text(`Footer space: ${fb} mm (your printed footer must start below this red line)`, PW / 2, PH - fb + 5, { align: 'center' });
  doc.setTextColor(30, 64, 175); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('Blue dashed line: the signature and stamp end here', PW / 2, PH - foot - 1.5, { align: 'center' });
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Letterhead test page' + (clinicName ? ' - ' + clinicName : ''), PW / 2, top + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const lines = ['1. Print this page at 100% (Actual size), not "Fit to page".', '2. Print it on your letterhead, or hold it against the letterhead and a light.', '3. The prescription is written between the two red lines.', '4. If the printed header or footer crosses a red line, change the mm value in Settings and print again.'];
  lines.forEach((l, i) => doc.text(l, 20, top + 26 + i * 7));
  doc.setDrawColor(100, 116, 139); doc.setLineWidth(0.2); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
  for (let mm = 0; mm <= PH; mm += 10) { doc.line(0, mm, mm % 50 === 0 ? 8 : 4, mm); if (mm % 50 === 0) doc.text(String(mm), 9, mm + 1); }
  return doc.output('blob');
}
