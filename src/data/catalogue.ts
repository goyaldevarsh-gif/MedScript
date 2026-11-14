import type { Medicine } from '../lib/types';
import { BRANDS, SUPPLEMENTS } from './brands';

/**
 * MedScript generic reference catalogue.
 * - Contains ONLY generic (non-proprietary) names, active ingredients, standard marketed strengths and forms.
 * - Brand names and manufacturers are deliberately NOT pre-filled: the doctor adds them from the product pack,
 *   and such entries are shown as "Doctor-entered (unverified)". Larger licensed databases can be loaded via CSV import.
 */
type Row = [generic: string, strengths: string[], form: string, route: string, category: string];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function single(r: Row): Medicine[] {
  const [generic, strengths, form, route, category] = r;
  return strengths.map((st) => ({
    id: `cat-${slug(generic)}-${slug(st)}-${slug(form)}`,
    brand: '', generic, ingredients: [{ name: generic, strength: st }], strength: st, form, route,
    manufacturer: '', verified: true, source: 'catalogue' as const, category,
  }));
}
function combo(parts: [string, string][], form: string, route: string, category: string): Medicine {
  const generic = parts.map((p) => p[0]).join(' + ');
  const strength = parts.map((p) => p[1]).join(' + ');
  return {
    id: `cat-${slug(generic)}-${slug(strength)}-${slug(form)}`,
    brand: '', generic, ingredients: parts.map(([name, st]) => ({ name, strength: st })), strength, form, route,
    manufacturer: '', verified: true, source: 'catalogue', category,
  };
}

const singles: Row[] = [
  // Analgesics / NSAIDs
  ['Paracetamol', ['500 mg', '650 mg', '1 g'], 'Tablet', 'Oral', 'Analgesic / Antipyretic'],
  ['Paracetamol', ['125 mg/5 mL', '250 mg/5 mL'], 'Suspension', 'Oral', 'Analgesic / Antipyretic'],
  ['Paracetamol', ['1 g/100 mL'], 'Injection', 'IV', 'Analgesic / Antipyretic'],
  ['Aceclofenac', ['100 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Diclofenac', ['50 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Diclofenac', ['75 mg/3 mL'], 'Injection', 'IM', 'NSAID'],
  ['Diclofenac', ['1% w/w'], 'Gel', 'Topical', 'NSAID'],
  ['Etoricoxib', ['60 mg', '90 mg', '120 mg'], 'Tablet', 'Oral', 'NSAID (COX-2)'],
  ['Celecoxib', ['100 mg', '200 mg'], 'Capsule', 'Oral', 'NSAID (COX-2)'],
  ['Ibuprofen', ['200 mg', '400 mg', '600 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Naproxen', ['250 mg', '500 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Ketorolac', ['10 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Ketorolac', ['30 mg/mL'], 'Injection', 'IM', 'NSAID'],
  ['Tramadol', ['50 mg'], 'Capsule', 'Oral', 'Opioid analgesic'],
  ['Tramadol', ['50 mg/mL'], 'Injection', 'IM', 'Opioid analgesic'],
  // Neuropathic / nerve
  ['Pregabalin', ['75 mg', '150 mg'], 'Capsule', 'Oral', 'Neuropathic pain'],
  ['Gabapentin', ['100 mg', '300 mg'], 'Capsule', 'Oral', 'Neuropathic pain'],
  ['Duloxetine', ['20 mg', '30 mg', '60 mg'], 'Capsule', 'Oral', 'Neuropathic pain'],
  ['Amitriptyline', ['10 mg', '25 mg'], 'Tablet', 'Oral', 'Neuropathic pain'],
  ['Methylcobalamin', ['500 mcg', '1500 mcg'], 'Tablet', 'Oral', 'Vitamin B12'],
  ['Methylcobalamin', ['500 mcg/mL', '1500 mcg/mL'], 'Injection', 'IM', 'Vitamin B12'],
  // Muscle relaxants
  ['Thiocolchicoside', ['4 mg', '8 mg'], 'Tablet', 'Oral', 'Muscle relaxant'],
  ['Tizanidine', ['2 mg', '4 mg'], 'Tablet', 'Oral', 'Muscle relaxant'],
  ['Baclofen', ['10 mg'], 'Tablet', 'Oral', 'Muscle relaxant'],
  ['Methocarbamol', ['500 mg'], 'Tablet', 'Oral', 'Muscle relaxant'],
  ['Chlorzoxazone', ['250 mg', '500 mg'], 'Tablet', 'Oral', 'Muscle relaxant'],
  // Gastro-protection / antiemetic
  ['Pantoprazole', ['20 mg', '40 mg'], 'Tablet', 'Oral', 'PPI'],
  ['Pantoprazole', ['40 mg'], 'Injection', 'IV', 'PPI'],
  ['Rabeprazole', ['20 mg'], 'Tablet', 'Oral', 'PPI'],
  ['Esomeprazole', ['20 mg', '40 mg'], 'Tablet', 'Oral', 'PPI'],
  ['Omeprazole', ['20 mg'], 'Capsule', 'Oral', 'PPI'],
  ['Domperidone', ['10 mg'], 'Tablet', 'Oral', 'Antiemetic'],
  ['Ondansetron', ['4 mg', '8 mg'], 'Tablet', 'Oral', 'Antiemetic'],
  ['Ondansetron', ['4 mg/2 mL'], 'Injection', 'IV', 'Antiemetic'],
  ['Sucralfate', ['1 g/10 mL'], 'Suspension', 'Oral', 'Gastroprotective'],
  // Bone health / supplements
  ['Cholecalciferol (Vitamin D3)', ['60000 IU'], 'Capsule', 'Oral', 'Vitamin D'],
  ['Cholecalciferol (Vitamin D3)', ['60000 IU'], 'Sachet', 'Oral', 'Vitamin D'],
  ['Cholecalciferol (Vitamin D3)', ['1000 IU', '2000 IU'], 'Tablet', 'Oral', 'Vitamin D'],
  ['Alendronate', ['35 mg', '70 mg'], 'Tablet', 'Oral', 'Bisphosphonate'],
  ['Risedronate', ['35 mg'], 'Tablet', 'Oral', 'Bisphosphonate'],
  ['Zoledronic acid', ['5 mg/100 mL'], 'Injection', 'IV', 'Bisphosphonate'],
  ['Denosumab', ['60 mg/mL'], 'Injection', 'SC', 'Anti-resorptive'],
  ['Calcitriol', ['0.25 mcg'], 'Capsule', 'Oral', 'Vitamin D (active)'],
  ['Calcium carbonate', ['500 mg'], 'Tablet', 'Oral', 'Calcium'],
  ['Glucosamine sulphate', ['1500 mg'], 'Sachet', 'Oral', 'Chondroprotective'],
  ['Diacerein', ['50 mg'], 'Capsule', 'Oral', 'Chondroprotective'],
  ['Vitamin C (Ascorbic acid)', ['500 mg'], 'Tablet', 'Oral', 'Vitamin'],
  // Antibiotics (post-op / infection)
  ['Cefuroxime', ['250 mg', '500 mg'], 'Tablet', 'Oral', 'Antibiotic'],
  ['Cefixime', ['100 mg', '200 mg'], 'Tablet', 'Oral', 'Antibiotic'],
  ['Cefazolin', ['1 g'], 'Injection', 'IV', 'Antibiotic'],
  ['Ceftriaxone', ['1 g'], 'Injection', 'IV', 'Antibiotic'],
  ['Cefoperazone + Sulbactam', ['1.5 g'], 'Injection', 'IV', 'Antibiotic'],
  ['Amikacin', ['500 mg/2 mL'], 'Injection', 'IV', 'Antibiotic'],
  ['Cloxacillin', ['500 mg'], 'Capsule', 'Oral', 'Antibiotic'],
  ['Clindamycin', ['150 mg', '300 mg'], 'Capsule', 'Oral', 'Antibiotic'],
  ['Doxycycline', ['100 mg'], 'Capsule', 'Oral', 'Antibiotic'],
  ['Linezolid', ['600 mg'], 'Tablet', 'Oral', 'Antibiotic'],
  ['Metronidazole', ['400 mg'], 'Tablet', 'Oral', 'Antibiotic'],
  // Anticoagulants / antiplatelets
  ['Rivaroxaban', ['2.5 mg', '10 mg'], 'Tablet', 'Oral', 'Anticoagulant'],
  ['Apixaban', ['2.5 mg', '5 mg'], 'Tablet', 'Oral', 'Anticoagulant'],
  ['Enoxaparin', ['20 mg/0.2 mL', '40 mg/0.4 mL', '60 mg/0.6 mL'], 'Injection', 'SC', 'Anticoagulant'],
  ['Aspirin', ['75 mg', '150 mg'], 'Tablet', 'Oral', 'Antiplatelet'],
  ['Tranexamic acid', ['500 mg'], 'Tablet', 'Oral', 'Antifibrinolytic'],
  ['Tranexamic acid', ['500 mg/5 mL'], 'Injection', 'IV', 'Antifibrinolytic'],
  // Steroids / injectables
  ['Prednisolone', ['5 mg', '10 mg', '20 mg'], 'Tablet', 'Oral', 'Corticosteroid'],
  ['Methylprednisolone', ['4 mg', '16 mg'], 'Tablet', 'Oral', 'Corticosteroid'],
  ['Methylprednisolone acetate', ['40 mg/mL'], 'Injection', 'Intra-articular', 'Corticosteroid'],
  ['Triamcinolone acetonide', ['40 mg/mL'], 'Injection', 'Intra-articular', 'Corticosteroid'],
  ['Dexamethasone', ['4 mg/mL'], 'Injection', 'IV', 'Corticosteroid'],
  ['Lignocaine (Lidocaine)', ['2% w/v'], 'Injection', 'Local infiltration', 'Local anaesthetic'],
  ['Lignocaine (Lidocaine)', ['5% w/w'], 'Gel', 'Topical', 'Local anaesthetic'],
  // Topicals
  ['Povidone iodine', ['5% w/w'], 'Ointment', 'Topical', 'Antiseptic'],
  ['Silver sulfadiazine', ['1% w/w'], 'Cream', 'Topical', 'Antibacterial (topical)'],
  ['Mupirocin', ['2% w/w'], 'Ointment', 'Topical', 'Antibacterial (topical)'],
  // Misc
  ['Cetirizine', ['10 mg'], 'Tablet', 'Oral', 'Antihistamine'],
  ['Lactulose', ['10 g/15 mL'], 'Syrup', 'Oral', 'Laxative'],
  ['Bisacodyl', ['5 mg'], 'Tablet', 'Oral', 'Laxative'],
  // Added: more NSAIDs / analgesics
  ['Meloxicam', ['7.5 mg', '15 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Piroxicam', ['20 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Nimesulide', ['100 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Etodolac', ['300 mg', '400 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Lornoxicam', ['4 mg', '8 mg'], 'Tablet', 'Oral', 'NSAID'],
  ['Indomethacin', ['25 mg'], 'Capsule', 'Oral', 'NSAID'],
  ['Diclofenac', ['100 mg'], 'Tablet (SR)', 'Oral', 'NSAID'],
  ['Tramadol', ['100 mg'], 'Tablet (SR)', 'Oral', 'Opioid analgesic'],
  ['Tapentadol', ['50 mg'], 'Tablet', 'Oral', 'Opioid analgesic'],
  ['Ketorolac', ['2% w/w'], 'Gel', 'Topical', 'NSAID'],
  // Added: neuropathic / muscle
  ['Nortriptyline', ['10 mg', '25 mg'], 'Tablet', 'Oral', 'Neuropathic pain'],
  ['Gabapentin', ['400 mg', '600 mg'], 'Tablet', 'Oral', 'Neuropathic pain'],
  ['Pregabalin', ['50 mg', '300 mg'], 'Capsule', 'Oral', 'Neuropathic pain'],
  ['Eperisone', ['50 mg', '150 mg'], 'Tablet', 'Oral', 'Muscle relaxant'],
  ['Folic acid', ['5 mg'], 'Tablet', 'Oral', 'Vitamin'],
  ['Vitamin B12 (Cyanocobalamin)', ['1000 mcg/mL'], 'Injection', 'IM', 'Vitamin B12'],
  // Added: bone health
  ['Ibandronate', ['150 mg'], 'Tablet', 'Oral', 'Bisphosphonate'],
  ['Raloxifene', ['60 mg'], 'Tablet', 'Oral', 'SERM'],
  ['Teriparatide', ['20 mcg/80 mcL'], 'Injection', 'SC', 'Anabolic (bone)'],
  ['Calcium citrate', ['500 mg'], 'Tablet', 'Oral', 'Calcium'],
  ['Menaquinone-7 (Vitamin K2)', ['45 mcg', '100 mcg'], 'Capsule', 'Oral', 'Vitamin'],
  ['Cholecalciferol (Vitamin D3)', ['3000 IU', '4000 IU'], 'Tablet', 'Oral', 'Vitamin D'],
  // Added: antibiotics / infection / trauma
  ['Amoxicillin', ['250 mg', '500 mg'], 'Capsule', 'Oral', 'Antibiotic'],
  ['Cephalexin', ['250 mg', '500 mg'], 'Capsule', 'Oral', 'Antibiotic'],
  ['Cefpodoxime', ['100 mg', '200 mg'], 'Tablet', 'Oral', 'Antibiotic'],
  ['Azithromycin', ['250 mg', '500 mg'], 'Tablet', 'Oral', 'Antibiotic'],
  ['Ciprofloxacin', ['500 mg'], 'Tablet', 'Oral', 'Antibiotic'],
  ['Levofloxacin', ['500 mg', '750 mg'], 'Tablet', 'Oral', 'Antibiotic'],
  ['Vancomycin', ['500 mg', '1 g'], 'Injection', 'IV', 'Antibiotic'],
  ['Meropenem', ['1 g'], 'Injection', 'IV', 'Antibiotic'],
  ['Gentamicin', ['80 mg/2 mL'], 'Injection', 'IV', 'Antibiotic'],
  ['Tetanus toxoid', ['0.5 mL'], 'Injection', 'IM', 'Vaccine (tetanus)'],
  ['Human tetanus immunoglobulin', ['250 IU'], 'Injection', 'IM', 'Immunoglobulin'],
  // Added: anticoagulants / steroids / misc
  ['Warfarin', ['1 mg', '2 mg', '5 mg'], 'Tablet', 'Oral', 'Anticoagulant'],
  ['Dabigatran', ['110 mg', '150 mg'], 'Capsule', 'Oral', 'Anticoagulant'],
  ['Heparin', ['5000 IU/mL'], 'Injection', 'SC', 'Anticoagulant'],
  ['Betamethasone', ['4 mg/mL'], 'Injection', 'IM', 'Corticosteroid'],
  ['Hydrocortisone', ['100 mg'], 'Injection', 'IV', 'Corticosteroid'],
  ['Deflazacort', ['6 mg', '12 mg'], 'Tablet', 'Oral', 'Corticosteroid'],
  ['Bupivacaine', ['0.25% w/v', '0.5% w/v'], 'Injection', 'Local infiltration', 'Local anaesthetic'],
  ['Famotidine', ['20 mg'], 'Tablet', 'Oral', 'H2 blocker'],
  ['Hyaluronidase', ['1500 IU'], 'Injection', 'Local infiltration', 'Enzyme'],
  ['Methotrexate', ['2.5 mg', '7.5 mg', '15 mg'], 'Tablet', 'Oral', 'DMARD'],
  ['Hydroxychloroquine', ['200 mg', '400 mg'], 'Tablet', 'Oral', 'DMARD'],
  ['Sulfasalazine', ['500 mg'], 'Tablet', 'Oral', 'DMARD'],
  ['Colchicine', ['0.5 mg'], 'Tablet', 'Oral', 'Anti-gout'],
  ['Febuxostat', ['40 mg', '80 mg'], 'Tablet', 'Oral', 'Anti-gout'],
  ['Allopurinol', ['100 mg', '300 mg'], 'Tablet', 'Oral', 'Anti-gout'],
];

const combos: Medicine[] = [
  combo([['Aceclofenac', '100 mg'], ['Paracetamol', '325 mg']], 'Tablet', 'Oral', 'NSAID combination'),
  combo([['Ibuprofen', '400 mg'], ['Paracetamol', '325 mg']], 'Tablet', 'Oral', 'NSAID combination'),
  combo([['Tramadol', '37.5 mg'], ['Paracetamol', '325 mg']], 'Tablet', 'Oral', 'Opioid combination'),
  combo([['Pregabalin', '75 mg'], ['Methylcobalamin', '750 mcg']], 'Capsule', 'Oral', 'Neuropathic combination'),
  combo([['Pantoprazole', '40 mg'], ['Domperidone', '30 mg']], 'Capsule', 'Oral', 'PPI combination'),
  combo([['Amoxicillin', '500 mg'], ['Clavulanic acid', '125 mg']], 'Tablet', 'Oral', 'Antibiotic'),
  combo([['Amoxicillin', '1000 mg'], ['Clavulanic acid', '200 mg']], 'Injection', 'IV', 'Antibiotic'),
  combo([['Calcium carbonate', '1250 mg'], ['Cholecalciferol (Vitamin D3)', '250 IU']], 'Tablet', 'Oral', 'Calcium + Vitamin D'),
  combo([['Glucosamine sulphate', '1500 mg'], ['Chondroitin sulphate', '1200 mg']], 'Sachet', 'Oral', 'Chondroprotective'),
  combo([['Aceclofenac', '100 mg'], ['Paracetamol', '325 mg'], ['Serratiopeptidase', '15 mg']], 'Tablet', 'Oral', 'NSAID combination'),
  combo([['Aceclofenac', '100 mg'], ['Thiocolchicoside', '4 mg']], 'Tablet', 'Oral', 'NSAID + muscle relaxant'),
  combo([['Aceclofenac', '100 mg'], ['Thiocolchicoside', '8 mg']], 'Tablet', 'Oral', 'NSAID + muscle relaxant'),
  combo([['Etoricoxib', '60 mg'], ['Thiocolchicoside', '4 mg']], 'Tablet', 'Oral', 'NSAID + muscle relaxant'),
  combo([['Etoricoxib', '90 mg'], ['Thiocolchicoside', '4 mg']], 'Tablet', 'Oral', 'NSAID + muscle relaxant'),
  combo([['Diclofenac', '50 mg'], ['Paracetamol', '325 mg']], 'Tablet', 'Oral', 'NSAID combination'),
  combo([['Diclofenac', '50 mg'], ['Paracetamol', '325 mg'], ['Serratiopeptidase', '15 mg']], 'Tablet', 'Oral', 'NSAID combination'),
  combo([['Nimesulide', '100 mg'], ['Paracetamol', '325 mg']], 'Tablet', 'Oral', 'NSAID combination'),
  combo([['Ibuprofen', '400 mg'], ['Paracetamol', '325 mg'], ['Chlorzoxazone', '250 mg']], 'Tablet', 'Oral', 'NSAID + muscle relaxant'),
  combo([['Paracetamol', '325 mg'], ['Chlorzoxazone', '250 mg']], 'Tablet', 'Oral', 'Analgesic + muscle relaxant'),
  combo([['Gabapentin', '300 mg'], ['Nortriptyline', '10 mg']], 'Tablet', 'Oral', 'Neuropathic combination'),
  combo([['Gabapentin', '300 mg'], ['Methylcobalamin', '500 mcg']], 'Tablet', 'Oral', 'Neuropathic combination'),
  combo([['Pregabalin', '75 mg'], ['Nortriptyline', '10 mg']], 'Capsule', 'Oral', 'Neuropathic combination'),
  combo([['Duloxetine', '20 mg'], ['Methylcobalamin', '1500 mcg']], 'Capsule', 'Oral', 'Neuropathic combination'),
  combo([['Piperacillin', '4 g'], ['Tazobactam', '0.5 g']], 'Injection', 'IV', 'Antibiotic'),
  combo([['Calcium carbonate', '500 mg'], ['Cholecalciferol (Vitamin D3)', '250 IU']], 'Tablet', 'Oral', 'Calcium + Vitamin D'),
  combo([['Calcium citrate', '1000 mg'], ['Cholecalciferol (Vitamin D3)', '500 IU']], 'Tablet', 'Oral', 'Calcium + Vitamin D'),
  combo([['Calcium carbonate', '500 mg'], ['Cholecalciferol (Vitamin D3)', '250 IU'], ['Menaquinone-7 (Vitamin K2)', '45 mcg']], 'Tablet', 'Oral', 'Calcium + Vitamin D'),
  combo([['Calcium carbonate', '500 mg'], ['Calcitriol', '0.25 mcg'], ['Zinc', '7.5 mg'], ['Magnesium', '50 mg']], 'Softgel capsule', 'Oral', 'Calcium + Vitamin D'),
  combo([['Diclofenac', '1% w/w'], ['Linseed oil', ''], ['Methyl salicylate', ''], ['Menthol', '']], 'Gel', 'Topical', 'NSAID (topical)'),
  combo([['Diclofenac', '1% w/w'], ['Methyl salicylate', ''], ['Menthol', '']], 'Gel', 'Topical', 'NSAID (topical)'),
  combo([['Glucosamine sulphate', '750 mg'], ['Chondroitin sulphate', '100 mg']], 'Tablet', 'Oral', 'Chondroprotective'),
  combo([['Glucosamine sulphate', '1500 mg'], ['Methylsulfonylmethane (MSM)', '500 mg']], 'Tablet', 'Oral', 'Chondroprotective'),
  combo([['Diacerein', '50 mg'], ['Glucosamine sulphate', '750 mg']], 'Capsule', 'Oral', 'Chondroprotective'),
];

const _all: Medicine[] = [...singles.flatMap(single), ...combos, ...SUPPLEMENTS, ...BRANDS];
const _seen = new Set<string>();
export const CATALOGUE: Medicine[] = _all.filter((m) => (_seen.has(m.id) ? false : (_seen.add(m.id), true)));

export const GROUPS = ['Pain killers', 'Calcium', 'Vitamins', 'Bone health', 'Muscle relaxants', 'Neuropathic', 'Antibiotics', 'Supplements', 'Tendon & cartilage', 'Steroids & injections', 'Gastro', 'Anticoagulants', 'Topicals', 'Gout & RA'] as const;
export type Group = (typeof GROUPS)[number];
export function groupsOf(m: Medicine): Group[] {
  const c = (m.category || '').toLowerCase();
  const g: Group[] = [];
  if (/nsaid|analges|opioid/.test(c)) g.push('Pain killers');
  if (/calcium/.test(c)) g.push('Calcium');
  if (/vitamin|calcitriol/.test(c) && !/calcium \+/.test(c)) g.push('Vitamins');
  if (/calcium \+ vitamin/.test(c)) g.push('Vitamins');
  if (/bisphosphonate|resorptive|anabolic|serm|vitamin d|calcium/.test(c)) g.push('Bone health');
  if (/muscle/.test(c)) g.push('Muscle relaxants');
  if (/neuropathic|b12/.test(c)) g.push('Neuropathic');
  if (/antibiotic|antibacterial/.test(c)) g.push('Antibiotics');
  if (/supplement|vitamin|omega/.test(c)) g.push('Supplements');
  if (/chondro|collagen|joint|tendon|viscosuppl|enzyme/.test(c)) g.push('Tendon & cartilage');
  if (/cortico|local anaes/.test(c) || m.route === 'Intra-articular') g.push('Steroids & injections');
  if (/ppi|antiemetic|gastro|laxative|h2/.test(c)) g.push('Gastro');
  if (/anticoag|antiplatelet|antifibrin/.test(c)) g.push('Anticoagulants');
  if (/dmard|gout/.test(c)) g.push('Gout & RA');
  if (m.route === 'Topical') g.push('Topicals');
  return Array.from(new Set(g));
}
const GROUP_WORDS: Record<string, string> = {
  'Pain killers': 'pain killer painkiller pain relief analgesic nsaid dard',
  Calcium: 'calcium', Vitamins: 'vitamin vitamins', 'Bone health': 'bone osteoporosis',
  'Muscle relaxants': 'muscle relaxant relaxants spasm', Neuropathic: 'neuropathic nerve neuropathy',
  Antibiotics: 'antibiotic antibiotics infection', Supplements: 'supplement supplements',
  'Tendon & cartilage': 'tendon ligament cartilage collagen joint chondroprotective',
  'Steroids & injections': 'steroid injection', Gastro: 'gastro acidity antacid ppi', Anticoagulants: 'anticoagulant blood thinner dvt', Topicals: 'topical gel cream ointment', 'Gout & RA': 'gout uric acid rheumatoid arthritis ra dmard',
};
const blobCache = new WeakMap<Medicine, string>();
export function searchBlob(m: Medicine): string {
  let b = blobCache.get(m);
  if (!b) {
    b = [m.brand, m.generic, m.ingredients.map((i) => i.name).join(' '), m.strength, m.form, m.manufacturer, m.category || '', ...groupsOf(m).map((x) => GROUP_WORDS[x] || '')].join(' ').toLowerCase();
    blobCache.set(m, b);
  }
  return b;
}
export const CATALOGUE_NOTE =
  'Reference entries list generic names, active ingredients and commonly marketed strengths. Brand and manufacturer are entered by the doctor from the pack, and shown as unverified.';
