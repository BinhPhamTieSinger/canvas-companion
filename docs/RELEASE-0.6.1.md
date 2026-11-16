# 0.6.1 — week numbers and missed course-source warnings

## Diagnosis

Live inspection found automatic refresh disabled and the previous Canvas snapshot five days old. The instructor's new lab announcement had therefore never reached the companion. A manual refresh immediately produced seven pending source reviews, confirming that new-source identity/digest comparison worked once refreshed.

Two independent weaknesses made this easier to miss:

- There was no prominent stale-source/disabled-monitoring notice, so an old cache with zero pending reviews appeared current.
- Schedule topic detection recognized “laboratory” but missed “lab” and common plurals. That affected the topic hint, not whether an actually fetched new digest required review.

The missed occurrence was already part of the student's saved recurring class, but that date had been excluded pending confirmation. The current instructor announcement and course Home page confirmed its date, room and saved group time. The existing meeting was corrected locally; the earlier cancellation and other meetings were retained. No duplicate class was created. Private account/section information and exports remain outside the repository.

## Changes

- `time.js`, `widget.js`, `styles.js`: ISO week numbers in the weekly/daily period label and monthly Monday cells. An optional verified first teaching Monday adds teaching-week numbers, including correct year-boundary behavior. Labels do not shift event dates.
- `model.js`, `forms.js`: additive `weekOneDate` preference, validated as a Monday; old preferences retain their values and default to ISO numbering until configured.
- `review.js`: schedule hints recognize lab/labs, laboratories, lectures and recitations. Source health distinguishes missing/stale checks and partial coverage. Recent relevant announcements are not automatically acknowledged on the first baseline; explicit acknowledgements remain digest-specific.
- `canvas.js`: preserve announcement posting/edit timestamps and scan the full text for topic hints while continuing to store only a short excerpt and digest. No inferred prose date is promoted to a timetable event.
- `repository.js`: persist source-check attempt time and announcement provenance using existing metadata. Partial failures retain prior source state and warnings.
- `widget.js`, `control-panel.js`, `integration-ui.js`: red stale/coverage notices, refresh actions, review provenance, and warnings retained when the timetable is collapsed. The notices distinguish an unperformed check from a detected update.

No new permission, dependency, data store or database-version migration. Automatic refresh remains an explicit setting; the affected installation was configured to enable it as part of this requested correction. It runs only while the dashboard remains open; source checks do not run after Chrome closes. Freeform announcements still require review before manual schedules change.

## Verification

- 82 Node tests pass, covering ISO boundaries, teaching-week anchors, lab signals, long documents, first-baseline review policy, stale/partial/future timestamps, announcement provenance, and restoring one verified lab date without losing earlier cancellations.
- 9 new native Chrome checks pass using synthetic data and an isolated IndexedDB database: stale notices, baseline red warnings, lab review labels and links, teaching-week persistence/navigation, monthly numbering, a restored lab on one class, partial-source warnings, explicit acknowledgement, and collapsed warnings. Machine results: [week-review-browser-results.json](week-review-browser-results.json).
- Syntax/manifest and package checks pass.
- Live inspection verified the instructor announcement and Home schedule, the missed lab's restoration, automatic refresh enabled, and pending source reviews. Academic backups were exported before and after correction. Their record identities/count match; exactly one existing lab meeting changed (one restored date and its confirmed end time), with its earlier cancellation and all other records preserved. The only preference changes are enabling monitoring and setting the teaching-week anchor. The correction, week label, automatic-refresh setting and red reviews persisted after a Canvas refresh. No assignments, grades, submissions, registrations or messages were changed.

The installed 0.6.1 build was observed showing Teaching week 9 / ISO week 47, the corrected lab, automatic refresh enabled, and seven pending source reviews. The pending Chrome Web Store submission is unchanged. A complete browser restart and all theme/window combinations were not retested. The warnings provide source-review status rather than guaranteed interpretation of every announcement or external Simple Syllabus document.
