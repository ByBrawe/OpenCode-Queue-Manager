# Host adapters: roadmap and contributor contract

**One verified host today: OpenCode v2.** `src/platforms/registry.mjs` declares supported host applications; the installer will reject an unknown host instead of pretending to support it.

A **host adapter** integrates with a coding application and its queue API. A **model provider** supplies the LLM that host runs. DeepSeek, OpenAI, Anthropic, Gemini, OpenRouter etc. are providers, and do **not** need individual queue adapters as long as OpenCode's current session can use their models.

## Future host adapter interface (proposal, not shipped as working integrations)

```ts
interface QueueHostAdapter {
  id: string;
  label: string;
  detect(): Promise<{ installed: boolean; version?: string }>;
  install(options: { dryRun: boolean }): Promise<void>;
  uninstall(options: { dryRun: boolean }): Promise<void>;
  listSessions(): Promise<{ id: string; title: string }[]>;
  listPending(sessionId: string): Promise<{ id: string; text: string }[]>;
  enqueue(sessionId: string, text: string): Promise<{ id: string }>;
  cancel(sessionId: string, id: string): Promise<void>;
}
```

Different hosts have different authorization, persistence and ordering semantics. A new adapter must document native capabilities; never fabricate guaranteed reordering, exact-once execution, remote behavior, or GUI integration.

Possible *future research targets* (no existing support): Claude Code, Codex CLI, Cursor, Gemini CLI, other coding harnesses. Each needs independently confirmed public extension API and appropriate integration tests. A term such as “harmless” is not a verified tool identifier; attach the exact project URL to a feature request.

## Contribution checklist

1. Link the host's official documented extension/queue API and license.
2. Implement detection and install/uninstall without modifying unrelated settings; prefer native plugin commands.
3. Make queue submission opt-in, with quotas, failure handling and safe cancellation.
4. Add unit tests with mocked host clients and manual host integration instructions.
5. Add a host-specific doc and register the host in `src/platforms/registry.mjs` **only after implementation and tests**.
6. Never collect API keys within this plugin; let the host manage provider credentials.

The current installer is intentionally host-specific under `src/installer/`; its interface can be evolved to delegate to new adapters without breaking the OpenCode v2 commands.
