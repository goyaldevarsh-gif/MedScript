# Architecture

**Stack:** Vite, React 18, TypeScript, Tailwind 3, Dexie (IndexedDB), jsPDF (PDF), pdf.js (preview), vite-plugin-pwa (Workbox).

## Layers
- `src/data` static reference data: `catalogue.ts` (generic), `brands.ts` (brand reference), `templates.ts` (starter templates), `rules.ts` (dose limits, allergy classes)
- `src/lib` logic: `db.ts` (schema + repository functions), `dosage.ts` (quantity + instructions EN/HI), `safety.ts`, `pdf.ts`, `imaging.ts` (signature cleanup, stamp renderer), `snapshot.ts`, `share.ts`, `backup` inside `db.ts`
- `src/components`, `src/pages` UI

## IndexedDB schema (v1)
`patients(id, pid, name, phone, updatedAt)` · `prescriptions(id, rxNo, patientId, status, updatedAt, createdAt)` ·
`medicines(id, generic, brand)` custom/imported · `meta(id, favourite, lastUsedAt)` · `templates(id, name, favourite)` · `settings(key)` · `audit(id, ts, rxId)`

## Integrity model
Finalizing a prescription (one transaction): assigns Rx number, stores an immutable snapshot of doctor/clinic/signature/stamp/layout,
computes a SHA-256 hash, writes an audit entry. `saveDraft` refuses to write over a finalized record. Changes create a new version (`parentId`, `version`).

## Sync-readiness
UUID primary keys and `updatedAt` on every record; repository functions are the only DB access, so a cloud sync adapter can be added without touching the UI.
