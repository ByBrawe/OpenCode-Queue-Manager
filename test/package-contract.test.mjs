import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const text = (path) => readFile(resolve(root, path), 'utf8');

test('npm manifest is publicly publishable with real Desktop and TUI exports', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.name, '@bybrawe/opencode-queue-manager');
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.publishConfig.access, 'public');
  assert.equal(pkg.license, 'MIT');
  assert.ok(Array.isArray(pkg.files));
  assert.ok(pkg.files.includes('dist/') && pkg.files.includes('src/') && pkg.files.includes('bin/'));
  assert.equal(pkg.bin['opencode-queue-manager'], './bin/opencode-queue-manager.mjs');
  assert.ok(pkg.repository.url.includes('ByBrawe/OpenCode-Queue-Manager'));
  for (const entry of ['./tui', './gui-experimental']) {
    assert.ok(pkg.exports[entry], `missing ${entry} export`);
    assert.ok((await stat(resolve(root, pkg.exports[entry]))).isFile(), `${entry} missing on disk`);
  }
});

test('distributed GUI bundle is generated from the committed source', async () => {
  assert.equal(await text('dist/gui-experimental.cjs'), await text('src/gui-experimental.cjs'));
});

test('automatic npm release workflow is restricted to main and uses OIDC', async () => {
  const workflow = await text('.github/workflows/publish-npm.yml');
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /environment: npm/);
  assert.match(workflow, /node-version: "24"/);
  assert.match(workflow, /node scripts\/prepare-npm-release\.mjs/);
  assert.match(workflow, /npm run verify/);
  assert.match(workflow, /npm publish --access public/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN/);
});

test('package root provides a valid OpenCode v2 server plugin entrypoint', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.exports['.'], './src/index.mjs');
  assert.ok((await stat(resolve(root, pkg.exports['.']))).isFile());
  const { default: definition } = await import(resolve(root, pkg.exports['.']));
  assert.equal(definition.id, 'bybrawe.queue-manager');
  assert.equal(typeof definition.setup, 'function');
});

