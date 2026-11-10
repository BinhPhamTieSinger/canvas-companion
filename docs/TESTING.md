# Verification report — background increment 0.1.0

Date: 10 November 2026. This report distinguishes automated/synthetic evidence from authenticated Canvas acceptance.

## Performed

| Check | Result |
| --- | --- |
| Node model tests | 8 passed |
| Manifest, narrow permissions, JavaScript syntax and forbidden API checks | Passed |
| Real-browser IndexedDB and renderer fixture suite | 19 passed; [machine-readable results](browser-results.json) |
| Actual settings UI with fixture worker transport | Local image upload, contain mode, save, page reload, removal and undo verified |
| Narrow layout | 360 × 800 viewport; document width 360; no horizontal overflow |
| Package preparation | Extension-only allowlist; ZIP/checksum generation |
| Original extension inspection | Temporarily enabled and restored to its prior disabled state; saved theme seen, original wallpaper repetition not reproduced |

The browser suite uses actual IndexedDB and image elements. It checks canonical record counts, hash reuse, simultaneous stale-edit rejection, reopening persistence, backup validation/corruption rejection, removal/undo, bounded asset cleanup, single-layer rendering, visual controls, Canvas shell replacement, reversible ownership, inherited overlays and filters, image removal/failure, and late-load cancellation.

The inherited-image fixture redirects only its test renderer's image loader to a synthetic local Blob. It does not download the user's image or contact an image host. The settings fixture executes the actual settings and worker modules with a fixture Chrome runtime/storage transport and localhost-origin IndexedDB. It does not prove Chrome extension process integration.

Testing found and fixed a blank-image remount bug, where replacing the layer could retain a loaded-URL marker but create an empty image node. A regression check covers remounting. Upload selection also guards against a late validation result replacing a newer URL choice, and disables Save while validating an upload.

## Commands

```sh
npm test
npm run check
npm run package
npm run serve:test
```

Open `http://127.0.0.1:4178/tests/browser/` for the renderer/storage suite. The settings fixture link uses isolated synthetic data and persists only under the local test origin. The server binds only to loopback.

## Still unverified

- Installation as an actual unpacked Chrome extension and Chrome content-script/worker transport.
- University CSP and authenticated Canvas compatibility for the exact affected wallpaper.
- Live cross-tab extension signals, service-worker suspension, browser restart, quota exhaustion and large-upload performance.
- Exhaustive original themes, fonts, cards, custom layouts, new/classic dashboard variants and productivity regressions.
- Formal screen-reader and contrast audit; keyboard labels/focus and responsive CSS are implemented, not fully accessibility-certified.
- All timetable, examination, assignment/project, reminder and calendar-sync requirements; these are not implemented yet.

No credentials, session cookies, original settings exports, personal academic fixtures or university screenshots are committed.
