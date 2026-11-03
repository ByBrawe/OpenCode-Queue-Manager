# Changelog

## 0.2.1 (2026-11-03)

- Prepared the public scoped package `@bybrawe/opencode-queue-manager` for npm publication (previous package was private).
- Added npm package metadata, explicit distributable file list, and `prepack` build/test verification.
- Added packaging contract tests and GitHub Actions CI for Linux and Windows.
- Added opt-in manual npm Trusted Publishing workflow, install guides and release checklist.
- Desktop remains **experimental**, not verified in a live application.

## 0.2.0 (2026-11-03)

- First experimental OpenCode v2 **Desktop GUI** entry point (`./gui-experimental`) with a session side panel.
- Turkish GUI: repeat counts (10/25/50/100/200/custom), paste/import list, search, reorder, sort, multi-select, edit, duplicate, delete, publish.
- Native OpenCode inbox view and queued-user-prompt cancellation.
- Added mocked GUI contract and send/failover tests.
- Kept the original TUI entry point, also accessible using `/qm`.
- Not yet verified against a live OpenCode Desktop installation.

## 0.1.0 (experimental)

- TUI-only native queue draft manager and list-operation tests.
