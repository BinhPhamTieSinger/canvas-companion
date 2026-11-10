# Implementation roadmap

## Completed background increment

- Independent Manifest V3 companion with narrow host access.
- Canonical background record and hashed upload assets.
- Transactional updates, stale-edit protection, bounded recovery, backup import/export.
- One dashboard image layer, inheritance adapter, custom controls and preview.
- Unit tests, real-browser fixtures, settings UI checks and packaging.

## Installed-extension acceptance

The user explicitly approved installation. The initial live trial verified worker/content startup, local image loading, refresh, an open-tab change, navigation, removal/recovery, coexistence with the saved BetterCampus theme and Chrome restart persistence. See [live validation](LIVE-VALIDATION.md). Exhaustive theme/layout coverage and the exact original affected wallpaper remain open.

## Next: planner ownership decision

[Planner integration findings](PLANNER-INTEGRATION.md) describe the existing supported schedule features, the missing private-data contract, and the concrete fallback requiring approval.

## Timetable interoperability gate

BetterCampus already owns manual schedules, tasks, planned sessions and reminders. Before writing overlapping companion entities, establish a supported way to reference them. The inspected installed manifest exposes no assumed public cross-extension API, and no matching current source or supported sharing contract is available.

Preferred route: obtain matching source/support and extend the existing planner/schedule services. Conditional fallback: a Canvas-read-only academic projection plus explicitly companion-owned manual data, only after the user accepts the limitations and duplicate-planner implications. Do not silently take the fallback route.

## Timetable sequence after the gate

1. Stable course/task source identities, origin/account partitioning, pagination and coverage states.
2. Recurring class meetings, weekday-specific times, locations/instructors, term bounds and exceptions; daily/weekly views and week navigation.
3. One-time examinations, room/instructions, preparation state and derived countdowns.
4. Assignment deadline views that reference existing tasks and separate personal completion from Canvas submission.
5. Projects, milestones and smaller task references; derived progress.
6. Monthly and combined views; overlap, travel-buffer, same-day-exam and concentrated-deadline warnings.
7. Reuse one reminder dispatcher and prove calendar loop prevention before enabling external sync writes.

All warnings are informational; no automatic schedule edits or academic mutations. Preserve unknown dates/rooms instead of inventing them. Use the user's actual schedules only when provided; documentation examples are not user data.
