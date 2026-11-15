/** Detailed hand & wrist and foot & ankle figures. Region ids look like "h_idx_pip-R" (part-side), so the
    existing selection / side / label logic of the body map works unchanged. */
import type { Shape } from './body';

export type Detail = 'hand' | 'foot';
export type DView = 'palmar' | 'dorsal' | 'plantar' | 'back';
export const DETAIL_VIEWS: Record<Detail, DView[]> = { hand: ['palmar', 'dorsal'], foot: ['dorsal', 'plantar', 'back'] };
export const VIEW_LABEL: Record<DView, string> = { palmar: 'Palm side', dorsal: 'Back of hand / top of foot', plantar: 'Sole', back: 'Heel (from behind)' };
export const viewLabel = (d: Detail, v: DView) => (d === 'hand' ? (v === 'palmar' ? 'Palm side' : 'Back of hand') : v === 'dorsal' ? 'Top of foot' : v === 'plantar' ? 'Sole' : 'Heel from behind');
export const W = 120;
export const detailH = (d: Detail, v: DView) => (d === 'hand' ? 164 : v === 'dorsal' ? 190 : v === 'plantar' ? 184 : 142);

const rr = (id: string, x: number, y: number, w: number, h: number, r = 4): Shape => ({ id, t: 'r', a: [x, y, w, h, r] });
const el = (id: string, cx: number, cy: number, rx: number, ry: number): Shape => ({ id, t: 'e', a: [cx, cy, rx, ry] });
const flip = (s: Shape): Shape => (s.t === 'e' ? { ...s, a: [W - s.a[0], s.a[1], s.a[2], s.a[3]] } : { ...s, a: [W - s.a[0] - s.a[2], s.a[1], s.a[2], s.a[3], s.a[4]] });

const HAND_PALMAR_ONLY = ['thenar', 'hypo', 'palm', 'ctunnel'];
const HAND_DORSAL_ONLY = ['mc1', 'mc2', 'mc3', 'mc4', 'mc5', 'snuff', 'carpus'];
const FOOT_VIEW: Record<string, DView> = {
  ball: 'plantar', arch: 'plantar', heelp: 'plantar', pfo: 'plantar', achilles: 'back', heelb: 'back',
  mt1: 'dorsal', mt2: 'dorsal', mt3: 'dorsal', mt4: 'dorsal', mt5: 'dorsal', mt5b: 'dorsal', mid: 'dorsal', hind: 'dorsal', ankle: 'dorsal', tibd: 'dorsal',
};

function handBase(view: 'palmar' | 'dorsal'): Shape[] {
  const out: Shape[] = [];
  const F: [string, number, number][] = [['lit', 24, 22], ['rng', 44, 10], ['mid', 62, 4], ['idx', 80, 9]];
  for (const [k, cx, top] of F) {
    const w = k === 'lit' ? 12 : 13; let y = top;
    out.push(rr(`h_${k}_dist`, cx - w / 2, y, w, 17, 6)); y += 17;
    out.push(el(`h_${k}_dip`, cx, y + 2.5, w / 2 + 1, 3.2)); y += 5;
    out.push(rr(`h_${k}_mid`, cx - w / 2, y, w, 15, 4)); y += 15;
    out.push(el(`h_${k}_pip`, cx, y + 2.5, w / 2 + 1, 3.2)); y += 5;
    out.push(rr(`h_${k}_prox`, cx - w / 2, y, w, 18, 4)); y += 18;
    out.push(el(`h_${k}_mcp`, cx, y + 2.5, w / 2 + 1, 3.2));
  }
  out.push(rr('h_th_dist', 100, 54, 14, 16, 6), el('h_th_ip', 107, 72.5, 8, 3.2), rr('h_th_prox', 100, 75, 14, 18, 4), el('h_th_mcp', 107, 95.5, 8, 3.2));
  if (view === 'palmar') {
    out.push(rr('h_hypo', 16, 92, 24, 24, 7), rr('h_palm', 41, 78, 36, 38, 7), el('h_thenar', 89, 108, 12, 14), rr('h_ctunnel', 42, 118, 44, 12, 4));
  } else {
    out.push(rr('h_mc5', 18, 92, 12, 24, 4), rr('h_mc4', 38, 80, 12, 34, 4), rr('h_mc3', 56, 74, 12, 40, 4), rr('h_mc2', 74, 80, 12, 34, 4), rr('h_mc1', 91, 100, 12, 20, 4), el('h_snuff', 97, 124, 6, 5), rr('h_carpus', 36, 118, 56, 16, 6));
  }
  out.push(rr('h_wrist', 34, 136, 64, 8, 3), rr('h_ulna_d', 34, 146, 26, 16, 4), rr('h_radius_d', 64, 146, 34, 16, 4));
  return out;
}
function footBase(view: 'dorsal' | 'plantar' | 'back'): Shape[] {
  const out: Shape[] = [];
  if (view === 'back') return [rr('f_achilles', 54, 6, 24, 62, 8), el('f_heelb', 66, 104, 24, 28), el('f_mmal', 40, 66, 8, 11), el('f_lmal', 92, 70, 8, 11)];
  out.push(rr('f_hal_dist', 31, 6, 18, 13, 6), el('f_hal_ip', 40, 21, 10, 3.2), rr('f_hal_prox', 31, 24, 18, 14, 4), el('f_hal_mtp', 40, 40.5, 10, 3.5));
  out.push(rr('f_t2', 52, 13, 11, 24, 5), rr('f_t3', 65, 19, 11, 21, 5), rr('f_t4', 78, 25, 10, 19, 5), rr('f_t5', 90, 32, 10, 16, 5));
  if (view === 'dorsal') {
    out.push(rr('f_mt1', 32, 44, 16, 50, 5), rr('f_mt2', 51, 44, 10, 50, 4), rr('f_mt3', 63, 46, 10, 48, 4), rr('f_mt4', 75, 48, 10, 46, 4), rr('f_mt5', 87, 50, 11, 46, 4), el('f_mt5b', 101, 98, 6, 5));
    out.push(rr('f_mid', 32, 102, 66, 26, 8), rr('f_hind', 40, 130, 52, 20, 8), rr('f_ankle', 42, 152, 48, 14, 5), rr('f_tibd', 46, 168, 40, 20, 4), el('f_mmal', 36, 162, 7, 10), el('f_lmal', 97, 166, 7, 10));
  } else {
    out.push(rr('f_ball', 30, 46, 70, 34, 8), rr('f_arch', 34, 82, 62, 44, 10), el('f_heelp', 66, 152, 26, 26), el('f_pfo', 52, 134, 10, 6));
  }
  return out;
}

/** side "R"/"L" of the patient; medial (big-toe / thumb) side is mirrored accordingly */
export function detailShapes(d: Detail, view: DView, side: 'R' | 'L'): Shape[] {
  const base = d === 'hand' ? handBase(view === 'dorsal' ? 'dorsal' : 'palmar') : footBase(view === 'plantar' ? 'plantar' : view === 'back' ? 'back' : 'dorsal');
  const mirror = d === 'hand' ? (view === 'palmar') !== (side === 'R') : (view === 'plantar') !== (side === 'L');
  return base.map((s) => { const f = mirror ? flip(s) : s; return { ...f, id: f.id + '-' + side }; });
}

const FN: Record<string, string> = { th: 'thumb', idx: 'index finger', mid: 'middle finger', rng: 'ring finger', lit: 'little finger' };
export const DETAIL_NAMES: Record<string, string> = (() => {
  const n: Record<string, string> = {};
  for (const [k, f] of Object.entries(FN)) {
    n[`h_${k}_dist`] = `${f} - distal phalanx`; n[`h_${k}_prox`] = `${f} - proximal phalanx`; n[`h_${k}_mcp`] = `${f} - MCP joint`;
    if (k === 'th') n.h_th_ip = 'thumb - IP joint'; else { n[`h_${k}_dip`] = `${f} - DIP joint`; n[`h_${k}_mid`] = `${f} - middle phalanx`; n[`h_${k}_pip`] = `${f} - PIP joint`; }
  }
  Object.assign(n, {
    h_thenar: 'thenar (thumb base) palm', h_hypo: 'hypothenar palm', h_palm: 'central palm', h_ctunnel: 'carpal tunnel / wrist crease', h_carpus: 'carpal bones', h_snuff: 'anatomical snuffbox',
    h_wrist: 'wrist joint', h_radius_d: 'distal radius', h_ulna_d: 'distal ulna',
    h_mc1: '1st metacarpal', h_mc2: '2nd metacarpal', h_mc3: '3rd metacarpal', h_mc4: '4th metacarpal', h_mc5: '5th metacarpal',
    f_hal_dist: 'big toe - distal phalanx', f_hal_ip: 'big toe - IP joint', f_hal_prox: 'big toe - proximal phalanx', f_hal_mtp: 'big toe - MTP joint',
    f_t2: '2nd toe', f_t3: '3rd toe', f_t4: '4th toe', f_t5: '5th toe',
    f_mt1: '1st metatarsal', f_mt2: '2nd metatarsal', f_mt3: '3rd metatarsal', f_mt4: '4th metatarsal', f_mt5: '5th metatarsal', f_mt5b: '5th metatarsal base',
    f_mid: 'midfoot', f_hind: 'hindfoot (talus)', f_ankle: 'ankle joint', f_tibd: 'distal tibia', f_mmal: 'medial malleolus', f_lmal: 'lateral malleolus',
    f_ball: 'ball of foot (metatarsal heads)', f_arch: 'arch / midfoot (sole)', f_heelp: 'heel (sole)', f_pfo: 'plantar fascia origin (inner heel)',
    f_achilles: 'Achilles tendon', f_heelb: 'heel (calcaneus, back)',
  });
  return n;
})();

export const detailOf = (id: string): Detail | null => (id.startsWith('h_') ? 'hand' : id.startsWith('f_') ? 'foot' : null);
const part = (id: string) => id.split('-')[0];
export const sideOfId = (id: string): 'R' | 'L' => (id.endsWith('-L') ? 'L' : 'R');
/** the one view that shows this region, or null when it appears in every view */
export function viewOf(id: string): DView | null {
  const p = part(id).slice(2);
  if (id.startsWith('h_')) return HAND_PALMAR_ONLY.includes(p) ? 'palmar' : HAND_DORSAL_ONLY.includes(p) ? 'dorsal' : null;
  return FOOT_VIEW[p] || null;
}

/** Which detailed figure fits what the doctor has written / selected. Used to open it automatically only when relevant. */
export function suggestDetail(text: string, parts: string[] = []): Detail | null {
  const hit = parts.map(detailOf).find(Boolean) || null; if (hit) return hit;
  const t = text.toLowerCase();
  const H = /(hand|wrist|finger|thumb|carpal|scaphoid|metacarp|phalan|trigger|quervain|dupuytren|mallet|boutonni|ganglion|distal radius|colles|smith fracture)/;
  const F = /(foot|feet|ankle|toe|heel|plantar|achilles|calcane|metatars|malleol|talar|talus|hallux|bunion|lisfranc|clubfoot|ctev|flat ?foot|diabetic foot|jones)/;
  const h = t.search(H), f = t.search(F);
  if (h < 0 && f < 0) return null;
  if (h >= 0 && (f < 0 || h < f)) return 'hand';
  return 'foot';
}
