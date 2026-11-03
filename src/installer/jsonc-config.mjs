import { readFile, mkdir, copyFile, chmod, writeFile, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

export const PACKAGE = '@bybrawe/opencode-queue-manager';

/** OpenCode v2 uses ~/.config/opencode/opencode.jsonc for desktop/server plugins. */
export function defaultConfigPath({ home = homedir(), env = process.env } = {}) {
  return join(env.XDG_CONFIG_HOME || join(home, '.config'), 'opencode', 'opencode.jsonc');
}

/** Replace JSONC comments with spaces, preserving all offsets for precise editing. */
export function stripJsonc(source) {
  const out = String(source).split('');
  let string = false;
  for (let i = 0; i < out.length; i++) {
    const ch = source[i];
    if (string) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') string = false;
      continue;
    }
    if (ch === '"') { string = true; continue; }
    if (ch === '/' && source[i + 1] === '/') {
      out[i] = out[i + 1] = ' ';
      i += 2;
      while (i < source.length && source[i] !== '\n' && source[i] !== '\r') out[i++] = ' ';
      i--;
    } else if (ch === '/' && source[i + 1] === '*') {
      out[i] = out[i + 1] = ' ';
      const start = i;
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] !== '\n' && source[i] !== '\r') out[i] = ' ';
        i++;
      }
      if (i >= source.length) throw new Error(`Unterminated block comment at ${start}`);
      out[i++] = ' ';
      out[i] = ' ';
    }
  }
  if (string) throw new Error('Unterminated JSON string in OpenCode config');
  // Ignore valid JSONC trailing commas without affecting string literals.
  string = false;
  for (let i = 0; i < out.length; i++) {
    if (out[i] === '"') { string = !string; continue; }
    if (string && out[i] === '\\') { i++; continue; }
    if (string || out[i] !== ',') continue;
    let next = i + 1;
    while (/\s/.test(out[next] ?? '') && next < out.length) next++;
    if (out[next] === '}' || out[next] === ']') out[i] = ' ';
  }
  return out.join('');
}

export function parseConfig(source) {
  const parsed = JSON.parse(stripJsonc(source));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('OpenCode config must contain a JSON object');
  }
  if ('plugins' in parsed && !Array.isArray(parsed.plugins)) {
    throw new Error('OpenCode config plugins setting is not an array; refused to overwrite it');
  }
  return parsed;
}

// Read a JSON string token starting at offset; returns the closing quote position.
function closeString(s, at) {
  for (let i = at + 1; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '"') return i;
  }
  throw new Error('Unterminated config string');
}

function findRoot(s) {
  let level = 0;
  let rootStart = -1;
  let rootEnd = -1;
  let property = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      const end = closeString(s, i);
      if (level === 1 && JSON.parse(s.slice(i, end + 1)) === 'plugins') {
        let j = end + 1;
        while (/\s/.test(s[j] ?? '') && j < s.length) j++;
        if (s[j] === ':') {
          j++;
          while (/\s/.test(s[j] ?? '') && j < s.length) j++;
          if (s[j] !== '[') throw new Error('OpenCode config plugins is not an array');
          const start = j;
          let nested = 0;
          for (; j < s.length; j++) {
            if (s[j] === '"') { j = closeString(s, j); continue; }
            if (s[j] === '[') nested++;
            if (s[j] === ']') {
              nested--;
              if (nested === 0) break;
            }
          }
          if (nested !== 0) throw new Error('Unterminated plugins array');
          property = { start, end: j + 1 };
        }
      }
      i = end;
    } else if (c === '{') { level++; if (level === 1) rootStart = i; }
    else if (c === '}') { level--; if (level === 0) rootEnd = i; }
  }
  if (rootStart < 0 || rootEnd < 0) throw new Error('OpenCode config must contain an object');
  return { rootStart, rootEnd, property };
}

export function isManagedEntry(item) {
  const target = typeof item === 'string' ? item : item?.package;
  return typeof target === 'string' && [PACKAGE, `-${PACKAGE}`].some((id) => target === id || target.startsWith(`${id}@`));
}

/** Return new config text with unrelated properties/comments untouched. */
export function planConfigChange(source, action) {
  if (action !== 'install' && action !== 'uninstall') throw new Error('Unknown config action');
  const original = source.trim() ? source : '{\n  "$schema": "https://opencode.ai/config.json"\n}\n';
  const data = parseConfig(original);
  const before = data.plugins ?? [];
  const kept = before.filter((p) => !isManagedEntry(p));
  const next = action === 'install' ? [...kept, PACKAGE] : kept;
  if (JSON.stringify(before) === JSON.stringify(next)) return { changed: false, content: original, entries: next };
  const clean = stripJsonc(original);
  const { rootStart, rootEnd, property } = findRoot(clean);
  let content;
  if (property) {
    const line = original.slice(0, property.start).split(/\r?\n/).pop() || '';
    const indent = /^\s*/.exec(line)?.[0] || '  ';
    const array = JSON.stringify(next, null, 2).replace(/\n/g, `\n${indent}`);
    content = original.slice(0, property.start) + array + original.slice(property.end);
  } else {
    if (action === 'uninstall') return { changed: false, content: original, entries: next };
    // Detect an existing trailing comma in the JSONC so we never add a double comma.
    const withoutComments = stripJsoncCommentsOnly(original);
    const hasPrior = clean.slice(rootStart + 1, rootEnd).trim().length > 0;
    const endsInComma = withoutComments.slice(rootStart + 1, rootEnd).trimEnd().endsWith(',');
    const prefix = hasPrior && !endsInComma ? ',' : '';
    content = original.slice(0, rootEnd) + `${prefix}\n  "plugins": ["${PACKAGE}"]\n` + original.slice(rootEnd);
  }
  parseConfig(content); // Fail closed before writing any file.
  return { changed: true, content, entries: next };
}

function stripJsoncCommentsOnly(text) {
  // A trailing comma differs from whitespace in JSONC; preserve original comma bytes.
  const source = String(text);
  const out = source.split('');
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    if (quoted) {
      if (source[i] === '\\') { i++; continue; }
      if (source[i] === '"') quoted = false;
      continue;
    }
    if (source[i] === '"') { quoted = true; continue; }
    if (source[i] === '/' && source[i + 1] === '/') {
      out[i] = out[++i] = ' ';
      while (++i < source.length && source[i] !== '\n' && source[i] !== '\r') out[i] = ' ';
      i--;
    } else if (source[i] === '/' && source[i + 1] === '*') {
      out[i] = out[++i] = ' ';
      while (++i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] !== '\n' && source[i] !== '\r') out[i] = ' ';
      }
      out[i] = out[++i] = ' ';
    }
  }
  return out.join('');
}

export async function changeConfigFile({ configPath = defaultConfigPath(), action, dryRun = false } = {}) {
  let original = '';
  let exists = true;
  try { original = await readFile(configPath, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    exists = false;
  }
  if (!exists && action === 'uninstall') return { changed: false, configPath, method: 'config' };
  const plan = planConfigChange(original, action);
  if (!plan.changed || dryRun) return { changed: plan.changed, dryRun, configPath, method: 'config' };
  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  let backup;
  if (exists) {
    backup = `${configPath}.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`;
    await copyFile(configPath, backup);
    await chmod(backup, 0o600);
  }
  const tmp = join(dirname(configPath), `.opencode-queue-manager-${randomUUID()}.tmp`);
  try {
    await writeFile(tmp, plan.content, { mode: 0o600, flag: 'wx' });
    await rename(tmp, configPath);
  } catch (error) {
    await rm(tmp, { force: true }).catch(() => {});
    throw error;
  }
  return { changed: true, configPath, backup, method: 'config' };
}