# Local trial and rollback

The 0.1.0 build is a reviewable background increment, not a completed academic timetable product. It has been tested in browser fixtures; installation and authenticated Canvas acceptance still need to be performed.

## Build

From the repository root, with Node 22 or newer:

```sh
npm test
npm run check
npm run package
```

No dependency installation is needed. The unpacked folder is `dist/canvas-companion-0.1.0`; a ZIP and SHA-256 checksum are also generated in `dist`.

## Load in Chrome

1. Review the code and permission: read/change pages only on `https://vinuni.instructure.com/*`, plus the extension storage API. This build makes no Canvas API calls.
2. Open `chrome://extensions` in the Chrome profile used for university Canvas.
3. Enable Developer mode, choose **Load unpacked**, and select the generated unpacked folder.
4. Open Canvas in that profile and refresh the dashboard. Sign in through the university's official flow yourself if needed.
5. Open the Canvas Companion toolbar button. Compatibility mode is the initial, unsaved default. It acts only when a supported rendered BetterCampus image exists. Otherwise it leaves the page alone.

Loading a new local extension grants it access to the stated Canvas origin. Installation is deliberately left as an explicit user step; it was not performed automatically.

## Background acceptance

First export a backup of any companion background already saved. Original BetterCampus settings are not imported or overwritten.

- With the affected BetterCampus image active, compare compatibility mode versus **Leave BetterCampus unchanged**. Check the existing theme, cards and layout.
- Select **Choose my own image**, upload a test image, preview, and save. Change its fit/position/filter, save, then refresh.
- Verify another dashboard tab updates. Open a course page and return; the companion layer must be absent on course pages.
- Switch BetterCampus themes and light/dark modes. Verify the intended custom choice remains and there is still one companion image layer.
- Remove the companion background, verify original rendering returns, then use Undo.
- Export and restore a companion backup. Keep the file private.
- After saving other browser work, close/reopen Chrome and verify persistence. This check has not yet been performed.

Image URLs depend on that host remaining available and on the university's content security policy. Uploaded images remain local. If a policy blocks an image, the saved choice remains and fallback behavior should be verified on the live site.

## Roll back

Choose **Leave BetterCampus unchanged** and save, or disable Canvas Companion in Chrome and refresh affected Canvas tabs. The original BetterCampus configuration is never modified. Disabling the extension does not delete the companion's stored image; removal/uninstall can delete local extension data, so export a backup first.

After updating an unpacked build, use Chrome's Reload button on its extension card and refresh Canvas. Reuse the same folder/profile to preserve its extension identity and storage; changing the path or uninstalling may create a different identity or lose access to local settings.
