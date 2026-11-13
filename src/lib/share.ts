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
export async function shareWhatsApp(rx: Prescription, blob: Blob, name: string, doctorName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const text = `Prescription from ${doctorName || 'your doctor'} for ${rx.patient.name}.`;
  if (canShareFiles(blob, name)) return sharePdf(blob, name, text);
  // Desktop fallback: save the PDF and open a WhatsApp chat with the patient's number to attach it.
  download(blob, name);
  const digits = rx.patient.phone.replace(/\D/g, '');
  const num = digits.length === 10 ? '91' + digits : digits;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(text + ' (PDF attached)')}`, '_blank');
  return 'downloaded';
}
