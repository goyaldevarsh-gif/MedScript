# MedScript – Digital Prescription Maker

Fast, professional, NMC-aware prescriptions for Indian doctors (starter content for orthopaedics).
React + TypeScript + Tailwind, local-first (IndexedDB via Dexie), installable PWA, works offline.

## Run
```bash
npm install --legacy-peer-deps
npm run dev        # development
npm run build      # production build in dist/
```
Deploy: push to `main`; the included GitHub Actions workflow publishes `dist/` to GitHub Pages
(Settings → Pages → Source: GitHub Actions). The app uses relative paths and a hash router, so it works from any sub-path.

## What is inside
- Dashboard, New Prescription (autosaved drafts), Patients, My Templates, Settings
- Medicine library: generic reference catalogue + Indian brand reference list + custom medicines (remembered) + CSV import
- Dosage builder (dose / frequency / timing / duration / SOS limit / taper / liquids / quantity), instructions in English and Hindi (Roman)
- 15 editable orthopaedic starter templates (no medicines pre-selected) + your own templates
- Doctor profile, multiple clinics, signature (upload or draw), stamp generator (circle/rectangle, blue/black/red) or upload
- A4 PDF with selectable text, multi-page, preview, download, print, native share, WhatsApp share
- Final review & authorisation, locked finalized versions, audit log, backup/restore
- Safety aids: allergy, duplicate medicine / ingredient, basic adult max-dose checks. **No interaction checking.**

## Data & compliance notes
- All data stays on the device. Take regular backups (Settings → Backup & restore).
- Medicine brand entries are a reference list: brand → composition. **Manufacturers are not pre-filled.** Always verify on the pack. Load a licensed database via CSV (columns: brand, generic, composition, strength, form, route, manufacturer).
- An inserted signature image is **not** a legally validated digital signature (DSC / Aadhaar eSign). MedScript says so wherever it is used.
- Registration number is mandatory before authorising (IMC Regulations 2002 cl. 1.4.1). Generic names in capitals are the default layout (cl. 1.5).
