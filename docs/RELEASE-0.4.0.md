# 0.4.0 implementation and verification

## Investigation and diagnosis

Read the existing modules and prior audit before extending them. The original BetterCampus package remains an independent system; no vendor internals or user theme settings were modified.

Live DOM inspection identified two appearance gaps: course-authored white `dp-content-block` containers, and an InstUI `span` tray surface inside `#nav-tray-portal`. The original broad transparent selectors did not cover that span. Dialogs inherited the fully transparent page surface, allowing timetable text behind them to compete with the foreground. These were rendering problems, not evidence of duplicated stored wallpaper records.

The portal's general catalog was retrieved through four authenticated application GET requests, capped by the server at 100 entries each. Only safe course/schedule response fields were exported; no request headers or authentication storage were inspected. It contains 389 section identities, 222 course codes, 379 scheduled sections and 10 without schedules. All API occurrence types were identical, so they were not treated as trustworthy lecture/lab/recitation distinctions.

## Architecture and files

- `src/background/glass.js`, `renderer.js`, and `src/content/main.js`: scoped tray/active navigation glass, light typography, and a reversible observer for near-white course-authored surfaces. Editors/iframe documents are excluded. The same background repository/configuration remains authoritative.
- `src/academic/styles.js`: a separate dark glass dialog surface and blurred backdrop; details retain paragraph spacing without applying `pre-line` to the entire dialog layout.
- `src/catalog/vinuni-fall-2026.json`, `src/academic/catalog.js`, and `integration-ui.js`: one distributable snapshot, exact course matching, explicit registered-section selection, original occurrence dates, export and duplicate guards. Existing manual classes are preserved.
- `src/academic/model.js`, `engine.js`, and `forms.js`: compatibility alias from tutorial to recitation for display/edit/backup validation.
- `src/academic/canvas.js`, `repository.js`, `widget.js`, and `src/worker.js`: opt-in refresh while the dashboard is open, cross-tab leases, full-document digests and provenance, explicit review of changed freeform sources, partial-failure preservation and revision-safe acknowledgements.
- `scripts/portal-catalog-export.js` and `build-catalog.mjs`: sanitized response export and deterministic catalog normalization. No extension dependency or host permission was added.

No database version bump, duplicated assignment store, image migration or background-setting rewrite was needed. Code rollback and a fresh academic export were saved privately before deployment. The installed unpacked directory and extension ID were retained.

## Tests actually performed

- **45/45 Node tests**: catalog completeness, all 379 scheduled imports validate, matching/semester boundaries, unknown schedules, exact selected teaching dates, legacy recitation compatibility, full-body digest changes, endpoint restrictions and partial document failures, plus existing background/timetable logic.
- **18/18 academic browser checks**: migrations, account separation, stale edits, create/edit/delete/undo, assignment identity, moved deadlines, exams/projects, backup recovery, source baselines/acknowledgements, failed reads, refresh lease ownership/stale-response rejection and duplicate catalog import protection.
- **19/19 background browser checks**: existing persistence, canonical asset/configuration and rendering regressions. Machine results are committed separately.
- Synthetic UI: matched a Canvas-style course, explicitly selected a section, imported it, reloaded, and verified that another import was blocked. Verified glass background colors and light tray links. Measured dialog alpha 0.96 and backdrop alpha 0.6; saved a synthetic screenshot.
- Live Chrome: verified installed version 0.4.0 with the same extension ID. Measured **zero remaining white course panels and zero white course-tray layers** on the inspected Calculus page. Established a course-source baseline without reported source-read warnings. Enabled auto-refresh and verified it remained enabled after reloading Canvas.
- Fresh before/after academic exports: **all 22 existing records compare equal**. Existing preference fields compare equal; the new `autoRefresh` preference is enabled. Background configuration was never written by this update.
- Syntax, manifest permission/resource checks, packaging and `git diff --check` pass.

## Limits and remaining work

This release does not claim automatic interpretation of freeform academic prose. Structured Canvas sources refresh; changed announcements/native syllabus/home documents require review before manual times, rooms, exam records or cancellations change. External Simple Syllabus LTI content, non-front course pages and arbitrary attachments need a supported additional connector. The catalog is a dated Fall 2026 snapshot and cannot provide later changes without a new verified export. Ten sections have no published times. Other students must confirm their registered section and session types.

A new full Chrome restart and every Canvas page type/theme were not repeated for 0.4.0. Reload persistence, existing browser regression suites and the reported live surfaces were verified; broader historical checks are documented in earlier validation reports. Private live academic screenshots were not shared; the committed preview uses synthetic data.
