# PDF catalog import — 5 November 2026

Sources: the user-provided `SAYARA 2.pdf` (43 numbered rows, two pages) and `SAYARA 3.pdf` (30 numbered rows, three pages). All five pages were rendered and reviewed, including the four company logos at the end of SAYARA 2.

The user confirmed that these are **categories**, not terminal products, and that they belong inside **every existing year branch**. A model without year branches receives the categories directly. Existing custom groups, descendants, prices, IDs and ordering are retained. No vehicles or inventory were invented. Accessories are outside this import.

- SAYARA 3's 30 categories apply to every make/model.
- SAYARA 2 applies only to **Toyota, Nissan, Hyundai and Kia**, determined from the company ancestor.
- Exact repeated Kurdish labels share one category. Different wording, such as left/right and driver/passenger, remains distinct. Driver/passenger labels do not imply a particular steering-wheel side.
- All 73 numbered source rows are mapped in `data/catalog/pdf-parts.json`, resulting in 57 distinct categories: 30 universal and 27 additional restricted categories. Source rows remain traceable even when repeated.
- Kurdish wording is retained, excluding embedded duplicate row numerals and PDF line wraps. Arabic left/right errors in SAYARA 3 rows 11–14 were corrected to agree with Kurdish and English. English/Arabic labels use natural automotive terminology.
- The user authorized nearest English/Arabic equivalents for unclear terms. Review/edit SAYARA 3 rows 25 and 27, and SAYARA 2 rows 37–39 in Studio when exact supplier terminology is available. Their Kurdish labels remain intact.

The live import added **6,461 categories**, reused **7 existing matching categories**, and covered **176 model/year branches across 22 companies**. Other company folders currently have no model children; there is no valid model destination for their parts yet. This includes Hyundai. Its restriction is already represented in the import data and applies when model branches are added and the import is rerun.

## Administration and customer display

Icon update: all 6,468 imported category assignments now use the existing blue wrench icon, matching the user's reference. The 6,461 imported folder icons were changed; the seven reused categories already used a wrench. Future PDF imports also use a wrench. This is a database-driven display change supported by existing app and Studio builds.

Studio's category form has Kurdish, English and Arabic name fields. The Kurdish field remains the canonical `name`, so existing installed applications keep working. `name_en` and `name_ar` fall back to the canonical name when blank. The Studio language control previews category names; its administration interface remains Kurdish. All three names can be searched in any preview language.

Customer rows, headings, breadcrumbs, Saved, search results and product details use the selected app language. This native display change is included in the prepared **Android version code 4**, which must be installed/distributed to expose the new translation behavior. The database categories themselves are already available to existing installations. Version 4 has not been submitted to Google Play as part of this data import; the version 3 closed-test release is unchanged.

## Safe repeat runs

```powershell
npm run db:migrate
npm run db:import-pdf
npm run db:import-pdf -- --apply
```

The default import is a dry run. `--apply` uses a transaction, an import advisory lock, unique `(parent_id, source_key)` identities and version checks when adopting existing rows. It saves a private catalog snapshot under ignored `artifacts/catalog-import/` before writing. It neither overwrites subsequent administrator translations/renames nor recreates existing tagged categories. Rerun after adding new models or year branches. `data/catalog/pdf-exclusions.json` preserves explicit parent-specific deletions: the front bumper chrome trim, front brake pads and front brake rotors are excluded only from BMW 530i 2023. Other deleted imported categories are recreated on a rerun unless similarly excluded.

`data/catalog/pdf-disabled-models.json` also excludes the twelve existing BMW model branches other than 530i. The requested cleanup removed 300 imported folders from ten populated branches; 228i and 440i were already empty. The exclusion applies to existing and future year children of those model IDs, so rerunning the PDF import cannot repopulate them. Other companies remain unaffected. See `bmw-530i-2026.md` for the 2026 publication and cleanup details.

No rules claim a specific part fits a vehicle year/engine/trim: these PDFs describe navigation categories, not fitment certifications. Existing compatibility rules are preserved.

## Verification

- All 27 automated tests and both TypeScript checks passed.
- Live checks verified three-language reads/search, literal wildcard escaping, two-page loading (40 + 17 rows), and six simultaneous administrator edits/creates. Conflicting edits cannot overwrite each other.
- Authenticated customer SQL searches took approximately 1.3–1.6 ms on this catalog in a local verification run; this measures database execution, not mobile/network latency or an availability guarantee.
- The generated `search_name` is backed by a trigram GIN index; browsing keeps the existing parent/order index and 40-row pagination. No whole-tree download or real-time subscription was added.
- A second import preview reported **0 inserts, 0 adoptions, 6,468 unchanged assignments**.
- Studio navigation, English/Arabic previews, the three filled edit fields, a non-terminal category switch and the phone-sized dialog footer were visually checked.

The customer application remains mobile only. Vercel packages the protected Telegram Studio, APIs and the existing public policy/deletion resources. The source PDFs and inspection outputs are excluded from deployment uploads.
