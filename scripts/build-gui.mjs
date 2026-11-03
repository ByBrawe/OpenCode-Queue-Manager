// The GUI implementation is already single-file CommonJS. No external bundles.
// Copy verbatim so ./gui-experimental exists in a freshly unpacked archive.
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(resolve(root, 'dist'), { recursive: true });
await copyFile(resolve(root, 'src/gui-experimental.cjs'), resolve(root, 'dist/gui-experimental.cjs'));
console.log('Built dist/gui-experimental.cjs (standalone CJS, host-provided dependencies only)');
