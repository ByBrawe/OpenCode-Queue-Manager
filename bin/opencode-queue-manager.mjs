#!/usr/bin/env node
import { execute } from '../src/installer/cli.mjs';

const args = process.argv.slice(2);
try {
  const result = await execute(args);
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else if (result.help) process.stdout.write(result.help);
  else console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`OpenCode Queue Manager: ${error.message}`);
  process.exitCode = 1;
}
