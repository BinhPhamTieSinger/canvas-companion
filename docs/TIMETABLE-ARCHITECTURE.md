# Timetable architecture and decisions

## One owner and projected views

`AcademicController` mounts one shadow-root section in the existing Canvas content area on dashboard routes. The existing content lifecycle handles navigation and visibility; no separate application or navigation replacement is introduced. Typography inherits from Canvas; BetterCampus text/surface/border/link tokens are reused with readable fallbacks. The six views share the same event projection and form components.

Manual classes, exams, assignments, projects and course metadata live in the worker-owned `AcademicRepository`. Imported Canvas assignments/events are an explicitly bounded, refreshable source cache, not separately editable task copies. SHA-256 annotation identities reference the canonical source key and store only personal completion/priority/effort/notes. No source title or deadline is copied into an annotation. Recurring occurrences, countdowns, conflicts and project progress are calculated rather than stored.

## Additive IndexedDB schema version 2

`src/storage/database.js` centralizes opening/upgrading the existing extension database. It creates missing stores in an additive upgrade; existing background records, recovery references and image Blobs are not rewritten.

| Store | Key | Ownership |
| --- | --- | --- |
| backgrounds / assets / recovery | Existing scope/hash keys | Existing canonical background repository, unchanged semantics |
| academicRecords | origin/account + kind + stable ID | Manual records and personal annotations; scope index; per-record revisions and reversible deletion tombstones |
| academicMeta | origin/account | Preferences, aggregate revision and one-step delete recovery |
| academicCache | origin/account | Last complete source snapshot, its date coverage and refresh timestamp |

Origin plus numeric Canvas self-account ID partitions academic data. Profile validation precedes display and mutations; a changed identity resets the old view and closes its editors. No profile name/email is persisted. Background ownership remains the existing browser-profile/university dashboard scope, preserving its semantics and customization.

A worker transaction checks expected revisions and commits record/metadata changes together. Stale edits fail with an explicit reload message. Chrome local storage contains revision notifications only, not a duplicate academic database. Open dashboards reread on notifications and focus; inactive tabs may update when reactivated. Repositories close connections for a future version change. A blocked upgrade asks the user to close older settings tabs rather than resetting data.

Deletes retain tombstones and one-step undo. Export includes only manual records, annotations and preferences, not source-cache copies; re-read Canvas after recovery. Imports validate every record, are account-bound and merge by stable identity. Existing live records and preferences win; an unused scope can recover exported preferences. No bulk destructive reset exists.

## Read-only adapter

`src/academic/canvas.js` is the only fetch-capable production module. It allows exact same-origin GET paths for self profile/colors, active courses, planner items and calendar events. Requests use the existing browser session through `credentials: same-origin`; no cookie/token APIs or bearer tokens. Redirects and foreign pagination are rejected, pagination is bounded, and responses have timeouts. Partial source failures never commit an empty replacement. Colors are optional presentation data.

Source payloads are normalized and reduced before storage; HTML is converted to text and rendered through `textContent`. Academic links remain on the university origin. Manual resource notes are plain text. There is no raw HTML injection, external-message interface or Canvas write endpoint.

## Time and recurrence

Date-only values and instants remain distinct. Wall-clock classes use explicit IANA timezones; projection handles term bounds, weekday differences, multi-week recurrence, skip dates, overnight meetings and adjacent local days at a view boundary. Intervals are half-open so a class ending at 09:00 does not overlap one beginning at 09:00. DST gaps produce a warning; repeated times resolve deterministically to the first occurrence. The campus display timezone defaults to Asia/Ho_Chi_Minh and is editable.

Projection is limited to visible date ranges, not infinite expansion. The source cache has a visible coverage label. Unknown deadlines remain undated; no missing academic facts are fabricated.

## Operational limits

Local storage can be lost by uninstall/profile loss; use backups. No cross-device synchronization, cloud backend, external calendar writer, reminder dispatcher, arbitrary vendor private-data adapter or new dependency was added. Tombstone retention is deliberate; long-term compaction needs a versioned recovery policy. API schema/CSP/vendor token changes need continuing compatibility checks. Formal performance and accessibility certification remain outside the measured tests.
