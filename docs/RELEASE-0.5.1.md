# 0.5.1 — course images, contrast and invalidated contexts

## Diagnosis and changes

- **Course images:** the glass styling used `background:` to tint generic view wrappers. That shorthand also resets `background-image`, including course imagery. Glass/hover tints now change `background-color` only. Failed course `<img>` elements receive a local book icon, with original `src`/`srcset` retained for cleanup. Successful images and stored Canvas/background choices are not rewritten. An unavailable remote photograph is not claimed to be recovered.
- **Light boxes:** the earlier font pass lightened dark text without checking the surface. The new contrast utility composes CSS background colors through ancestors and keeps already-readable text. Otherwise it chooses dark ink on light surfaces or light ink on dark surfaces, with accessible link alternatives and a minimum calculated 4.5:1 ratio. The control panel and embedded settings now pair their light/dark surfaces with matching foregrounds. Code, editors, invisible text and explicit contrast opt-outs are preserved. Images are neither downloaded nor sampled for contrast.
- **`onChanged` exception:** content startup and the academic controller previously subscribed through unguarded Chrome namespaces. After an extension reload/update, an old isolated context can lose access to those namespaces. Storage subscriptions now capture their event reference and unsubscribe safely even if Chrome revokes the API. Runtime checks guard startup and messaging, including after asynchronous profile validation. One teardown path removes storage listeners, DOM observers, timers, and window/document event listeners. Late replies cannot repaint a destroyed timetable. A disconnected old context gets a user-activated reload prompt; pages are not automatically reloaded.

Files include `src/runtime.js`, `src/content/boot.js`, `src/content/main.js`, `src/academic/widget.js`, `src/background/contrast.js`, `glass.js`, `src/ui/control-panel.js`, `options.js`, `options.css`, `src/assets/course-fallback.svg`, manifest/package versions and regression tests. No permission, dependency, stored-setting schema or academic record migration was added.

## Console messages supplied by the user

| Message | Finding / action |
| --- | --- |
| `Cannot read properties of undefined (reading 'onChanged')` | Companion-owned unsafe API access is fixed and covered by invalidation/teardown tests. Previously loaded tabs must be refreshed after the extension reload. Old recorded Errors entries do not disappear automatically. |
| `JQMIGRATE ... installed ... 3.4.1` | Informational dependency message. The companion does not bundle jQuery or jQuery Migrate. |
| Widget types registered in `customWidgets` and built-in registry | None of those types or a widget registry exist in the companion. The message states that a host/custom registration overrides a built-in registration. Its originating application/module needs inspection; the extension does not alter that registry or suppress its logs. |
| `about:blank` body `aria-hidden` blocked | No companion code sets `aria-hidden` on a body. Only the decorative background layer is hidden from assistive technology; dialogs are native `<dialog>` elements. The full emitting stack is needed to identify another script or integration trigger. Body accessibility is not forcibly overridden. |
| `Permissions policy ... unload ... not allowed` | The companion registers `pagehide`, not `unload`. It does not relax the browser/site policy to allow another script's deprecated listener. See [Chrome's unload documentation](https://developer.chrome.com/docs/web-platform/deprecating-unload). |

The generic `console.js` / `trycatch.js` names alone do not conclusively identify the original emitter. These non-companion messages have not been falsely marked fixed or hidden.

## Verification and limits

- 64/64 Node tests pass, including undefined/revoked runtime namespaces, throwing event getters/removal, idempotent unsubscription, stale mutation rejection, late-read teardown, and no requests after destroyed-focus events.
- Contrast tests cover opaque/translucent light surfaces, retained readable dark text, links, ancestor composition, every gray level, control-panel theme selection, and course-image fallback attribute preservation.
- Syntax/manifest checks and package validation pass. Browser fixtures include light boxes/buttons and course imagery for the next visual run.
- Fresh live browser/visual testing of this patch was blocked because the automatic approval review service reached its usage limit. Previous version browser results are historical and are not represented as rerun 0.5.1 results. A full Canvas/Chrome restart was not performed for this patch.

The repository was verified public before this patch. No `private/`, `backups/` or local `audit/` files were found in tracked history. These directories remain ignored. The user reports that 0.5.0 is awaiting store review; 0.5.1 is a separate follow-up package and does not cancel/replace that submission.
