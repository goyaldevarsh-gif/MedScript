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
Ketorol 10|Ketorolac 10 mg|Tablet|NSAID
Ketorol 30 Injection|Ketorolac 30 mg/mL|Injection:IM|NSAID
Dynapar AQ Injection|Diclofenac 75 mg/3 mL|Injection:IM|NSAID
Dolokind Plus|Diclofenac 50 mg + Paracetamol 325 mg|Tablet|NSAID combination
Dolo-Neurobion Forte|Diclofenac + Thiamine + Pyridoxine + Cyanocobalamin|Tablet|NSAID combination
Sumo|Nimesulide 100 mg + Paracetamol 325 mg|Tablet|NSAID combination
Nise 100|Nimesulide 100 mg|Tablet|NSAID
Melflam 7.5|Meloxicam 7.5 mg|Tablet|NSAID
Melflam 15|Meloxicam 15 mg|Tablet|NSAID
Xefo 8|Lornoxicam 8 mg|Tablet|NSAID
Etova 400|Etodolac 400 mg|Tablet|NSAID
Dolonex 20|Piroxicam 20 mg|Capsule|NSAID
Flexon-MR|Ibuprofen 400 mg + Paracetamol 325 mg + Chlorzoxazone 250 mg|Tablet|NSAID + muscle relaxant
Myospaz Forte|Paracetamol 325 mg + Chlorzoxazone 250 mg|Tablet|Muscle relaxant
Epry 50|Eperisone 50 mg|Tablet|Muscle relaxant
Omnigel|Diclofenac diethylamine 1.16% w/w|Gel:Topical|NSAID (topical)
Thrombophob Gel|Heparin sodium 0.2% w/w|Gel:Topical|Topical (anti-oedema)
Hirudoid Cream|Mucopolysaccharide polysulfate 0.3% w/w|Cream:Topical|Topical (anti-oedema)
Pregalin-M 75|Pregabalin 75 mg + Methylcobalamin 750 mcg|Capsule|Neuropathic combination
Lyrica 50|Pregabalin 50 mg|Capsule|Neuropathic pain
Gabapin 100|Gabapentin 100 mg|Capsule|Neuropathic pain
Gabapin 400|Gabapentin 400 mg|Capsule|Neuropathic pain
Neurobion Forte|Vitamin B1 + Vitamin B6 + Vitamin B12|Tablet|Vitamin B12 / Neuropathic
Tapadol 50|Tapentadol 50 mg|Tablet|Opioid analgesic
Transtec 35|Buprenorphine 35 mcg/h|Patch:Topical|Opioid analgesic
Fortwin 30|Pentazocine 30 mg/mL|Injection:IM|Opioid analgesic
Bonviva 150|Ibandronate 150 mg|Tablet|Bisphosphonate
Saaz 500|Sulfasalazine 500 mg|Tablet|DMARD
Zycolchin 0.5|Colchicine 0.5 mg|Tablet|Anti-gout
Calcort 6|Deflazacort 6 mg|Tablet|Corticosteroid
Calcort 30|Deflazacort 30 mg|Tablet|Corticosteroid
Efcorlin 100|Hydrocortisone 100 mg|Injection:IV|Corticosteroid
Xylocaine 2% with Adrenaline|Lignocaine 2% + Adrenaline 1:200000|Injection:Local infiltration|Local anaesthetic
Naropin 0.75%|Ropivacaine 0.75%|Injection:Local infiltration|Local anaesthetic
Chymoral Forte|Trypsin + Chymotrypsin 100000 AU|Tablet|Enzyme (anti-oedema)
Warf 5|Warfarin 5 mg|Tablet|Anticoagulant
Acitrom 2|Acenocoumarol 2 mg|Tablet|Anticoagulant
Arixtra 2.5|Fondaparinux 2.5 mg/0.5 mL|Injection:SC|Anticoagulant
Fragmin 5000|Dalteparin 5000 IU/0.2 mL|Injection:SC|Anticoagulant
Cepodem XP 200|Cefpodoxime 200 mg|Tablet|Antibiotic
Droxyl 500|Cefadroxil 500 mg|Capsule|Antibiotic
Phexin 500|Cephalexin 500 mg|Capsule|Antibiotic
Doxt-SL 100|Doxycycline 100 mg|Capsule|Antibiotic
Ampiclox 500|Ampicillin 250 mg + Cloxacillin 250 mg|Capsule|Antibiotic
Moxikind-CV 625|Amoxicillin 500 mg + Clavulanic acid 125 mg|Tablet|Antibiotic
Clavam 1.2 g Injection|Amoxicillin 1000 mg + Clavulanic acid 200 mg|Injection:IV|Antibiotic
Zinacef 750 Injection|Cefuroxime 750 mg|Injection:IV|Antibiotic
Zosyn 4.5 g|Piperacillin 4 g + Tazobactam 0.5 g|Injection:IV|Antibiotic
Magnex Forte|Cefoperazone 1 g + Sulbactam 0.5 g|Injection:IV|Antibiotic
Amicin 500|Amikacin 500 mg/2 mL|Injection:IV|Antibiotic
Targocid 400|Teicoplanin 400 mg|Injection:IV|Antibiotic
Tienam 500|Imipenem 500 mg + Cilastatin 500 mg|Injection:IV|Antibiotic
Invanz 1 g|Ertapenem 1 g|Injection:IV|Antibiotic
Avelox 400|Moxifloxacin 400 mg|Tablet|Antibiotic
Septran DS|Trimethoprim 160 mg + Sulfamethoxazole 800 mg|Tablet|Antibiotic
Forcan 150|Fluconazole 150 mg|Tablet|Antifungal
Fucidin Cream|Fusidic acid 2% w/w|Cream:Topical|Antibacterial (topical)
Neosporin Powder|Neomycin + Polymyxin B + Bacitracin|Other:Topical|Antibacterial (topical)
Betadine Solution 5%|Povidone-iodine 5% w/v|Lotion:Topical|Antiseptic
Savlon Liquid|Chlorhexidine 1.5% + Cetrimide 3%|Lotion:Topical|Antiseptic
Famocid 20|Famotidine 20 mg|Tablet|Acid suppressant
Razo-D|Rabeprazole 20 mg + Domperidone 30 mg|Capsule|PPI combination
Nexpro-RD|Esomeprazole 40 mg + Domperidone 30 mg|Capsule|PPI combination
Pantocid IV 40|Pantoprazole 40 mg|Injection:IV|PPI
Nexpro IV 40|Esomeprazole 40 mg|Injection:IV|PPI
Sucral Suspension|Sucralfate 1 g/10 mL|Suspension|Gastroprotective
Digene Gel|Aluminium hydroxide + Magnesium hydroxide + Simethicone|Suspension|Antacid
Ondem 4|Ondansetron 4 mg|Tablet|Antiemetic
Cremaffin|Milk of magnesia + Liquid paraffin|Suspension|Laxative
Duphalac Syrup|Lactulose 10 g/15 mL|Syrup|Laxative
Dulcolax 5|Bisacodyl 5 mg|Tablet|Laxative
Electral Powder|Oral rehydration salts (WHO)|Sachet|Rehydration
Cetzine 10|Cetirizine 10 mg|Tablet|Antihistamine
Levocet 5|Levocetirizine 5 mg|Tablet|Antihistamine
Allegra 120|Fexofenadine 120 mg|Tablet|Antihistamine
Avil 25|Pheniramine 25 mg|Tablet|Antihistamine
Avil Injection|Pheniramine 22.75 mg/2 mL|Injection:IM|Antihistamine
Montair-LC|Montelukast 10 mg + Levocetirizine 5 mg|Tablet|Antihistamine combination
Ascoril LS|Ambroxol + Levosalbutamol + Guaifenesin|Syrup|Cough / respiratory
Montair 10|Montelukast 10 mg|Tablet|Antiasthmatic
Folvite 5|Folic acid 5 mg|Tablet|Vitamin
Autrin|Ferrous fumarate + Folic acid + Vitamin B12|Capsule|Iron supplement (haematinic)
Livogen|Ferrous fumarate + Folic acid|Capsule|Iron supplement (haematinic)
Zincovit|Multivitamin + Multimineral + Zinc|Tablet|Vitamin
Becosules|Vitamin B-complex + Vitamin C|Capsule|Vitamin
Glycomet 500|Metformin 500 mg|Tablet|Antidiabetic
Glycomet-GP 1|Metformin 500 mg + Glimepiride 1 mg|Tablet|Antidiabetic
Amlong 5|Amlodipine 5 mg|Tablet|Antihypertensive
Telma 40|Telmisartan 40 mg|Tablet|Antihypertensive
Atorva 10|Atorvastatin 10 mg|Tablet|Statin
Rosuvas 10|Rosuvastatin 10 mg|Tablet|Statin
Thyronorm 50|Levothyroxine 50 mcg|Tablet|Thyroid
Meftal-500|Mefenamic acid 500 mg|Tablet|NSAID
Meftal-Spas|Mefenamic acid 250 mg + Dicyclomine 10 mg|Tablet|NSAID combination
Hifenac-SP|Aceclofenac 100 mg + Serratiopeptidase 15 mg|Tablet|NSAID combination
Ibugesic 100 Suspension|Ibuprofen 100 mg/5 mL|Suspension|NSAID
Ibugesic Plus Suspension|Ibuprofen 100 mg + Paracetamol 162.5 mg/5 mL|Suspension|NSAID combination
Calpol 120 Suspension|Paracetamol 120 mg/5 mL|Suspension|Analgesic / Antipyretic
Fastum Gel|Ketoprofen 2.5% w/w|Gel:Topical|NSAID (topical)
Nise Gel|Nimesulide 1% w/w|Gel:Topical|NSAID (topical)
Dolonex Gel|Piroxicam 0.5% w/w|Gel:Topical|NSAID (topical)
Voveran 100 Suppository|Diclofenac 100 mg|Other:Rectal|NSAID
Contramal Injection|Tramadol 100 mg/2 mL|Injection:IM|Opioid analgesic
Pregalin 75|Pregabalin 75 mg|Capsule|Neuropathic pain
Pregalin 150|Pregabalin 150 mg|Capsule|Neuropathic pain
Lyrica 300|Pregabalin 300 mg|Capsule|Neuropathic pain
Tegretol 200|Carbamazepine 200 mg|Tablet|Neuropathic pain
Eptoin 100|Phenytoin 100 mg|Tablet|Anticonvulsant
Neurobion Injection|Vitamin B1 + Vitamin B6 + Vitamin B12|Injection:IM|Vitamin B12 / Neuropathic
Vertin 16|Betahistine 16 mg|Tablet|Anti-vertigo
Stugeron 25|Cinnarizine 25 mg|Tablet|Anti-vertigo
Aclasta 5 mg|Zoledronic acid 5 mg/100 mL|Injection:IV|Bisphosphonate
Fosamax Plus|Alendronate 70 mg + Cholecalciferol 2800 IU|Tablet|Bisphosphonate
Miacalcic 100 IU|Calcitonin salmon 100 IU/mL|Injection:SC|Anti-resorptive
Synvisc-One|Hylan G-F20 48 mg/6 mL|Injection:Intra-articular|Viscosupplement (joint)
Durolane|Hyaluronic acid (NASHA) 60 mg/3 mL|Injection:Intra-articular|Viscosupplement (joint)
Orthovisc|Sodium hyaluronate 30 mg/2 mL|Injection:Intra-articular|Viscosupplement (joint)
Diprospan|Betamethasone dipropionate 5 mg + Betamethasone sodium phosphate 2 mg/mL|Injection:Intra-articular|Corticosteroid
Rumalaya Forte|Herbal formulation|Tablet|Herbal joint support
Yograj Guggulu|Herbal formulation|Tablet|Herbal joint support
Febugood 80|Febuxostat 80 mg|Tablet|Anti-gout
HCQS 300|Hydroxychloroquine 300 mg|Tablet|DMARD
Imuran 50|Azathioprine 50 mg|Tablet|DMARD
Olumiant 4|Baricitinib 4 mg|Tablet|DMARD
Exemptia 40|Adalimumab 40 mg/0.8 mL|Injection:SC|DMARD (biologic)
Pause 500|Tranexamic acid 500 mg|Tablet|Antifibrinolytic
Monocef-SB 1.5 g|Ceftriaxone 1 g + Sulbactam 0.5 g|Injection:IV|Antibiotic
Taxim 1 g Injection|Cefotaxime 1 g|Injection:IV|Antibiotic
Cepime 1 g|Cefepime 1 g|Injection:IV|Antibiotic
Fortum 1 g|Ceftazidime 1 g|Injection:IV|Antibiotic
Azithral 250|Azithromycin 250 mg|Tablet|Antibiotic
Claribid 500|Clarithromycin 500 mg|Tablet|Antibiotic
Akurit-4|Rifampicin 150 mg + Isoniazid 75 mg + Pyrazinamide 400 mg + Ethambutol 275 mg|Tablet|Anti-tubercular
R-Cinex 450|Rifampicin 450 mg + Isoniazid 300 mg|Capsule|Anti-tubercular
Benadon 40|Pyridoxine 40 mg|Tablet|Vitamin
Bactroban Ointment|Mupirocin 2% w/w|Ointment:Topical|Antibacterial (topical)
TT (Tetanus Toxoid)|Tetanus toxoid adsorbed 5 Lf/0.5 mL|Injection:IM|Vaccine
Tetagam-P 250 IU|Human tetanus immunoglobulin 250 IU|Injection:IM|Immunoglobulin
Omez-D|Omeprazole 20 mg + Domperidone 10 mg|Capsule|PPI combination
Levopraid 25|Levosulpiride 25 mg|Tablet|Prokinetic
Ganaton 50|Itopride 50 mg|Tablet|Prokinetic
Perinorm 10|Metoclopramide 10 mg|Tablet|Antiemetic
Cyclopam|Dicyclomine 20 mg + Paracetamol 500 mg|Tablet|Antispasmodic
Buscopan 10|Hyoscine butylbromide 10 mg|Tablet|Antispasmodic
Drotin 40|Drotaverine 40 mg|Tablet|Antispasmodic
Colospa 135|Mebeverine 135 mg|Tablet|Antispasmodic
Eldoper 2|Loperamide 2 mg|Capsule|Antidiarrhoeal
Redotil 100|Racecadotril 100 mg|Capsule|Antidiarrhoeal
Enterogermina|Bacillus clausii 2 billion spores/5 mL|Suspension|Probiotic
Asthalin Inhaler|Salbutamol 100 mcg/dose|Inhaler:Inhalation|Bronchodilator
Allegra-M|Fexofenadine 120 mg + Montelukast 10 mg|Tablet|Antihistamine combination
Montair-FX|Montelukast 10 mg + Fexofenadine 120 mg|Tablet|Antihistamine combination
Telekast-L|Montelukast 10 mg + Levocetirizine 5 mg|Tablet|Antihistamine combination
Okacet 10|Cetirizine 10 mg|Tablet|Antihistamine
Atarax 25|Hydroxyzine 25 mg|Tablet|Antihistamine
Sinarest|Paracetamol + Phenylephrine + Chlorpheniramine|Tablet|Cold / flu
Glycomet SR 500|Metformin 500 mg|Tablet (SR)|Antidiabetic
Amaryl 1|Glimepiride 1 mg|Tablet|Antidiabetic
Amaryl 2|Glimepiride 2 mg|Tablet|Antidiabetic
Diamicron MR 60|Gliclazide 60 mg|Tablet (SR)|Antidiabetic
Januvia 100|Sitagliptin 100 mg|Tablet|Antidiabetic
Galvus 50|Vildagliptin 50 mg|Tablet|Antidiabetic
Forxiga 10|Dapagliflozin 10 mg|Tablet|Antidiabetic
Jardiance 10|Empagliflozin 10 mg|Tablet|Antidiabetic
Mixtard 30|Human insulin 30/70 100 IU/mL|Injection:SC|Antidiabetic (insulin)
Huminsulin R|Human insulin regular 100 IU/mL|Injection:SC|Antidiabetic (insulin)
Lantus|Insulin glargine 100 IU/mL|Injection:SC|Antidiabetic (insulin)
Telma-H|Telmisartan 40 mg + Hydrochlorothiazide 12.5 mg|Tablet|Antihypertensive
Concor 5|Bisoprolol 5 mg|Tablet|Antihypertensive
Metolar XR 50|Metoprolol succinate 50 mg|Tablet (SR)|Antihypertensive
Losar 50|Losartan 50 mg|Tablet|Antihypertensive
Lasix 40|Furosemide 40 mg|Tablet|Diuretic
Aldactone 25|Spironolactone 25 mg|Tablet|Diuretic
Atorva 20|Atorvastatin 20 mg|Tablet|Statin
Atorva 40|Atorvastatin 40 mg|Tablet|Statin
Rosuvas 20|Rosuvastatin 20 mg|Tablet|Statin
Thyronorm 25|Levothyroxine 25 mcg|Tablet|Thyroid
Thyronorm 75|Levothyroxine 75 mcg|Tablet|Thyroid
Thyronorm 100|Levothyroxine 100 mcg|Tablet|Thyroid
Eltroxin 50|Levothyroxine 50 mcg|Tablet|Thyroid
Supradyn|Multivitamin + Multimineral|Tablet|Vitamin
Venofer|Iron sucrose 100 mg/5 mL|Injection:IV|Iron supplement (haematinic)
Dexorange Syrup|Ferric ammonium citrate + Folic acid + Vitamin B12|Syrup|Iron supplement (haematinic)
Protinex|Protein supplement|Powder|Nutritional supplement
Ensure|Nutritional formula|Powder|Nutritional supplement
Betnovate-N|Betamethasone 0.1% + Neomycin 0.5%|Cream:Topical|Corticosteroid (topical)
Dermovate Cream|Clobetasol 0.05% w/w|Cream:Topical|Corticosteroid (topical)
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
