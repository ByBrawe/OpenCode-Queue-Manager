import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

test('Desktop GUI uses the official OpenCode V2 Vite preset', async () => {
  const manifest = JSON.parse(await text('package.json'));
  const cfg = await text('vite.config.mjs');
  const script = await text('scripts/build-gui.mjs');
  const bundle = await text('dist/gui-experimental.cjs');
  assert.match(cfg, /@opencode\/plugin\/gui\/vite/);
  assert.match(cfg, /entry: "src\/gui-experimental\.mjs"/);
  assert.match(script, /await build\(\)/);
  assert.ok(manifest.devDependencies.vite && manifest.devDependencies["vite-plugin-solid"]);
  assert.ok(bundle.length > 200);
  assert.notEqual(bundle, await text('src/gui-experimental.mjs'));
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
  const { default: definition } = await import(pathToFileURL(resolve(root, pkg.exports['.'])).href);
  assert.equal(definition.id, 'bybrawe.queue-manager');
  assert.equal(typeof definition.setup, 'function');
});

