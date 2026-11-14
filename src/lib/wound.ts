import type { Prescription } from './types';

export const W_TYPES = ['Surgical', 'Traumatic', 'Ulcer', 'Abscess / I&D'];
export const W_STATUS = ['Clean & dry', 'Healing well', 'Discharge', 'Gaping', 'Infected'];
export const W_DRESS = ['Alternate day', 'Daily', 'Keep dry', 'Open (no dressing)'];
export const W_SUTURE = [7, 10, 12, 14, 21];

const fmt = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
/** One printable line describing the wound; '' when there is no wound */
export function woundLine(rx: Pick<Prescription, 'wound' | 'authorizedAt' | 'createdAt'>): string {
  const w = rx.wound; if (!w || !w.on) return '';
  const parts: string[] = [];
  parts.push([w.type, 'wound'].filter(Boolean).join(' ') + (w.site ? ', ' + w.site : ''));
  if (w.status) parts.push(w.status);
  if (w.dressing) parts.push('Dressing: ' + w.dressing.toLowerCase());
  if (w.sutureDays) parts.push(`Suture/staple removal: ${fmt((rx.authorizedAt || rx.createdAt) + w.sutureDays * 86400000)} (after ${w.sutureDays} days)`);
  if (w.note?.trim()) parts.push(w.note.trim());
  return parts.join('. ');
}
