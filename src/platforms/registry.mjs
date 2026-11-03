/** Host applications; model providers (DeepSeek, Anthropic, etc.) are not hosts. */
export const platforms = Object.freeze([
  Object.freeze({ id: 'opencode', label: 'OpenCode v2 Desktop and TUI', supported: true, install: 'opencode plugin add', remove: 'opencode plugin remove' }),
  // New host adapters must implement the contract in docs/en/platform-adapters.md.
]);

export function findPlatform(id) {
  return platforms.find((platform) => platform.id === id);
}
