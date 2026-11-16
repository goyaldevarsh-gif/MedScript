import type { Prescription, RxItem } from './types';
import { norm } from './util';

const DAY = 86400000;
export const visitTs = (r: Pick<Prescription, 'authorizedAt' | 'createdAt'>) => r.authorizedAt || r.createdAt;
export const daysSince = (t: number, now = Date.now()) => Math.max(0, Math.floor((startOfDay(now) - startOfDay(t)) / DAY));
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Courses that should not be carried forward without a fresh decision once they have ended. */
const RISKY = /(cef|cefix|ceftri|cefur|amox|augmentin|clav|azith|clarith|cipro|oflox|levoflox|moxi|doxy|metronid|tinidaz|clinda|linezolid|cotrimox|pen[iy]cillin|cloxa|genta|amikac|rifamp|predni|dexameth|methylpred|betameth|deflazacort|hydrocortis|tramadol|tapentadol|codeine|morphin|buprenorph|fentanyl|pregabalin|gabapentin|alprazol|clonazep|zolpidem)/i;
export const isRisky = (it: RxItem) => RISKY.test(`${it.generic} ${it.brand} ${it.ingredients?.map((i) => i.name).join(' ') || ''}`);

/** length of the prescribed course in days; null when it has no fixed end (SOS / no duration) */
export function courseDays(it: RxItem): number | null {
  if (it.useTaper) return it.taper.reduce((a, t) => a + t.days, 0) || null;
  if (it.freq === 'SOS' && !it.duration) return null;
  if (!it.duration) return null;
  return it.duration * (it.durationUnit === 'weeks' ? 7 : it.durationUnit === 'months' ? 30 : 1);
}

export interface ItemState { state: 'ongoing' | 'ended' | 'open'; text: string; risky: boolean; checked: boolean }
export function itemState(it: RxItem, visit: number, now = Date.now()): ItemState {
  const risky = isRisky(it);
  const c = courseDays(it); const d = daysSince(visit, now);
  if (c == null) return { state: 'open', text: it.freq === 'SOS' ? 'As needed' : 'No end date', risky, checked: true };
  if (d < c) return { state: 'ongoing', text: `Day ${d + 1} of ${c}`, risky, checked: true };
  const over = d - c;
  return { state: 'ended', text: over <= 0 ? 'Course ended today' : `Course ended ${over} day${over > 1 ? 's' : ''} ago`, risky, checked: !risky };
}

export const medKey = (i: RxItem) => i.medId || norm(`${i.brand || i.generic} ${i.strength}`);

export function followUpStatus(prev: Pick<Prescription, 'authorizedAt' | 'createdAt' | 'followUpDays'>, now = Date.now()): { text: string; tone: 'green' | 'amber' | 'red' } | null {
  if (!prev.followUpDays) return null;
  const due = startOfDay(visitTs(prev)) + prev.followUpDays * DAY;
  const diff = Math.round((startOfDay(now) - due) / DAY);
  if (diff === 0) return { text: 'Follow-up due today', tone: 'green' };
  if (diff < 0) return { text: `Follow-up due in ${-diff} day${diff < -1 ? 's' : ''} (early visit)`, tone: 'amber' };
  return { text: `${diff} day${diff > 1 ? 's' : ''} after the planned follow-up`, tone: diff > 7 ? 'red' : 'amber' };
}

export const shortDate = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
export const agoText = (t: number, now = Date.now()) => { const d = daysSince(t, now); return d === 0 ? 'today' : d === 1 ? 'yesterday' : d < 14 ? `${d} days ago` : d < 60 ? `${Math.round(d / 7)} weeks ago` : `${Math.round(d / 30)} months ago`; };
