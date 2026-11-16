/** Import a medical shop's stock list (CSV / Excel / PDF) into the medicine library. */
import type { Medicine } from './types';
import { BRANDS, parseComp } from '../data/brands';
import { routeForForm } from './defaults';

export interface RawRow { name: string; composition?: string; form?: string; manufacturer?: string }
export interface ImportPlan { meds: Medicine[]; rows: number; matched: number; nameOnly: number; skipped: number; sample: Medicine[] }

/* ---------- table readers ---------- */
export function parseCsv(text: string): string[][] {
  const delim = (text.split('\n', 1)[0].match(/\t/g)?.length || 0) > 1 ? '\t' : ',';
  const rows: string[][] = []; let row: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

async function readXlsx(file: File): Promise<string[][]> {
  const XLSX: any = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const out: string[][] = [];
  for (const name of wb.SheetNames) {
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
    for (const r of rows) out.push(r.map((c) => String(c ?? '').trim()));
  }
  return out;
}

async function readPdf(file: File): Promise<string[][]> {
  const pdfjs: any = await import('pdfjs-dist');
  const worker: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: string[][] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent();
    const items = (tc.items as any[]).filter((i) => i.str && i.str.trim()).map((i) => ({ s: i.str as string, x: i.transform[4] as number, y: i.transform[5] as number, w: (i.width as number) || 0 }));
    // group into lines by y, then split each line into cells by x gaps
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: typeof items[] = [];
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last[0].y - it.y) <= 3) last.push(it); else lines.push([it]);
    }
    for (const ln of lines) {
      ln.sort((a, b) => a.x - b.x);
      const cells: string[] = []; let prevEnd = -1e9;
      for (const it of ln) {
        if (cells.length && it.x - prevEnd < 6) cells[cells.length - 1] += (it.x - prevEnd > 1 ? ' ' : '') + it.s;
        else cells.push(it.s);
        prevEnd = it.x + it.w;
      }
      out.push(cells.map((c) => c.trim()));
    }
  }
  return out;
}

export async function readTable(file: File): Promise<string[][]> {
  const n = file.name.toLowerCase();
  if (/\.(xlsx|xls|xlsm|ods)$/.test(n)) return readXlsx(file);
  if (/\.pdf$/.test(n) || file.type === 'application/pdf') return readPdf(file);
  return parseCsv(await file.text());
}

/* ---------- table -> raw rows ---------- */
const NAME_H = /^(item|items|product|products|medicine|medicines|drug|drugs|particulars?|description|brand|name|item ?name|product ?name|medicine ?name|drug ?name|brand ?name)\b/i;
const COMP_H = /(composition|salt|generic|content|molecule)/i;
const FORM_H = /^(form|dosage ?form|type|dosage)$/i;
const MFR_H = /(manufacturer|company|mfg|mfr|make|marketed)/i;
const JUNK = /^(total|grand|sub ?total|page|stock|date|report|sr|s\.?no|sl|bill|gst|tax|inventory|closing|opening|print|shop|pharmacy|medical|store)\b/i;

/** drop trailing qty / price columns glued to the name ("DOLO 650 120 45.50" -> "DOLO 650") */
function stripTail(s: string): string {
  const t = s.trim().split(/\s+/);
  let n = 0;
  while (n < t.length - 1 && /^[\d.,/]+$/.test(t[t.length - 1 - n])) n++;
  if (n >= 2) t.length -= n - 1;
  return t.join(' ');
}

export function tableToRows(table: string[][]): RawRow[] {
  let hi = -1, iN = -1, iC = -1, iF = -1, iM = -1;
  for (let r = 0; r < Math.min(table.length, 40); r++) {
    const c = table[r].findIndex((x) => NAME_H.test(x.trim()));
    if (c >= 0 && table[r].filter((x) => x.trim()).length >= 2) {
      hi = r; iN = c;
      iC = table[r].findIndex((x, k) => k !== c && COMP_H.test(x));
      iF = table[r].findIndex((x) => FORM_H.test(x.trim()));
      iM = table[r].findIndex((x, k) => k !== c && MFR_H.test(x));
      break;
    }
  }
  const out: RawRow[] = [];
  for (const row of table.slice(hi + 1)) {
    let name = '';
    if (iN >= 0) name = row[iN] || '';
    else name = row.find((x) => /[a-z]{3,}/i.test(x)) || '';
    name = stripTail(name.replace(/\s+/g, ' '));
    if (name.length < 3 || !/[a-z]{2,}/i.test(name) || JUNK.test(name)) continue;
    out.push({ name, composition: iC >= 0 ? row[iC] : undefined, form: iF >= 0 ? row[iF] : undefined, manufacturer: iM >= 0 ? row[iM] : undefined });
  }
  return out;
}

/* ---------- name cleaning + matching ---------- */
const FORM_WORDS: [RegExp, string][] = [
  [/\b(tabs?|tablets?)\b/gi, 'Tablet'], [/\b(caps?|capsules?)\b/gi, 'Capsule'], [/\b(syp|syrup)\b/gi, 'Syrup'],
  [/\b(susp|suspension)\b/gi, 'Suspension'], [/\b(inj|injection|vial|amp|ampoule)\b/gi, 'Injection'], [/\bgel\b/gi, 'Gel'],
  [/\b(cream|crm)\b/gi, 'Cream'], [/\b(oint|ointment)\b/gi, 'Ointment'], [/\b(lotion|lot)\b/gi, 'Lotion'], [/\bspray\b/gi, 'Spray'],
  [/\bsachets?\b/gi, 'Sachet'], [/\b(powder|pdr)\b/gi, 'Powder'], [/\bdrops?\b/gi, 'Drops'], [/\b(inhaler|rotacap)\b/gi, 'Inhaler'], [/\bpatch\b/gi, 'Patch'],
];
const PACK = /\b\d+\s*'?\s?(s|strip|strips|tabs?|caps?|ml|ltr)\b(?!\s*\d)|\b\d+\s*x\s*\d+\b|\(\s*\d+\s*'?s?\s*\)/gi;

function clean(name: string): { brand: string; form: string } {
  let s = name.replace(/\s+/g, ' ').replace(/[_]/g, ' ');
  let form = '';
  for (const [re, f] of FORM_WORDS) if (re.test(s)) { form = form || f; s = s.replace(re, ' '); }
  s = s.replace(PACK, ' ').replace(/\s+/g, ' ').trim();
  const brand = s.replace(/\w\S*/g, (w) => (w === w.toUpperCase() && /[A-Z]{2,}/.test(w) && w.length > 3 ? w[0] + w.slice(1).toLowerCase() : w));
  return { brand, form };
}
const key = (s: string) => s.toLowerCase().replace(/(\d)\s*(mg|mcg|gm|gms)\b/g, (_, d, u) => d + (u.startsWith('g') && u !== 'mg' ? 'g' : '')).replace(/[^a-z0-9]+/g, '');

let _index: Map<string, Medicine> | null = null;
function brandIndex(): Map<string, Medicine> {
  if (!_index) { _index = new Map(); for (const b of BRANDS) { _index.set(key(b.brand), b); _index.set(key(clean(b.brand).brand), b); } }
  return _index;
}

const STRENGTH = /(\d+(?:\.\d+)?\s?(?:mg|mcg|g|gm|ml|iu|%)(?:\s?\/\s?\d*\s?(?:ml|g))?)/i;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function planImport(rows: RawRow[], shop: string): ImportPlan {
  const idx = brandIndex();
  const seen = new Set<string>(); const meds: Medicine[] = [];
  let matched = 0, nameOnly = 0, skipped = 0;
  for (const r of rows) {
    const { brand, form: wf } = clean(r.name);
    if (!brand) { skipped++; continue; }
    const hit = idx.get(key(brand)) || idx.get(key(r.name)) || idx.get(key(brand.replace(/\s\d+(\.\d+)?\s?(g|gm|gms|ml)$/i, '')));
    let m: Medicine;
    if (hit) {
      m = { ...hit, id: `shop-${slug(shop)}-${slug(hit.brand)}`, source: 'import', shop, manufacturer: r.manufacturer?.trim() || hit.manufacturer };
      matched++;
    } else {
      const comp = r.composition?.trim();
      const ingredients = comp ? comp.split(/\s*\+\s*/).map(parseComp) : [];
      const explicit = r.form ? FORM_WORDS.map(([, f]) => f).find((f) => f.toLowerCase() === r.form!.trim().toLowerCase()) : '';
      const form = explicit || wf || 'Tablet';
      const st = comp ? ingredients.map((i) => i.strength).filter(Boolean).join(' + ') : (brand.match(STRENGTH)?.[1] || '').replace(/\s+/g, ' ');
      m = {
        id: `shop-${slug(shop)}-${slug(brand)}-${slug(form)}`, brand, generic: ingredients.map((i) => i.name).join(' + '), ingredients, strength: st,
        form, route: routeForForm(form), manufacturer: r.manufacturer?.trim() || '', verified: false, source: 'import', shop, category: 'Shop stock',
      };
      if (comp) matched++; else nameOnly++;
    }
    if (seen.has(m.id)) { skipped++; continue; }
    seen.add(m.id); meds.push(m);
  }
  return { meds, rows: rows.length, matched, nameOnly, skipped, sample: meds.slice(0, 8) };
}
