# Audit summary and diagnosis

Audit date: 10 November 2026. Original installed package inspected: BetterCampus 9.9.1. Source files in this repository are new companion code; no BetterCampus bundle or assets are redistributed.

The initial workspace was empty. The installed extension contains Manifest V3 content scripts, a background worker, React interfaces, hosted page bridges, Chrome local storage, vendor synchronization and IndexedDB-backed features. Original development sources/build inputs were unavailable. The public legacy repository's manifest describes version 5.12.6, not the installed version.

## Background finding

The compiled theme generator's unfiltered image value can be applied independently to `body` and the Canvas application shell without explicit sizing/repeat controls in that rule. Its filtered path moves the image into a fixed pseudo-element. This differing rendering ownership matches the user's description of visible repetition, but does not establish duplicate saved records.

Nine isolated checks of extracted functions characterized the original background generator and its legacy sync-to-local migration. They showed existing local presets are preserved, missing legacy values are copied, and sync values remain afterward. Retained sync values alone are not proof of conflicting active storage.

A controlled live inspection briefly enabled the installed extension. The saved theme appeared, but no repeated dashboard wallpaper was visible in that inspection. BetterCampus was restored to its prior disabled state, and temporary inspection tabs were closed. No original theme/background was changed. The user's exact original background symptom remains to be reproduced with the affected image and settings.

The companion addresses the identified rendering pattern through one owned layer and independently canonical companion storage. It does not claim to repair or centralize private BetterCampus records.

## Existing productivity features

The inspected package already contains class schedules with multiple weekday time slots, schedule end dates, schedule/syllabus import paths, generated schedule overrides, recurring tasks, subtasks, planned assignment sessions, calendar-view settings, class/task reminders, dashboard widget infrastructure and Google/Outlook bridges.

Reusing those entities requires current source or a supported integration contract. A new companion cannot assume access to another extension's internal task store or vendor APIs. No private bridge is used in this repository.

## Other candidates for investigation

Static code paths suggest invalid planner deadlines can become the current timestamp, paginated fetches can return accumulated partial results after failure, whole-map course updates can have stale-write risks, and schedule min/max normalization may reinterpret overnight meetings. No corresponding live-account failure was reproduced, and the companion does not patch these vendor internals.

The main bundle's approximately 5.3 MB size, broad document-start injection, observer/polling patterns and update fan-out warrant profiling. Textual observer counts are not active observer counts. No performance benchmark was performed on the original extension.

## Approval and current stage

The user approved the scoped companion architecture and authorized publication to their GitHub account, including a choice of visibility. Private visibility was selected. The background increment is implemented, fixture-tested and installed with explicit user approval. The specific authenticated Canvas checks, including Chrome restart, passed; see [live validation](LIVE-VALIDATION.md). Timetable implementation is still gated on planner interoperability and the documented ownership decision.

The full local report includes environment-specific paths and is deliberately excluded from Git. Repository screenshots, fixtures and test evidence contain synthetic data only.

## Primary references

- [Legacy public manifest](https://raw.githubusercontent.com/UseBetterCanvas/bettercanvas/main/manifest.json)
- [Chrome content-script isolation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome storage behavior and limits](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Canvas Planner API](https://developerdocs.instructure.com/services/canvas/resources/planner)
- [Canvas Calendar Events API](https://developerdocs.instructure.com/services/canvas/resources/calendar_events)
