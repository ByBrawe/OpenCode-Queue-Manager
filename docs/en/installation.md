# Installation, updating and uninstalling

Supported host: **OpenCode v2 Desktop/TUI**. Installer runtime: **Node.js 20+**, Windows/macOS/Linux. OpenCode Desktop is not installed by the helper; only the optional `@opencode/cli` npm package can be installed globally.

## Recommended: built-in OpenCode CLI

```sh
opencode plugin add @bybrawe/opencode-queue-manager
opencode plugin list
opencode plugin check
opencode plugin update @bybrawe/opencode-queue-manager
opencode plugin remove @bybrawe/opencode-queue-manager
```

See the [official commands reference](https://opencode.ai/v2/docs/cli/commands) for versions and command behavior.

## Automatic plugin installer

The installer is published on npm and updates are released automatically through GitHub Actions:

```sh
npx @bybrawe/opencode-queue-manager install
npx @bybrawe/opencode-queue-manager uninstall
npx @bybrawe/opencode-queue-manager update
npx @bybrawe/opencode-queue-manager doctor
```

For a local Git checkout (before npm publication), run `node bin/opencode-queue-manager.mjs ...` in the repository root.

`--method auto` (default) prefers the `opencode plugin` command if OpenCode v2 CLI is installed. With **no CLI**, it adds/removes the package in the user's global `opencode.jsonc` so **Desktop-only** installations can load it. `--method cli` requires the CLI; `--method config` always uses the config file. `--config PATH` overrides the file path and implies config mode. `--dry-run` makes no changes. `--json` emits machine-readable output.

```sh
npx @bybrawe/opencode-queue-manager doctor --json
npx @bybrawe/opencode-queue-manager install --dry-run
npx @bybrawe/opencode-queue-manager install --method config
npx @bybrawe/opencode-queue-manager uninstall --method config
```

The default config path is `~/.config/opencode/opencode.jsonc` (Windows: `%USERPROFILE%\.config\opencode\opencode.jsonc`). `$XDG_CONFIG_HOME` is respected. Config changes create a timestamped `.bak.*` backup, preserve unrelated keys, and fail safely for invalid JSONC. Comments inside an existing `plugins` array can be removed by reformatting that array; comments elsewhere remain. Backups may contain secrets from your own config. Do not share them publicly.

## Installing the OpenCode CLI itself

Only run this if you specifically want the **OpenCode CLI**, not the Desktop application:

```sh
npx @bybrawe/opencode-queue-manager install-opencode --dry-run
npx @bybrawe/opencode-queue-manager install-opencode --yes
```

The command invokes **official** `npm install -g @opencode/cli`. The uninstall command verifies that global npm owns the CLI first; it refuses to remove a Homebrew/manual installation:

```sh
npx @bybrawe/opencode-queue-manager uninstall-opencode --yes
```

Both are explicit opt-in actions. Neither clears OpenCode's config, models, projects, data, Desktop app or the plugin's app-stored drafts. Uninstall the Desktop app through your OS package management if desired.

## OpenCode Desktop setup

1. [Download OpenCode Desktop](https://opencode.ai/download) for your architecture from the official site.
2. Install the package using `opencode plugin add` or the config-mode helper if the CLI is not installed.
3. Restart/reload OpenCode v2 Desktop, open a session and search for Queue Manager in the command palette or use `/qm`.
4. If no panel appears, verify the Desktop version exposes the experimental plugin GUI SDK and check **Settings → Extensions → Plugins**.

No updater can guarantee compatibility with an experimental host SDK. Test with 2–3 draft messages before sending large batches.

## Common issues

| Symptom | What to check |
| --- | --- |
| `opencode: command not found` | Use `--method config`, or install OpenCode CLI (`install-opencode --yes`) |
| OpenCode is version 1 | Install OpenCode v2; the plugin is v2-only |
| Desktop plugin is missing | Check global `opencode.json(c)`, session/server selection, GUI SDK compatibility |
| Installer refused config | Fix invalid JSONC or `plugins` non-array; no destructive fallback occurs |
| Old package is pinned | `opencode plugin update` skips exact versions; update the config pin deliberately |
| `Wrong workdir` | Run from the right project root before sending repeated prompts |
| `npx` command not found | Install Node.js 20+ and npm, or use the official `opencode plugin add` |

## Cleanup

- Plugin only: `opencode plugin remove @bybrawe/opencode-queue-manager`.
- Config-only removal: `npx @bybrawe/opencode-queue-manager uninstall --method config`.
- Restore settings from the timestamped backup if needed; carefully compare changes first.
- Do not delete OpenCode's entire configuration directory just to remove Queue Manager.


## Server entrypoint / Desktop background errors

The npm package includes three separate OpenCode v2 exports: the root `.`
server definition (`src/index.mjs`), the `./tui` entry, and the experimental
`./gui-experimental` entry. The root has a no-op setup and is required for
OpenCode to resolve the package as a normal plugin. The older npm v0.3.1
package lacked this root export and could log
`Plugin entrypoint not found: @bybrawe/opencode-queue-manager`.
After updating this package, use `opencode plugin update @bybrawe/opencode-queue-manager`
(or remove and reinstall it) so OpenCode loads the new package version.

`doctor` checks configuration and/or registration via `plugin list`;
its `configured` flag is **not** proof that the plugin loaded successfully
or that Desktop's experimental GUI is compatible with the host.

If Desktop reports `Background service failed to start`, inspect the
OpenCode log first. A separate `SQLiteError: disk I/O error` while booting
the background service is a host database/locked-process issue, not a
Queue Manager plugin load error. Stop or restart the stuck OpenCode service
before touching any database files. Never delete `opencode.db`, `-wal` or
`-shm` without a verified full backup of the entire database set.

## Desktop language selection

Once the plugin is loaded inside OpenCode v2 Desktop, open `/qm` and choose one of 20 languages from the **Language / 🌐** dropdown near the top of the panel. **Auto** follows the application's interface locale. The override is saved in the plugin's own global preference store and persists across sessions; it does not modify existing drafts or queued messages. Arabic and Persian use right-to-left layout. Low-frequency diagnostics may fall back to English. TUI localization is separate.

[20-language feature guide](../languages/README.md) · [Localized web guide](https://bybrawe.github.io/OpenCode-Queue-Manager/languages.html).
