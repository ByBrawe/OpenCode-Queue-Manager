# Queue Manager examples

## 1. Continue a long agent task (review before sending)

```text
Instruction: devam et
Preset: 100
Drafts: 100
```

Open Queue Manager, stage 100 draft messages, remove unnecessary items, then publish only what you need. A large queue might trigger many paid model calls; the safest alternative is often one well-written task instruction.

## 2. Plan a development workflow using a text file

Save `examples/tasks.txt` or paste these lines:

```text
Inspect package.json and locate the project root.
Install dependencies using the project's package manager.
Run unit tests and identify which assertions failed.
Fix the minimal underlying issue and rerun relevant tests.
Summarize completed changes and remaining risks.
```

Each nonempty line becomes one staged task. Reorder the list before submission.

## 3. Reorder a staged batch

Initial drafts:

```text
1. Update documentation.
2. Run tests.
3. Fix failing tests.
```

Reorder to:

```text
1. Run tests.
2. Fix failing tests.
3. Update documentation.
```

This changes **drafts only**; already queued messages cannot be atomically rearranged.

## 4. Use DeepSeek as the selected model in OpenCode

In OpenCode TUI:

```text
/connect    (choose DeepSeek and provide credentials securely to OpenCode)
/models     (choose an available DeepSeek model)
/qm         (open Queue Manager)
```

Queue Manager uses the current OpenCode session and model; it does not manage DeepSeek credentials or connect to a separate DeepSeek program.

## 5. Test a clean install/uninstall from source

```sh
node bin/opencode-queue-manager.mjs install --dry-run
node bin/opencode-queue-manager.mjs doctor
node bin/opencode-queue-manager.mjs install --method config
node bin/opencode-queue-manager.mjs uninstall --method config
```

Run `doctor` again afterward. If you already use other OpenCode plugins, they should remain configured.

## 6. Windows PowerShell example

```powershell
node .\bin\opencode-queue-manager.mjs install --method config
node .\bin\opencode-queue-manager.mjs doctor --json
node .\bin\opencode-queue-manager.mjs uninstall --method config
```

Restart OpenCode Desktop when checking actual plugin load/unload behavior.
