# Automatic npm publication

No manual `npm publish` is required. GitHub Actions `.github/workflows/publish-npm.yml` handles npm releases on eligible `main` branch updates.

## One-time settings

- npm: Trusted Publisher **GitHub Actions**, user `ByBrawe`, repository `OpenCode-Queue-Manager`, workflow filename `publish-npm.yml`, Environment `npm`, **Allow npm publish** enabled.
- GitHub: Environment `npm` must allow deployment from `main`. If required reviewers are enabled, approval remains necessary.
- Workflow uses `id-token: write`, Node 24 and npm OIDC; no `NPM_TOKEN` is needed.

## Publishing rules

1. Source code or package files change on `main` (or the workflow is manually dispatched).
2. GitHub Actions installs dependencies, builds and tests the package with `npm run verify`. Failure stops publication.
3. The release helper queries the npm registry. Network errors stop publication rather than guessing.
4. If the current Git SHA was already published, it is **not published again**.
5. The source version is used when newer than npm's latest version (e.g. `0.3.0` after `0.2.x`). Otherwise, npm's latest stable patch version is increased automatically (e.g. `0.3.0` → `0.3.1`). Major/minor releases require setting the source version deliberately.
6. `npm publish --access public` uses Trusted Publishing. Provenance is recorded by npm.
7. After a successful publish, the workflow **attempts** to write the published version back to `main` as a bot commit. Branch protection may prevent this, without undoing a successful npm release. Later releases still calculate versions from the npm registry.

The workflow triggers on source/installer/package files plus the release workflow itself. Documentation-only changes to `docs/` do not trigger npm publication. A bot commit using `GITHUB_TOKEN` does not recursively trigger the workflow.

To verify results see [GitHub Actions](https://github.com/ByBrawe/OpenCode-Queue-Manager/actions/workflows/publish-npm.yml) and [npm](https://www.npmjs.com/package/@bybrawe/opencode-queue-manager). A merge alone is not proof of a successful npm publication.

## User installations

Publishing a new npm version does **not** force an update on users' computers. OpenCode v2 may check for unpinned plugin updates on startup without installing them. Users can apply an update with:

```sh
opencode plugin update @bybrawe/opencode-queue-manager
```

Do not advertise Desktop as production-tested without a real OpenCode v2 Desktop integration run; current automated tests use mocks.
