# Installed Chrome validation — 0.1.0

Date: 10 November 2026. Performed in the user's university Chrome profile after explicit installation approval. No credentials, cookies or academic records were extracted. The agent did not submit assignments or change grades, messages, calendar records or Canvas settings.

## Observed results

| Scenario | Observed result |
| --- | --- |
| Load unpacked package | Chrome showed Canvas Companion 0.1.0 enabled; the card showed no startup error |
| Open actual extension settings | Worker/IndexedDB-backed settings loaded successfully |
| Upload and save | Synthetic PNG preview decoded and the actual worker saved it |
| Live dashboard | Status `ready`, one owned layer and one image element; image visibly loaded behind existing content |
| Refresh Canvas | After asynchronous startup, status `ready` with one layer and one image |
| Change appearance | A brightness change reached the existing dashboard without page reload; one layer remained |
| Canonical persistence | Read-only counts in the companion's own IndexedDB showed one configuration and one image asset after appearance changes |
| Navigate to a course | Zero companion layers and no companion ownership attribute |
| Return to dashboard | Status `ready` with one layer |
| BetterCampus coexistence | Existing theme stylesheet loaded with the companion at `ready`, one layer; no new BetterCampus theme was selected or saved |
| Remove companion background | Status `off`, zero companion layers, ownership removed, original theme stylesheet still present |
| Undo | Previous local image restored without another upload |
| Unavailable image URL | Saved test URL survived settings reload; dashboard reported `error`, showed fallback color and no active image source |
| Recover from unavailable URL | Undo restored the previous local image |
| Restart Chrome | University profile reopened its tabs; uploaded background returned at `ready` with one layer and one image |
| Test-data cleanup | Compatibility mode restored; companion counts showed one configuration and zero image assets at cleanup |
| Later user customization | A newly saved customization appeared after cleanup. It was preserved; the agent did not reset or export it |
| Final installed access | Extension enabled, university-only host access displayed, incognito off, unnecessary file-URL access switched off |

The live DOM inspections returned only companion status, node counts, filter/fallback values and presence of the existing theme stylesheet. The companion storage inspection returned integer record counts only. No private BetterCampus database or API was accessed.

## Operational finding

This Chrome installation disables unpacked extensions when Developer mode is turned off, displaying an instruction to turn Developer mode on. The setting was restored to on so the approved extension remained usable. BetterCampus itself was restored to its original disabled state. Both original Chrome profiles were observed after restart. The current user-selected background was left intact.

## Limits

- The exact original repeated wallpaper was not reproduced. Compatibility with the selected existing theme and a synthetic companion image is verified; every original background configuration is not.
- Open-tab updates were verified after activating the dashboard, which also triggers a fallback refresh. This does not independently prove immediate notification processing in an unfocused/hidden tab.
- No saved theme was switched or overwritten. Full light/dark/theme rotation and old-dashboard regression coverage remain open.
- Backup import/export, concurrent stale-edit rejection and asset reuse have browser-fixture coverage; they were not all repeated against live extension storage.
- Quota exhaustion, very large uploads, formal accessibility/performance audits and timetable features remain outside these results.

No source-code correction was needed during this live trial. Updated files for this stage are README.md, docs/AUDIT.md, docs/INSTALL.md, docs/TESTING.md, docs/ROADMAP.md, docs/LIVE-VALIDATION.md and docs/PLANNER-INTEGRATION.md. Private installation screenshots and the detailed local audit stay excluded from Git. The published browser screenshots still contain only synthetic fixtures.
