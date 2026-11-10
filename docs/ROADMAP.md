# Implementation roadmap

## Completed

1. Audit of installed BetterCampus package, scope limitations and repeated-background rendering hypothesis; no original vendor settings modified.
2. Canonical background configuration, hashed image assets, transactional updates, undo/backups and one reversible dashboard renderer.
3. Original 0.1.0 installed-extension checks, including refresh, navigation, saved-theme coexistence and Chrome restart.
4. Separate user approval of companion ownership for manual academic data; [planner boundary](PLANNER-INTEGRATION.md) documented.
5. Additive account-scoped timetable storage, Canvas source references/deduplication, recurrence, examinations, assignment annotations, projects/milestones and six integrated views.
6. Informational conflict/deadline warnings, local recovery, theme tokens, responsive agenda and correctness tests. See [current measured validation](TIMETABLE-VALIDATION.md).

## Next priorities

1. Continue original BetterCampus theme/layout regression coverage, including the exact originally affected image when it can be reproduced. Formal accessibility, performance and quota-pressure checks.
2. Supported transfer of existing vendor-only manual records. Require an actual maintained export/API contract; do not read private databases or silently recreate existing entries.
3. Reminder ownership design: one explicitly chosen dispatcher, persistent identities, timezone behavior and restart semantics. Current countdowns/warnings are dashboard-only.
4. Optional ICS export/import and external-calendar projection, with stable external IDs, loop prevention and separate authorization before any provider writes.
5. Long-term tombstone/recovery retention policy and optional deliberate cross-device synchronization. Keep image bytes out of Chrome sync storage and budget metadata quotas before implementation.

The companion has no Canvas write APIs. All schedule warnings remain informational. New integrations must preserve manual records and unknown academic facts, and must not introduce competing data owners.
