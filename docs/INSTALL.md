# Local trial and rollback

The 0.3.0 build includes the approved companion-owned academic timetable. See [current verification](TIMETABLE-VALIDATION.md) and the [historical background live checks](LIVE-VALIDATION.md). This does not certify every theme/layout or future Canvas change.

## Build

From the repository root, with Node 22 or newer:

```sh
npm test
npm run check
npm run package
```

No dependency installation is needed. For a new installation the unpacked folder is `dist/canvas-companion-0.3.0`; a ZIP and SHA-256 checksum are also generated in `dist`.

## Load in Chrome

1. Review the code and permission: read/change pages only on `https://vinuni.instructure.com/*`, plus the extension storage API. The academic adapter uses authorized same-origin Canvas GET requests; it makes no academic changes.
2. Open `chrome://extensions` in the Chrome profile used for university Canvas.
3. Enable Developer mode, choose **Load unpacked**, and select the generated unpacked folder. Keep Developer mode enabled while using this unpacked build: in the tested Chrome installation, turning it off disabled the extension. A Chrome Web Store distribution would be a separate release process.
4. Open Canvas in that profile and refresh the dashboard. Sign in through the university's official flow yourself if needed.
5. Open the Canvas Companion toolbar button. Compatibility mode is the initial, unsaved default. It acts only when a supported rendered BetterCampus image exists. Otherwise it leaves the page alone.

Loading a new local extension grants it access to the stated Canvas origin. The initial installation was completed only after the user explicitly confirmed the build and scope. The installed extension was verified as enabled with university-only host access; unnecessary file-URL access was turned off.

## Background acceptance

First export a backup of any companion background already saved. Original BetterCampus settings are not imported or overwritten.

- With the affected BetterCampus image active, compare compatibility mode versus **Leave BetterCampus unchanged**. Check the existing theme, cards and layout.
- Select **Choose my own image**, upload a test image, preview, and save. Change its fit/position/filter, save, then refresh.
- Verify another dashboard tab updates. Open a course page and return; the companion layer must be absent on course pages.
- Switch BetterCampus themes and light/dark modes. Verify the intended custom choice remains and there is still one companion image layer.
- Remove the companion background, verify original rendering returns, then use Undo.
- Export and restore a companion backup. Keep the file private.
- After saving other browser work, close/reopen Chrome and verify persistence. This check passed during the initial live trial; repeat it after substantive persistence changes.

Image URLs depend on that host remaining available and on the university's content security policy. Uploaded images remain local. If a policy blocks an image, the saved choice remains and fallback behavior should be verified on the live site.

## Roll back

Choose **Leave BetterCampus unchanged** and save, or disable Canvas Companion in Chrome and refresh affected Canvas tabs. The original BetterCampus configuration is never modified. Disabling the extension does not delete the companion's stored image; removal/uninstall can delete local extension data, so export a backup first.

After updating an unpacked build, use Chrome's Reload button on its extension card and refresh Canvas. Back up first, then replace the files inside the original unpacked folder (even if its folder name includes an older version). Reuse that folder/profile to preserve its extension identity and storage; changing the path or uninstalling may create a different identity or lose access to local settings.

## Timetable update and recovery

The database upgrade from version 1 to 2 only adds academic stores. Existing background records/assets are not rewritten. Close older settings tabs before reloading the extension, then refresh Canvas tabs. If Chrome shows a historical invalidated-context cleanup error from the old build, it is separate from the corrected 0.2.0 cleanup path.

Use the timetable’s academic backup separately from the background backup. A version-2 database should not be opened by the original version-1-only repository: disabling the companion is the safe immediate rollback. Retain the current files/data and backups while arranging a compatible code rollback; do not delete or downgrade the database.

## Transparent appearance

Open background settings, choose **All Canvas pages** and **Transparent · light text and colorful accents**, then save. Existing installations retain their prior page/surface options until explicitly changed. The selected image and overlay are reused. Embedded documents/editors retain their own surfaces.
