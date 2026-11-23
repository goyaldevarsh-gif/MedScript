/** Drug classes (matched on generic / ingredient / brand names) and the rules between them.
 *  Aimed at the medicines an orthopaedic OPD actually prescribes. Every rule has an id so the doctor can switch it off in Settings. */
export type IxLevel = 'danger' | 'warn' | 'info';

export const CLASSES: Record<string, { label: string; re: RegExp }> = {
  nsaid: { label: 'NSAID', re: /\b(diclofenac|ibuprofen|naproxen|aceclofenac|etoricoxib|celecoxib|nimesulide|ketorolac|piroxicam|meloxicam|indomethacin|indometacin|mefenamic|etodolac|lornoxicam|nabumetone|parecoxib|flurbiprofen|ketoprofen|dexketoprofen|tenoxicam|oxaprozin|aceclo|zerodol|voveran|brufen|combiflam)/ },
  anticoag: { label: 'blood thinner', re: /\b(warfarin|acenocoumarol|nicoumalone|rivaroxaban|apixaban|dabigatran|edoxaban|heparin|enoxaparin|dalteparin|fondaparinux|acitrom)/ },
  antiplatelet: { label: 'antiplatelet', re: /\b(clopidogrel|prasugrel|ticagrelor|aspirin|acetylsalicylic|ecosprin|disprin|cilostazol)/ },
  steroid: { label: 'steroid', re: /\b(prednisolone|prednisone|methylprednisolone|dexamethasone|betamethasone|hydrocortisone|deflazacort|triamcinolone|wysolone|medrol)/ },
  fq: { label: 'fluoroquinolone', re: /\b(ciprofloxacin|levofloxacin|ofloxacin|moxifloxacin|norfloxacin|gatifloxacin|gemifloxacin|prulifloxacin|ofloxacin|cifran|oflox)/ },
  opioid: { label: 'opioid', re: /\b(tramadol|tapentadol|codeine|morphine|fentanyl|buprenorphine|oxycodone|pentazocine|nalbuphine|pethidine)/ },
  tramadol: { label: 'tramadol', re: /\b(tramadol|tapentadol)/ },
  serotonergic: { label: 'antidepressant (SSRI/SNRI/TCA)', re: /\b(fluoxetine|sertraline|paroxetine|escitalopram|citalopram|fluvoxamine|duloxetine|venlafaxine|desvenlafaxine|amitriptyline|nortriptyline|imipramine|clomipramine|trazodone|mirtazapine)/ },
  ssri: { label: 'SSRI/SNRI', re: /\b(fluoxetine|sertraline|paroxetine|escitalopram|citalopram|fluvoxamine|duloxetine|venlafaxine|desvenlafaxine)/ },
  linezolid: { label: 'linezolid', re: /\blinezolid/ },
  benzo: { label: 'benzodiazepine / sleep tablet', re: /\b(clonazepam|alprazolam|diazepam|lorazepam|etizolam|zolpidem|nitrazepam|chlordiazepoxide|midazolam|clobazam)/ },
  gabapentinoid: { label: 'pregabalin / gabapentin', re: /\b(pregabalin|gabapentin|mirogabalin)/ },
  tizanidine: { label: 'tizanidine', re: /\btizanidine/ },
  relaxant: { label: 'muscle relaxant', re: /\b(tizanidine|thiocolchicoside|chlorzoxazone|methocarbamol|baclofen|eperisone|tolperisone|cyclobenzaprine|orphenadrine)/ },
  mtx: { label: 'methotrexate', re: /\b(methotrexate|mtx)/ },
  cotrimox: { label: 'co-trimoxazole / trimethoprim', re: /\b(cotrimoxazole|co-trimoxazole|trimethoprim|sulfamethoxazole|septran|bactrim)/ },
  raas: { label: 'BP tablet (ACE inhibitor / ARB)', re: /\b(enalapril|ramipril|lisinopril|perindopril|captopril|telmisartan|losartan|olmesartan|valsartan|candesartan|irbesartan|azilsartan)/ },
  diuretic: { label: 'diuretic', re: /\b(furosemide|torsemide|torasemide|hydrochlorothiazide|chlorthalidone|indapamide|spironolactone|amiloride)/ },
  antihtn: { label: 'BP tablet', re: /\b(enalapril|ramipril|lisinopril|perindopril|telmisartan|losartan|olmesartan|valsartan|candesartan|irbesartan|amlodipine|nifedipine|cilnidipine|atenolol|metoprolol|bisoprolol|carvedilol|nebivolol|propranolol|clonidine|furosemide|torsemide|hydrochlorothiazide|chlorthalidone|indapamide|prazosin)/ },
  cation: { label: 'calcium / iron / antacid / zinc / magnesium', re: /\b(calcium|ferrous|iron|ferric|zinc|magnesium|aluminium|aluminum|antacid|sucralfate|digene|gelusil|shelcal)/ },
  calcium: { label: 'calcium', re: /\b(calcium|shelcal)/ },
  tetracycline: { label: 'doxycycline / tetracycline', re: /\b(doxycycline|minocycline|tetracycline|lymecycline)/ },
  bisphos: { label: 'oral bisphosphonate', re: /\b(alendronate|risedronate|ibandronate)/ },
  ppi: { label: 'acid-reducing tablet (PPI / P-CAB)', re: /\b(omeprazole|esomeprazole|pantoprazole|rabeprazole|lansoprazole|dexlansoprazole|ilaprazole|vonoprazan|tegoprazan|fexuprazan|keverprazan)/ },
  omeprazole: { label: 'omeprazole / esomeprazole', re: /\b(omeprazole|esomeprazole)/ },
  macrolide: { label: 'clarithromycin / erythromycin', re: /\b(clarithromycin|erythromycin)/ },
  azithro: { label: 'azithromycin', re: /\bazithromycin/ },
  colchicine: { label: 'colchicine', re: /\bcolchicine/ },
  statin: { label: 'statin', re: /\b(atorvastatin|rosuvastatin|simvastatin|pravastatin|pitavastatin)/ },
  metronidazole: { label: 'metronidazole / tinidazole', re: /\b(metronidazole|tinidazole|ornidazole|secnidazole)/ },
  sulfonylurea: { label: 'diabetes tablet (sulfonylurea)', re: /\b(glimepiride|gliclazide|glibenclamide|glipizide)/ },
  levothyroxine: { label: 'levothyroxine', re: /\blevothyroxine|thyronorm|eltroxin/ },
  ondansetron: { label: 'ondansetron', re: /\bondansetron|ondem/ },
  kidopioid: { label: 'tramadol / tapentadol / codeine', re: /\b(tramadol|tapentadol|codeine)/ },
  aspirin: { label: 'aspirin', re: /\b(aspirin|acetylsalicylic|ecosprin|disprin)/ },
  lithium: { label: 'lithium', re: /\blithium/ },
  thiocol: { label: 'thiocolchicoside', re: /\bthiocolchicoside/ },
  teratogen: { label: 'methotrexate / leflunomide', re: /\b(methotrexate|mtx|leflunomide|teriflunomide)/ },
  /** anything that counts as stomach cover next to an NSAID */
  gprot: { label: 'stomach protection', re: /\b(omeprazole|esomeprazole|pantoprazole|rabeprazole|lansoprazole|dexlansoprazole|ilaprazole|vonoprazan|tegoprazan|fexuprazan|keverprazan|famotidine|ranitidine|nizatidine|misoprostol)/ },
};

export interface IxRule { id: string; a: string; b: string; level: IxLevel; text: string; group: string; /** skip when this class is also on the prescription */ unless?: string }

export const RULES: IxRule[] = [
  /* --- bleeding / kidney / stomach with NSAIDs --- */
  { id: 'nsaid-nsaid', group: 'NSAIDs', a: 'nsaid', b: 'nsaid', level: 'danger', text: 'two NSAIDs together. This adds stomach, kidney and heart risk with no extra pain relief. Keep one.' },
  { id: 'nsaid-anticoag', group: 'NSAIDs', a: 'nsaid', b: 'anticoag', level: 'danger', text: 'NSAID with a blood thinner raises the risk of serious bleeding. Avoid; use paracetamol or a non-drug option.' },
  { id: 'nsaid-antiplatelet', group: 'NSAIDs', a: 'nsaid', b: 'antiplatelet', level: 'warn', text: 'NSAID with aspirin / clopidogrel raises bleeding risk, and ibuprofen / naproxen can blunt the aspirin effect. Prefer a short course with stomach cover.' },
  { id: 'nsaid-steroid', group: 'NSAIDs', a: 'nsaid', b: 'steroid', level: 'warn', unless: 'ppi', text: 'NSAID with a steroid raises the risk of stomach ulcer and bleeding. Add stomach protection or avoid.' },
  { id: 'nsaid-ssri', group: 'NSAIDs', a: 'nsaid', b: 'ssri', level: 'warn', unless: 'ppi', text: 'NSAID with an SSRI / SNRI (for example duloxetine) raises the risk of stomach bleeding. Consider stomach protection.' },
  { id: 'nsaid-raas', group: 'NSAIDs', a: 'nsaid', b: 'raas', level: 'warn', text: 'NSAID with an ACE inhibitor / ARB can harm the kidneys and weaken the BP medicine. Keep the course short and check kidney function if prolonged.' },
  { id: 'nsaid-diuretic', group: 'NSAIDs', a: 'nsaid', b: 'diuretic', level: 'warn', text: 'NSAID with a diuretic can harm the kidneys and weaken the diuretic. Use the shortest course.' },
  { id: 'nsaid-mtx', group: 'NSAIDs', a: 'nsaid', b: 'mtx', level: 'warn', text: 'NSAID with methotrexate can raise methotrexate levels (more so at higher doses). Monitor blood counts and kidney function.' },
  { id: 'nsaid-lithium', group: 'NSAIDs', a: 'nsaid', b: 'lithium', level: 'warn', text: 'NSAID can raise lithium levels.' },
  { id: 'nsaid-bisphos', group: 'NSAIDs', a: 'nsaid', b: 'bisphos', level: 'warn', text: 'NSAID with an oral bisphosphonate adds to stomach and food-pipe irritation.' },
  { id: 'nsaid-fq', group: 'NSAIDs', a: 'nsaid', b: 'fq', level: 'info', text: 'NSAID with a fluoroquinolone can slightly raise the risk of seizures.' },
  /* --- tendon / antibiotics --- */
  { id: 'fq-steroid', group: 'Antibiotics', a: 'fq', b: 'steroid', level: 'warn', text: 'fluoroquinolone with a steroid raises the risk of tendon rupture (Achilles). Consider another antibiotic.' },
  { id: 'fq-cation', group: 'Antibiotics', a: 'fq', b: 'cation', level: 'warn', text: 'calcium / iron / antacid / zinc stops the antibiotic from being absorbed. Give the antibiotic 2 hours before or 6 hours after.' },
  { id: 'tetra-cation', group: 'Antibiotics', a: 'tetracycline', b: 'cation', level: 'warn', text: 'calcium / iron / antacid / zinc stops doxycycline from being absorbed. Keep them at least 2-3 hours apart.' },
  { id: 'fq-tizanidine', group: 'Antibiotics', a: 'fq', b: 'tizanidine', level: 'danger', text: 'ciprofloxacin / fluoroquinolones can raise tizanidine levels many times (very low BP, drowsiness). Avoid the combination.' },
  { id: 'fq-sulfonylurea', group: 'Antibiotics', a: 'fq', b: 'sulfonylurea', level: 'warn', text: 'fluoroquinolone with a sulfonylurea can cause low blood sugar.' },
  { id: 'fq-anticoag', group: 'Antibiotics', a: 'fq', b: 'anticoag', level: 'warn', text: 'fluoroquinolone can raise the effect of warfarin. Check INR.' },
  { id: 'metro-anticoag', group: 'Antibiotics', a: 'metronidazole', b: 'anticoag', level: 'warn', text: 'metronidazole can raise the effect of warfarin. Check INR.' },
  { id: 'cotrimox-anticoag', group: 'Antibiotics', a: 'cotrimox', b: 'anticoag', level: 'danger', text: 'co-trimoxazole can strongly raise the effect of warfarin. Avoid or check INR closely.' },
  { id: 'macrolide-anticoag', group: 'Antibiotics', a: 'macrolide', b: 'anticoag', level: 'warn', text: 'clarithromycin / erythromycin can raise the effect of warfarin. Check INR.' },
  { id: 'macrolide-colchicine', group: 'Antibiotics', a: 'macrolide', b: 'colchicine', level: 'danger', text: 'clarithromycin / erythromycin can cause colchicine toxicity. Avoid.' },
  { id: 'macrolide-statin', group: 'Antibiotics', a: 'macrolide', b: 'statin', level: 'warn', text: 'clarithromycin / erythromycin raises statin levels (muscle damage). Pause the statin during the course.' },
  { id: 'mtx-cotrimox', group: 'Antibiotics', a: 'mtx', b: 'cotrimox', level: 'danger', text: 'methotrexate with co-trimoxazole / trimethoprim can cause severe bone-marrow suppression. Avoid.' },
  { id: 'steroid-anticoag', group: 'Antibiotics', a: 'steroid', b: 'anticoag', level: 'warn', text: 'steroids can change the effect of warfarin and add to the bleeding risk.' },
  /* --- pain, nerve, sedation --- */
  { id: 'opioid-benzo', group: 'Pain and sedation', a: 'opioid', b: 'benzo', level: 'danger', text: 'opioid with a benzodiazepine / sleep tablet can cause dangerous drowsiness and slow breathing. Avoid, or use the lowest doses.' },
  { id: 'opioid-gaba', group: 'Pain and sedation', a: 'opioid', b: 'gabapentinoid', level: 'warn', text: 'opioid with pregabalin / gabapentin adds to drowsiness and can slow breathing. Start low, especially in the elderly.' },
  { id: 'benzo-gaba', group: 'Pain and sedation', a: 'benzo', b: 'gabapentinoid', level: 'warn', text: 'benzodiazepine with pregabalin / gabapentin adds to drowsiness and dizziness (fall risk).' },
  { id: 'opioid-relaxant', group: 'Pain and sedation', a: 'opioid', b: 'relaxant', level: 'info', text: 'opioid with a muscle relaxant adds to drowsiness. Advise against driving.' },
  { id: 'tramadol-sero', group: 'Pain and sedation', a: 'tramadol', b: 'serotonergic', level: 'warn', text: 'tramadol / tapentadol with an antidepressant raises the risk of serotonin syndrome and seizures.' },
  { id: 'tramadol-linezolid', group: 'Pain and sedation', a: 'tramadol', b: 'linezolid', level: 'danger', text: 'tramadol with linezolid can cause serotonin syndrome. Avoid.' },
  { id: 'tramadol-ondansetron', group: 'Pain and sedation', a: 'tramadol', b: 'ondansetron', level: 'info', text: 'ondansetron can reduce the pain relief of tramadol and adds a small serotonin risk.' },
  { id: 'tramadol-anticoag', group: 'Pain and sedation', a: 'tramadol', b: 'anticoag', level: 'warn', text: 'tramadol can raise the effect of warfarin. Check INR.' },
  { id: 'tizanidine-antihtn', group: 'Pain and sedation', a: 'tizanidine', b: 'antihtn', level: 'warn', text: 'tizanidine lowers BP and adds to BP medicines (dizziness, fainting).' },
  { id: 'relaxant-benzo', group: 'Pain and sedation', a: 'relaxant', b: 'benzo', level: 'info', text: 'muscle relaxant with a benzodiazepine adds to drowsiness.' },
  /* --- bone health, gout, stomach --- */
  { id: 'bisphos-cation', group: 'Bone and gout', a: 'bisphos', b: 'cation', level: 'warn', text: 'calcium / antacid blocks absorption of alendronate-type tablets. Take alendronate alone with water, 30 minutes before food and other tablets.' },
  { id: 'levo-cation', group: 'Bone and gout', a: 'levothyroxine', b: 'cation', level: 'info', text: 'calcium / iron reduces levothyroxine absorption. Keep 4 hours apart.' },
  { id: 'colchicine-statin', group: 'Bone and gout', a: 'colchicine', b: 'statin', level: 'warn', text: 'colchicine with a statin can cause muscle damage. Watch for muscle pain and weakness.' },
  { id: 'clopidogrel-ppi', group: 'Bone and gout', a: 'antiplatelet', b: 'omeprazole', level: 'warn', text: 'omeprazole / esomeprazole can reduce the effect of clopidogrel. Pantoprazole is the safer choice.' },
];

/** Conditions typed under "Comorbidities" and what they mean for a class. Matched against the comorbidity text. */
export interface CtxRule { id: string; cls: string; cond: RegExp; condLabel: string; level: IxLevel; text: string; group: string; /** replaces "Patient has <condition>" at the start of the message */ lead?: string }
/** how the Comorbidities text says it */
export const PREG = /\b(pregnan\w*|expecting)\b/;
export const BF = /\b(breast ?feed\w*|lactati\w*|nursing mother)\b/;
export const CTX_RULES: CtxRule[] = [
  { id: 'ctx-nsaid-kidney', group: 'Patient conditions', cls: 'nsaid', cond: /\b(kidney|ckd|renal|nephro\w*|dialysis|creatinine)\b/, condLabel: 'kidney disease', level: 'danger', text: 'NSAIDs can worsen kidney function. Avoid; use paracetamol or non-drug measures.' },
  { id: 'ctx-nsaid-gi', group: 'Patient conditions', cls: 'nsaid', cond: /\b(ulcer|gastritis|gerd|reflux|acidity|dyspepsia|gi bleed|melena|hematemesis|haematemesis|stomach)\b/, condLabel: 'stomach problems', level: 'warn', text: 'NSAIDs can cause stomach ulcers and bleeding. Prefer paracetamol, or add stomach protection and keep the course short.' },
  { id: 'ctx-nsaid-cvs', group: 'Patient conditions', cls: 'nsaid', cond: /\b(hypertension|htn|high bp|heart failure|cardiac|heart|ihd|cad|mi|stroke|angina)\b/, condLabel: 'heart or BP problem', level: 'warn', text: 'NSAIDs can raise BP, cause fluid retention and add heart risk. Use the lowest dose for the shortest time.' },
  { id: 'ctx-nsaid-asthma', group: 'Patient conditions', cls: 'nsaid', cond: /\basthma|copd|wheez/, condLabel: 'asthma', level: 'warn', text: 'NSAIDs can trigger an asthma attack in some patients.' },
  { id: 'ctx-nsaid-liver', group: 'Patient conditions', cls: 'nsaid', cond: /\b(liver|cirrhosis|hepatitis|jaundice)\b/, condLabel: 'liver disease', level: 'warn', text: 'NSAIDs need caution in liver disease (bleeding and fluid retention).' },
  { id: 'ctx-steroid-dm', group: 'Patient conditions', cls: 'steroid', cond: /\b(diabet\w*|dm|sugar|t2dm|t1dm)\b/, condLabel: 'diabetes', level: 'warn', text: 'steroids raise blood sugar. Advise monitoring, or avoid.' },
  { id: 'ctx-steroid-inf', group: 'Patient conditions', cls: 'steroid', cond: /\b(tb|tuberculosis|infect\w*|sepsis|hiv)\b/, condLabel: 'infection', level: 'warn', text: 'steroids can worsen an active infection.' },
  { id: 'ctx-steroid-gi', group: 'Patient conditions', cls: 'steroid', cond: /\b(ulcer|gastritis|gi bleed)\b/, condLabel: 'stomach ulcer', level: 'warn', text: 'steroids can aggravate stomach ulcers.' },
  { id: 'ctx-fq-seizure', group: 'Patient conditions', cls: 'fq', cond: /\b(epilep\w*|seizure\w*|fits|myasthenia)\b/, condLabel: 'epilepsy / myasthenia', level: 'danger', text: 'fluoroquinolones can trigger seizures and worsen myasthenia. Avoid.' },
  { id: 'ctx-tramadol-seizure', group: 'Patient conditions', cls: 'tramadol', cond: /\b(epilep\w*|seizure\w*|fits)\b/, condLabel: 'epilepsy', level: 'danger', text: 'tramadol lowers the seizure threshold. Avoid.' },
  { id: 'ctx-gaba-kidney', group: 'Patient conditions', cls: 'gabapentinoid', cond: /\b(kidney|ckd|renal|dialysis)\b/, condLabel: 'kidney disease', level: 'warn', text: 'pregabalin / gabapentin are cleared by the kidneys. Reduce the dose.' },
  { id: 'ctx-opioid-resp', group: 'Patient conditions', cls: 'opioid', cond: /\b(copd|sleep apnea|sleep apnoea|respiratory|asthma)\b/, condLabel: 'breathing problem', level: 'warn', text: 'opioids can depress breathing. Use with caution.' },
  { id: 'ctx-benzo-resp', group: 'Patient conditions', cls: 'benzo', cond: /\b(copd|sleep apnea|sleep apnoea|respiratory)\b/, condLabel: 'breathing problem', level: 'warn', text: 'benzodiazepines can depress breathing. Avoid.' },
  { id: 'ctx-tizanidine-liver', group: 'Patient conditions', cls: 'tizanidine', cond: /\b(liver|cirrhosis|hepatitis)\b/, condLabel: 'liver disease', level: 'warn', text: 'tizanidine can affect the liver. Avoid or monitor liver tests.' },
  { id: 'ctx-bisphos-gi', group: 'Patient conditions', cls: 'bisphos', cond: /\b(kidney|ckd|renal|gerd|reflux|oesophag\w*|esophag\w*|ulcer)\b/, condLabel: 'kidney or food-pipe problem', level: 'warn', text: 'oral bisphosphonates need caution here. Consider an injection or another option.' },
  { id: 'ctx-metro-liver', group: 'Patient conditions', cls: 'metronidazole', cond: /\b(liver|cirrhosis)\b/, condLabel: 'liver disease', level: 'warn', text: 'metronidazole dose may need reduction in liver disease.' },
  /* --- pregnancy and breastfeeding (the doctor taps Pregnant / Breastfeeding under Comorbidities) --- */
  { id: 'ctx-preg-teratogen', group: 'Pregnancy and breastfeeding', cls: 'teratogen', cond: PREG, condLabel: 'pregnancy', lead: 'Pregnant', level: 'danger', text: 'can cause miscarriage and birth defects. Do not give in pregnancy.' },
  { id: 'ctx-preg-thiocol', group: 'Pregnancy and breastfeeding', cls: 'thiocol', cond: PREG, condLabel: 'pregnancy', lead: 'Pregnant', level: 'danger', text: 'not recommended in pregnancy. Choose another muscle relaxant, or none.' },
  { id: 'ctx-preg-tetra', group: 'Pregnancy and breastfeeding', cls: 'tetracycline', cond: PREG, condLabel: 'pregnancy', lead: 'Pregnant', level: 'danger', text: 'doxycycline / tetracyclines can harm the baby\'s teeth and bones. Avoid.' },
  { id: 'ctx-preg-fq', group: 'Pregnancy and breastfeeding', cls: 'fq', cond: PREG, condLabel: 'pregnancy', lead: 'Pregnant', level: 'warn', text: 'fluoroquinolones are generally avoided in pregnancy. Choose another antibiotic if you can.' },
  { id: 'ctx-preg-nsaid', group: 'Pregnancy and breastfeeding', cls: 'nsaid', cond: PREG, condLabel: 'pregnancy', lead: 'Pregnant', level: 'warn', text: 'NSAIDs are generally avoided in pregnancy, especially after 20 weeks. Paracetamol is the usual choice.' },
  { id: 'ctx-preg-bisphos', group: 'Pregnancy and breastfeeding', cls: 'bisphos', cond: PREG, condLabel: 'pregnancy', lead: 'Pregnant', level: 'warn', text: 'bisphosphonates are not recommended in pregnancy.' },
  { id: 'ctx-preg-opioid', group: 'Pregnancy and breastfeeding', cls: 'opioid', cond: PREG, condLabel: 'pregnancy', lead: 'Pregnant', level: 'warn', text: 'opioids in pregnancy: only if clearly needed, lowest dose, shortest time.' },
  { id: 'ctx-bf-teratogen', group: 'Pregnancy and breastfeeding', cls: 'teratogen', cond: BF, condLabel: 'breastfeeding', lead: 'Breastfeeding', level: 'danger', text: 'passes into breast milk. Avoid while breastfeeding.' },
  { id: 'ctx-bf-thiocol', group: 'Pregnancy and breastfeeding', cls: 'thiocol', cond: BF, condLabel: 'breastfeeding', lead: 'Breastfeeding', level: 'danger', text: 'not recommended while breastfeeding.' },
  { id: 'ctx-bf-fq', group: 'Pregnancy and breastfeeding', cls: 'fq', cond: BF, condLabel: 'breastfeeding', lead: 'Breastfeeding', level: 'warn', text: 'fluoroquinolones pass into breast milk. Prefer another antibiotic.' },
  { id: 'ctx-bf-tetra', group: 'Pregnancy and breastfeeding', cls: 'tetracycline', cond: BF, condLabel: 'breastfeeding', lead: 'Breastfeeding', level: 'warn', text: 'doxycycline / tetracyclines pass into breast milk. Prefer another antibiotic, or keep the course short.' },
  { id: 'ctx-bf-opioid', group: 'Pregnancy and breastfeeding', cls: 'kidopioid', cond: BF, condLabel: 'breastfeeding', lead: 'Breastfeeding', level: 'warn', text: 'tramadol / codeine can make the baby drowsy. Avoid, or use very briefly.' },
];
/** age-based rules (years) */
export const AGE_RULES: { id: string; cls: string; min?: number; max?: number; level: IxLevel; text: string; group: string }[] = [
  { id: 'age-nsaid', group: 'Patient conditions', cls: 'nsaid', min: 65, level: 'warn', text: 'NSAIDs in patients 65 and older carry higher stomach, kidney and heart risk. Lowest dose, shortest time, consider stomach cover.' },
  { id: 'age-fq', group: 'Patient conditions', cls: 'fq', min: 60, level: 'warn', text: 'fluoroquinolones raise the risk of tendon rupture in patients over 60.' },
  { id: 'age-benzo', group: 'Patient conditions', cls: 'benzo', min: 65, level: 'warn', text: 'benzodiazepines in patients 65 and older raise the risk of confusion and falls.' },
  { id: 'age-opioid', group: 'Patient conditions', cls: 'opioid', min: 65, level: 'info', text: 'opioids in patients 65 and older: start at a lower dose.' },
  { id: 'age-gaba', group: 'Patient conditions', cls: 'gabapentinoid', min: 65, level: 'info', text: 'pregabalin / gabapentin in patients 65 and older: start at a lower dose (dizziness, falls).' },
  { id: 'kid-tramadol', group: 'Children', cls: 'kidopioid', max: 12, level: 'danger', text: 'tramadol / tapentadol / codeine are not recommended under 12 years (risk of breathing problems).' },
  { id: 'kid-aspirin', group: 'Children', cls: 'aspirin', max: 16, level: 'danger', text: 'aspirin is avoided under 16 years because of the risk of Reye syndrome.' },
  { id: 'kid-fq', group: 'Children', cls: 'fq', max: 18, level: 'warn', text: 'fluoroquinolones are generally avoided in children and teenagers (joint and tendon risk). Use only if there is no alternative.' },
  { id: 'kid-tetra', group: 'Children', cls: 'tetracycline', max: 8, level: 'warn', text: 'doxycycline / tetracyclines under 8 years can stain growing teeth.' },
  { id: 'kid-nsaid-infant', group: 'Children', cls: 'nsaid', max: 0.5, level: 'warn', text: 'NSAIDs under 6 months of age need a specialist decision.' },
];

/** how long a course may run before the app speaks up (oral medicines, days) */
export interface CourseRule { id: string; cls: string; maxDays: number; level: IxLevel; text: string; group: string; name: string }
export const COURSE_RULES: CourseRule[] = [
  { id: 'course-thiocol', group: 'Course length', cls: 'thiocol', maxDays: 7, level: 'warn', name: 'Thiocolchicoside, over 7 days', text: 'thiocolchicoside by mouth is usually limited to 7 days. Check the course length.' },
  { id: 'course-nsaid', group: 'Course length', cls: 'nsaid', maxDays: 14, level: 'info', name: 'NSAID, over 14 days', text: 'a long NSAID course. Lowest dose, stomach cover, and check kidney function if it continues.' },
  { id: 'course-kidopioid', group: 'Course length', cls: 'kidopioid', maxDays: 14, level: 'info', name: 'Tramadol / codeine, over 14 days', text: 'a long opioid course raises the risk of dependence. Review the need.' },
  { id: 'course-steroid', group: 'Course length', cls: 'steroid', maxDays: 14, level: 'info', name: 'Oral steroid, over 14 days', text: 'oral steroid for more than 2 weeks raises sugar and BP, and the dose should be tapered.' },
  { id: 'course-benzo', group: 'Course length', cls: 'benzo', maxDays: 14, level: 'info', name: 'Sleep / anxiety tablet, over 14 days', text: 'a long course can cause dependence. Review the need.' },
];
/** an NSAID by mouth for a week or more (or in an older patient) with nothing protecting the stomach */
export const NSAID_GI = { id: 'nsaid-no-gi', group: 'NSAIDs', level: 'info' as IxLevel, name: 'NSAID without stomach protection', text: 'no stomach protection on this prescription. For a course of 7 days or more, or in an older patient, consider adding a PPI.' };
