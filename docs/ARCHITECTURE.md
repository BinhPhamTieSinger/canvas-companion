# Background increment architecture

## Ownership and scope

`src/background/model.js` defines the supported university origin, one `origin|dashboard` scope, validated sources and bounded visual controls. This scope belongs to the browser profile; there is no academic account identity or assignment storage in this increment.

`src/background/repository.js` is the only authoritative configuration repository. It runs in the extension service worker through `src/worker.js`. Content scripts and the settings interface send validated runtime commands; they do not maintain independent saved configurations.

The version-1 IndexedDB schema has three stores:

| Store | Key | Purpose |
| --- | --- | --- |
| `backgrounds` | scope | One committed configuration and revision per supported dashboard scope |
| `assets` | SHA-256 | Uploaded image Blob, stored once per content hash |
| `recovery` | scope | One previous committed configuration for reversible removal/save |

The previous configuration references the existing asset; it does not copy image bytes. Each mutation keeps only assets referenced by the active record or bounded recovery snapshot. When the recovery window advances, obsolete assets are collected transactionally. Export includes only the active image, not the recovery snapshot.

No record is created during initialization. Missing settings resolve to compatibility mode in memory. There is no legacy companion schema to migrate yet. Versioned backup validation provides the first controlled import route; it does not import private BetterCampus data.

## Commands and consistency

Mutating commands originate only from the companion settings page. Other authorized Canvas pages can request the background snapshot. The worker validates extension identity and sender URL. There is no external-message listener or page-level RPC bridge.

A readwrite transaction checks the expected revision, writes any new asset, stores the previous configuration, commits the new configuration and reclaims obsolete assets. Stale edits fail with an instruction to reload. A Chrome local-storage revision entry wakes open views after commit; it is a notification, not a second configuration store. Initialization, focus and visibility changes also re-read the authoritative state.

Uploaded images cross Chrome runtime's JSON transport as bounded base64, then become Blobs in the worker. Object URLs are transient rendering/preview handles, never saved sources. No asset byte is written to Chrome sync storage. One 8 MB maximum upload plus a previous image may be retained; quota errors abort the transaction and preserve the last commit.

Commands are not automatically retried. An interrupted response is resolved by reopening settings and reading the committed revision rather than resubmitting a possibly completed mutation.

## Rendering

`src/background/renderer.js` owns exactly one fixed, noninteractive dashboard layer. Both filtered and unfiltered images use the same image element. The image element uses `referrerpolicy=no-referrer`, and avoids another CSS image request. An overlay preserves supported inherited gradients or applies the user's custom overlay.

A dashboard-only root attribute activates narrowly scoped shell overrides. Removal deletes the owned attribute, stylesheet and layer, restoring the original stylesheet cascade. No original inline style or saved theme is rewritten. Content scripts clear their layer outside dashboard paths.

Compatibility mode reads the rendered `--bcbackground-image`, `--bcbackground-image-layer`, `--bcbackground-image-filter` and legacy `--bcbackground-0` properties. It supports one HTTPS image plus recognized gradients. It declines malformed/ambiguous backgrounds and does not guess among multiple images. Vendor CSS changes can require an adapter update; it is not a supported vendor integration API.

Custom images have a fallback on decode/load failure. The saved configuration remains intact. A generation token prevents a late image load from recreating a background after removal. A remount reloads the image if Canvas has replaced the owning DOM node.

`src/content/main.js` observes theme stylesheets, root class/style, and top-level body replacement; it does not observe the entire academic subtree. Updates are debounced. Lightweight path checks cover client-side navigation. The script installs only once per isolated world.

## Deliberate limits

- Dashboard only; course-card images, Canvas pages, original settings and user layouts remain owned by their existing systems.
- Companion configuration is local and is not synchronized across devices. Backups are explicit.
- Current scope is profile/university, not separate user-account/theme scopes. Add those only through a versioned schema extension if required.
- No private BetterCampus storage or hosted APIs, credential access, assignment submission, grade changes, messaging, calendar writes or notifications.
- No timetable database until a supported way to reference existing planner entities is established or a narrower fallback is separately approved.
