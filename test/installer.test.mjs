import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PACKAGE, parseConfig, stripJsonc, planConfigChange, changeConfigFile, defaultConfigPath } from '../src/installer/jsonc-config.mjs';
import { parseArgs, execute } from '../src/installer/cli.mjs';
import { platforms, findPlatform } from '../src/platforms/registry.mjs';

const first = '{\n  // preserve this comment\n  "$schema": "https://opencode.ai/config.json",\n  "model": "deepseek/some-model",\n  "plugins": ["other", /* keep my plugin */ "@bybrawe/opencode-queue-manager@0.2.1",],\n}\n';

test('parses JSONC with comments, trailing commas and slashes in strings', () => {
  assert.deepEqual(parseConfig('{"url":"https://example.com/a,b", /* c */ "plugins": ["x",],}').plugins, ['x']);
  assert.match(stripJsonc('{"a":1, // hi\n}'), /"a":1/);
  assert.throws(() => parseConfig('{"plugins":{}}'), /not an array/);
  assert.throws(() => parseConfig('{"plugins":[], /*oops '), /Unterminated/);
});

test('install is idempotent and preserves unrelated settings and comments', () => {
  const added = planConfigChange(first, 'install');
  assert.equal(added.changed, true);
  assert.ok(added.content.includes('// preserve this comment'));
  assert.ok(added.content.includes('deepseek/some-model'));
  assert.deepEqual(parseConfig(added.content).plugins, ['other', PACKAGE]);
  assert.equal(planConfigChange(added.content, 'install').changed, false);
  const removed = planConfigChange(added.content, 'uninstall');
  assert.deepEqual(parseConfig(removed.content).plugins, ['other']);
  assert.equal(planConfigChange(removed.content, 'uninstall').changed, false);
});

test('missing plugins property is inserted without breaking JSONC', () => {
  for (const original of ['{}', '{"foo": 1,}', '{"foo":1 // hi\n}', '{ // one\n }', '']) {
    const planned = planConfigChange(original, 'install');
    assert.ok(planned.changed);
    assert.ok(parseConfig(planned.content).plugins.includes(PACKAGE));
  }
  assert.equal(planConfigChange('{"foo":1}', 'uninstall').changed, false);
  assert.throws(() => planConfigChange('{"plugins": "abc"}', 'install'), /not an array/);
  assert.throws(() => planConfigChange('invalid', 'install'));
});

test('global config path honors XDG and defaults to user config', () => {
  assert.equal(defaultConfigPath({ home: '/home/test', env: {} }), '/home/test/.config/opencode/opencode.jsonc');
  assert.equal(defaultConfigPath({ home: '/home/test', env: { XDG_CONFIG_HOME: '/else' } }), '/else/opencode/opencode.jsonc');
});

test('config mutation creates backup, supports dry-run, and does not overwrite other plugins', async (t) => {
  const base = await mkdtemp(join(tmpdir(), 'queue-manager-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const configPath = join(base, 'opencode', 'opencode.jsonc');
  assert.equal((await changeConfigFile({ action: 'install', configPath, dryRun: true })).changed, true);
  await assert.rejects(readFile(configPath, 'utf8'), { code: 'ENOENT' });
  const added = await changeConfigFile({ action: 'install', configPath });
  assert.equal(added.changed, true);
  assert.deepEqual(parseConfig(await readFile(configPath, 'utf8')).plugins, [PACKAGE]);
  const content = '{"plugins":["safe-plugin", "' + PACKAGE + '"]}';
  await writeFile(configPath, content);
  const removed = await changeConfigFile({ action: 'uninstall', configPath });
  assert.ok(removed.backup);
  assert.equal(await readFile(removed.backup, 'utf8'), content);
  assert.deepEqual(parseConfig(await readFile(configPath, 'utf8')).plugins, ['safe-plugin']);
  const after = await readdir(join(base, 'opencode'));
  assert.equal(after.filter((name) => name.includes('.tmp')).length, 0);
});

test('platform registry exposes only verified host, not LLM providers', () => {
  assert.equal(platforms.length, 1);
  assert.equal(findPlatform('opencode').supported, true);
  assert.equal(findPlatform('deepseek'), undefined);
  assert.throws(() => parseArgs(['install', '--platform', 'harmless']), /Unsupported/);
});

test('CLI plugin add/remove/update uses official OpenCode v2 commands, supports dry run', async () => {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, args]);
    return cmd === 'opencode' && args[0] === '--version' ? { code: 0, stdout: '2.0.1' } : { code: 0, stdout: '' };
  };
  const install = await execute(['install', '--method', 'cli'], { run });
  assert.match(install.command, /plugin add/);
  await execute(['uninstall', '--method', 'cli'], { run });
  await execute(['update', '--method', 'cli'], { run });
  assert.deepEqual(calls.slice(1).map((v) => v[1]), [
    ['plugin','add',PACKAGE], ['--version'], ['plugin','remove',PACKAGE], ['--version'], ['plugin','update',PACKAGE],
  ]);
  const previewCalls = [];
  const preview = await execute(['install', '--dry-run'], { run: (c, a) => { previewCalls.push([c,a]); return { code: 0, stdout: '2.0.0' }; } });
  assert.equal(preview.dryRun, true);
  assert.equal(previewCalls.length, 1);
});

test('Desktop-only installation falls back to config, doctor stays read-only', async () => {
  const events = [];
  const fakeRun = () => ({ code: null, error: 'ENOENT' });
  const fakeChange = async (input) => { events.push(input); return { changed: true, method: 'config' }; };
  const result = await execute(['install','--config','/tmp/config.jsonc'], { run: fakeRun, change: fakeChange });
  assert.equal(result.method, 'config');
  assert.equal(events[0].configPath, '/tmp/config.jsonc');
  await assert.rejects(execute(['update'], { run: fakeRun }), /requires OpenCode v2 CLI/);
  await assert.rejects(execute(['install','--method','cli'], { run: fakeRun }), /not found/);
  const d = await execute(['doctor'], { run: fakeRun, read: async () => '{"plugins":["' + PACKAGE + '"]}' });
  assert.equal(d.configured, true);
  assert.equal(d.cliFound, false);
});

test('OpenCode CLI install/removal require explicit confirmation; npm-owned install only', async () => {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd,args]);
    if (cmd === 'opencode') return { code: null, error: 'ENOENT' };
    if (cmd === 'npm' && args[0] === 'ls') return { code: 0, stdout: '{"dependencies":{"@opencode/cli":{"version":"2.1.0"}}}' };
    return { code: 0 };
  };
  await assert.rejects(execute(['install-opencode'], { run }), /--yes/);
  await assert.rejects(execute(['uninstall-opencode'], { run }), /--yes/);
  const preview = await execute(['install-opencode', '--dry-run'], { run });
  assert.equal(preview.dryRun, true);
  assert.deepEqual(calls.map((v) => v[0]), ['opencode', 'opencode', 'opencode']);
  await execute(['install-opencode', '--yes'], { run });
  await execute(['uninstall-opencode', '--yes'], { run });
  assert.ok(calls.some(([cmd,a]) => cmd === 'npm' && a[0] === 'uninstall'));
  const bad = (cmd, a) => cmd === 'npm' ? { code: 1, stdout:'{"dependencies":{}}' } : { code: null };
  await assert.rejects(execute(['uninstall-opencode','--yes'], { run: bad }), /not installed with global npm/);
});

test('CLI rejects unknown options or unsupported host', () => {
  assert.equal(parseArgs(['--help']).command, 'help');
  assert.throws(() => parseArgs(['install', '--bogus']), /Unknown option/);
  assert.throws(() => parseArgs(['install', '--method', 'no']), /Invalid method/);
  assert.throws(() => parseArgs(['install', 'another']), /Only one command/);
});