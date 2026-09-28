# Hoek · Ribbon Studio

An offline-first, mobile-friendly planning workspace for Hoek Architects. No build, account, external fonts, CDN, or runtime dependencies. Node.js is needed only for the included local server.

## Run

Double-click `start.cmd` on Windows with Node.js installed, or run `node serve.mjs` in this folder. Open http://localhost:4173. Keep the server window running for first load. Do not open index.html directly.

## Install on a phone

Serve the contents of `dist/` from an HTTPS static host. Visit that HTTPS URL once while online and wait for “מוכנה לאופליין”. iPhone: Safari → Share → Add to Home Screen. Android: Chrome → menu → Install app. Open the installed app once before disconnecting. A plain HTTP LAN address is insufficient for an installable offline PWA. Localhost is suitable for desktop testing only.

## Use

- On first launch, choose one of five starting themes: original Hoek, Blueprint, Essential, Color Coded or Night Studio. Themes change button presentation and the supplied icon family while preserving layout, notes and statuses. Reopen the chooser from the three-dot menu. Per-button overrides remain available afterward; Undo reverses a theme change.

- Open **אייקונים** to compare the original icon and two new alternatives for each of the 39 tools and the Lists dropdown (80 new SVG icons). Filter by panel or search. Choosing one applies and saves it immediately; Undo restores the previous choice. The editor also offers these alternatives, but applies its selection only when you save the editor. Original icons remain available.
- The comparison includes small-size previews. Icons use the original navy/plum palette with distinct line and symbol concepts. Selection remains available offline and survives backup/export/import.

- Tap a tool to edit its name, icon, tooltip, status, priority, notes, fix description, fixed version and location.
- Drag the dotted handle to reorder or move between visible panels/groups, with touch or mouse. The location and order fields provide an accessible alternative and work across filtered panels.
- Add panels with “קבוצה” and dropdowns with “תפריט”. Edit a dropdown to turn it into a stack. Revit stacks support 2–3 commands; this workspace intentionally allows draft structures for planning.
- Use Ideas for backlog items; move them to a panel in their editor when ready.
- Test & Fix includes needs-testing, needs-fix and in-progress tools. All imported commands start needs-testing; no testing history is invented.
- Undo/redo retains 40 changes; the activity log retains 120 entries. Both survive reload.
- Backup exports a portable JSON containing the layout, all custom and source icons, notes and activity log. Import is validated, requires confirmation and is undoable. It does not modify Revit.
- Planning specification export is a review artifact, not an automatically deployable Revit manifest.

## Storage and offline

State is stored in IndexedDB, with localStorage fallback. Data belongs to this browser and origin; devices do not synchronize. Export periodic backups before clearing browser data or switching devices. The service worker precaches the shell, source seed and every bundled icon. There are no online API calls. Custom icons are stored in the workspace itself.

## Source fidelity

`dist/source-manifest.json` preserves the unmodified package manifest. `dist/seed.json` adds planning metadata without dropping command classes, prompts, targets, parameters, tooltips or separators. Original source metadata remains inspectable in each editor.

The package has six manifest panels plus the independently created **Hoek AI Tools** bridge panel. Its **Hoek AI Status** button and original logo are included. See `SOURCE-AUDIT.md` for evidence. Revit can additionally read office or per-user overrides outside this ZIP; those are not available here. This is a faithful package baseline, not a live interrogation of an installed Revit workstation.

To regenerate the seed: `node extract.mjs PATH_TO_EXTRACTED_HoekAI-Package`. This reads JSON only and does not execute package scripts or binaries. Icons are copied unchanged from `toolbar/icons/` and `build/src/bridge/HoekLogo_*.png`.

## Files

`dist/` is the complete deployable PWA. `app.js` contains UI and local persistence; `style.css` contains responsive styling. `serve.mjs` is a dependency-free local preview server. After editing app files, regenerate the service worker file list/version using `node prepare.mjs`. Existing stored plans are preserved on updates.

`make-alternatives.mjs` regenerates the vector alternatives and their catalog. `node verify-icons.mjs` checks coverage, original retention, selected states, local assets and SVG backup validation. All icons are supplied as editable SVG, alongside the unchanged original PNGs.
