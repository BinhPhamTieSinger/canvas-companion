# Planner interoperability and approved ownership

Date: 10 November 2026. Background installation/testing is complete for the cases documented in [live validation](LIVE-VALIDATION.md). The user subsequently explicitly approved: “Yes—make the companion the timetable owner.” The implemented 0.2.0 design is documented in [timetable architecture](TIMETABLE-ARCHITECTURE.md).

## Supported existing capabilities

The official [Planner guide](https://help.bettercampus.com/about-the-planner-ipm4c) documents class schedules, personal tasks and day/week/month views. The [schedule guide](https://help.bettercampus.com/set-your-class-schedule-ss4cy) documents manual weekday slots and ICS/screenshot schedule imports. These confirm substantial overlap with the requested timetable.

The official [calendar integration guide](https://help.bettercampus.com/sync-your-calendar-s15ko) describes a Pro Google/Microsoft connection that exchanges calendar events, deadlines, planned work and class times. The [school-feed guide](https://help.bettercampus.com/add-a-school-calendar-feed-enf5q) describes a separate one-way import into BetterCampus. Neither establishes a public API for this companion to read its private manual task/schedule records.

No supported public cross-extension planner contract was found in the inspected manifest, package or these guides. This is a bounded finding, not a claim that no contract exists anywhere. A current source/build, maintained API, or supported export could change the decision.

## Concrete choices

### Preserve BetterCampus as planner owner

Use its existing class schedules/tasks and retain this companion for background consistency. Further planner metadata and examination/project features require matching source/support or a supported extension point. This has the least duplication, but the requested new planner features cannot be implemented inside the installed vendor package.

### Approve companion ownership of new manual academic records

A Canvas-native timetable could use authorized, same-origin Canvas reads for course/assignment references, with stable source identities and no separately editable copies of imported assignments. Manual class meetings, one-time exams, projects and milestones would have one owner in the companion. All six views would be projections of those records.

This route **does not automatically synchronize BetterCampus-only manual schedules, tasks or reminders**. Existing vendor records must be inventoried and migrated through a supported export or deliberate manual transfer before duplicating them. The companion would not delete, disable or silently overwrite them. Existing reminder/calendar ownership must be explicitly coordinated before adding another dispatcher.

The proposed first timetable increment would include a collapsible dashboard section and daily/weekly views, canonical course/assignment references, manual recurring meetings and conflict warnings. Later increments would add one-time exams, projects/milestones, monthly and filtered calendars. No academic writes or external calendar updates would be enabled by default.

This fallback required user approval because it changes ownership relative to the originally preferred extension of BetterCampus's existing planner. Approval of background installation alone was not treated as approval of this data split. The separate ownership approval now authorizes the companion-owned manual timetable.

### Supported external-calendar projection

If the user already has the vendor's supported calendar sync, a separately authorized read-only calendar connection could potentially project those events. That requires provider access, source-identity mapping and verification of what fields actually sync. It is not currently configured, and no provider credentials or private feed links have been requested or copied.
