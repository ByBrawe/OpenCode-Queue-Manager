# OpenCode Queue Manager — Desktop + TUI (experimental v0.2)

**Open-source, MIT-licensed OpenCode v2 plugin** for creating and organizing hundreds of native-queue prompts without keyboard macros. It supports OpenCode **Desktop GUI (Windows/macOS/Linux)** and **TUI** from one local package.

> **Experimental, not production-verified.** The v2 GUI plugin SDK is experimental, and this environment does not have OpenCode Desktop/TUI installed. We verified JavaScript syntax, static plugin registration and mocked client/GUI flows, not real in-app activation. No GitHub or npm publication has been performed.

## Desktop (Windows) installation — recommended

1. Extract the ZIP so the project folder is, for example, `C:\tools\opencode-queue-manager` (check that `package.json` is inside this folder).
2. Open the **OpenCode v2** global config. Press `Win + R`, enter `%USERPROFILE%\.config\opencode`, and open/create `opencode.jsonc`.
3. Merge the `plugins` entry below into your existing JSONC configuration; **do not overwrite** other settings:

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": ["C:/tools/opencode-queue-manager"]
   }
   ```

   For a different extraction location, update the path. Use `/` in the Windows JSONC string.
4. Completely close and restart OpenCode Desktop (or reload its plugin from **Settings → Extensions → Plugins**). Make sure you are using the Desktop app's own server, not an external/remote server.
5. Open a **session**, then use the command palette to run **Queue Manager panelini aç** or type `/qm` in the command interface. Its panel appears in the session's **side region** and can be dragged to the bottom region.
6. **Test with 2–3 messages** before using 100/200 presets. The plugin sends native user prompts, potentially incurring model costs.

The GUI bundle is already present at `dist/gui-experimental.cjs`. No manual `npm install` or build is needed just to try the package in OpenCode v2.

### Desktop interface

- **Repeat** 10 / 25 / 50 / 100 / 200 / custom **1–500** copies of any text (default: `devam et`).
- **Paste a vertical message list**, one message per line, or choose a local `.txt` file. Up to 1000 messages per import, 2000 total staged drafts/session.
- **Persistent session-scoped drafts**: separate from the native inbox, stored with OpenCode's GUI storage API.
- **List + search**: filter case-insensitively, 75 rows/page.
- **Manage drafts**: edit text, duplicate, move up/down/to top/to bottom, sort A–Z/Z–A, reverse, multi-select and delete, clear all.
- **Publish** sequentially to the native OpenCode session inbox with `delivery: "queue"`. Confirmation required; successful prompts are removed from drafts. A failure stops publication and leaves the unsubmitted drafts.
- **Native queue view**: refresh, view pending items and their delivery type, select/cancel queued user prompts or cancel all queued user prompts. Does **not** interrupt already-running execution.
- Automatically refreshes native pending items every 6 seconds while its native queue view is active.

### Desktop-specific limitations

- The GUI SDK, especially its internal module loader and panel API, is experimental. This package uses one **prebuilt, hand-written CommonJS** file importing only documented Desktop host-provided shared modules (`@opencode/plugin/gui`, `effect`, `solid-js`). The official recommended compiler is the Vite GUI preset; real Desktop compatibility still must be checked with your installed OpenCode version.
- **Sorting/editing affects drafts only.** The official native API does not offer atomic reordering or text-editing of already enqueued items. You can cancel pending items but not edit or reorder them in place.
- The GUI plugin is available only on **OpenCode v2**; it does **not** modify OpenCode v1 Desktop or overwrite OpenCode's built-in composer queue UI.
- Drafts staged in TUI and Desktop are currently held in their own plugin storage, not synchronized; **both** can publish to and inspect the same native inbox when connected to the same session/server.
- No exactly-once guarantee across app crashes: if the API accepts a message but the local draft checkpoint does not persist, retrying may duplicate that message.
- Multiple windows editing the same session's drafts concurrently are not coordinated.

## TUI installation

The same folder exports a TUI plugin, `./tui`. If your v2 CLI isn't picking up plugins from the global config above, add this to your v2 global `cli.json`:

```json
{
  "plugins": ["C:/tools/opencode-queue-manager"]
}
```

Restart OpenCode TUI and use `/qm` or the command palette. The terminal plugin uses the official select/prompt/confirm dialogs, and supports repeating, TXT import, numbered list management, edit/move/sort/delete, native queue publishing, and pending-item cancellations.

For macOS and Linux, replace `C:/tools/...` with the absolute path to the extracted directory.

## Safety & behavior

**Queueing 200 prompts does not hold them for manual execution.** OpenCode may start draining them immediately. Each message can call the model and incur charges. Canceling a pending message does not stop a request that already started. Fix errors like `Wrong workdir` **before** repeating `devam et` 100 times.

Plugin data never leaves OpenCode except when you explicitly **Publish** to its own native inbox. All GUI code lives in `src/gui-experimental.cjs`; there are no network/CDN imports, telemetry or shell execution in the GUI part.

## Build / test

Requires Node.js 20+ for the included automated tests (not required just to run the packaged plugin):

```sh
npm run build
npm run check
npm test
```

`npm run build` copies the already self-contained CJS source to `dist/`; no external bundle download is necessary. `npm test` uses a mocked GUI host and fake inbox to verify registration, 100-message submission, failure checkpointing, import limits and pure list operations.

## Source layout

```text
opencode-queue-manager/
  package.json
  src/gui-experimental.cjs     # Desktop GUI source (standalone CommonJS)
  dist/gui-experimental.cjs    # Desktop GUI load target
  src/tui.ts                   # TUI entry
  src/queue-core.mjs           # TUI list/publish helpers
  test/gui-contract.test.mjs   # Desktop mocked integration tests
  test/queue-core.test.mjs     # Pure queue tests
  scripts/build-gui.mjs
  examples/
  LICENSE
```

## References

- OpenCode v2 plugins: https://opencode.ai/v2/docs/build/plugins/
- OpenCode v2 GUI SDK: https://opencode.ai/v2/docs/build/plugins/gui
- OpenCode v2 native queue: https://opencode.ai/v2/docs/api
- Community alternative: https://github.com/mirsella/opencode-queue

## License

MIT. Independently written; no third-party queue manager source code included.
