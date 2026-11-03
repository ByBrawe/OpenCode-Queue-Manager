# Contributing

Contributions and bug reports are welcome once this source has been placed in a repository. This archive does **not** imply there is a published GitHub repository.

- Install OpenCode v2 and reproduce any GUI failures with a temporary test session.
- Run `npm run build && npm test` before proposing changes.
- The experimental GUI SDK may change; include the OpenCode version and operating system in bug reports.
- Never claim a GUI integration is verified unless tested inside OpenCode Desktop.
- Do not silently move, edit, or delete already admitted native queue messages. The official v2 API does not support atomic reorder/text edits.
- Keep the GUI bundle self-contained; no untrusted external URL scripts, CDN resources or telemetry.
- Keep changes under the MIT license and include a test where possible.
