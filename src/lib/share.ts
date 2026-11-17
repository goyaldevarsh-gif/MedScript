import type { Prescription } from './types';
import { download } from './util';

export function printBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  f.src = url;
  f.onload = () => {
    try { f.contentWindow?.focus(); f.contentWindow?.print(); }
    catch { window.open(url, '_blank'); }
    setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 60000);
  };
  document.body.appendChild(f);
}
const fileOf = (blob: Blob, name: string) => new File([blob], name, { type: 'application/pdf' });
export const canShareFiles = (blob: Blob, name: string) => {
  try { return !!(navigator as any).canShare?.({ files: [fileOf(blob, name)] }); } catch { return false; }
};
export async function sharePdf(blob: Blob, name: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = fileOf(blob, name);
  if (canShareFiles(blob, name)) {
    try { await (navigator as any).share({ files: [file], title: 'Prescription', text }); return 'shared'; }
    catch (e: any) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  download(blob, name); return 'downloaded';
}
const DAYMS = 86400000;
/** the planned follow-up date (midnight) from the visit date + follow-up days; null if none */
export function followUpOn(rx: Pick<Prescription, 'authorizedAt' | 'createdAt' | 'followUpDays'>): Date | null {
  if (!rx.followUpDays) return null;
  const d = new Date(rx.authorizedAt || rx.createdAt); d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + rx.followUpDays * DAYMS);
}
const fuLabel = (d: Date, hi: boolean) => d.toLocaleDateString(hi ? 'hi-IN' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const waNumber = (phone: string) => { const d = (phone || '').replace(/\D/g, '').replace(/^0+/, ''); return d.length === 10 ? '91' + d : d; };
export const hasWaNumber = (phone: string) => waNumber(phone).length >= 10;
function clinicOf(rx: Prescription) { const c = rx.doctorSnapshot?.clinic; return { name: c?.name || '', phone: (c?.whatsapp || c?.phone || '').trim() }; }
/** message that goes with the prescription PDF: greeting, follow-up date, how to book */
export function rxMessage(rx: Prescription, doctorName: string): string {
  const hi = rx.lang === 'hi'; const fu = followUpOn(rx); const c = clinicOf(rx); const dr = doctorName || (hi ? 'आपके डॉक्टर' : 'your doctor');
  const lines = hi
    ? [`नमस्ते ${rx.patient.name},`, `${dr}${c.name ? ` (${c.name})` : ''} की ओर से आपका पर्चा संलग्न है।`, fu ? `अगली जांच की तारीख: ${fuLabel(fu, true)}। कृपया पर्चा और रिपोर्ट साथ लाएं।` : '', rx.clinical.nextTests ? `अगली बार लाने वाली जांच: ${rx.clinical.nextTests}` : '', c.phone ? `अपॉइंटमेंट के लिए संपर्क करें: ${c.phone}` : '', 'जल्दी स्वस्थ हों।']
    : [`Hello ${rx.patient.name},`, `Your prescription from ${dr}${c.name ? ` (${c.name})` : ''} is attached.`, fu ? `Your next visit is due on ${fuLabel(fu, false)}. Please bring this prescription and your reports.` : '', rx.clinical.nextTests ? `Tests to bring next time: ${rx.clinical.nextTests}` : '', c.phone ? `To book or confirm an appointment: ${c.phone}` : '', 'Get well soon.'];
  return lines.filter(Boolean).join('\n');
}
/** reminder sent a few days before (or after) the follow-up date */
export function reminderMessage(rx: Prescription, doctorName: string, now = Date.now()): string {
  const hi = rx.lang === 'hi'; const fu = followUpOn(rx); const c = clinicOf(rx); const dr = doctorName || (hi ? 'आपके डॉक्टर' : 'your doctor');
  const over = fu ? fu.getTime() < new Date(now).setHours(0, 0, 0, 0) : false;
  const lines = hi
    ? [`नमस्ते ${rx.patient.name},`, fu ? (over ? `${dr}${c.name ? ` (${c.name})` : ''} की ओर से याद दिला रहे हैं: आपकी अगली जांच की तारीख ${fuLabel(fu, true)} थी। कृपया जल्द दिखा लें।` : `${dr}${c.name ? ` (${c.name})` : ''} की ओर से याद दिला रहे हैं: आपकी अगली जांच की तारीख ${fuLabel(fu, true)} है।`) : '', rx.clinical.nextTests ? `साथ लाएं: ${rx.clinical.nextTests}` : '', c.phone ? `अपॉइंटमेंट के लिए: ${c.phone}` : '']
    : [`Hello ${rx.patient.name},`, fu ? (over ? `A gentle reminder from ${dr}${c.name ? ` (${c.name})` : ''}: your follow-up was due on ${fuLabel(fu, false)}. Please visit when you can.` : `A gentle reminder from ${dr}${c.name ? ` (${c.name})` : ''}: your follow-up is due on ${fuLabel(fu, false)}.`) : '', rx.clinical.nextTests ? `Please bring: ${rx.clinical.nextTests}` : '', c.phone ? `To book or confirm: ${c.phone}` : ''];
  return lines.filter(Boolean).join('\n');
}
export function openWhatsApp(phone: string, text: string) { window.open(`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`, '_blank'); }

export async function shareWhatsApp(rx: Prescription, blob: Blob, name: string, doctorName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const text = rxMessage(rx, doctorName);
  if (canShareFiles(blob, name)) return sharePdf(blob, name, text);
  // Desktop fallback: save the PDF and open a WhatsApp chat with the patient's number to attach it.
  download(blob, name);
  openWhatsApp(rx.patient.phone, text + (rx.lang === 'hi' ? '\n(पर्चा PDF में संलग्न करें)' : '\n(PDF attached)'));
  return 'downloaded';
}
