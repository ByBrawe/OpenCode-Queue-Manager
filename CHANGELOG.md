# Changelog

## Next patch (automatically published)

- Built Desktop GUI using the official OpenCode V2 `@opencode/plugin/gui/vite` preset instead of copying a raw CommonJS source file.
- Always register the `/qm` Desktop command (including before a session is chosen), with an explanatory no-session notice, and add a Queue Manager `session.panel` menu launcher.
- Added a Desktop GUI bundle contract smoke test covering the default export, `/qm` and panel registration, based on native V2 plugin patterns.

- Fixed missing OpenCode v2 root entrypoint: new no-op server plugin at `src/index.mjs` and `exports["."]`; prevents `Plugin entrypoint not found` while keeping Desktop and TUI exports separate.
- Added package-root contract test and documented why `configured: true` does not guarantee that experimental Desktop GUI loaded.

- Fixed version detection for actual Windows CLI output like `opencode v2.0.22` (previously falsely reported `cliV2: false`).
- Removed Node.js DEP0190 warning by invoking Windows .cmd shims through explicit `cmd.exe` with `shell: false`, validating fixed arguments before invocation.
- Updated `doctor` to check both the config file and official `opencode plugin list` output, with a clear suggested installation action.
- Added regression tests and Windows troubleshooting instructions.

## 0.3.0 (source, automated npm publishing enabled)

- Added a cross-platform CLI (`opencode-queue-manager`) to install, inspect, update and uninstall the plugin.
- Added an explicit opt-in installer/uninstaller for the official npm-distributed OpenCode v2 CLI (`install-opencode` / `uninstall-opencode --yes`); does not affect the Desktop app.
- Added Desktop-only configuration fallback with JSONC-safe changes, preservation of other plugins, and timestamped backups.
- Introduced a supported-host registry for future adapters while documenting that DeepSeek and other LLMs are model providers.
- Added bilingual documentation, more examples, safety notes, an optional SEO-friendly GitHub Pages site, and release instructions.
- **Enabled automatic npm publishing:** the main-branch OIDC workflow verifies builds and tests, checks the npm registry, assigns a non-duplicate release version and publishes without npm tokens or manual commands.
- No real OpenCode Desktop app integration testing is claimed.

## 0.2.1

- Prepared public scoped npm package `@bybrawe/opencode-queue-manager`.
- Added packaging verification and CI.
- Preserved Desktop/TUI subpath exports.

## 0.2.0

- Experimental OpenCode v2 GUI panel and TUI queue manager.
- Batch repetition, line import, draft editing, reordering and native queue operations.
