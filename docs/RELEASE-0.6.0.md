# 0.6.0 — course catalog and semester planning

## Investigation and decisions

The in-Canvas Companion panel previously exposed Overview and Appearance. The bundled catalog was available only through the enrolled-course matching dialog, so students could not browse the complete backup. It contains **389 sections across 222 course codes**, captured for **Fall 2026**; ten sections have no complete published schedule. It does not establish future offerings, credits, prerequisites, enrollment, room assignments or lecture/lab/recitation labels.

Two new tabs extend the existing panel rather than adding another application:

- **Courses:** browse every section, search names/codes/sections/available rooms, filter department and schedule completeness, page through 20 results at a time, inspect published teaching dates, and download the existing catalog backup. Portal sign-in is unnecessary.
- **Semester Planner:** choose a season/year, shortlist courses, enter sourced credits and notes, and optionally enter proposed weekly meetings with lecture/lab/recitation distinctions and rooms. A weekly preview flags overlaps without changing times. Multiple semesters save independently. Unknown credits remain unknown.

Historical catalog meeting times are never shifted or copied into future plans. A future course selection references a catalog course code; future availability remains unconfirmed. The registered-section import tool remains available under Find class times. Plans do not enroll the student or create timetable classes, assignments, exams or deadlines.

## Storage and synchronization

An additive `semester_plan` record kind uses the existing `academicRecords` IndexedDB store, account scope, RPC transport, revision signals, validation, reversible deletion and academic backup. There is no database-version upgrade, dependency, permission, background-setting migration or new data store.

Each semester has one canonical identity, `semester-plan:<season>-<year>`. Its data contains `term`, `notes`, and course choices containing only `catalogTerm`, `code`, optional manually entered `credits`, `notes`, and proposed `meetings`. Titles and historical schedules resolve from the existing catalog instead of being copied into each plan. Duplicate course choices and stale record revisions are rejected. Recreating a deleted semester advances its original revision; stale edits cannot silently overwrite it.

Every planner mutation rechecks the current Canvas account and extension context. Other-tab changes show a refresh notice; failed saves retain drafts. Drafts survive tab/semester switching within an open panel. Closing or following the timetable/review actions prompts before discarding unsaved drafts. A page refresh still discards unsaved work, so save each semester first. There is no unload listener or automatic academic write.

Existing academic backups restore in 0.6.0. Backups containing the new record kind require 0.6.0 or newer. Background backups are unchanged. Academic import continues merging missing records rather than overwriting newer data.

## Files

- `src/ui/control-panel.js`: additional tabs, keyboard tab navigation, account-checked RPC, unsaved-draft close/navigation guard, existing theme tokens.
- `src/ui/course-workspace.js`: catalog browser, semester editor, loading/empty/error states, proposed-week preview and local save/reload/delete controls.
- `src/academic/semester-plan.js`: canonical identities, validation, catalog filters, credit summary and weekly draft conflicts.
- `src/academic/model.js`, `repository.js`: additive record validation and safe recreation of deleted canonical plans. Existing timetable projection ignores plans.
- `manifest.json`, `package.json`, `src/content/boot.js`: 0.6.0 and explicit accessibility of the two content modules; existing host/storage permissions retained.
- `tests/semester-plan.test.js`, `tests/browser/semester-planner*`: model, RPC, IndexedDB and UI regression checks. `tests/browser/polish-suite.js` selects the currently open dialog to avoid a queued-close-event race in its assertions.

## Verification

- **73/73 Node tests** pass, including future-plan isolation, duplicate prevention, incomplete/invalid meetings, account changes, runtime invalidation, catalog filtering and unknown credits.
- **14/14 new Chrome browser checks** pass against synthetic data and an isolated IndexedDB database. They exercise actual UI search/pagination, planning, credits, recitation/lab conflicts, canonical saves, conflicting edits, independent semesters, confirmed deletion, unsaved draft protection, backup/import/account isolation, delete/undo/recreate, accessible tab navigation, and persistence after an actual page refresh. Machine results: [semester-browser-results.json](semester-browser-results.json).
- **18/18 existing academic browser checks** rerun successfully, including background preservation, assignment identity, stale edits and catalog-import deduplication.
- **13/13 image/contrast/control-panel browser checks** rerun successfully.
- Manifest, JavaScript syntax, restricted permissions and package checks pass.
- Native Chrome loaded **0.6.0** at the original extension path and ID. Both tabs were observed inside authenticated Canvas: the catalog reported 389 sections / 222 course codes, and the semester planner opened the Spring 2027 empty state. No real plan or academic record was created for this verification; all mutation tests used synthetic data.

The previous installed code was backed up locally before replacement. The installed folder and package were compared byte-for-byte. The pending 0.5.0 Chrome Web Store submission was not changed.

## Limits

The catalog remains the dated Fall 2026 snapshot. Future schedules, availability, prerequisites, degree requirements and credits need official information; the planner does not infer them. Proposed times are weekly drafts, without term-date/holiday expansion or overnight meetings. Plans stay local to the Chrome profile and are recoverable through the existing academic export. No full Chrome restart or exhaustive browser-window/theme combination was repeated for this release.
