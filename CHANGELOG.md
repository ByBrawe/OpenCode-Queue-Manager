# Changelog

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
