import type { Medicine } from '../lib/types';

/**
 * Indian orthopaedic brand reference list: brand → composition / strength / form.
 * Compiled from commonly known product compositions and flagged "check pack" in the UI.
 * Manufacturers are intentionally NOT filled in. Doctors can add/edit them, or import a licensed CSV from Settings → Favourite medicines / Drug Library.
 * Row format: Brand | Composition (parts joined by " + ") | Form[:Route] | Category
 */
const ROWS = `
Dolo 650|Paracetamol 650 mg|Tablet|Analgesic / Antipyretic
Dolo 500|Paracetamol 500 mg|Tablet|Analgesic / Antipyretic
Dolo 250 Suspension|Paracetamol 250 mg/5 mL|Suspension|Analgesic / Antipyretic
Crocin Advance|Paracetamol 500 mg|Tablet|Analgesic / Antipyretic
Calpol 500|Paracetamol 500 mg|Tablet|Analgesic / Antipyretic
Calpol 650|Paracetamol 650 mg|Tablet|Analgesic / Antipyretic
Pacimol 500|Paracetamol 500 mg|Tablet|Analgesic / Antipyretic
Pacimol 650|Paracetamol 650 mg|Tablet|Analgesic / Antipyretic
Combiflam|Ibuprofen 400 mg + Paracetamol 325 mg|Tablet|NSAID combination
Ibugesic Plus|Ibuprofen 400 mg + Paracetamol 325 mg|Tablet|NSAID combination
Brufen 400|Ibuprofen 400 mg|Tablet|NSAID
Brufen 600|Ibuprofen 600 mg|Tablet|NSAID
Naprosyn 250|Naproxen 250 mg|Tablet|NSAID
Naprosyn 500|Naproxen 500 mg|Tablet|NSAID
Voveran 50|Diclofenac 50 mg|Tablet|NSAID
Voveran SR 100|Diclofenac 100 mg|Tablet|NSAID
Voveran 75 Injection|Diclofenac 75 mg/3 mL|Injection:IM|NSAID
Voveran Emulgel|Diclofenac 1% w/w|Gel|NSAID
Hifenac|Aceclofenac 100 mg|Tablet|NSAID
Hifenac-P|Aceclofenac 100 mg + Paracetamol 325 mg|Tablet|NSAID combination
Zerodol|Aceclofenac 100 mg|Tablet|NSAID
Zerodol-P|Aceclofenac 100 mg + Paracetamol 325 mg|Tablet|NSAID combination
Acenac|Aceclofenac 100 mg|Tablet|NSAID
Acenac-P|Aceclofenac 100 mg + Paracetamol 325 mg|Tablet|NSAID combination
Nucoxia 60|Etoricoxib 60 mg|Tablet|NSAID (COX-2)
Nucoxia 90|Etoricoxib 90 mg|Tablet|NSAID (COX-2)
Nucoxia 120|Etoricoxib 120 mg|Tablet|NSAID (COX-2)
Arcoxia 60|Etoricoxib 60 mg|Tablet|NSAID (COX-2)
Arcoxia 90|Etoricoxib 90 mg|Tablet|NSAID (COX-2)
Arcoxia 120|Etoricoxib 120 mg|Tablet|NSAID (COX-2)
Celebrex 200|Celecoxib 200 mg|Capsule|NSAID (COX-2)
Ketorol-DT 10|Ketorolac 10 mg|Tablet|NSAID
Ultracet|Tramadol 37.5 mg + Paracetamol 325 mg|Tablet|Opioid combination
Contramal 50|Tramadol 50 mg|Capsule|Opioid analgesic
Tramazac 50|Tramadol 50 mg|Capsule|Opioid analgesic
Lyrica 75|Pregabalin 75 mg|Capsule|Neuropathic pain
Lyrica 150|Pregabalin 150 mg|Capsule|Neuropathic pain
Maxgalin 75|Pregabalin 75 mg|Capsule|Neuropathic pain
Neurontin 300|Gabapentin 300 mg|Capsule|Neuropathic pain
Duzela 20|Duloxetine 20 mg|Capsule|Neuropathic pain
Duzela 30|Duloxetine 30 mg|Capsule|Neuropathic pain
Duzela 60|Duloxetine 60 mg|Capsule|Neuropathic pain
Tryptomer 10|Amitriptyline 10 mg|Tablet|Neuropathic pain
Tryptomer 25|Amitriptyline 25 mg|Tablet|Neuropathic pain
Methycobal 500|Methylcobalamin 500 mcg|Tablet|Vitamin B12 / Neuropathic
Tizan 2|Tizanidine 2 mg|Tablet|Muscle relaxant
Tizan 4|Tizanidine 4 mg|Tablet|Muscle relaxant
Sirdalud 2|Tizanidine 2 mg|Tablet|Muscle relaxant
Sirdalud 4|Tizanidine 4 mg|Tablet|Muscle relaxant
Lioresal 10|Baclofen 10 mg|Tablet|Muscle relaxant
Muscoril 4|Thiocolchicoside 4 mg|Capsule|Muscle relaxant
Myoril 4|Thiocolchicoside 4 mg|Capsule|Muscle relaxant
Myonal 50|Eperisone 50 mg|Tablet|Muscle relaxant
Shelcal 500|Calcium carbonate 1250 mg + Cholecalciferol (Vitamin D3) 250 IU|Tablet|Calcium + Vitamin D
Cipcal 500|Calcium carbonate 1250 mg + Cholecalciferol (Vitamin D3) 250 IU|Tablet|Calcium + Vitamin D
Calcirol Sachet|Cholecalciferol (Vitamin D3) 60000 IU|Sachet|Vitamin D
Uprise-D3 60K|Cholecalciferol (Vitamin D3) 60000 IU|Softgel capsule|Vitamin D
Arachitol 6L|Cholecalciferol (Vitamin D3) 600000 IU/mL|Injection:IM|Vitamin D
Rocaltrol|Calcitriol 0.25 mcg|Capsule|Vitamin D (active)
Limcee 500|Vitamin C (Ascorbic acid) 500 mg|Tablet|Vitamin
Celin 500|Vitamin C (Ascorbic acid) 500 mg|Tablet|Vitamin
Fosamax 70|Alendronate 70 mg|Tablet|Bisphosphonate
Actonel 35|Risedronate 35 mg|Tablet|Bisphosphonate
Reclast|Zoledronic acid 5 mg/100 mL|Injection:IV|Bisphosphonate
Prolia|Denosumab 60 mg/mL|Injection:SC|Anti-resorptive
Forteo|Teriparatide 250 mcg/mL (20 mcg per dose)|Injection:SC|Anabolic (osteoporosis)
Evista 60|Raloxifene 60 mg|Tablet|SERM (osteoporosis)
Artrodar|Diacerein 50 mg|Capsule|Chondroprotective
Augmentin 625|Amoxicillin 500 mg + Clavulanic acid 125 mg|Tablet|Antibiotic
Clavam 625|Amoxicillin 500 mg + Clavulanic acid 125 mg|Tablet|Antibiotic
Zinacef 500|Cefuroxime 500 mg|Tablet|Antibiotic
Ceftum 500|Cefuroxime 500 mg|Tablet|Antibiotic
Cefakind 500|Cefuroxime 500 mg|Tablet|Antibiotic
Taxim-O 200|Cefixime 200 mg|Tablet|Antibiotic
Monocef 1 g|Ceftriaxone 1 g|Injection:IV|Antibiotic
Meronem 1 g|Meropenem 1 g|Injection:IV|Antibiotic
Cleocin 300|Clindamycin 300 mg|Capsule|Antibiotic
Dalacin C 300|Clindamycin 300 mg|Capsule|Antibiotic
Linospan 600|Linezolid 600 mg|Tablet|Antibiotic
Zyvox 600|Linezolid 600 mg|Tablet|Antibiotic
Flagyl 400|Metronidazole 400 mg|Tablet|Antibiotic
Metrogyl 400|Metronidazole 400 mg|Tablet|Antibiotic
Ciplox 500|Ciprofloxacin 500 mg|Tablet|Antibiotic
Levoflox 500|Levofloxacin 500 mg|Tablet|Antibiotic
Tavanic 500|Levofloxacin 500 mg|Tablet|Antibiotic
Xarelto 2.5|Rivaroxaban 2.5 mg|Tablet|Anticoagulant
Xarelto 10|Rivaroxaban 10 mg|Tablet|Anticoagulant
Xarelto 15|Rivaroxaban 15 mg|Tablet|Anticoagulant
Xarelto 20|Rivaroxaban 20 mg|Tablet|Anticoagulant
Eliquis 2.5|Apixaban 2.5 mg|Tablet|Anticoagulant
Eliquis 5|Apixaban 5 mg|Tablet|Anticoagulant
Pradaxa 110|Dabigatran 110 mg|Capsule|Anticoagulant
Pradaxa 150|Dabigatran 150 mg|Capsule|Anticoagulant
Clexane 20|Enoxaparin 20 mg/0.2 mL|Injection:SC|Anticoagulant
Clexane 40|Enoxaparin 40 mg/0.4 mL|Injection:SC|Anticoagulant
Clexane 60|Enoxaparin 60 mg/0.6 mL|Injection:SC|Anticoagulant
Ecosprin 75|Aspirin 75 mg|Tablet|Antiplatelet
Ecosprin 150|Aspirin 150 mg|Tablet|Antiplatelet
Cyklokapron 500|Tranexamic acid 500 mg|Tablet|Antifibrinolytic
Medrol 4|Methylprednisolone 4 mg|Tablet|Corticosteroid
Medrol 16|Methylprednisolone 16 mg|Tablet|Corticosteroid
Wysolone 5|Prednisolone 5 mg|Tablet|Corticosteroid
Wysolone 10|Prednisolone 10 mg|Tablet|Corticosteroid
Wysolone 20|Prednisolone 20 mg|Tablet|Corticosteroid
Omnacortil 5|Prednisolone 5 mg|Tablet|Corticosteroid
Omnacortil 10|Prednisolone 10 mg|Tablet|Corticosteroid
Omnacortil 20|Prednisolone 20 mg|Tablet|Corticosteroid
Depo-Medrol 40|Methylprednisolone acetate 40 mg/mL|Injection:Intra-articular|Corticosteroid
Kenacort 40|Triamcinolone acetonide 40 mg/mL|Injection:Intra-articular|Corticosteroid
Dexona 0.5|Dexamethasone 0.5 mg|Tablet|Corticosteroid
Dexona Injection|Dexamethasone 4 mg/mL|Injection:IV|Corticosteroid
Xylocaine 2%|Lignocaine (Lidocaine) 2% w/v|Injection:Local infiltration|Local anaesthetic
Xylocaine Jelly 2%|Lignocaine (Lidocaine) 2% w/w|Gel|Local anaesthetic
Pantocid 40|Pantoprazole 40 mg|Tablet|PPI
Pan 40|Pantoprazole 40 mg|Tablet|PPI
Pantop 40|Pantoprazole 40 mg|Tablet|PPI
Pan-D|Pantoprazole 40 mg + Domperidone 30 mg|Capsule|PPI combination
Pantocid-DSR|Pantoprazole 40 mg + Domperidone 30 mg|Capsule|PPI combination
Nexpro 40|Esomeprazole 40 mg|Tablet|PPI
Nexium 40|Esomeprazole 40 mg|Tablet|PPI
Razo 20|Rabeprazole 20 mg|Tablet|PPI
Rablet 20|Rabeprazole 20 mg|Tablet|PPI
Omez 20|Omeprazole 20 mg|Capsule|PPI
Zofer 4|Ondansetron 4 mg|Tablet|Antiemetic
Zofer 8|Ondansetron 8 mg|Tablet|Antiemetic
Emeset 4|Ondansetron 4 mg|Tablet|Antiemetic
Domstal 10|Domperidone 10 mg|Tablet|Antiemetic
Betadine Ointment|Povidone iodine 5% w/w|Ointment|Antiseptic
Soframycin|Framycetin 1% w/w|Cream|Antibacterial (topical)
T-Bact|Mupirocin 2% w/w|Ointment|Antibacterial (topical)
Zerodol-SP|Aceclofenac 100 mg + Paracetamol 325 mg + Serratiopeptidase 15 mg|Tablet|NSAID combination
Zerodol-TH 4|Aceclofenac 100 mg + Thiocolchicoside 4 mg|Tablet|NSAID + muscle relaxant
Nucoxia-MR|Etoricoxib 60 mg + Thiocolchicoside 4 mg|Tablet|NSAID + muscle relaxant
Mobic 7.5|Meloxicam 7.5 mg|Tablet|NSAID
Mobic 15|Meloxicam 15 mg|Tablet|NSAID
Dolonex DT 20|Piroxicam 20 mg|Tablet|NSAID
Nimulid 100|Nimesulide 100 mg|Tablet|NSAID
Gabapin 300|Gabapentin 300 mg|Capsule|Neuropathic pain
Gabapin-NT|Gabapentin 300 mg + Nortriptyline 10 mg|Tablet|Neuropathic combination
Volini Gel|Diclofenac + Linseed oil + Methyl salicylate + Menthol|Gel:Topical|NSAID (topical)
Azee 500|Azithromycin 500 mg|Tablet|Antibiotic
Azithral 500|Azithromycin 500 mg|Tablet|Antibiotic
Mox 500|Amoxicillin 500 mg|Capsule|Antibiotic
Novamox 500|Amoxicillin 500 mg|Capsule|Antibiotic
Sporidex 500|Cephalexin 500 mg|Capsule|Antibiotic
Vancocin CP 1 g|Vancomycin 1 g|Injection:IV|Antibiotic
Bonmax 70|Alendronate 70 mg|Tablet|Bisphosphonate
Pantocid-D|Pantoprazole 40 mg + Domperidone 30 mg|Capsule|PPI combination
Bupivan 0.5%|Bupivacaine 0.5% w/v|Injection:Local infiltration|Local anaesthetic
Sensorcaine 0.5%|Bupivacaine 0.5% w/v|Injection:Local infiltration|Local anaesthetic
Betnesol Injection|Betamethasone 4 mg/mL|Injection:IM|Corticosteroid
Zyloric 100|Allopurinol 100 mg|Tablet|Anti-gout
Zyloric 300|Allopurinol 300 mg|Tablet|Anti-gout
Febugood 40|Febuxostat 40 mg|Tablet|Anti-gout
Hcqs 200|Hydroxychloroquine 200 mg|Tablet|DMARD
Folitrax 7.5|Methotrexate 7.5 mg|Tablet|DMARD
Folitrax 15|Methotrexate 15 mg|Tablet|DMARD
Zerodol-S|Aceclofenac 100 mg + Serratiopeptidase 15 mg|Tablet|NSAID combination
Zerodol-MR|Aceclofenac 100 mg + Tizanidine 2 mg|Tablet|NSAID + muscle relaxant
Zerodol-TH 8|Aceclofenac 100 mg + Thiocolchicoside 8 mg|Tablet|NSAID + muscle relaxant
Zerodol-TH Max 4|Aceclofenac 100 mg + Paracetamol 325 mg + Thiocolchicoside 4 mg|Tablet|NSAID + muscle relaxant
Zerodol-TH Max 8|Aceclofenac 100 mg + Paracetamol 325 mg + Thiocolchicoside 8 mg|Tablet|NSAID + muscle relaxant
Zerodol Gel|Aceclofenac|Gel:Topical|NSAID (topical)
Signoflam|Aceclofenac 100 mg + Paracetamol 325 mg + Serratiopeptidase 15 mg|Tablet|NSAID combination
Signoflam-P|Aceclofenac 100 mg + Paracetamol 500 mg|Tablet|NSAID combination
Signoflam-TH 4|Aceclofenac 100 mg + Paracetamol 325 mg + Thiocolchicoside 4 mg|Tablet|NSAID + muscle relaxant
Signoflam-TH 8|Aceclofenac 100 mg + Paracetamol 325 mg + Thiocolchicoside 8 mg|Tablet|NSAID + muscle relaxant
Signoflam 200 SR|Aceclofenac 200 mg|Tablet (SR)|NSAID
Osicare-Trio|Glucosamine sulphate 564 mg + Curcuma longa extract 60 mg + Boswellia serrata extract 30 mg + Undenatured type II collagen 20 mg|Tablet|Joint / tendon support
Trinyros 50|Aflapin (Boswellia serrata extract) 50 mg|Capsule|Joint / tendon support
Rosiflex|Rosehip extract|Capsule|Joint / tendon support
Rosiflex-C|Rosehip extract 275 mg + Vitamin C|Capsule|Joint / tendon support
Gemcal-D3|Calcium 500 mg + Cholecalciferol (Vitamin D3) 500 IU|Tablet|Calcium + Vitamin D
Gemcal-D3 Capsule|Calcium carbonate + Cholecalciferol (Vitamin D3)|Capsule|Calcium + Vitamin D
Gemcal Capsule|Calcium carbonate + Calcitriol 0.25 mcg + Zinc|Capsule|Calcium + Vitamin D
Gemcal Plus|Calcium carbonate + Calcitriol + Vitamin K2-7 + Methylcobalamin + Magnesium + Boron + Zinc|Capsule|Calcium + Vitamin D
Gemcal Suspension|Calcium citrate + Calcitriol|Suspension|Calcium + Vitamin D
Gemcal-XT|Calcium carbonate 1250 mg + Cholecalciferol (Vitamin D3) 2000 IU + L-Methylfolate calcium 1 mg + Methylcobalamin 1500 mcg + Pyridoxal-5-phosphate 20 mg|Tablet|Calcium + Vitamin D
Tayo 60K|Cholecalciferol (Vitamin D3) 60000 IU|Chewable tablet|Vitamin D
Tayo Soft 60K|Cholecalciferol (Vitamin D3) 60000 IU|Softgel capsule|Vitamin D
Tayo Derm 60K|Cholecalciferol (Vitamin D3) 60000 IU|Softgel capsule|Vitamin D
Tayo Total|Calcium carbonate 1250 mg + Cholecalciferol (Vitamin D3) 2000 IU + Methylcobalamin 1500 mcg + L-Methylfolate calcium 1 mg + Pyridoxal-5-phosphate 20 mg|Tablet|Calcium + Vitamin D
Tayo-M|Calcium carbonate 1250 mg + Cholecalciferol (Vitamin D3) 2000 IU + Methylcobalamin 1500 mcg + L-Methylfolate calcium 1 mg + Pyridoxal-5-phosphate 20 mg|Tablet|Calcium + Vitamin D
Uprise-D3 1K|Cholecalciferol (Vitamin D3) 1000 IU|Softgel capsule|Vitamin D
Uprise-D3 2K|Cholecalciferol (Vitamin D3) 2000 IU|Softgel capsule|Vitamin D
Uprise-D3 Sachet|Cholecalciferol (Vitamin D3) 60000 IU|Sachet|Vitamin D
Uprise-D3 60K Syrup|Cholecalciferol (Vitamin D3) 60000 IU/5 mL|Syrup|Vitamin D
Cifran 500|Ciprofloxacin 500 mg|Tablet|Antibiotic
Zifi 200|Cefixime 200 mg|Tablet|Antibiotic
Oflox 200|Ofloxacin 200 mg|Tablet|Antibiotic
Mydocalm 150|Tolperisone 150 mg|Tablet|Muscle relaxant
Evion 400|Vitamin E (Tocopheryl acetate) 400 mg|Capsule|Vitamin
Orofer-XT|Ferrous ascorbate 100 mg + Folic acid 1.5 mg|Tablet|Iron supplement (haematinic)
Orofer-S|Iron sucrose 100 mg/5 mL|Injection:IV|Iron supplement (haematinic)
Injectafer|Ferric carboxymaltose 500 mg/10 mL|Injection:IV|Iron supplement (haematinic)
Arava 20|Leflunomide 20 mg|Tablet|DMARD
Xeljanz 5|Tofacitinib 5 mg|Tablet|DMARD
Voltaren Emulgel|Diclofenac 1.16% w/w|Gel:Topical|NSAID (topical)
Plavix 75|Clopidogrel 75 mg|Tablet|Antiplatelet
Tendocare Forte|L-Arginine (SR) 500 mg + Chondroitin sulphate 200 mg + Collagen peptide type I 40 mg + Sodium hyaluronate 30 mg + Vitamin C 12.5 mg|Tablet|Collagen / tendon support
Tendocare|Collagen peptide + Sodium hyaluronate + Chondroitin sulphate + Vitamin C|Tablet|Collagen / tendon support
T-Heal|Collagen peptide type I + Mucopolysaccharides + Vitamin C|Capsule|Collagen / tendon support
T-Heal Forte|L-Arginine + Collagen peptide type I + Sodium hyaluronate + Chondroitin sulphate + Vitamin C|Tablet|Collagen / tendon support
`.trim().split('\n');

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export function parseComp(part: string) {
  const toks = part.trim().split(/\s+/);
  const i = toks.findIndex((t) => /^\d/.test(t));
  if (i <= 0) return { name: part.trim(), strength: '' };
  const name = toks.slice(0, i).join(' ');
  const strength = toks.slice(i).join(' ').replace(/^(\d[\d.]*)(mg|mcg|g|iu)$/i, '$1 $2');
  return { name, strength };
}
export const BRANDS: Medicine[] = ROWS.map((line) => {
  const [brand, comp, formRoute, category] = line.split('|');
  const [form, routeX] = formRoute.split(':');
  const ingredients = comp.split(' + ').map(parseComp);
  const route = routeX || (['Gel', 'Cream', 'Ointment'].includes(form) ? 'Topical' : 'Oral');
  return {
    id: `brand-${slug(brand)}`, brand, generic: ingredients.map((i) => i.name).join(' + '),
    ingredients, strength: ingredients.map((i) => i.strength).join(' + '), form, route,
    manufacturer: '', verified: false, source: 'brand' as const, category,
  };
});

/** Extra generic supplement / tendon / cartilage entries (no fixed standard strength unless widely standard). */
const g = (generic: string, strength: string, form: string, route: string, category: string, ing?: { name: string; strength: string }[]): Medicine => ({
  id: `cat-${slug(generic)}-${slug(strength)}-${slug(form)}`, brand: '', generic, ingredients: ing || [{ name: generic, strength }], strength, form, route,
  manufacturer: '', verified: true, source: 'catalogue', category,
});
export const SUPPLEMENTS: Medicine[] = [
  g('Collagen peptide (hydrolysed)', '', 'Sachet', 'Oral', 'Collagen / tendon support'),
  g('Collagen peptide + Vitamin C', '', 'Sachet', 'Oral', 'Collagen / tendon support', [{ name: 'Collagen peptide', strength: '' }, { name: 'Vitamin C', strength: '' }]),
  g('Curcumin + Piperine', '', 'Capsule', 'Oral', 'Joint / tendon support', [{ name: 'Curcumin', strength: '' }, { name: 'Piperine', strength: '' }]),
  g('Methylsulfonylmethane (MSM)', '', 'Tablet', 'Oral', 'Joint / tendon support'),
  g('Omega-3 fatty acids', '1000 mg', 'Capsule', 'Oral', 'Supplement'),
  g('Vitamin B-complex', '', 'Tablet', 'Oral', 'Supplement / Vitamin', [{ name: 'Vitamin B-complex', strength: '' }]),
  g('Serratiopeptidase', '10 mg', 'Tablet', 'Oral', 'Enzyme (anti-oedema)'),
  g('Trypsin + Bromelain + Rutoside', '48 mg + 90 mg + 100 mg', 'Tablet', 'Oral', 'Enzyme (anti-oedema)', [{ name: 'Trypsin', strength: '48 mg' }, { name: 'Bromelain', strength: '90 mg' }, { name: 'Rutoside', strength: '100 mg' }]),
  g('Sodium hyaluronate', '20 mg/2 mL', 'Injection', 'Intra-articular', 'Viscosupplement (joint)'),
];
