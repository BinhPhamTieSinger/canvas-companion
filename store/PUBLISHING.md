# Publishing assets and migration

- Package: `dist/canvas-companion-0.5.0.zip` (manifest at ZIP root; no private backups or test fixtures).
- Store icon: `src/assets/icon-128.png` (128 × 128, transparent padding around 96 × 96 artwork).
- Screenshots: `store/screenshot-timetable.png`, `store/screenshot-review.png` (1280 × 800, fictional sample data).
- Copy and reviewer instructions: `store/LISTING.md`.
- Privacy policy: https://gist.github.com/BinhPhamTieSinger/4404b899ef9e94ab5e06b8a2b4ae2bd5 . The development repository is now public at https://github.com/BinhPhamTieSinger/canvas-companion . Private recovery exports and local academic inspection files remain ignored and are not tracked.

Store approval and public availability are separate from uploading a draft or submitting it for review. Record the actual dashboard status in the release report. Do not claim that an extension is live until the store confirms it.

## Current submission and patch

The user reported submitting version 0.5.0 for Chrome Web Store review. Version 0.5.1 contains subsequent course-image, contrast and runtime-invalidation fixes and is packaged separately. Preparing this patch does not update or cancel the submitted store version. Its package is `dist/canvas-companion-0.5.1.zip`.

## Existing unpacked installations

A store-created extension has its own extension ID and storage. Preserve the existing unpacked installation and export BOTH academic and background backups first. Disable the unpacked companion before enabling the store version, so two companions do not compete to render the same page. Import the exported backups into the store installation using the same Canvas account. Keep the disabled unpacked installation as a rollback until the restored settings are verified. Do not uninstall or remove profile storage as part of migration.

The store build and the development build share the same validated backup formats. Academic imports merge missing records without overwriting newer records. Uploaded background bytes remain content-addressed and validated. The currently configured local extension keeps its original folder and ID; publishing does not itself move that local data to a new store ID.
