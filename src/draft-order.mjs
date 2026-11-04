/**
 * Pure, stable draft ordering helpers. Selections are original draft indices,
 * not prompt texts: duplicate messages can be moved independently.
 * All operations return a new array and updated selection without mutating input.
 */
export function normalizeSelection(indices, length) {
  return [...new Set(indices)]
    .filter((index) => Number.isSafeInteger(index) && index >= 0 && index < length)
    .sort((a, b) => a - b);
}

function unchanged(items, selected) {
  return { items: [...items], selected: normalizeSelection(selected, items.length), changed: false };
}

export function shiftSelected(items, indices, direction) {
  if (direction !== "up" && direction !== "down") throw new RangeError("Unknown shift direction");
  const selected = normalizeSelection(indices, items.length);
  if (!selected.length) return unchanged(items, selected);
  const next = [...items];
  const flags = items.map((_, index) => selected.includes(index));
  let changed = false;
  if (direction === "up") {
    for (let index = 1; index < next.length; index++) {
      if (!flags[index] || flags[index - 1]) continue;
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      [flags[index - 1], flags[index]] = [flags[index], flags[index - 1]];
      changed = true;
    }
  } else {
    for (let index = next.length - 2; index >= 0; index--) {
      if (!flags[index] || flags[index + 1]) continue;
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      [flags[index + 1], flags[index]] = [flags[index], flags[index + 1]];
      changed = true;
    }
  }
  return { items: next, selected: flags.flatMap((flag, index) => flag ? [index] : []), changed };
}

export function moveSelectedToEdge(items, indices, edge) {
  if (edge !== "start" && edge !== "end") throw new RangeError("Unknown edge");
  const selected = normalizeSelection(indices, items.length);
  if (!selected.length) return unchanged(items, selected);
  const chosen = new Set(selected);
  const moved = selected.map((index) => items[index]);
  const rest = items.filter((_, index) => !chosen.has(index));
  const next = edge === "start" ? [...moved, ...rest] : [...rest, ...moved];
  const begin = edge === "start" ? 0 : rest.length;
  const newSelected = moved.map((_, index) => begin + index);
  return {
    items: next,
    selected: newSelected,
    changed: selected.some((oldIndex, index) => oldIndex !== newSelected[index]),
  };
}

/**
 * Move the dragged selection before or after the original target row.
 * When the target is part of the selected block it is a safe no-op.
 */
export function dropSelected(items, indices, target, placement = "before") {
  if (placement !== "before" && placement !== "after") throw new RangeError("Unknown drop placement");
  const selected = normalizeSelection(indices, items.length);
  if (!selected.length || !Number.isInteger(target) || target < 0 || target >= items.length || selected.includes(target)) {
    return unchanged(items, selected);
  }
  const chosen = new Set(selected);
  const restIndices = items.map((_, index) => index).filter((index) => !chosen.has(index));
  const insertAt = restIndices.indexOf(target) + (placement === "after" ? 1 : 0);
  const moved = selected.map((index) => items[index]);
  const rest = restIndices.map((index) => items[index]);
  const next = [...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)];
  const newSelected = moved.map((_, index) => insertAt + index);
  return {
    items: next,
    selected: newSelected,
    changed: selected.some((oldIndex, index) => oldIndex !== newSelected[index]),
  };
}
