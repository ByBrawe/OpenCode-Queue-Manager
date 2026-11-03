/**
 * OpenCode v2 server plugin entrypoint.
 *
 * Queue Manager currently provides its actual UI through the independently
 * exported ./tui and ./gui-experimental host components.
 * The no-op server setup keeps the npm package resolvable under the official
 * V2 default export contract, without touching sessions or filesystem state.
 */
import { Plugin } from '@opencode/plugin';

export default Plugin.define({
  id: 'bybrawe.queue-manager',
  setup() {},
});
