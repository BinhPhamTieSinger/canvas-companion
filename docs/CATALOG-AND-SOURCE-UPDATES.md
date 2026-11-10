# Catalog matching and course-source updates (0.4.0)

The packaged Fall 2026 snapshot contains **389 sections across 222 course codes**. It was captured from the signed-in official portal on November 11, 2026 (Vietnam time). **379 sections have published schedules; 10 do not.** Individual teaching dates are retained, including gaps in the published schedule. A snapshot cannot anticipate later cancellations or changes.

`src/catalog/vinuni-fall-2026.json` is the canonical distributable backup. It contains course codes/names, section identities and meeting times/dates only. No account identities, student lists, registration status, capacities, authentication headers or tokens are included. The extension needs no portal permission or portal login to read this bundled file.

Choose **Refresh Canvas → Find class times → your registered section → Import selected sections**. Matching uses the course code (including supported Canvas term suffixes) or an exact normalized title. A term suffix for a different semester is rejected. Multiple candidate sections are offered for explicit selection; membership in a Canvas course is not proof of registration in a particular section. A course with a saved manual class cannot be imported again. Its current rooms, exceptions and notes must be edited deliberately.

Session types remain unspecified in catalog imports. The portal API labels all captured occurrences alike, so those labels do not reliably distinguish lectures, laboratories and recitations. Confirm these types and rooms against Canvas Home or the actual syllabus. Existing classes retain their verified session metadata; legacy `tutorial` values display/edit as `recitation` without rewriting unrelated records.

## What updates automatically

Enable **Auto refresh · 15 min** to refresh while the Canvas dashboard is open. Refresh also resumes on focus if the last successful refresh is old enough. Cross-tab leases prevent duplicate concurrent refreshes. No background browser alarm or closed-browser job runs.

- Canvas planner/calendar assignment records and structured calendar events update through authorized GET requests. The same stable source identity is reused when a deadline changes. Personal completion, priority and notes remain separate references.
- Native Canvas syllabus bodies, the configured front page and announcements from the last 180 days are hashed in full. Only a short text excerpt, provenance and digest are persisted. The first successful check establishes a baseline; subsequent new/edited sources appear under **Source updates**.
- **Source updates** offers original links, search, review acknowledgements and actions to edit existing classes/exams or create an examination draft. Freeform prose does not silently change manual rooms, times, cancellations or exams. Acknowledging a stale digest is rejected if the document has changed again.
- Partial document failures retain previous source state and report warnings. Failed core planner/calendar reads retain the last complete source snapshot. Unavailable documents are not interpreted as deletions.

External **Simple Syllabus LTI/iframe content is not monitored** by the native Canvas API adapter. It needs a supported provider export/connector, or a deliberate manual review. Changes to prose, attachments, module pages that are not the front page, announcements older than the checking window, and external embedded documents are not guaranteed automatic calendar updates. Missing or ambiguous academic facts are never invented.

## Maintaining the catalog

`scripts/portal-catalog-export.js` is a one-time, reviewed DevTools response exporter for the official signed-in portal. Reload the portal first, run it once, then click the catalog's Reload button four times, waiting for each result count. The server limits results to 100 per page. The script changes only GET pagination, reads sanitized response fields, downloads the complete backup, and removes its temporary hooks. It never reads or copies request headers, local/session storage, cookies or tokens. Reloading the portal cancels it. It has no recurring timer and no GitHub upload.

Build a replacement snapshot with:

```sh
node scripts/build-catalog.mjs /absolute/path/to/vinuni-fall-2026-catalog.json
npm test
npm run check
npm run package
```

The current builder intentionally validates the known Fall 2026 total. A later semester needs an explicit term/version update and fresh review rather than silently replacing this snapshot.
