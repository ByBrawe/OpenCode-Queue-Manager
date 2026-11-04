
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("published GUI bundle default-exports a V2 definition and exposes /qm even without a session", async () => {
  const file = await readFile(resolve(root, "dist/gui-experimental.cjs"), "utf8");
  const registry = {
    Command: Symbol("Command"), Panel: Symbol("Panel"),
    Style: Symbol("Style"), MenuItem: Symbol("MenuItem"),
  };
  const guiSdk = { ...registry, Plugin: { define: (definition) => definition } };
  const dependencies = {
    "@opencode/plugin/gui": guiSdk,
    "solid-js": {
      createEffect() {}, createMemo() {}, createSignal() {}, onCleanup() {},
    },
    "effect": { Schema: { Struct: (schema) => schema, Array: (item) => item, String: {} } },
  };
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports,
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw new Error("Unexpected GUI host dependency: " + name);
      return dependencies[name];
    },
    console, setInterval, clearInterval,
  };
  runInNewContext(file, sandbox, { filename: "dist/gui-experimental.cjs", timeout: 3000 });
  const definition = module.exports.default ?? module.exports;
  assert.equal(typeof definition.setup, "function");
  assert.equal(typeof definition.i18n.en["command.open"], "string");

  let activeSession;
  const events = [];
  const contributions = [];
  const context = {
    id: "bybrawe.queue-manager",
    t: (key) => key,
    sessions: { current: () => activeSession },
    layout: {
      open: (...args) => events.push(["open", ...args]),
      state: () => "closed",
    },
    toast: { show: (data) => events.push(["toast", data]) },
    add: (token, item) => { contributions.push([token, item]); return () => {}; },
  };
  definition.setup(context);
  const selected = (token) => {
    const entry = contributions.find(([type]) => type === token);
    assert.ok(entry, "Missing GUI registration");
    return typeof entry[1] === "function" ? entry[1]() : entry[1];
  };
  const command = selected(registry.Command);
  assert.equal(command.slash.name, "qm");
  assert.equal(command.id, "open");
  assert.notEqual(command.enabled, false);
  command.run();
  assert.equal(events[0][0], "toast");
  activeSession = { id: "session-test", key: "server:session-test" };
  command.run();
  assert.equal(events[1][0], "open");
  assert.equal(events[1][1], "bybrawe.queue-manager:main");
  assert.equal(events[1][2], activeSession);
  const launcher = selected(registry.MenuItem);
  assert.equal(launcher.menu, "session.panel");
  assert.equal(launcher.title, "panel.title");
  assert.equal(launcher.keybind, "bybrawe.queue-manager.open");
  launcher.run();
  assert.equal(events.at(-1)[0], "open");
  assert.equal(selected(registry.Panel).region, "side");
  assert.ok(typeof selected(registry.Style) === "string");
});
