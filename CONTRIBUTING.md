# Contributing to OpenCode Queue Manager

Thanks for contributing! Please keep changes small, testable and safe for existing OpenCode users.

## Development

```sh
npm install
npm run verify
npm pack --dry-run
```

OpenCode v2 GUI integrations are experimental and should be tested in an actual Desktop app before making stability claims. Automated tests mock OpenCode sessions and UI contracts.

For install/uninstall changes, cover Windows paths, macOS/Linux XDG paths, malformed JSONC, other plugin entries, backups, dry-run, CLI present/absent and explicit consent for global npm operations.

## Feature requests

Attach official API documentation for new coding-app host integrations. See [adapter contract](docs/en/platform-adapters.md). DeepSeek and other model providers are accessed through OpenCode; do not confuse them with new application hosts. Never request API keys or add telemetry without explicit review.

## Release policy

Merging relevant code changes to the main branch **automatically publishes** npm releases through GitHub Actions Trusted Publishing (OIDC), after successful tests. Do not commit changes without review: a merge can trigger a public release. See [release procedure](docs/en/releasing.md). MIT license applies.
