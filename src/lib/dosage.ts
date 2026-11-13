import type { Freq, Lang, RxItem, Timing } from './types';

export const FREQS: { v: Freq; label: string; perDay: number; en: string; hi: string }[] = [
  { v: 'OD', label: 'OD', perDay: 1, en: 'once daily', hi: 'दिन में एक बार' },
  { v: 'BD', label: 'BD', perDay: 2, en: 'twice daily', hi: 'दिन में दो बार' },
  { v: 'TDS', label: 'TDS', perDay: 3, en: 'three times daily', hi: 'दिन में तीन बार' },
  { v: 'QID', label: 'QID', perDay: 4, en: 'four times daily', hi: 'दिन में चार बार' },
  { v: 'HS', label: 'HS', perDay: 1, en: 'at bedtime', hi: 'रात को सोने से पहले' },
  { v: 'SOS', label: 'SOS', perDay: 0, en: 'only if needed', hi: 'ज़रूरत पड़ने पर ही' },
  { v: 'WEEKLY', label: 'Weekly', perDay: 1 / 7, en: 'once a week', hi: 'हफ़्ते में एक बार' },
  { v: 'CUSTOM', label: 'Custom', perDay: 1, en: '', hi: '' },
];
export const TIMINGS: { v: Timing; label: string; en: string; hi: string }[] = [
  { v: 'before', label: 'Before food', en: 'before meals', hi: 'खाने से पहले' },
  { v: 'after', label: 'After food', en: 'after meals', hi: 'खाने के बाद' },
  { v: 'with', label: 'With food', en: 'with food', hi: 'खाने के साथ' },
  { v: 'empty', label: 'Empty stomach', en: 'on an empty stomach', hi: 'खाली पेट' },
  { v: 'bedtime', label: 'At bedtime', en: 'at bedtime', hi: 'सोने से पहले' },
  { v: 'asreq', label: 'As required', en: 'as required', hi: 'ज़रूरत अनुसार' },
];
export const DURATIONS = [3, 5, 7, 10, 14, 30];
export const freqMeta = (f: Freq) => FREQS.find((x) => x.v === f)!;
export const timingMeta = (t: Timing) => TIMINGS.find((x) => x.v === t);

export function timesPerDay(it: RxItem): number {
  if (it.freq === 'CUSTOM') return it.timesPerDay || 1;
  return freqMeta(it.freq).perDay;
}
export function durationDays(it: RxItem): number {
  const n = it.duration || 0;
  return it.durationUnit === 'weeks' ? n * 7 : it.durationUnit === 'months' ? n * 30 : n;
}
export const isLiquid = (it: RxItem) => it.doseUnit === 'mL' || it.doseUnit === 'drop' || it.doseUnit === 'tsp';

const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
function amountEn(q: number, unit: string): string {
  const plural = (n: number, u: string) => (n === 1 ? u : u === 'mL' || u === 'unit' ? u : u + 's');
  if (unit === 'mL') return `${q} mL`;
  if (unit === 'application') return 'a thin layer';
  let w: string;
  if (q === 0.5) w = 'half'; else if (q === 1.5) w = 'one and a half'; else if (Number.isInteger(q) && q <= 10) w = W[q]; else w = String(q);
  const n = q === 0.5 ? 1 : q;
  const u = plural(n > 1 ? 2 : 1, unit);
  return `${w} ${q === 0.5 ? unit : u}`;
}
function durEn(it: RxItem): string {
  const n = it.duration;
  if (!n) return '';
  const unit = it.durationUnit === 'days' ? 'day' : it.durationUnit === 'weeks' ? 'week' : 'month';
  const w = n <= 10 ? W[n] : String(n);
  return `for ${w} ${unit}${n === 1 ? '' : 's'}`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function slotWord(it: RxItem) {
  return it.odSlot === 'night' ? 'at night' : it.odSlot === 'afternoon' ? 'in the afternoon' : 'in the morning';
}

export function doseLabel(it: RxItem): string {
  if (it.doseQty == null) return it.doseText || '';
  const u = it.doseUnit;
  if (u === 'mL') return `${it.doseQty} mL`;
  if (u === 'application') return 'Apply';
  const q = it.doseQty;
  const qs = q === 0.5 ? '½' : q === 1.5 ? '1½' : String(q);
  return `${qs} ${u}${q > 1 ? 's' : ''}`;
}
export function freqLabel(it: RxItem): string {
  if (it.freq === 'CUSTOM') return it.freqCustom || `${it.timesPerDay} times daily`;
  return freqMeta(it.freq).label;
}
export function durationLabel(it: RxItem): string {
  if (it.freq === 'SOS' && !it.duration) return 'As needed';
  if (!it.duration) return '';
  return `${it.duration} ${it.durationUnit === 'days' ? (it.duration === 1 ? 'day' : 'days') : it.durationUnit === 'weeks' ? (it.duration === 1 ? 'week' : 'weeks') : it.duration === 1 ? 'month' : 'months'}`;
}

export function computeQty(it: RxItem): { n: number | null; unit: string; text: string } {
  const unit = it.doseUnit;
  if (it.qtyOverride.trim()) return { n: null, unit, text: it.qtyOverride.trim() };
  if (unit === 'application') return { n: null, unit, text: '' };
  let total: number | null = null;
  if (it.useTaper && it.taper.length) total = it.taper.reduce((s, t) => s + t.dose * t.timesPerDay * t.days, 0);
  else if (it.doseQty != null) {
    const days = durationDays(it);
    if (it.freq === 'SOS') total = it.sosMax && days ? it.sosMax * it.doseQty * days : null;
    else if (it.freq === 'WEEKLY') total = Math.ceil(days / 7) * it.doseQty;
    else total = it.doseQty * timesPerDay(it) * days;
  }
  if (total == null || !isFinite(total) || total <= 0) return { n: null, unit, text: '' };
  total = Math.round(total * 10) / 10;
  const prefix = it.freq === 'SOS' ? 'up to ' : '';
  if (unit === 'mL') return { n: total, unit, text: `${prefix}${total} mL` };
  if (unit === 'drop') return { n: total, unit, text: `${prefix}${total} drops` };
  const whole = Math.ceil(total);
  const u = unit === 'unit' ? 'unit' : unit;
  return { n: whole, unit, text: `${prefix}${whole} ${u}${whole > 1 && !u.endsWith('s') ? 's' : ''}` };
}

function verbEn(it: RxItem): { lead: string; routePhrase: string } {
  const r = it.route;
  if (it.form === 'Injection' || ['IM', 'IV', 'SC', 'Intra-articular', 'Local infiltration'].includes(r))
    return { lead: 'Injection', routePhrase: '' };
  if (r === 'Topical' || it.doseUnit === 'application') return { lead: 'Apply', routePhrase: 'to the affected area' };
  if (r === 'Inhalation') return { lead: 'Inhale', routePhrase: '' };
  if (r === 'Ophthalmic') return { lead: 'Put', routePhrase: 'in the eye' };
  if (r === 'Nasal') return { lead: 'Use', routePhrase: 'in the nose' };
  if (r === 'Rectal') return { lead: 'Use', routePhrase: 'rectally' };
  if (it.form === 'Sachet' || it.form === 'Powder') return { lead: 'Dissolve in water and take', routePhrase: 'by mouth' };
  return { lead: 'Take', routePhrase: 'by mouth' };
}

function freqPhraseEn(it: RxItem): string {
  if (it.freq === 'CUSTOM') return it.freqCustom || (it.timesPerDay ? `${it.timesPerDay} times daily` : '');
  if (it.freq === 'OD') return `once daily ${slotWord(it)}`;
  if (it.freq === 'SOS') return it.sosMax ? `only if needed, up to ${it.sosMax} time${it.sosMax > 1 ? 's' : ''} a day` : 'only if needed';
  return freqMeta(it.freq).en;
}

function sentenceFor(it: RxItem, steps: { dose: number; per: number; days: number }[] | null): string {
  const unit = it.doseUnit;
  const { lead, routePhrase } = verbEn(it);
  const timing = timingMeta(it.timing);
  const timingPhrase = it.freq === 'HS' && (!it.timing || it.timing === 'bedtime') ? '' : timing && it.timing !== 'asreq' ? timing.en : '';
  if (lead === 'Injection') {
    const amt = it.doseQty != null ? `${it.doseQty} ${unit === 'mL' ? 'mL' : unit}` : it.doseText;
    const how = it.route === 'Intra-articular' ? 'into the joint' : it.route === 'IV' ? 'into the vein' : it.route === 'SC' ? 'under the skin' : it.route === 'IM' ? 'into the muscle' : '';
    return `${cap(amt || 'Injection')} ${how ? how + ' ' : ''}${freqPhraseEn(it)} ${durEn(it)}, to be given by a healthcare professional.`.replace(/\s+/g, ' ').replace(' ,', ',');
  }
  const amtOf = (q: number | null) => (q == null ? it.doseText || 'as directed' : amountEn(q, unit));
  if (steps) {
    const parts = steps.map((s) => {
      const per = s.per === 1 ? 'once daily' : s.per === 2 ? 'twice daily' : s.per === 3 ? 'three times daily' : `${s.per} times daily`;
      return `${amtOf(s.dose)} ${per} for ${s.days} day${s.days === 1 ? '' : 's'}`;
    });
    return `${lead} ${parts[0]}${parts.slice(1).map((p) => ', then ' + p).join('')}${timingPhrase ? ' ' + timingPhrase : ''}.`;
  }
  const amt = lead === 'Apply' ? '' : amtOf(it.doseQty);
  const bits = [lead, amt, routePhrase, freqPhraseEn(it), timingPhrase, it.freq === 'SOS' ? '' : durEn(it)].filter(Boolean);
  let s = bits.join(' ');
  if (it.freq === 'SOS' && it.sosMax && it.doseQty != null && unit !== 'application')
    s += ` (maximum ${Math.round(it.sosMax * it.doseQty * 10) / 10} ${unit === 'mL' ? 'mL' : unit + (it.sosMax * it.doseQty > 1 ? 's' : '')} in 24 hours)`;
  return s + '.';
}

const HI_SLOT = { morning: 'सुबह', afternoon: 'दोपहर', evening: 'शाम', night: 'रात' } as const;
function slotsFor(it: RxItem): ('morning' | 'afternoon' | 'evening' | 'night')[] {
  switch (it.freq) {
    case 'OD': return [it.odSlot];
    case 'BD': return ['morning', 'night'];
    case 'TDS': return ['morning', 'afternoon', 'night'];
    case 'QID': return ['morning', 'afternoon', 'evening', 'night'];
    case 'HS': return ['night'];
    default: return [];
  }
}
/** Classic "1-0-1" pattern (morning-afternoon-night; 4 slots for QID). Empty when it does not apply. */
export function dosePattern(it: RxItem): string {
  if (it.useTaper || it.doseQty == null || it.doseUnit === 'application') return '';
  const slots = slotsFor(it);
  if (!slots.length) return '';
  const q = it.doseQty === 0.5 ? '½' : it.doseQty === 1.5 ? '1½' : String(it.doseQty);
  const order = it.freq === 'QID' ? ['morning', 'afternoon', 'evening', 'night'] : ['morning', 'afternoon', 'night'];
  return order.map((s) => (slots.includes(s as any) ? q : '0')).join('-');
}
function hiTiming(it: RxItem): string {
  const t = it.timing;
  if (t === 'after') return 'खाने के बाद';
  if (t === 'before') return 'खाने से पहले';
  if (t === 'with') return 'खाने के साथ';
  if (t === 'empty') return 'खाली पेट';
  if (t === 'bedtime' || it.freq === 'HS') return 'सोने से पहले';
  return '';
}
function amountHi(it: RxItem, q: number | null): string {
  if (q == null) return it.doseText || '';
  const u = it.doseUnit;
  if (u === 'mL') return `${q} mL`;
  if (u === 'tablet') return q === 0.5 ? 'आधी गोली' : `${q} गोली`;
  if (u === 'capsule') return `${q} कैप्सूल`;
  if (u === 'drop') return `${q} बूँद`;
  if (u === 'application') return '';
  return `${q} ${u}`;
}
export function instructionHi(it: RxItem): { sentence: string; schedule: string } {
  const unit = it.doseUnit;
  const isInj = it.form === 'Injection' || ['IM', 'IV', 'SC', 'Intra-articular', 'Local infiltration'].includes(it.route);
  const dur = it.duration ? `${it.duration} ${it.durationUnit === 'days' ? 'दिन' : it.durationUnit === 'weeks' ? 'हफ़्ते' : 'महीने'} तक` : '';
  const tm = timingMeta(it.timing);
  const timeHi = it.freq === 'HS' && (!it.timing || it.timing === 'bedtime') ? '' : tm && it.timing !== 'asreq' ? tm.hi : '';
  const verb = isInj ? 'डॉक्टर/नर्स से लगवाएँ' : unit === 'application' || it.route === 'Topical' ? 'प्रभावित जगह पर लगाएँ' : 'लें';
  let sentence: string;
  if (it.useTaper && it.taper.length) {
    const parts = it.taper.map((s) => `${amountHi(it, s.dose)} दिन में ${s.timesPerDay} बार ${s.days} दिन`);
    sentence = `${parts.join(', फिर ')} ${timeHi} ${verb}।`;
  } else {
    const fh = it.freq === 'CUSTOM' ? it.freqCustom || `दिन में ${it.timesPerDay} बार` : freqMeta(it.freq).hi;
    const sosMax = it.freq === 'SOS' && it.sosMax ? ` (दिन में ज़्यादा से ज़्यादा ${it.sosMax} बार)` : '';
    sentence = [amountHi(it, it.doseQty), fh + sosMax, timeHi, it.freq === 'SOS' ? '' : dur, verb].filter(Boolean).join(' ') + '।';
  }
  const slots = slotsFor(it);
  const t2 = hiTiming(it);
  const schedule = it.useTaper ? '' : slots.map((s) => `${HI_SLOT[s]}${t2 ? ' - ' + t2 : ''}`).join('  |  ');
  return { sentence: sentence.replace(/\s+/g, ' '), schedule };
}

export function instructionEn(it: RxItem): string {
  const steps = it.useTaper && it.taper.length ? it.taper.map((t) => ({ dose: t.dose, per: t.timesPerDay, days: t.days })) : null;
  let s = sentenceFor(it, steps);
  if (it.notes.trim()) s += ` ${it.notes.trim().replace(/\.$/, '')}.`;
  return s.replace(/\s+/g, ' ');
}
export function itemInstructions(it: RxItem, lang: Lang): { en?: string; hi?: string; schedule?: string } {
  const out: { en?: string; hi?: string; schedule?: string } = {};
  if (lang !== 'hi') out.en = it.instructionOverride.trim() || instructionEn(it);
  if (lang !== 'en') {
    const h = instructionHi(it);
    out.hi = h.sentence;
    out.schedule = h.schedule;
  }
  return out;
}
export function itemIssues(it: RxItem): string[] {
  const e: string[] = [];
  if (!it.generic.trim()) e.push('Medicine name missing');
  if (it.doseQty == null && !it.doseText.trim()) e.push('Dose missing');
  if (!it.useTaper) {
    if (it.freq === 'CUSTOM' && !it.freqCustom.trim()) e.push('Custom frequency text missing');
    if (it.freq !== 'SOS' && it.freq !== 'WEEKLY' && !it.duration) e.push('Duration missing');
    if (it.freq === 'WEEKLY' && !it.duration) e.push('Duration missing');
  } else if (!it.taper.length) e.push('Add at least one taper step');
  return e;
}
