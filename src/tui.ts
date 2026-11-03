/**
 * OpenCode v2 native TUI plugin, accessible with /qm or Ctrl+P > Queue Manager.
 * Uses official session.prompt and session.inbox.* client methods.
 * All reordering/editing happens in a private draft list BEFORE publishing.
 */
import { Plugin } from "@opencode/plugin/tui";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  MAX_BATCH,
  deleteAt,
  editAt,
  flushDrafts,
  moveAt,
  normalizeCount,
  parseMessageLines,
  repeatMessage,
  summarize,
} from "./queue-core.mjs";

type DraftState = { sessions: Record<string, string[]> };

type MenuOption = { title: string; value: string; description?: string };

export default Plugin.define({
  id: "queue.manager.tui",
  setup(ctx) {
    const [drafts, updateDrafts] = ctx.storage.store("queue-manager.drafts.v1", {
      initial: { sessions: {} } as DraftState,
    });

    const message = (title: string, body: string) =>
      ctx.ui.toast.show({ title, message: body, variant: "info" });

    async function reportError(error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      await ctx.ui.dialog.alert({ title: "Queue Manager - Error", message: detail });
    }

    function sessionID(): string | undefined {
      const route = ctx.ui.router.current();
      return route?.type === "session" ? route.sessionID : undefined;
    }

    function entries(id: string): string[] {
      return [...(drafts.sessions[id] ?? [])];
    }

    async function storeEntries(id: string, list: string[]) {
      await updateDrafts((state) => {
        state.sessions[id] = list;
      });
    }

    async function choose(title: string, options: MenuOption[]): Promise<string | undefined> {
      return ctx.ui.dialog.select({ title, options });
    }

    async function getText(title: string, placeholder: string): Promise<string | undefined> {
      const text = await ctx.ui.dialog.prompt({ title, placeholder });
      return typeof text === "string" && text.trim() ? text.trim() : undefined;
    }

    async function createRepeated(id: string) {
      const choice = await choose("Repeat count", [
        ...[10, 25, 50, 100, 200].map((n) => ({ title: String(n), value: String(n) })),
        { title: "Custom (1-500)", value: "custom" },
      ]);
      if (!choice) return;
      let count: number;
      try {
        const raw = choice === "custom" ? await getText("How many?", "e.g. 150") : choice;
        if (!raw) return;
        count = normalizeCount(raw);
      } catch (error) {
        return reportError(error);
      }
      const preset = await choose("Choose message", [
        { title: "devam et", value: "devam et" },
        { title: "continue", value: "continue" },
        { title: "testleri çalıştır ve hataları düzelt", value: "testleri çalıştır ve hataları düzelt" },
        { title: "Custom message", value: "custom" },
      ]);
      if (!preset) return;
      const text = preset === "custom" ? await getText("Message to repeat", "your prompt") : preset;
      if (!text) return;
      const confirmed = await ctx.ui.dialog.confirm({
        title: "Create repeated draft items?",
        message: `Stage ${count} copies of '${summarize(text, 55)}'? No prompts will be sent yet.`,
        label: { confirm: "Stage", cancel: "Cancel" },
      });
      if (!confirmed) return;
      await storeEntries(id, [...entries(id), ...repeatMessage(text, count)]);
      message("Draft ready", `${count} items added. Use 'Publish drafts' to send them to the native queue.`);
    }

    async function importFile(id: string) {
      const filename = await getText("Import UTF-8 .txt file (one message per line)", "C:\\path\\messages.txt");
      if (!filename) return;
      try {
        const path = resolve(filename.replace(/^~(?=[/\\])/, process.env.HOME ?? process.env.USERPROFILE ?? "~"));
        const content = await readFile(path, "utf8");
        const lines = parseMessageLines(content);
        const ok = await ctx.ui.dialog.confirm({
          title: "Import message list",
          message: `Stage ${lines.length} messages from ${path}?`,
          label: { confirm: "Import", cancel: "Cancel" },
        });
        if (!ok) return;
        await storeEntries(id, [...entries(id), ...lines]);
        message("Imported", `${lines.length} messages staged. Nothing has been submitted to OpenCode yet.`);
      } catch (error) {
        await reportError(error);
      }
    }

    async function addOne(id: string) {
      const value = await getText("Add one draft message", "Your prompt");
      if (!value) return;
      await storeEntries(id, [...entries(id), value]);
      message("Added", "Message appended to the draft list.");
    }

    async function manageDrafts(id: string) {
      for (;;) {
        const list = entries(id);
        if (!list.length) return ctx.ui.dialog.alert({ title: "Drafts", message: "Draft list is empty." });
        const selected = await choose(`Drafts (${list.length}) - choose one`, [
          ...list.map((text, index) => ({
            title: `${String(index + 1).padStart(3, "0")}. ${summarize(text)}`,
            value: String(index),
          })),
          { title: "Back", value: "back" },
        ]);
        if (!selected || selected === "back") return;
        const i = Number(selected);
        const action = await choose(`Draft #${i + 1}`, [
          { title: "Replace text", value: "edit" },
          { title: "Move up", value: "up" },
          { title: "Move down", value: "down" },
          { title: "Move to top", value: "top" },
          { title: "Move to bottom", value: "bottom" },
          { title: "Duplicate", value: "duplicate" },
          { title: "Delete", value: "delete" },
          { title: "Back", value: "back" },
        ]);
        if (!action || action === "back") continue;
        try {
          if (action === "edit") {
            const next = await getText(`Replace draft #${i + 1}`, summarize(list[i], 65));
            if (next) await storeEntries(id, editAt(list, i, next));
          } else if (action === "delete") {
            await storeEntries(id, deleteAt(list, i));
          } else if (action === "duplicate") {
            const next = [...list];
            next.splice(i + 1, 0, list[i]);
            await storeEntries(id, next);
          } else {
            const target = {
              up: Math.max(0, i - 1),
              down: Math.min(list.length - 1, i + 1),
              top: 0,
              bottom: list.length - 1,
            }[action];
            if (target !== undefined) await storeEntries(id, moveAt(list, i, target));
          }
        } catch (error) {
          await reportError(error);
        }
      }
    }

    async function draftSort(id: string) {
      const action = await choose("Reorder draft list", [
        { title: "Reverse order", value: "reverse" },
        { title: "Sort A-Z", value: "asc" },
        { title: "Sort Z-A", value: "desc" },
      ]);
      if (!action) return;
      const list = entries(id);
      if (action === "reverse") list.reverse();
      else list.sort((a, b) => a.localeCompare(b, "tr"));
      if (action === "desc") list.reverse();
      await storeEntries(id, list);
      message("Sorted", "Only the local draft order was changed.");
    }

    async function clearDrafts(id: string) {
      const count = entries(id).length;
      if (!count) return;
      const ok = await ctx.ui.dialog.confirm({
        title: "Clear draft list?",
        message: `Delete ${count} draft entries? Native OpenCode pending prompts are NOT affected.`,
        label: { confirm: "Clear drafts", cancel: "Cancel" },
      });
      if (ok) await storeEntries(id, []);
    }

    async function publishDrafts(id: string) {
      const count = entries(id).length;
      if (!count) return;
      const ok = await ctx.ui.dialog.confirm({
        title: "Publish to OpenCode native queue?",
        message: `Send ${count} messages with delivery=queue to THIS session? They may begin executing immediately as the session becomes idle. This can incur provider costs.`,
        label: { confirm: "Publish", cancel: "Cancel" },
      });
      if (!ok) return;
      let sent = 0;
      try {
        sent = await flushDrafts({
          getNext: () => entries(id)[0],
          accept: async (text) => {
            await ctx.client.session.prompt({ sessionID: id, text, delivery: "queue" });
          },
          dropAccepted: async (text) => {
            await updateDrafts((state) => {
              const row = state.sessions[id] ?? [];
              if (row[0] !== text) throw new Error("Concurrent draft change detected; inspect drafts before retrying.");
              row.shift();
            });
          },
        });
      } catch (error) {
        message("Partial publish", `${count - entries(id).length} admitted, ${entries(id).length} still in drafts.`);
        await reportError(error);
        return;
      }
      await ctx.data.session.pending.sync(id);
      message("Published", `${sent} messages admitted to the native queue.`);
    }

    async function nativeInbox(id: string) {
      for (;;) {
        const all = await ctx.client.session.inbox.list({ sessionID: id });
        if (!all.length) return ctx.ui.dialog.alert({ title: "Native inbox", message: "No pending items." });
        const selection = await choose(`OpenCode native inbox (${all.length})`, [
          ...all.map((item, index) => ({
            title: `${String(index + 1).padStart(3, "0")}. ${item.type === "user" || item.type === "synthetic" ? summarize(item.payload.text) : `[${item.type}]`}`,
            value: item.id,
            description: item.delivery,
          })),
          { title: "Back", value: "back" },
        ]);
        if (!selection || selection === "back") return;
        const item = all.find((row) => row.id === selection);
        if (!item) continue;
        const decision = await choose(`Pending item (${item.type})`, [
          { title: "Cancel this pending item", value: "cancel" },
          { title: "Back", value: "back" },
        ]);
        if (decision !== "cancel") continue;
        const confirmed = await ctx.ui.dialog.confirm({
          title: "Cancel pending item?",
          message: "This cannot stop a message already being executed; only still-pending items can be cancelled.",
          label: { confirm: "Cancel item", cancel: "Keep" },
        });
        if (confirmed) {
          try {
            await ctx.client.session.inbox.cancel({ sessionID: id, inboxID: item.id });
            await ctx.data.session.pending.sync(id);
          } catch (error) {
            await reportError(error);
          }
        }
      }
    }

    async function clearNativeUserPrompts(id: string) {
      const all = await ctx.client.session.inbox.list({ sessionID: id });
      const pending = all.filter((item) => item.type === "user" && item.delivery === "queue");
      if (!pending.length) return ctx.ui.dialog.alert({ title: "Native inbox", message: "No queued user prompts to cancel." });
      const ok = await ctx.ui.dialog.confirm({
        title: "Cancel ALL native queued user prompts?",
        message: `Cancel ${pending.length} queued USER prompts? Synthetic, move and compaction entries will be kept. This does not stop active execution.`,
        label: { confirm: "Cancel queued prompts", cancel: "Keep all" },
      });
      if (!ok) return;
      let done = 0;
      try {
        for (const item of pending) {
          await ctx.client.session.inbox.cancel({ sessionID: id, inboxID: item.id });
          done += 1;
        }
        await ctx.data.session.pending.sync(id);
        message("Cleared", `${done} pending prompts cancellation requested.`);
      } catch (error) {
        message("Partial clear", `${done} cancellations completed before the error.`);
        await reportError(error);
      }
    }

    async function openManager() {
      const id = sessionID();
      if (!id) return ctx.ui.dialog.alert({ title: "Queue Manager", message: "Open a session in the OpenCode v2 terminal UI first, then run /qm." });
      try {
        for (;;) {
          const draftCount = entries(id).length;
          const pendingCount = (await ctx.client.session.inbox.list({ sessionID: id })).length;
          const item = await choose(`Queue Manager | ${draftCount} drafts | ${pendingCount} native pending`, [
            { title: "Repeat 10 / 25 / 50 / 100 / 200 / custom", value: "repeat" },
            { title: "Add one draft message", value: "one" },
            { title: "Import lines from .txt", value: "import" },
            { title: `Manage draft list (${draftCount}) - edit, reorder, delete`, value: "drafts" },
            { title: "Reverse / sort draft list", value: "sort" },
            { title: `Publish all drafts to OpenCode native queue (${draftCount})`, value: "publish" },
            { title: `View / cancel native pending messages (${pendingCount})`, value: "native" },
            { title: "Clear draft list", value: "clear-drafts" },
            { title: "Clear native queued user prompts", value: "clear-native" },
            { title: "Close", value: "exit" },
          ]);
          if (!item || item === "exit") return;
          if (item === "repeat") await createRepeated(id);
          if (item === "one") await addOne(id);
          if (item === "import") await importFile(id);
          if (item === "drafts") await manageDrafts(id);
          if (item === "sort") await draftSort(id);
          if (item === "publish") await publishDrafts(id);
          if (item === "native") await nativeInbox(id);
          if (item === "clear-drafts") await clearDrafts(id);
          if (item === "clear-native") await clearNativeUserPrompts(id);
        }
      } catch (error) {
        await reportError(error);
      }
    }

    ctx.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "queue.manager.open",
          title: "Queue Manager",
          group: "Queue Manager",
          palette: true,
          slash: { name: "qm" },
          run: openManager,
        },
      ],
    }));
  },
});
