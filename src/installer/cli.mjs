import { spawnSync } from 'node:child_process';
import { defaultConfigPath, changeConfigFile, PACKAGE, parseConfig, isManagedEntry } from './jsonc-config.mjs';
import { platforms, findPlatform } from '../platforms/registry.mjs';
import { readFile } from 'node:fs/promises';

export const USAGE = `OpenCode Queue Manager - installation and maintenance

Usage: opencode-queue-manager <command> [options]

Plugin management (OpenCode v2 Desktop + TUI):
  install                 Install/add the plugin (idempotent)
  uninstall               Remove the plugin registration (keeps OpenCode)
  update                  Update the plugin using OpenCode v2 CLI
  doctor                  Inspect OpenCode CLI and global plugin configuration
  platforms               Show supported host application adapters

Optional OpenCode CLI management (NOT the Desktop app):
  install-opencode --yes   Install official OpenCode CLI with npm -g
  uninstall-opencode --yes Remove npm-installed OpenCode CLI only

Options:
  --method auto|cli|config  Prefer official CLI, or edit Desktop config directly
  --config PATH             Override global config file (implies config mode)
  --platform opencode       Host integration (only OpenCode implemented)
  --dry-run                 Show what would happen, change nothing
  --yes                     Explicit approval for OpenCode CLI install/removal
  --json                    Output machine-readable JSON
  -h, --help                Show this help

Docs: https://github.com/ByBrawe/OpenCode-Queue-Manager
`;

export function parseArgs(argv) {
  const options = { method: 'auto', platform: 'opencode', dryRun: false, yes: false, json: false };
  let command;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') { command = 'help'; continue; }
    if (arg === '--dry-run' || arg === '--yes' || arg === '--json') {
      options[arg.slice(2).replace('dry-run','dryRun')] = true;
      continue;
    }
    for (const name of ['method', 'config', 'platform']) {
      if (arg === `--${name}`) {
        if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`);
        options[name] = argv[++i];
        break;
      }
      if (arg.startsWith(`--${name}=`)) { options[name] = arg.slice(name.length + 3); break; }
    }
    if (['method', 'config', 'platform'].some((name) => arg === `--${name}` || arg.startsWith(`--${name}=`))) continue;
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    if (command) throw new Error('Only one command is supported at a time');
    command = arg;
  }
  if (!['auto', 'cli', 'config'].includes(options.method)) throw new Error('Invalid method. Use auto, cli, or config');
  if (options.config && options.method === 'auto') options.method = 'config';
  if (!findPlatform(options.platform)?.supported) throw new Error(`Unsupported host platform: ${options.platform}`);
  if (!['help','install','uninstall','update','doctor','platforms','install-opencode','uninstall-opencode'].includes(command || 'help')) {
    throw new Error(`Unknown command: ${command}`);
  }
  return { command: command || 'help', options };
}

/** All child processes use fixed executable names and fixed, trusted argument lists. */
export function systemRun(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    windowsHide: true,
    timeout: 120000,
  });
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.code };
}

export async function execute(argv, deps = {}) {
  const { command, options } = parseArgs(argv);
  const run = deps.run ?? systemRun;
  const change = deps.change ?? changeConfigFile;
  const read = deps.read ?? readFile;
  const configPath = options.config || defaultConfigPath(deps.paths);
  if (command === 'help') return { help: USAGE };
  if (command === 'platforms') return { platforms };
  const version = run('opencode', ['--version']);
  const cliFound = version.code === 0;
  const major = cliFound ? parseInt((version.stdout.match(/\b(\d+)\.\d+/) || [])[1], 10) : NaN;
  const cliV2 = cliFound && major >= 2;
  if (command === 'doctor') {
    let configured = false;
    let configError;
    try {
      const raw = await read(configPath, 'utf8');
      configured = (parseConfig(raw).plugins || []).some(isManagedEntry);
    } catch (error) {
      if (error.code !== 'ENOENT') configError = error.message;
    }
    return { platform: 'opencode', cliFound, cliVersion: cliFound ? version.stdout.trim() : undefined, cliV2, configPath, configured, configError };
  }
  if (command === 'install-opencode' || command === 'uninstall-opencode') {
    const installing = command === 'install-opencode';
    const args = [installing ? 'install' : 'uninstall', '-g', '@opencode/cli'];
    if (!options.yes && !options.dryRun) throw new Error('Explicit --yes is required to change the OpenCode CLI installation');
    if (!installing && !options.dryRun) {
      const owned = run('npm', ['ls', '-g', '@opencode/cli', '--depth=0', '--json']);
      let found = false;
      try { found = Boolean(JSON.parse(owned.stdout).dependencies?.['@opencode/cli']); } catch { /* no npm installation found */ }
      if (!found) throw new Error('OpenCode CLI was not installed with global npm; refusing to uninstall a different installation');
    }
    if (options.dryRun) return { changed: true, dryRun: true, command: `npm ${args.join(' ')}`, note: 'Only OpenCode CLI; Desktop is unaffected' };
    const output = run('npm', args);
    if (output.code !== 0) throw new Error(`npm command failed: ${output.stderr.trim().slice(0, 500) || output.error || 'unknown error'}`);
    return { changed: true, command: `npm ${args.join(' ')}`, note: 'Desktop app and user settings are untouched' };
  }
  if (command === 'update' && (options.method === 'config' || !cliV2)) {
    throw new Error('Update requires OpenCode v2 CLI. Use `opencode plugin update @bybrawe/opencode-queue-manager` or install the OpenCode CLI first.');
  }
  const method = options.method === 'auto' ? (cliV2 ? 'cli' : 'config') : options.method;
  if (method === 'cli' && !cliV2) throw new Error('OpenCode v2 CLI not found. Use --method config for Desktop-only or install the v2 CLI.');
  if (method === 'config') {
    return { platform: 'opencode', ...(await change({ action: command, configPath, dryRun: options.dryRun })) };
  }
  const subcommand = command === 'install' ? 'add' : command === 'uninstall' ? 'remove' : 'update';
  const args = ['plugin', subcommand, PACKAGE];
  if (options.dryRun) return { changed: true, dryRun: true, method: 'cli', command: `opencode ${args.join(' ')}` };
  const output = run('opencode', args);
  if (output.code !== 0) throw new Error(`OpenCode plugin ${subcommand} failed: ${(output.stderr || output.stdout).trim().slice(0, 500)}`);
  return { changed: true, method: 'cli', command: `opencode ${args.join(' ')}`, note: 'Reload OpenCode Desktop/TUI to see plugin changes.' };
}