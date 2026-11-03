# Maintainer release checklist — MANUAL only

There is **no automatic npm publishing on GitHub**. GitHub Actions (`ci.yml`) runs lint/syntax, package verification and mocked tests only; commits and merges will not publish packages.

1. Review changes and run a real OpenCode Desktop/TUI smoke test.
2. Decide a new semver release. `npm view @bybrawe/opencode-queue-manager version` checks the latest published version; publishing the same version again is not allowed.
3. Update `package.json` version and CHANGELOG, commit to your release branch, review and merge.
4. Run `npm install`, `npm run verify`, and `npm pack --dry-run` locally.
5. Run **manually** from project root: `npm login` (if necessary), then `npm publish --access public`.
6. Verify `npm view @bybrawe/opencode-queue-manager version` and test `npx @bybrawe/opencode-queue-manager --help` for v0.3+.
7. Optionally tag the published Git commit and create a GitHub Release with notes.

If an npm Trusted Publisher (OIDC) remains configured, it grants permission but **does not trigger publication**. No workflow is committed to publish automatically. You may revoke unused trusted publishers from the package's npm settings; do not put tokens into GitHub secrets unnecessarily.

Do not describe real GUI compatibility as verified without an integration run on the relevant OpenCode v2 release. Static and mock tests are not sufficient.
