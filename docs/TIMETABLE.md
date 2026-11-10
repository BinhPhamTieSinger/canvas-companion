# Academic timetable — 0.2.0

The user approved companion ownership of manual academic records after reviewing [planner interoperability](PLANNER-INTEGRATION.md). The timetable is one collapsible dashboard section; native Canvas content remains below it. It is not a replacement for the vendor's private planner implementation.

## Using it

1. Open the Canvas dashboard while signed in. The companion reads the current account identity to select its local records. It does not read cookies or tokens.
2. Choose **Refresh Canvas** to read active courses, planner assignments and calendar events. The date range and last successful refresh appear below the controls. Moving beyond this range displays a coverage notice; refresh again for that period.
3. Select a record type and **Add**. No sample academic records are created automatically.
4. Use **Day**, **Week**, **Month**, **Exams**, **Deadlines** or **Overview**. Previous/next controls move days, weeks or months as appropriate. Course and completion filters are remembered. A narrow window uses an agenda instead of compressed weekly columns.
5. Open **Details** to edit a manual record or add **Personal details** to an imported assignment. Personal completion never submits anything to Canvas.
6. Export an academic backup periodically. It contains local academic information; keep it private. Import restores missing/deleted records by identity, preserving existing live records and preferences. Preferences are restored only for a previously unused academic scope.

## Records

| Type | Supported fields and behavior |
| --- | --- |
| Recurring class | Name/code, course, color, timezone, term dates, every N weeks, weekday-specific times, explicit overnight option, rooms/buildings/campuses per meeting, instructor, skip dates, notes. Editing updates the series. |
| Examination | Name, course, type, date/start/end, derived duration, room/building/campus, instructions, preparation status, notes, derived countdown. One-time record independent of classes. |
| Assignment | Manual title/course/description, deadline or explicitly undated, priority, estimated minutes, personal submission status, completion, source link and notes. Imported Canvas assignments retain Canvas source identity; annotations hold only personal fields. |
| Project | Title/course/description, start/final deadline, priority, members, resources, notes, personal submission status, milestones with optional deadlines, smaller tasks. Progress is derived from completed milestones/tasks. |
| Manual course | Name/code/color and notes for a course absent from the Canvas snapshot. |

The exam view contains a filtered monthly calendar and examination agenda. The deadline view contains a filtered monthly calendar plus overdue, due-today, due-soon, upcoming, undated and completed groups. Completed records are hidden unless the filter is enabled.

Warnings report overlaps, multiple exams on a day, short gaps between consecutive classes, approaching deadlines and clusters of explicitly high-priority deadlines. Travel time is a user-defined buffer, not a geographical route estimate. Warnings never move events or alter records.

## Canvas and BetterCampus boundaries

- Canvas reads are GET-only, same-origin and paginated. A failed or incomplete read leaves the previous complete snapshot intact. There are no academic write endpoints.
- The course/assignment/calendar response is reduced to display fields. No profile names/emails, grade values or raw responses are stored. Canvas submission flags remain separate from personal completion.
- Assignment IDs are canonical per Canvas origin even if a wrapper omits its course. Planner effective dates take precedence over calendar wrappers. A manual entry cannot use a Canvas assignment URL to create a second assignment; sync it and annotate the source instead.
- Only explicit assignment identities are treated as assignments. Generic calendar events remain generic events; an event named “Final” is not automatically classified as an examination.
- Canvas does not guarantee complete class schedules, rooms or exams. Supply these manually when absent. No date, room, instructor or examination is inferred from unrelated text.
- BetterCampus-only manual records do not automatically sync. Transfer them deliberately through a supported export or manually after checking for existing records. The companion does not access private vendor storage, disable vendor features or dispatch duplicate reminders.
- No desktop reminders, external-calendar sync or provider connections in this release. Countdown and deadline warnings update while the dashboard is open. No background notification service is claimed.

Data stays in the current Chrome profile. Cross-device sync is not implemented. Export before uninstalling, clearing extension storage or changing profiles.
