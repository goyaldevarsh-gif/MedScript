/** Basic adult maximum daily doses (mg/day) from standard product labelling. Not a substitute for clinical judgement. */
export const MAX_DAILY_MG: Record<string, number> = {
  paracetamol: 4000, aceclofenac: 200, diclofenac: 150, etoricoxib: 120, celecoxib: 400,
  ibuprofen: 2400, naproxen: 1250, ketorolac: 40, tramadol: 400, pregabalin: 600, gabapentin: 3600,
  duloxetine: 120, tizanidine: 36, baclofen: 80, pantoprazole: 80, domperidone: 40, thiocolchicoside: 16,
};
/** Drug-class keyword → member ingredients (for allergy matching). */
export const ALLERGY_CLASSES: { keys: string[]; label: string; members: string[] }[] = [
  { keys: ['nsaid', 'nsaids', 'anti-inflammatory', 'brufen'], label: 'NSAIDs', members: ['aceclofenac', 'diclofenac', 'etoricoxib', 'celecoxib', 'ibuprofen', 'naproxen', 'ketorolac', 'aspirin', 'nimesulide', 'piroxicam', 'meloxicam'] },
  { keys: ['penicillin', 'penicillins', 'amoxicillin', 'beta lactam', 'beta-lactam'], label: 'Penicillins', members: ['amoxicillin', 'ampicillin', 'cloxacillin', 'flucloxacillin', 'piperacillin', 'penicillin', 'clavulanic'] },
  { keys: ['cephalosporin', 'cephalosporins', 'cef'], label: 'Cephalosporins', members: ['cefuroxime', 'cefixime', 'cefazolin', 'ceftriaxone', 'cefoperazone', 'cefpodoxime', 'cefadroxil', 'cephalexin'] },
  { keys: ['sulfa', 'sulpha', 'sulfonamide'], label: 'Sulfonamides', members: ['sulfamethoxazole', 'cotrimoxazole', 'sulfasalazine', 'sulfadiazine', 'sulfadiazine'] },
  { keys: ['opioid', 'opioids', 'codeine', 'morphine'], label: 'Opioids', members: ['tramadol', 'morphine', 'codeine', 'fentanyl', 'tapentadol'] },
  { keys: ['aspirin'], label: 'Aspirin', members: ['aspirin'] },
  { keys: ['steroid', 'steroids', 'corticosteroid'], label: 'Corticosteroids', members: ['prednisolone', 'methylprednisolone', 'dexamethasone', 'triamcinolone', 'betamethasone', 'hydrocortisone'] },
  { keys: ['lignocaine', 'lidocaine', 'local anaesthetic', 'local anesthetic'], label: 'Local anaesthetics', members: ['lignocaine', 'lidocaine', 'bupivacaine'] },
  { keys: ['iodine', 'povidone'], label: 'Iodine', members: ['povidone', 'iodine'] },
];
