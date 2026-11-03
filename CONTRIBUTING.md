# Contributing

Contributions and bug reports are welcome at https://github.com/ByBrawe/OpenCode-Queue-Manager.

- Install OpenCode v2 and reproduce any GUI failures with a temporary test session.
- Run `npm run verify && npm pack --dry-run` before proposing changes.
- The experimental GUI SDK may change; include the OpenCode version and operating system in bug reports.
- Never claim a GUI integration is verified unless tested inside OpenCode Desktop.
- Do not silently move, edit, or delete already admitted native queue messages. The official v2 API does not support atomic reorder/text edits.
- Keep the GUI bundle self-contained; no untrusted external URL scripts, CDN resources or telemetry.
- Keep changes under the MIT license and include a test where possible.

Publishing on npm is a maintainer-only operation. Check the version, package contents and npm scope permissions first; see the release checklist in README.
