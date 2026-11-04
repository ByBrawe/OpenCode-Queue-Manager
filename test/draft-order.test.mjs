import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSelection, shiftSelected, moveSelectedToEdge, dropSelected } from "../src/draft-order.mjs";

test("selection normalizes duplicates, out-of-order and stale indices", () => {
  assert.deepEqual(normalizeSelection([3, 1, 3, 99, -1, 2.5, 0], 5), [0, 1, 3]);
});

test("multi-item upward shift preserves relative order and unselected rows", () => {
  const values = ["A", "B", "C", "D", "E"];
  const result = shiftSelected(values, [1, 3], "up");
  assert.deepEqual(result, { items: ["B", "A", "D", "C", "E"], selected: [0, 2], changed: true });
  assert.deepEqual(values, ["A", "B", "C", "D", "E"]);
  assert.deepEqual(shiftSelected(result.items, result.selected, "down").items, values);
});

test("multi-item downward shift and adjacent group remain stable", () => {
  assert.deepEqual(shiftSelected(["A", "B", "C", "D", "E"], [1, 2], "down"), {
    items: ["A", "D", "B", "C", "E"], selected: [2, 3], changed: true,
  });
  assert.equal(shiftSelected(["A", "B"], [0], "up").changed, false);
  assert.equal(shiftSelected(["A", "B"], [1], "down").changed, false);
});

test("send selected duplicates to start/end using positions, not text identity", () => {
  const items = ["aynı", "B", "aynı", "D", "aynı"];
  assert.deepEqual(moveSelectedToEdge(items, [0, 2], "end"), {
    items: ["B", "D", "aynı", "aynı", "aynı"], selected: [3, 4], changed: true,
  });
  assert.deepEqual(moveSelectedToEdge(items, [1, 3], "start"), {
    items: ["B", "D", "aynı", "aynı", "aynı"], selected: [0, 1], changed: true,
  });
  assert.deepEqual(items, ["aynı", "B", "aynı", "D", "aynı"]);
});

test("drag and drop selected rows before or after target with stable order", () => {
  const items = ["A", "B", "C", "D", "E", "F"];
  assert.deepEqual(dropSelected(items, [1, 3], 4, "after"), {
    items: ["A", "C", "E", "B", "D", "F"], selected: [3, 4], changed: true,
  });
  assert.deepEqual(dropSelected(items, [1, 3], 0, "before"), {
    items: ["B", "D", "A", "C", "E", "F"], selected: [0, 1], changed: true,
  });
  assert.equal(dropSelected(items, [1, 3], 3, "before").changed, false);
  assert.deepEqual(dropSelected(items, [1, 3], 20).items, items);
});

test("large batch 200 messages is safe and stable over reordering", () => {
  const items = Array.from({ length: 200 }, (_, i) => "Message " + (i + 1));
  const selected = Array.from({ length: 100 }, (_, i) => i * 2);
  const out = moveSelectedToEdge(items, selected, "end");
  assert.equal(out.items.length, 200);
  assert.equal(out.items[0], "Message 2");
  assert.equal(out.items[100], "Message 1");
  assert.equal(out.items[199], "Message 199");
  assert.deepEqual(items[0], "Message 1");
});

test("reject invalid mode without changing data", () => {
  assert.throws(() => shiftSelected(["A"], [0], "left"), /Unknown shift/);
  assert.throws(() => moveSelectedToEdge(["A"], [0], "middle"), /Unknown edge/);
  assert.throws(() => dropSelected(["A"], [0], 0, "middle"), /Unknown drop placement/);
});
