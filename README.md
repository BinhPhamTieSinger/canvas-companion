# Canvas Companion

A dependency-free Manifest V3 companion integrated into the VinUni Canvas dashboard. It preserves BetterCampus ownership of themes/course cards and adds canonical backgrounds and an academic timetable. This is an independent project, not an official or modified BetterCampus release.

## Academic timetable — 0.4.0

The approved ownership model uses one local record per manual class, examination, assignment or project. Six views project those records alongside read-only Canvas source references:

- Recurring classes with weekday-specific times, lecture/lab/recitation types, per-meeting selected dates/cancellations, term bounds, alternate weeks, rooms, locations, instructors and skipped dates.
- One-time examinations with preparation status, instructions, duration and countdowns.
- Canvas assignment references and personal deadlines, with priority, effort and separate personal completion/submission status.
- Projects with milestones, smaller tasks, resources, group members and derived progress.
- Day, week, month, examination calendar, deadline calendar and combined overview; course/completion filters and period navigation.
- Informational overlap, travel-buffer, same-day-exam and deadline warnings.
- Account-scoped persistence, stale-edit protection, reversible deletion and private academic backups.

See [how to use the timetable](docs/TIMETABLE.md), [data architecture](docs/TIMETABLE-ARCHITECTURE.md) and [verification evidence](docs/TIMETABLE-VALIDATION.md). BetterCampus-only manual records do not automatically sync. Desktop reminders and external calendar synchronization are future work.

![Timetable with synthetic academic records](docs/timetable-overview.jpg)

## Shared catalog and course-source updates

**Find class times** matches Canvas courses against the bundled Fall 2026 backup: 389 sections across 222 course codes. Confirm a registered section before importing; exact published teaching dates are retained. Portal sign-in is not needed by other users. Existing manual schedules are protected from duplicate imports.

Opt into **Auto refresh · 15 min** while the dashboard is open for structured Canvas deadline/calendar updates. New or edited native syllabus/home/announcement content is highlighted under **Source updates** for review; freeform prose does not silently overwrite manual schedules. External Simple Syllabus embeds need a supported connector. See [catalog and update behavior](docs/CATALOG-AND-SOURCE-UPDATES.md) and [0.4.0 verification](docs/RELEASE-0.4.0.md).

## Transparent appearance and backgrounds

Choose **All Canvas pages** and **Transparent · light text and colorful accents** in background settings for an editor-inspired transparent workspace. Your existing image and overlay remain unchanged. Course-authored white panels and the Canvas course tray use scoped glass surfaces with light text. Dialogs use a darker glass surface for readability. Embedded documents/editors retain their own surfaces. The floating **Timetable** link opens the dashboard timetable from any Canvas page. Existing installations keep their original appearance until these options are explicitly saved. See [appearance validation](docs/TRANSPARENT-APPEARANCE.md).


Custom HTTPS image URLs or local uploads support cover/contain, positioning, scale, brightness, blur, overlay, fallback color and preview. One canonical dashboard configuration references SHA-256-addressed image bytes. Transactional saves reject stale settings, support undo and checksum-validated backup recovery. Compatibility mode consolidates a supported rendered BetterCampus background into one reversible image layer without changing its saved theme.

The companion cannot read another extension’s private storage. Ambiguous multiple-image vendor backgrounds are left alone. Course-card images and original layouts remain with their existing systems.

## Install and verify

See [installation and rollback](docs/INSTALL.md). Node 22 or newer is required for development checks; no dependency installation is needed.

```sh
npm test
npm run check
npm run package
npm run serve:test
```

A fresh package is generated at `dist/canvas-companion-0.4.0`. When updating an existing unpacked installation, preserve its original folder path and extension identity. Do not uninstall or load a different path as an update. Keep Developer mode enabled for this unpacked installation.

The [background audit](docs/AUDIT.md), [background architecture](docs/ARCHITECTURE.md), [historical live tests](docs/LIVE-VALIDATION.md), [current validation](docs/TIMETABLE-VALIDATION.md) and [roadmap](docs/ROADMAP.md) distinguish measured results from remaining limitations.

## Data and privacy

The only host permission is `https://vinuni.instructure.com/*`. The Canvas adapter makes authorized same-origin GET requests; there are no submissions, grade changes, messages, academic writes, telemetry or credential APIs. Uploaded backgrounds and manual academic records stay in the extension’s IndexedDB in the current Chrome profile. Canvas source data is a refreshable cache, with opt-in automatic checks while the dashboard is open. URL images load from the chosen host. There is no cross-device synchronization.

Export private backups before uninstalling, clearing data or losing a profile. Backups, the detailed local audit, user images and university screenshots are excluded from Git. Published screenshots and test records are synthetic.
