# 0.5.0 — in-Canvas workspace and source review

## What was investigated

Reviewed the current content script, source adapter/repository, background renderer and settings page before extending them. Inspected the live Canvas Account tray without activating logout. The existing change detector compares full-document SHA-256 digests; it does not understand academic prose. Its count-only review entry was too easy to miss. The generic transparent-view CSS also removed background images from components beyond page shells, potentially hiding CSS avatar images.

## What changed

- Original Canvas Companion calendar/C/check logo in SVG and 16/32/48/128 PNG icons. Chrome toolbar, sidebar, popup and sample workspace share the same assets.
- Canvas sidebar **Companion** button and an accessible in-page control panel with overview, saved-record counts, source-review actions and an Appearance tab. Appearance embeds the existing options component and worker/repository; it does not create another settings store. Draft controls remain mounted while switching tabs.
- Persistent red review banner for unacknowledged sources, including when the timetable is collapsed. New/edited labels, possible-topic keyword hints, previous saved excerpts, original links, edit-existing actions, and examination/event/personal-deadline drafts. Missing dates are left blank. Digest-safe acknowledgement clears the warning. Keyword hints are not claimed as semantic extraction or confirmed changes.
- Scoped lightening of dark text outside code, embedded documents and editors. White authored course panels keep their own images. Generic view backgrounds no longer have their images erased, protecting CSS avatars.
- Local SVG fallback only for failed avatar image elements; successful images retain their source. Cleanup restores the original source when appropriate. Logout is styled without changing its form destination or POST method.
- Popup directs users into Canvas. A packaged fictional sample workspace exercises the actual timetable/review/editors in memory without Canvas credentials, real academic data or production-record writes.
- Store-root ZIP packaging, privacy policy, listing/reviewer instructions, logo and sample-data screenshots. No new dependency, host permission or database version was added.

Principal files: `src/ui/control-panel.js`, `src/ui/options.*`, `popup.html`, `demo.html`, `src/ui/demo.*`, `src/academic/review.js`, `integration-ui.js`, `widget.js`, `canvas.js`, `repository.js`, `styles.js`, `src/background/glass.js`, `renderer.js`, `src/content/main.js`, `src/assets/*`, `manifest.json`, and `scripts/package.mjs`. Publishing material lives under `store/`.

## Verification actually performed

- 47/47 Node logic tests, including review topic hints, baseline/new/edited state, previous-excerpt preservation and acknowledgement behavior.
- 18/18 academic browser checks and 19/19 background browser checks passed; machine results retained.
- Synthetic control-panel browser flow: opened from sidebar, switched tabs, loaded and saved through the embedded background settings page, opened source review, observed keyword hints/previous excerpt, opened an examination draft with an empty date, and verified acknowledgement removed the banner.
- Synthetic presentation checks: CSS background avatar retained; broken avatar loaded its local fallback; dark inline text lightened; logout kept `/logout` and a 40-pixel minimum height.
- Live Chrome verified version 0.5.0 under the original unpacked extension ID. Sidebar panel and embedded settings loaded successfully within Canvas. Auto-refresh remained enabled. The inspected Account tray had one visible avatar and zero broken visible avatars. Logout retained POST and had a 47-pixel rendered height with a readable cyan background.
- Fresh private exports before/after the upgrade compare equal for all 22 existing academic records and preferences. Code and data recovery exports remain excluded from Git. No background save was performed on the real account while verifying the new panel.
- Store screenshots use fictional sample data; no private Canvas screenshots, academic exports or user wallpaper are included in the upload package. ZIP has `manifest.json` at root and excludes tests/private backups.

## Limits

Changed source text is detected, then topic hints aid human review. This release does not automatically interpret and apply freeform room changes, cancellations or examination schedules. Native Canvas structured assignment/calendar updates remain read-only source refreshes. External Simple Syllabus LTI/iframe documents, arbitrary attachments, non-front pages and announcements outside the reading window remain unsupported by the current adapter.

Not every Canvas page type, individual avatar host, theme combination or a full browser restart was retested in 0.5.0. The reported live and synthetic paths are the actual verified scope. If a remote profile image is unavailable, the fallback is a generic local avatar rather than a recovered photograph.

A store installation receives separate extension storage and normally a different ID. See `store/PUBLISHING.md` for backup/import and disabling the duplicate development installation before migration. Publishing does not automatically migrate the existing local Chrome profile.

Store submission/publication status is recorded separately when the publisher dashboard confirms it.
